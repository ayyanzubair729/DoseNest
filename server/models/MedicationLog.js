const mongoose = require("mongoose");

const medicationLogSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    // Optional for Phase 4; wired up later in the family-care phase.
    familyMember: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "FamilyMember",
      index: true,
    },
    medication: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Medication",
      required: true,
      index: true,
    },
    schedule: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "MedicationSchedule",
      index: true,
    },
    status: {
      type: String,
      enum: ["upcoming", "taken", "missed", "skipped", "snoozed"],
      default: "upcoming",
      required: true,
    },
    scheduledFor: {
      type: Date,
      required: true,
    },
    takenAt: {
      type: Date,
    },
    // How the dose was confirmed: "manual" (in-app), "whatsapp" (TAKEN reply),
    // or undefined for legacy records.
    takenSource: {
      type: String,
      enum: ["manual", "whatsapp"],
    },
    note: {
      type: String,
      trim: true,
    },
    reviewed: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// One log per scheduled dose occurrence per user.
medicationLogSchema.index(
  { user: 1, medication: 1, schedule: 1, scheduledFor: 1 },
  { unique: true }
);

// Reminder engine: due/missed detection over time windows.
medicationLogSchema.index({ status: 1, scheduledFor: 1 });

module.exports = mongoose.model("MedicationLog", medicationLogSchema);
