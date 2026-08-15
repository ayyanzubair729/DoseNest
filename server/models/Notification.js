const mongoose = require("mongoose");
const { NOTIFICATION_TYPE_LIST } = require("../constants/notificationTypes");

const notificationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    familyMember: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "FamilyMember",
    },
    medication: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Medication",
    },
    schedule: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "MedicationSchedule",
    },
    medicationLog: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "MedicationLog",
    },
    type: {
      type: String,
      enum: NOTIFICATION_TYPE_LIST,
      default: "system",
    },
    channel: {
      type: String,
      enum: ["in_app", "whatsapp", "email", "push"],
      default: "in_app",
    },
    title: {
      type: String,
      trim: true,
    },
    body: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ["pending", "sent", "delivered", "read", "failed"],
      default: "pending",
    },
    // Delivery tracking (Phase 7). `status` doubles as the delivery state;
    // these fields record the outcome of the last delivery attempt.
    deliveryChannel: {
      type: String,
      enum: ["in_app", "whatsapp", "email", "push"],
      default: "in_app",
    },
    deliveryAttemptedAt: {
      type: Date,
    },
    deliveredAt: {
      type: Date,
    },
    deliveryError: {
      type: String,
      trim: true,
    },
    providerMessageId: {
      type: String,
      trim: true,
    },
    attempts: {
      type: Number,
      default: 0,
    },
    // True when the message was simulated (test mode) rather than actually
    // delivered through the WhatsApp provider.
    simulated: {
      type: Boolean,
      default: false,
    },
    read: {
      type: Boolean,
      default: false,
      index: true,
    },
    scheduledFor: {
      type: Date,
    },
    sentAt: {
      type: Date,
    },
    readAt: {
      type: Date,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

// One notification per dose occurrence + type. Sparse so ad-hoc notifications
// without a medication (e.g. system) never collide on the unique key.
notificationSchema.index(
  { user: 1, medication: 1, schedule: 1, scheduledFor: 1, type: 1 },
  { unique: true, sparse: true }
);

// Fast unread-badge and "recent notifications" queries.
notificationSchema.index({ user: 1, read: 1, createdAt: -1 });

module.exports = mongoose.model("Notification", notificationSchema);
