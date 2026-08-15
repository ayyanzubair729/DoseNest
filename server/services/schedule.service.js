const MedicationSchedule = require("../models/MedicationSchedule");
const MedicationLog = require("../models/MedicationLog");
const Medication = require("../models/Medication");
const AppError = require("../utils/AppError");
const { addLocalDays, localTimeToUtc, normalizeZone, utcToLocalParts } = require("../utils/timezone");

const DAY_MS = 24 * 60 * 60 * 1000;

const serializeSchedule = (schedule) => ({
  id: schedule._id.toString(),
  medicationId: schedule.medication.toString(),
  time: schedule.time,
  frequency: schedule.frequency,
  daysOfWeek: schedule.daysOfWeek || [],
  startDate: schedule.startDate ? schedule.startDate.toISOString() : null,
  endDate: schedule.endDate ? schedule.endDate.toISOString() : null,
  timezone: schedule.timezone,
  active: schedule.active,
});

/**
 * Next occurrence of a schedule's `time` at or after `from` (an absolute UTC
 * instant). `time` is a wall-clock value interpreted in the schedule's IANA
 * `timezone`; day constraints (days_of_week / custom) are evaluated on the
 * local calendar day in that timezone. Respects startDate/endDate bounds.
 * Returns null when there is no next occurrence.
 */
const getNextOccurrence = (schedule, from = new Date()) => {
  const timeZone = normalizeZone(schedule.timezone);
  const [hours, minutes] = schedule.time.split(":").map(Number);
  const startDate = schedule.startDate ? new Date(schedule.startDate) : null;
  const endDate = schedule.endDate ? new Date(schedule.endDate) : null;
  const isDayConstrained =
    (schedule.frequency === "days_of_week" || schedule.frequency === "custom") &&
    Array.isArray(schedule.daysOfWeek) &&
    schedule.daysOfWeek.length > 0;

  const advanceToAllowedDay = (candidate) => {
    if (!isDayConstrained) return candidate;
    for (let i = 0; i < 8; i += 1) {
      if (schedule.daysOfWeek.includes(utcToLocalParts(candidate, timeZone).weekday)) {
        return candidate;
      }
      candidate = addLocalDays(candidate, 1, timeZone);
    }
    return candidate;
  };

  // Candidate: the same local calendar day as `from`, at the dose time, in the
  // schedule's timezone.
  const fromLocal = utcToLocalParts(from, timeZone);
  let candidate = localTimeToUtc(
    fromLocal.year,
    fromLocal.month,
    fromLocal.day,
    hours,
    minutes,
    timeZone
  );

  if (startDate) {
    const startLocal = utcToLocalParts(startDate, timeZone);
    const startDayTime = localTimeToUtc(
      startLocal.year,
      startLocal.month,
      startLocal.day,
      hours,
      minutes,
      timeZone
    );
    if (candidate < startDayTime) {
      candidate = advanceToAllowedDay(startDayTime);
    }
  }

  if (candidate < from) {
    candidate = addLocalDays(candidate, 1, timeZone);
    candidate = advanceToAllowedDay(candidate);
  }

  if (endDate && candidate > endDate) return null;

  return candidate;
};

const listSchedulesForMedication = async (userId, medicationId) => {
  const schedules = await MedicationSchedule.find({ user: userId, medication: medicationId }).sort({
    time: 1,
  });
  return schedules.map(serializeSchedule);
};

const createSchedule = async (userId, medicationId, input) => {
  const schedule = await MedicationSchedule.create({ user: userId, medication: medicationId, ...input });
  return serializeSchedule(schedule);
};

const updateSchedule = async (userId, medicationId, scheduleId, input) => {
  const schedule = await MedicationSchedule.findOneAndUpdate(
    { _id: scheduleId, user: userId, medication: medicationId },
    { $set: input },
    { new: true, runValidators: true }
  );
  if (!schedule) {
    throw new AppError("Schedule not found.", 404);
  }
  return serializeSchedule(schedule);
};

