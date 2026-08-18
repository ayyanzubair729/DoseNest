/**
 * WhatsApp conversation service — intent routing + dose confirmation logic.
 *
 * Architecture:
 *
 *   incoming message
 *   ↓
 *   normalize text
 *   ↓
 *   identify intent
 *   ↓
 *   route to DoseNest service (Medication / MedicationLog / schedule)
 *   ↓
 *   generate response (whatsapp.templates.js)
 *   ↓
 *   webhook handler sends it via whatsapp.service.js
 *
 * Everything is scoped to the linked, opted-in DoseNest user resolved from the
 * Meta sender phone number. Medication/medicationName values in a message are
 * resolved against the user's OWN records only — never from a body-supplied id.
 *
 * Supported intents:
 *   - greeting
 *   - next dose
 *   - taken (plain)
 *   - taken <medication name>
 *   - medication list
 *   - today's doses
 *   - help
 *   - unknown
 *
 * This is NOT an AI chatbot. It routes to the real reminder/dose records.
 */

const Medication = require("../../models/Medication");
const MedicationLog = require("../../models/MedicationLog");
const MedicationSchedule = require("../../models/MedicationSchedule");
const { localTimeToUtc, normalizeZone, utcToLocalParts } = require("../../utils/timezone");
const templates = require("./whatsapp.templates");

// ---------------------------------------------------------------------------
// Intent detection (order matters: specific before general).
// ---------------------------------------------------------------------------

const GREETING_RE = /^(?:hi|hello|hey|salam|assalam|good\s+(?:morning|afternoon|evening))\b/i;
const NEXT_DOSE_RE =
  /what'?s?\s+my\s+next\s+dose|what\s+is\s+my\s+next\s+dose|next\s+dose|what\s+do\s+i\s+take\s+next|when'?s?\s+my\s+next\s+dose/i;
const TODAY_DOSES_RE =
  /what\s+(?:have\s+i\s+)?taken\s+today|what\s+are\s+my\s+doses\s+today|today'?s?\s+doses|what\s+do\s+i\s+take\s+today|what'?s?\s+my\s+schedule\s+today|doses\s+today/i;
const MED_LIST_RE =
  /what\s+medications?\s+am\s+i\s+taking|what\s+am\s+i\s+taking|my\s+medications?|list\s+(?:my\s+)?medications?|what\s+medications?\s+do\s+i\s+take/i;
