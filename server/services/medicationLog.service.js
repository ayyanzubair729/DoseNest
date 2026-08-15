const MedicationLog = require("../models/MedicationLog");
const AppError = require("../utils/AppError");
const notificationService = require("./notification.service");
const { NOTIFICATION_TYPES } = require("../constants/notificationTypes");

const serializeLog = (log) => ({
  id: log._id.toString(),
  medicationId: log.medication?._id?.toString?.() || log.medication?.toString?.(),
  medicationName: log.medication?.name || null,
  dosage: log.medication?.dosage || null,
  dosageUnit: log.medication?.dosageUnit || null,
  form: log.medication?.form || null,
  scheduleId: log.schedule?._id?.toString?.() || log.schedule?.toString?.() || null,
  scheduleTime: log.schedule?.time || null,
  scheduledFor: log.scheduledFor.toISOString(),
  status: log.status,
  takenAt: log.takenAt ? log.takenAt.toISOString() : null,
  takenSource: log.takenSource || null,
  note: log.note || null,
});

const listLogs = async (userId, { medicationId, familyMemberId, status, limit = 50 } = {}) => {
  const query = { user: userId };
  if (medicationId) query.medication = medicationId;
  if (familyMemberId) query.familyMember = familyMemberId;
  if (status) query.status = status;

  const logs = await MedicationLog.find(query)
    .sort({ scheduledFor: -1 })
    .limit(Math.min(Number(limit) || 50, 100))
    .populate("medication", "name dosage dosageUnit form")
    .populate("schedule", "time");

  return logs.map(serializeLog);
};

const getOwnedLog = async (userId, logId) => {
  const log = await MedicationLog.findOne({ _id: logId, user: userId });
  if (!log) {
    throw new AppError("Medication log not found.", 404);
  }
  return log;
};

const markLog = async (userId, logId, status) => {
  const log = await getOwnedLog(userId, logId);

  if (status === "taken" && log.status === "taken") {
    throw new AppError("This dose is already marked as taken.", 409);
  }
  if (status === "missed" && log.status === "missed") {
    throw new AppError("This dose is already marked as missed.", 409);
  }
  if (log.status === "taken" || log.status === "missed") {
    throw new AppError(`This dose is already marked as ${log.status}.`, 409);
  }

  const previousStatus = log.status;
  log.status = status;
  log.takenAt = status === "taken" ? new Date() : log.takenAt;
  log.takenSource = status === "taken" ? "manual" : log.takenSource;
  await log.save();

  const populated = await MedicationLog.findById(log._id)
    .populate("medication", "name dosage dosageUnit form")
    .populate("schedule", "time")
    .populate("familyMember", "name");

  // Keep the notification state in sync with the actual dose status.
  // The unique (user, medication, schedule, scheduledFor, type) index makes
  // this idempotent even when the reminder job also generates one. A
  // notification hiccup must never fail the dose-marking request itself.
  if (previousStatus !== status) {
    const type =
      status === "taken"
        ? NOTIFICATION_TYPES.MEDICATION_TAKEN
        : status === "missed"
          ? NOTIFICATION_TYPES.MEDICATION_MISSED
          : null;
    if (type) {
      try {
        await notificationService.createForDose(userId, {
          type,
          medication: populated.medication,
          schedule: populated.schedule,
          medicationLog: populated,
          familyMember: populated.familyMember,
          scheduledFor: populated.scheduledFor,
        });
      } catch {
        // Non-fatal: the log state is already persisted and correct.
      }
    }
  }

  return serializeLog(populated);
};

module.exports = { getOwnedLog, listLogs, markLog, serializeLog };