const deleteSchedule = async (userId, medicationId, scheduleId) => {
  const schedule = await MedicationSchedule.findOneAndDelete({
    _id: scheduleId,
    user: userId,
    medication: medicationId,
  });
  if (!schedule) {
    throw new AppError("Schedule not found.", 404);
  }
  // Keep the log history, but the schedule is gone: detach the reference and
  // cancel its not-yet-happened occurrences. Logs left "upcoming" with a null
  // schedule would otherwise be treated as real doses — marked missed, counted
  // in adherence, and notified — producing duplicates of the replacement
  // schedule's occurrences. Already taken/missed history is left untouched.
  await MedicationLog.updateMany(
    {
      user: userId,
      medication: medicationId,
      schedule: scheduleId,
      status: "upcoming",
    },
    { $set: { schedule: null, status: "skipped" } }
  );
};

/**
 * Materialize one log row per due occurrence across active schedules,
 * from the start of today (in each schedule's own timezone) for `days` days.
 * Idempotent via the unique (user, medication, schedule, scheduledFor) index.
 * Pass a userId to scope to one user, or omit it to cover all users (job mode).
 */
const materializeLogWindow = async (userId = null, days = 7) => {
  const match = userId ? { user: userId, active: true } : { active: true };
  const schedules = await MedicationSchedule.find(match).lean();
  if (schedules.length === 0) return 0;

  // Map medication -> familyMember so each materialized log carries the
  // family relationship (null for the primary user's own medications).
  const medicationIds = [...new Set(schedules.map((schedule) => schedule.medication))];
  const medicationMatch = userId ? { user: userId, _id: { $in: medicationIds } } : { _id: { $in: medicationIds } };
  const medications = await Medication.find(medicationMatch).select("_id familyMember").lean();
  const familyMemberByMedication = new Map(
    medications.map((medication) => [medication._id.toString(), medication.familyMember || null])
  );

  const now = new Date();
  let created = 0;
  const MAX_PER_SCHEDULE = 31;

  for (const schedule of schedules) {
    const timeZone = normalizeZone(schedule.timezone);
    const localNow = utcToLocalParts(now, timeZone);
    const startOfToday = localTimeToUtc(localNow.year, localNow.month, localNow.day, 0, 0, timeZone);
    const windowEnd = new Date(startOfToday.getTime() + days * DAY_MS);

    let cursor = getNextOccurrence(schedule, startOfToday);
    if (!cursor) continue;
    if (schedule.startDate && cursor < new Date(schedule.startDate)) {
      cursor = getNextOccurrence(schedule, new Date(schedule.startDate));
      if (!cursor) continue;
    }

    // Bulk-insert the schedule's whole window in one query; the unique
    // (user, medication, schedule, scheduledFor) index silently drops rows that
    // already exist on re-runs (E11000 is expected and ignored).
    const occurrences = [];
    while (cursor && cursor < windowEnd && occurrences.length < MAX_PER_SCHEDULE) {
      occurrences.push({
        user: schedule.user,
        medication: schedule.medication,
        familyMember: familyMemberByMedication.get(schedule.medication.toString()) || null,
        schedule: schedule._id,
        scheduledFor: cursor,
        status: "upcoming",
      });
      const next = getNextOccurrence(schedule, new Date(cursor.getTime() + 1));
      if (!next || next <= cursor) break;
      cursor = next;
    }

    if (occurrences.length > 0) {
      try {
        const inserted = await MedicationLog.insertMany(occurrences, { ordered: false });
        created += inserted.length;
      } catch (err) {
        if (err.code !== 11000) throw err;
        created += err.result?.insertedCount || 0;
      }
    }
  }

  return created;
};

const getSchedules = async (userId, medicationId) => {
  const schedules = await MedicationSchedule.find({ user: userId, medication: medicationId }).sort({
    time: 1,
  });
  return schedules;
};

module.exports = {
  createSchedule,
  deleteSchedule,
  getNextOccurrence,
  getSchedules,
  listSchedulesForMedication,
  materializeLogWindow,
  serializeSchedule,
  updateSchedule,
};
