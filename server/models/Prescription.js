const mongoose = require("mongoose");

const prescriptionSchema = new mongoose.Schema(
  {
    familyMember: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "FamilyMember",
      required: true,
      index: true,
    },
    imageUrl: {
      type: String,
    },
    // Raw AI/OCR payload. Stored only after the user confirms the extraction.
    extractedData: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    confirmed: {
      type: Boolean,
      default: false,
    },
    confirmedAt: {
      type: Date,
    },
    notes: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Prescription", prescriptionSchema);