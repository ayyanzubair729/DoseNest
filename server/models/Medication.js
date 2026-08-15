const mongoose = require("mongoose");

const medicationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    // Optional for Phase 4 (medications belong to the authenticated user).
    // Wired up later in the family-care phase.
    familyMember: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "FamilyMember",
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    dosage: {
      type: String,
      trim: true,
    },
    dosageUnit: {
      type: String,
      enum: ["mg", "ml", "tablet", "capsule", "drop", "puff"],
      trim: true,
    },
    form: {
      type: String,
      trim: true,
    },
    instructions: {
      type: String,
      trim: true,
    },
    notes: {
      type: String,
      trim: true,
    },
    startDate: {
      type: Date,
    },
    endDate: {
      type: Date,
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

module.exports = mongoose.model("Medication", medicationSchema);
