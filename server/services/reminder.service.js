const User = require("../models/User");
const Medication = require("../models/Medication");
const MedicationLog = require("../models/MedicationLog");
const scheduleService = require("./schedule.service");
const notificationService = require("./notification.service");
const { NOTIFICATION_TYPES } = require("../constants/notificationTypes");

const DAY_MS = 24 * 60 * 60 * 1000;

const getGraceMinutes = () => {
  const value = Number(process.env.MEDICATION_MISSED_GRACE_MINUTES);
  return Number.isFinite(value) && value > 0 ? value : 30;
};

/**
 * Runs the reminder engine once. Safe to call repeatedly:
 * - materializes dose logs idempotently (unique occurrence index)
 * - creates notifications idempotently (unique occurrence+type index)
 * - marks past-grace "upcoming" doses as missed (backend-owned rule)
 */
const runReminderEngine = async () => {
  await scheduleService.materializeLogWindow();

  const now = new Date();
  const graceMs = getGraceMinutes() * 60000;
  const counts = { due: 0, reminder: 0, missed: 0, missedMarked: 0 };

  // ---- 1. Missed doses (past grace period) ----
  const missedLogs = await MedicationLog.find({
    status: "upcoming",
    scheduledFor: { $lt: new Date(now.getTime() - graceMs) },
  })
    .populate("medication", "name dosage dosageUnit form")
    .populate("schedule", "time")
    .populate("familyMember", "name");

  if (missedLogs.length > 0) {
    const result = await MedicationLog.updateMany(
      { _id: { $in: missedLogs.map((log) => log._id) } },
      { $set: { status: "missed" } }
    );
    counts.missedMarked = result.modifiedCount || 0;
  }
  for (const log of missedLogs) {
    const created = await notificationService.createForDose(log.user, {
      type: NOTIFICATION_TYPES.MEDICATION_MISSED,
      medication: log.medication,
      schedule: log.schedule,
      medicationLog: log,
      familyMember: log.familyMember,
      scheduledFor: log.scheduledFor,
    });
    if (created) counts.missed += 1;
  }

  // ---- 2. Due doses (time arrived, within grace window) ----
  const dueLogs = await MedicationLog.find({
    status: "upcoming",
    scheduledFor: { $gte: new Date(now.getTime() - graceMs), $lte: now },
  })
    .populate("medication", "name dosage dosageUnit form")
    .populate("schedule", "time")
    .populate("familyMember", "name");

  for (const log of dueLogs) {
    const created = await notificationService.createForDose(log.user, {
      type: NOTIFICATION_TYPES.MEDICATION_DUE,
      medication: log.medication,
      schedule: log.schedule,
      medicationLog: log,
      familyMember: log.familyMember,
      scheduledFor: log.scheduledFor,
    });
    if (created) counts.due += 1;
  }

  // ---- 3. Advance reminders (lead time) for enabled users ----
  const upcomingLogs = await MedicationLog.find({
    status: "upcoming",
    scheduledFor: { $gt: now, $lt: new Date(now.getTime() + 7 * DAY_MS) },
  })
    .select("user medication schedule familyMember scheduledFor")
    .lean();

  const userIds = [...new Set(upcomingLogs.map((log) => log.user.toString()))];
  const users = userIds.length
    ? await User.find({ _id: { $in: userIds } })
        .select("notificationPreferences")
        .lean()
    : [];
  const enabledUserIds = new Set(
    users
      .filter((user) => user.notificationPreferences?.remindersEnabled !== false)
      .map((user) => user._id.toString())
  );
  const leadMinutesByUser = new Map(
    users.map((user) => [
      user._id.toString(),
      Number(user.notificationPreferences?.defaultReminderOffsetMinutes) || 0,
    ])
  );

  const reminderLogs = upcomingLogs.filter((log) => {
    const userId = log.user.toString();
    if (!enabledUserIds.has(userId)) return false;
    const lead = leadMinutesByUser.get(userId) || 0;
    if (lead <= 0) return false;
    return new Date(log.scheduledFor.getTime() - lead * 60000) <= now;
  });

  if (reminderLogs.length > 0) {
    const medicationIds = [...new Set(reminderLogs.map((log) => log.medication.toString()))];
    const medications = await Medication.find({ _id: { $in: medicationIds } })
      .select("name")
      .lean();
    const nameByMedication = new Map(medications.map((medication) => [medication._id.toString(), medication.name]));

    for (const log of reminderLogs) {
      const created = await notificationService.createForDose(log.user, {
        type: NOTIFICATION_TYPES.REMINDER,
        medication: { _id: log.medication, name: nameByMedication.get(log.medication.toString()) || null },
        schedule: log.schedule,
        medicationLog: log,
        familyMember: log.familyMember,
        scheduledFor: log.scheduledFor,
      });
      if (created) counts.reminder += 1;
    }
  }

  return counts;
};

module.exports = { runReminderEngine };
