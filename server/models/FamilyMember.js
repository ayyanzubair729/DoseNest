const mongoose = require("mongoose");

const familyMemberSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    relationship: {
      type: String,
      enum: ["self", "partner", "parent", "grandparent", "child", "sibling", "other"],
      default: "other",
    },
    dateOfBirth: {
      type: Date,
    },
    notes: {
      type: String,
      trim: true,
    },
    avatarColor: {
      type: String,
      default: "#79b851",
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

module.exports = mongoose.model("FamilyMember", familyMemberSchema);