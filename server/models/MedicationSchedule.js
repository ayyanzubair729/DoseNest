const mongoose = require("mongoose");

const medicationScheduleSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    medication: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Medication",
      required: true,
      index: true,
    },
    time: {
      type: String,
      required: true,
      match: /^([01]\d|2[0-3]):[0-5]\d$/,
    },
    frequency: {
      type: String,
      enum: ["daily", "days_of_week", "custom"],
      default: "daily",
    },
    daysOfWeek: {
      type: [Number],
      default: [],
    },
    startDate: {
      type: Date,
    },
    endDate: {
      type: Date,
    },
    timezone: {
      type: String,
      default: "UTC",
    },
    active: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("MedicationSchedule", medicationScheduleSchema);
