const mongoose = require("mongoose");
const FamilyMember = require("../models/FamilyMember");
const Medication = require("../models/Medication");
const MedicationLog = require("../models/MedicationLog");
const scheduleService = require("./schedule.service");
const medicationLogService = require("./medicationLog.service");
const AppError = require("../utils/AppError");

const AVATAR_COLORS = ["#79b851", "#f6c453", "#e88b9d", "#8b9de8", "#79b8a8", "#c79b56"];

const pickAvatarColor = (name) => {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
};

const RELATIONSHIP_LABELS = {
  self: "Me",
  partner: "Partner",
  parent: "Parent",
  grandparent: "Grandparent",
  child: "Child",
  sibling: "Sibling",
  other: "Family member",
};

const dayBounds = () => {
  const now = new Date();
  const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
  return { now, dayStart, dayEnd };
};

const serializeMember = (member, summary = null) => ({
  id: member._id.toString(),
  name: member.name,
  relationship: member.relationship,
  relationshipLabel: RELATIONSHIP_LABELS[member.relationship] || "Family member",
  dateOfBirth: member.dateOfBirth ? member.dateOfBirth.toISOString().slice(0, 10) : null,
  notes: member.notes || null,
  avatarColor: member.avatarColor,
  active: member.active,
  summary,
  createdAt: member.createdAt?.toISOString() || null,
});

/**
 * Computes a per-family-member summary from real data:
 * active medication count, today's scheduled/taken/missed doses,
 * adherence percentage (null when nothing is scheduled today) and next upcoming dose.
 */
const buildSummaries = async (userId, members) => {
  if (members.length === 0) return new Map();

  // Make sure dose logs exist for the current window so summaries always
  // reflect real schedules, even on a first visit.
  await scheduleService.materializeLogWindow(userId);

  const memberIds = members.map((member) => member._id);

  const [medications, todayLogs, upcomingLogs] = await Promise.all([
    Medication.find({ user: userId, active: true, familyMember: { $in: memberIds } }).lean(),
    MedicationLog.find({
      user: userId,
      familyMember: { $in: memberIds },
      scheduledFor: { $gte: dayBounds().dayStart, $lt: dayBounds().dayEnd },
    }).populate("medication", "name dosage dosageUnit form"),
    MedicationLog.find({
      user: userId,
      familyMember: { $in: memberIds },
      status: "upcoming",
      scheduledFor: { $gte: new Date() },
    })
      .sort({ scheduledFor: 1 })
      .limit(60)
      .populate("medication", "name dosage dosageUnit form")
      .populate("schedule", "time"),
  ]);

  const byMember = (key) => {
    const map = new Map();
    for (const item of key) {
      const id = item.familyMember.toString();
      if (!map.has(id)) map.set(id, []);
      map.get(id).push(item);
    }
    return map;
  };

  const medsByMember = byMember(medications);
  const logsByMember = byMember(todayLogs);
  const upcomingByMember = byMember(upcomingLogs);

  const summaries = new Map();
  for (const member of members) {
    const id = member._id.toString();
    const today = logsByMember.get(id) || [];
    const taken = today.filter((log) => log.status === "taken").length;
    const missed = today.filter((log) => log.status === "missed").length;
    const scheduled = today.length;
    const upcoming = upcomingByMember.get(id) || [];
    const upcomingDose = upcoming.length > 0 ? medicationLogService.serializeLog(upcoming[0]) : null;

    summaries.set(id, {
      activeMedicationCount: (medsByMember.get(id) || []).length,
      todayScheduledDoses: scheduled,
      takenToday: taken,
      missedToday: missed,
      adherencePct: scheduled > 0 ? Math.round((taken / scheduled) * 100) : null,
      upcomingDose,
    });
  }
  return summaries;
};

const listForUser = async (userId) => {
  const members = await FamilyMember.find({ user: userId, active: true }).sort({ createdAt: 1 });
  const summaries = await buildSummaries(userId, members);
  return members.map((member) => serializeMember(member, summaries.get(member._id.toString()) || null));
};

const getForUser = async (userId, memberId) => {
  if (!mongoose.isValidObjectId(memberId)) {
    throw new AppError("Family member not found.", 404);
  }
  const member = await FamilyMember.findOne({ _id: memberId, user: userId });
  if (!member) {
    throw new AppError("Family member not found.", 404);
  }
  const summaries = await buildSummaries(userId, [member]);
  return serializeMember(member, summaries.get(member._id.toString()) || null);
};

const createForUser = async (userId, input) => {
  const member = await FamilyMember.create({
    user: userId,
    avatarColor: pickAvatarColor(input.name),
    ...input,
  });
  return serializeMember(member, {
    activeMedicationCount: 0,
    todayScheduledDoses: 0,
    takenToday: 0,
    missedToday: 0,
    adherencePct: null,
    upcomingDose: null,
  });
};

const updateForUser = async (userId, memberId, input) => {
  const member = await FamilyMember.findOneAndUpdate(
    { _id: memberId, user: userId },
    { $set: input },
    { new: true, runValidators: true }
  );
  if (!member) {
    throw new AppError("Family member not found.", 404);
  }
  const summaries = await buildSummaries(userId, [member]);
  return serializeMember(member, summaries.get(member._id.toString()) || null);
};

const deleteForUser = async (userId, memberId) => {
  const member = await FamilyMember.findOne({ _id: memberId, user: userId });
  if (!member) {
    throw new AppError("Family member not found.", 404);
  }

  const medicationCount = await Medication.countDocuments({
    user: userId,
    familyMember: memberId,
  });
  if (medicationCount > 0) {
    throw new AppError(
      `This family member still has ${medicationCount} medication${
        medicationCount === 1 ? "" : "s"
      }. Reassign or delete those medications before removing them from Family Care.`,
      409
    );
  }

  await member.deleteOne();
};

/**
 * Dashboard overview: how many people are being cared for, the family's next
 * upcoming dose and today's aggregate adherence across all family members.
 */
const getFamilyOverview = async (userId) => {
  await scheduleService.materializeLogWindow(userId);

  const [memberCount, upcomingLogs, todayLogs] = await Promise.all([
    FamilyMember.countDocuments({ user: userId, active: true }),
    MedicationLog.find({
      user: userId,
      familyMember: { $ne: null },
      status: "upcoming",
      scheduledFor: { $gte: new Date() },
    })
      .sort({ scheduledFor: 1 })
      .limit(1)
      .populate("medication", "name dosage dosageUnit form")
      .populate("schedule", "time"),
    MedicationLog.find({
      user: userId,
      familyMember: { $ne: null },
      scheduledFor: { $gte: dayBounds().dayStart, $lt: dayBounds().dayEnd },
    }),
  ]);

  const takenToday = todayLogs.filter((log) => log.status === "taken").length;
  const missedToday = todayLogs.filter((log) => log.status === "missed").length;
  const scheduledToday = todayLogs.length;

  return {
    memberCount,
    upcomingDose: upcomingLogs.length > 0 ? medicationLogService.serializeLog(upcomingLogs[0]) : null,
    todayScheduledDoses: scheduledToday,
    takenToday,
    missedToday,
    adherencePct: scheduledToday > 0 ? Math.round((takenToday / scheduledToday) * 100) : null,
  };
};

module.exports = {
  createForUser,
  deleteForUser,
  getFamilyOverview,
  getForUser,
  listForUser,
  serializeMember,
  updateForUser,
};