const HELP_RE = /^(?:help|commands?|what\s+can\s+i\s+ask|what\s+can\s+you\s+do)\b/i;
const TAKEN_SPECIFIC_RE = /^(?:taken|i\s+took|i'?ve\s+taken|i\s+have\s+taken)\s+(.+)$/i;
const TAKEN_PLAIN_RE =
  /^(?:taken|yes|done|yep|i\s+took\s+it|i'?ve\s+taken\s+it|i\s+have\s+taken\s+it|i\s+took\s+it\s+just\s+now)\s*$/i;

const classifyIntent = (text) => {
  if (HELP_RE.test(text)) return "help";
  if (NEXT_DOSE_RE.test(text)) return "next-dose";
  if (TODAY_DOSES_RE.test(text)) return "today-doses";
  if (MED_LIST_RE.test(text)) return "medication-list";
  const specific = text.match(TAKEN_SPECIFIC_RE);
  if (specific && specific[1].toLowerCase() !== "it") {
    return { intent: "taken-medication", medicationName: specific[1].trim() };
  }
  if (TAKEN_PLAIN_RE.test(text)) return "taken";
  if (GREETING_RE.test(text)) return "greeting";
  return "unknown";
};

// ---------------------------------------------------------------------------
// Data access — always scoped to the linked user's own records.
// ---------------------------------------------------------------------------

/**
 * The user's currently active schedules (their reminders), as ObjectIds. Logs
 * whose schedule reference was deleted (orphans/skipped) are excluded so dev
 * duplicates never surface in a real conversation.
 */
const getActiveScheduleIds = async (userId) => {
  const schedules = await MedicationSchedule.find({ user: userId, active: true }).select("_id").lean();
  return schedules.map((schedule) => schedule._id);
};

/**
 * Local calendar day boundaries (UTC instants) for `date` in `zone`.
 * `start` is 00:00 local; `end` is 00:00 of the following local day, so a
 * "today" range is `scheduledFor >= start && scheduledFor < end`.
 */
const getDayBoundariesUtc = (date, zone) => {
  const local = utcToLocalParts(date, zone);
  const start = localTimeToUtc(local.year, local.month, local.day, 0, 0, zone);
  const end = localTimeToUtc(local.year, local.month, local.day + 1, 0, 0, zone);
  return { start, end };
};

const pad2 = (n) => String(n).padStart(2, "0");

/**
 * True when a log is a CURRENT occurrence of its schedule: the log's own
 * wall-clock time (in the schedule's timezone) equals the schedule's present
 * `time`. Stale logs left behind by a previous schedule.time edit (same
 * schedule id, old hour) are excluded so a schedule never double-counts.
 */
const isCurrentOccurrence = (log) => {
  const schedule = log.schedule;
  if (!schedule || !schedule.time) return false; // detached/skipped logs never count
  const zone = normalizeZone(schedule.timezone || "UTC");
  const local = utcToLocalParts(log.scheduledFor, zone);
  return `${pad2(local.hour)}:${pad2(local.minute)}` === schedule.time;
};

/**
 * Next upcoming dose from real logs (only active schedules, status upcoming,
 * matching the schedule's current time).
 */
const findNextDose = async (userId, scheduleIds) => {
  const log = await MedicationLog.findOne({
    user: userId,
    schedule: { $in: scheduleIds },
    status: "upcoming",
    scheduledFor: { $gte: new Date() },
  })
    .sort({ scheduledFor: 1 })
    .populate("medication", "name dosage dosageUnit form")
    .populate("schedule", "time timezone")
    .populate("familyMember", "name");
  if (log && !isCurrentOccurrence(log)) {
    // The next matching occurrence could be later today or another day; find
    // the earliest current occurrence rather than skipping ahead blindly.
    const candidates = await MedicationLog.find({
      user: userId,
      schedule: { $in: scheduleIds },
      status: "upcoming",
      scheduledFor: { $gte: new Date() },
    })
      .sort({ scheduledFor: 1 })
      .populate("medication", "name dosage dosageUnit form")
      .populate("schedule", "time timezone")
      .populate("familyMember", "name");
    return candidates.find(isCurrentOccurrence) || null;
  }
  return log;
};

/**
 * Actionable candidates for a TAKEN confirmation: current-occurrence doses
 * from the user's active schedules that are due or recently due today (status
 * upcoming or missed). Uses the user's timezone for "start of today"; dedupes
 * by (medication, scheduledFor) so schedule-recreation duplicates never
 * produce fake ambiguity.
 */
const findTakenCandidates = async (userId, scheduleIds, userTimezone) => {
  const zone = normalizeZone(userTimezone || "UTC");
  const now = new Date();
  const { start } = getDayBoundariesUtc(now, zone);

  const logs = await MedicationLog.find({
    user: userId,
    schedule: { $in: scheduleIds },
    status: { $in: ["upcoming", "missed"] },
    scheduledFor: { $gte: start, $lte: now },
  })
    .sort({ scheduledFor: 1 })
    .populate("medication", "name dosage dosageUnit form")
    .populate("schedule", "time timezone")
    .populate("familyMember", "name");

  // Dedupe by (medication, scheduledFor) — keep the first occurrence.
  const seen = new Set();
  const deduped = [];
  for (const log of logs) {
    if (!isCurrentOccurrence(log)) continue;
    const medId = (log.medication?._id || log.medication)?.toString?.();
    const key = `${medId}:${new Date(log.scheduledFor).getTime()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(log);
  }
  return deduped;
};

// ---------------------------------------------------------------------------
// Intent handlers
// ---------------------------------------------------------------------------

const handleGreeting = async (userId, scheduleIds, user) => {
  const nextDose = await findNextDose(userId, scheduleIds);
  return templates.buildGreeting(user, nextDose);
};

const handleNextDose = async (userId, scheduleIds) => {
  const nextDose = await findNextDose(userId, scheduleIds);
  return templates.buildNextDose(nextDose);
};

/**
 * Resolve a medication by name against the user's own active medications.
 * Case-insensitive; supports prefix matching; returns an array of matches.
 */
const findMedicationsByName = async (userId, name) => {
  const term = String(name || "").toLowerCase().trim();
  if (!term) return [];
  const medications = await Medication.find({ user: userId, active: true }).lean();
  return medications.filter((medication) => {
    const medName = String(medication.name || "").toLowerCase();
    return medName === term || medName.startsWith(term);
  });
};

/**
 * TAKEN <name>: resolve the medication, verify ownership, then confirm the
 * single most relevant dose for it. If the name is ambiguous (multiple meds)
 * or the dose is ambiguous (multiple times today), ask for clarification.
 */
const handleTakenMedication = async (userId, scheduleIds, userTimezone, medicationName) => {
  const matches = await findMedicationsByName(userId, medicationName);
  if (matches.length === 0) {
    return `I couldn't find a medication named "${medicationName}". Check the name in your DoseNest app or send "What medications am I taking?"`;
  }
  if (matches.length > 1) {
    const names = matches.map((m) => `• ${m.name}`).join("\n");
    return `Which medication did you mean?\n${names}`;
  }

  const medication = matches[0];
  const candidates = await findTakenCandidates(userId, scheduleIds, userTimezone);
  const forMed = candidates.filter(
    (log) => (log.medication?._id || log.medication)?.toString?.() === medication._id.toString()
  );

  if (forMed.length === 0) {
    return `I couldn't find a recent dose of ${medication.name} to confirm. Check your reminders in the DoseNest app. 💛`;
  }
  if (forMed.length > 1) {
    return templates.buildTakenAmbiguous(forMed);
  }
  return { reply: templates.buildTakenConfirmation(forMed[0].medication, forMed[0].familyMember), log: forMed[0] };
};

/**
 * Plain TAKEN: confirm the single most relevant dose. If multiple doses are
 * due/recent today, list them for clarification instead of guessing.
 */
const handleTaken = async (userId, scheduleIds, userTimezone) => {
  const candidates = await findTakenCandidates(userId, scheduleIds, userTimezone);
  if (candidates.length === 0) {
    return "I couldn't find a recent dose to confirm. Check your reminders in the app. 💛";
  }
  if (candidates.length > 1) {
    return templates.buildTakenAmbiguous(candidates);
  }
  const log = candidates[0];
  return { reply: templates.buildTakenConfirmation(log.medication, log.familyMember), log };
};

const handleMedicationList = async (userId) => {
  const medications = await Medication.find({ user: userId, active: true })
    .sort({ name: 1 })
    .lean();
  return templates.buildMedicationList(medications);
};

const handleTodayDoses = async (userId, scheduleIds, userTimezone) => {
  const zone = normalizeZone(userTimezone || "UTC");
  const { start, end } = getDayBoundariesUtc(new Date(), zone);

  const logs = await MedicationLog.find({
    user: userId,
    schedule: { $in: scheduleIds },
    scheduledFor: { $gte: start, $lt: end },
  })
    .sort({ scheduledFor: 1 })
    .populate("medication", "name dosage dosageUnit form")
    .populate("schedule", "time timezone")
    .populate("familyMember", "name");
  return templates.buildTodayDoses(logs.filter(isCurrentOccurrence));
};

/**
 * Entry point. Returns the reply string (and, for TAKEN confirmations, the log
 * that should be marked taken). The webhook handler is responsible for
 * actually persisting the "taken" state and sending the reply.
 */
const handleTextMessage = async ({ user, text }) => {
  const normalized = String(text || "").trim().replace(/\s+/g, " ");
  const intent = classifyIntent(normalized);
  const userId = user._id.toString();
  const scheduleIds = await getActiveScheduleIds(userId);
  const userTimezone = user.timezone;

  let reply;
  let logToConfirm = null;

  if (intent === "greeting") {
    reply = await handleGreeting(userId, scheduleIds, user);
  } else if (intent === "next-dose") {
    reply = await handleNextDose(userId, scheduleIds);
  } else if (intent === "today-doses") {
    reply = await handleTodayDoses(userId, scheduleIds, userTimezone);
  } else if (intent === "medication-list") {
    reply = await handleMedicationList(userId);
  } else if (intent === "help") {
    reply = templates.buildHelp();
  } else if (intent === "taken") {
    const outcome = await handleTaken(userId, scheduleIds, userTimezone);
    if (typeof outcome === "string") reply = outcome;
    else {
      reply = outcome.reply;
      logToConfirm = outcome.log;
    }
  } else if (intent?.intent === "taken-medication") {
    const outcome = await handleTakenMedication(
      userId,
      scheduleIds,
      userTimezone,
      intent.medicationName
    );
    if (typeof outcome === "string") reply = outcome;
    else {
      reply = outcome.reply;
      logToConfirm = outcome.log;
    }
  } else {
    reply = templates.buildUnknown();
  }

  return { intent: typeof intent === "object" ? intent.intent : intent, reply, logToConfirm };
};

module.exports = { classifyIntent, handleTextMessage };