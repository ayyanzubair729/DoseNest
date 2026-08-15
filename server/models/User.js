const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
      select: false,
    },
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },
    // WhatsApp-capable phone number in E.164 format (e.g. "+15551234567").
    // Optional — required only when the user opts into WhatsApp reminders.
    phoneNumber: {
      type: String,
      trim: true,
      default: null,
      match: /^\+[1-9]\d{1,14}$/,
    },
    // IANA timezone (e.g. "Asia/Karachi") used by the reminder engine.
    timezone: {
      type: String,
      default: "UTC",
    },
    notificationPreferences: {
      remindersEnabled: { type: Boolean, default: true },
      whatsapp: { type: Boolean, default: false },
      email: { type: Boolean, default: false },
      defaultReminderOffsetMinutes: { type: Number, default: 0 },
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("User", userSchema);