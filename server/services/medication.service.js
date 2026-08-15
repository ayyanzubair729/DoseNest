const mongoose = require("mongoose");
const Medication = require("../models/Medication");
const MedicationSchedule = require("../models/MedicationSchedule");
const MedicationLog = require("../models/MedicationLog");
const FamilyMember = require("../models/FamilyMember");
const AppError = require("../utils/AppError");
const scheduleService = require("./schedule.service");

const serializeMedication = (medication, schedules = []) => ({
  id: medication._id.toString(),
  name: medication.name,
  dosage: medication.dosage || null,
  dosageUnit: medication.dosageUnit || null,
  form: medication.form || null,
  instructions: medication.instructions || null,
  notes: medication.notes || null,
  startDate: medication.startDate ? medication.startDate.toISOString() : null,
  endDate: medication.endDate ? medication.endDate.toISOString() : null,
  active: medication.active,
  familyMemberId: medication.familyMember?._id?.toString?.() || medication.familyMember?.toString?.() || null,
  familyMemberName: medication.familyMember?.name || null,
  schedules: schedules.map(scheduleService.serializeSchedule),
  createdAt: medication.createdAt?.toISOString() || null,
  updatedAt: medication.updatedAt?.toISOString() || null,
});

/**
 * Verifies a familyMemberId belongs to the authenticated user and returns
 * the resolved family member (or null when no id is supplied).
 */
const resolveFamilyMember = async (userId, familyMemberId) => {
  if (!familyMemberId) return null;
  if (!mongoose.isValidObjectId(familyMemberId)) {
    throw new AppError("Invalid family member id.", 400);
  }
  const member = await FamilyMember.findOne({ _id: familyMemberId, user: userId });
  if (!member) {
    throw new AppError("Family member not found.", 404);
  }
  return member;
};

const attachSchedules = async (userId, medications) => {
  if (medications.length === 0) return [];
  const ids = medications.map((m) => m._id);
  const schedules = await MedicationSchedule.find({ user: userId, medication: { $in: ids } }).sort({
    time: 1,
  });
  const byMedication = new Map();
  for (const schedule of schedules) {
    const key = schedule.medication.toString();
    if (!byMedication.has(key)) byMedication.set(key, []);
    byMedication.get(key).push(schedule);
  }
  return medications.map((medication) =>
    serializeMedication(medication, byMedication.get(medication._id.toString()) || [])
  );
};

const listForUser = async (userId, { active, search, familyMemberId } = {}) => {
  if (familyMemberId) {
    // Filter by family member only if the member belongs to this user.
    await resolveFamilyMember(userId, familyMemberId);
  }

  const query = { user: userId };
  if (active === "true" || active === true) query.active = true;
  if (active === "false" || active === false) query.active = false;
  if (search && typeof search === "string" && search.trim()) {
    query.name = { $regex: search.trim(), $options: "i" };
  }
  if (familyMemberId) {
    query.familyMember = familyMemberId;
  }

  const medications = await Medication.find(query).sort({ createdAt: -1 }).populate("familyMember", "name");
  return attachSchedules(userId, medications);
};

const getForUser = async (userId, medicationId) => {
  const medication = await Medication.findOne({ _id: medicationId, user: userId }).populate(
    "familyMember",
    "name"
  );
  if (!medication) {
    throw new AppError("Medication not found.", 404);
  }
  const schedules = await scheduleService.getSchedules(userId, medicationId);
  return serializeMedication(medication, schedules);
};

const createForUser = async (userId, input) => {
  const { schedules = [], familyMemberId, ...medicationInput } = input;
  const member = await resolveFamilyMember(userId, familyMemberId);

  const medication = await Medication.create({
    user: userId,
    ...(member ? { familyMember: member._id } : {}),
    ...medicationInput,
  });

  // Keep raw schedule documents so serializeMedication can serialize them once.
  const createdSchedules = [];
  for (const scheduleInput of schedules) {
    createdSchedules.push(
      await MedicationSchedule.create({
        user: userId,
        medication: medication._id,
        ...scheduleInput,
      })
    );
  }
  medication.familyMember = member || null;
  return serializeMedication(medication, createdSchedules);
};

const updateForUser = async (userId, medicationId, input) => {
  const { schedules, ...medicationInput } = input;
  // Ownership is immutable: a medication can never be reassigned to another
  // user or another family member through an update.
  delete medicationInput.familyMemberId;
  const medication = await Medication.findOneAndUpdate(
    { _id: medicationId, user: userId },
    { $set: medicationInput },
    { new: true, runValidators: true }
  ).populate("familyMember", "name");
  if (!medication) {
    throw new AppError("Medication not found.", 404);
  }

  // Ownership-controlled: never allow changing the owner.
  medication.user = undefined;

  if (Array.isArray(schedules) && schedules.length > 0) {
    for (const scheduleInput of schedules) {
      await scheduleService.createSchedule(userId, medicationId, scheduleInput);
    }
  }

  const allSchedules = await scheduleService.getSchedules(userId, medicationId);
  return serializeMedication(medication, allSchedules);
};

const deleteForUser = async (userId, medicationId) => {
  const medication = await Medication.findOneAndDelete({ _id: medicationId, user: userId });
  if (!medication) {
    throw new AppError("Medication not found.", 404);
  }
  // Cascade: remove schedules and logs so no orphaned records remain.
  await MedicationSchedule.deleteMany({ user: userId, medication: medicationId });
  await MedicationLog.deleteMany({ user: userId, medication: medicationId });
};

const getUpcomingDoses = async (userId, limit = 10) => {
  await scheduleService.materializeLogWindow(userId);
  const doses = await MedicationLog.find({
    user: userId,
    status: "upcoming",
    scheduledFor: { $gte: new Date() },
  })
    .sort({ scheduledFor: 1 })
    .limit(Math.min(Number(limit) || 10, 50))
    .populate("medication", "name dosage dosageUnit form")
    .populate("schedule", "time");

  const medicationLogService = require("./medicationLog.service");
  return doses.map(medicationLogService.serializeLog);
};

const getStats = async (userId) => {
  const [totalMedications, activeMedications] = await Promise.all([
    Medication.countDocuments({ user: userId }),
    Medication.countDocuments({ user: userId, active: true }),
  ]);

  await scheduleService.materializeLogWindow(userId);

  const now = new Date();
  const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

  const todayLogs = await MedicationLog.find({
    user: userId,
    scheduledFor: { $gte: dayStart, $lt: dayEnd },
  }).populate("medication", "name dosage dosageUnit form");

  const upcomingLog = await MedicationLog.findOne({
    user: userId,
    status: "upcoming",
    scheduledFor: { $gte: now },
  })
    .sort({ scheduledFor: 1 })
    .populate("medication", "name dosage dosageUnit form")
    .populate("schedule", "time");

  const medicationLogService = require("./medicationLog.service");
  return {
    totalMedications,
    activeMedications,
    todayScheduledDoses: todayLogs.length,
    takenToday: todayLogs.filter((log) => log.status === "taken").length,
    missedToday: todayLogs.filter((log) => log.status === "missed").length,
    upcomingDose: upcomingLog ? medicationLogService.serializeLog(upcomingLog) : null,
  };
};

module.exports = {
  attachSchedules,
  createForUser,
  deleteForUser,
  getForUser,
  getStats,
  getUpcomingDoses,
  listForUser,
  serializeMedication,
  updateForUser,
};
