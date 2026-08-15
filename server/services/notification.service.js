const Notification = require("../models/Notification");
const MedicationLog = require("../models/MedicationLog");
const AppError = require("../utils/AppError");
const {
  NOTIFICATION_TYPES,
  NOTIFICATION_TYPE_LABELS,
} = require("../constants/notificationTypes");
// Phase 7: WhatsApp delivery is triggered from the single notification
// creation funnel. The delivery service is loaded lazily to keep the
// notification engine decoupled from provider details.
const getWhatsappDeliveryService = () => require("./whatsapp/whatsapp.delivery.service");

const serializeNotification = (notification) => ({
  id: notification._id.toString(),
  type: notification.type,
  typeLabel: NOTIFICATION_TYPE_LABELS[notification.type] || notification.type,
  title: notification.title,
  body: notification.body,
  read: notification.read,
  status: notification.status,
  channel: notification.channel,
  deliveryChannel: notification.deliveryChannel || "in_app",
  simulated: Boolean(notification.simulated),
  familyMemberId: notification.familyMember?._id?.toString?.() || notification.familyMember?.toString?.() || null,
  familyMemberName: notification.familyMember?.name || null,
  medicationId: notification.medication?._id?.toString?.() || notification.medication?.toString?.() || null,
  medicationName: notification.medication?.name || null,
  scheduledFor: notification.scheduledFor ? notification.scheduledFor.toISOString() : null,
  sentAt: notification.sentAt ? notification.sentAt.toISOString() : null,
  readAt: notification.readAt ? notification.readAt.toISOString() : null,
  createdAt: notification.createdAt?.toISOString() || null,
});

const doseSummary = (medication) => {
  if (!medication) return "your medication";
  const name = medication.name || "medication";
  const dosage = [medication.dosage, medication.dosageUnit].filter(Boolean).join(" ");
  return dosage ? `${name} (${dosage})` : name;
};

const buildMessage = (type, medication, familyMemberName) => {
  const who = familyMemberName ? `${familyMemberName}'s` : "Your";
  const subject = doseSummary(medication);

  switch (type) {
    case NOTIFICATION_TYPES.MEDICATION_DUE:
      return {
        title: familyMemberName ? `${familyMemberName}'s medication is due now` : "Medication due now",
        body: `Time to take ${subject}.`,
      };
    case NOTIFICATION_TYPES.MEDICATION_TAKEN:
      return {
        title: "Dose recorded as taken",
        body: `${who} dose of ${subject} was recorded as taken.`,
      };
    case NOTIFICATION_TYPES.MEDICATION_MISSED:
      return {
        title: "Dose missed",
        body: `${who} scheduled dose of ${subject} was marked as missed.`,
      };
    case NOTIFICATION_TYPES.REMINDER:
      return {
        title: "Upcoming dose",
        body: `${who} dose of ${subject} is coming up soon.`,
      };
    default:
      return { title: "DoseNest", body: subject };
  }
};

/**
 * Creates a notification for a single dose occurrence. Idempotent: the unique
 * (user, medication, schedule, scheduledFor, type) index guarantees one
 * notification per occurrence+type — safe to call from any job run.
 * Returns true when created, false when a duplicate already exists.
 */
const createForDose = async (
  userId,
  { type, medication, schedule, medicationLog, familyMember, scheduledFor },
  options = {}
) => {
  const medId = medication?._id?.toString?.() || medication?.toString?.() || null;
  const scheduleId = schedule?._id?.toString?.() || schedule?.toString?.() || null;
  const memberId = familyMember?._id?.toString?.() || familyMember?.toString?.() || null;
  const memberName = familyMember?.name || null;

  // One notification per DOSE OCCURRENCE, keyed by (user, medication,
  // scheduledFor, type). The schedule is deliberately NOT part of the key:
  // duplicate schedules (or logs orphaned by a deleted schedule) can produce
  // several logs for the same real-world dose, and they must not each spawn a
  // notification. This also covers schedule-less notifications, which the
  // sparse DB unique index (which includes schedule) cannot deduplicate.
  const existing = await Notification.findOne({
    user: userId,
    medication: medId,
    scheduledFor,
    type,
  }).lean();
  if (existing) return false;

  const { title, body } = buildMessage(type, medication, memberName);

  try {
    const created = await Notification.create({
      user: userId,
      familyMember: memberId || undefined,
      medication: medId || undefined,
      schedule: scheduleId || undefined,
      medicationLog: medicationLog?._id?.toString?.() || medicationLog?.toString?.() || undefined,
      type,
      channel: "in_app",
      title,
      body,
      status: "pending",
      read: false,
      scheduledFor,
      metadata: { familyMemberName: memberName },
    });

    // Phase 7: hand the new notification to the WhatsApp delivery pipeline.
    // Delivery is self-contained (checks opt-in, config, idempotency) and
    // never throws, so a provider hiccup cannot break the reminder engine.
    // Phase 8: callers can pass { deliver: false } when the WhatsApp
    // confirmation already happened out-of-band (e.g. a webhook TAKEN reply)
    // so no duplicate template message is sent.
    if (options.deliver !== false) {
      await getWhatsappDeliveryService().deliverForNotification(created);
    }
    return true;
  } catch (err) {
    if (err.code === 11000) return false;
    throw err;
  }
};

const listForUser = async (userId, { unread, type, limit = 50 } = {}) => {
  const query = { user: userId };
  if (unread === "true" || unread === true) query.read = false;
  if (type) query.type = type;

  const notifications = await Notification.find(query)
    .sort({ createdAt: -1 })
    .limit(Math.min(Number(limit) || 50, 100))
    .populate("familyMember", "name")
    .populate("medication", "name");

  return notifications.map(serializeNotification);
};

const unreadCountForUser = async (userId) => {
  const count = await Notification.countDocuments({ user: userId, read: false });
  return count;
};

const markReadForUser = async (userId, notificationId) => {
  const notification = await Notification.findOneAndUpdate(
    { _id: notificationId, user: userId },
    { $set: { read: true, readAt: new Date(), status: "read" } },
    { new: true }
  );
  if (!notification) {
    throw new AppError("Notification not found.", 404);
  }
  return serializeNotification(notification);
};

const markAllReadForUser = async (userId) => {
  const result = await Notification.updateMany(
    { user: userId, read: false },
    { $set: { read: true, readAt: new Date(), status: "read" } }
  );
  return result.modifiedCount || 0;
};

/**
 * Next upcoming reminder: the soonest future scheduled dose (from real logs),
 * including family member context when applicable.
 */
const getNextReminder = async (userId) => {
  const log = await MedicationLog.findOne({
    user: userId,
    status: "upcoming",
    scheduledFor: { $gte: new Date() },
  })
    .sort({ scheduledFor: 1 })
    .populate("medication", "name dosage dosageUnit form")
    .populate("schedule", "time")
    .populate("familyMember", "name");

  if (!log) return null;

  return {
    medication: log.medication
      ? {
          id: log.medication._id.toString(),
          name: log.medication.name,
          dosage: log.medication.dosage || null,
          dosageUnit: log.medication.dosageUnit || null,
          form: log.medication.form || null,
        }
      : null,
    familyMember: log.familyMember
      ? {
          id: log.familyMember._id.toString(),
          name: log.familyMember.name,
        }
      : null,
    scheduledFor: log.scheduledFor.toISOString(),
    status: "upcoming",
  };
};

module.exports = {
  buildMessage,
  createForDose,
  getNextReminder,
  listForUser,
  markAllReadForUser,
  markReadForUser,
  serializeNotification,
  unreadCountForUser,
};
