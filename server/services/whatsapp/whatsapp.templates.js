/**
 * WhatsApp message templates (Phase 7).
 *
 * All application values (names, medications, dosages, times) come from the
 * authenticated user's real database records — nothing is hardcoded. Static
 * wording lives here only.
 *
 * The Cloud API requires pre-approved templates for business-initiated
 * messages. Each builder returns the template parameters and a plain-text
 * fallback (used for simulation and previews, never for real sends).
 *
 * Template parameter contracts (create these templates in the WABA console
 * with matching placeholders — names are configurable via env):
 *
 *   medication_due_reminder     {{1}} first name, {{2}} subject, {{3}} time
 *   medication_missed_reminder  {{1}} first name, {{2}} subject, {{3}} time
 *   medication_taken_confirmation {{1}} first name, {{2}} subject
 *   medication_upcoming_reminder  {{1}} first name, {{2}} subject, {{3}} time
 *
 * `subject` is a privacy-conscious summary: for family medications it reads
 * like "Mom's Metformin (500 mg)" — never instructions, notes, or extra
 * medical details.
 */

const { NOTIFICATION_TYPES } = require("../../constants/notificationTypes");

// Deterministic 12-hour rendering ("8:30 AM") — locale-independent so template
// parameters are stable across servers.
const formatDoseTime = (schedule) => {
  const raw = schedule?.time;
  if (typeof raw !== "string" || !raw) return "";
  const [hours, minutes] = raw.split(":").map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return raw;
  const period = hours >= 12 ? "PM" : "AM";
  const hour12 = hours % 12 === 0 ? 12 : hours % 12;
  return `${hour12}:${String(minutes).padStart(2, "0")} ${period}`;
};

const firstOrFullName = (name) => {
  const trimmed = String(name || "").trim();
  if (!trimmed) return "";
  return trimmed.split(/\s+/)[0];
};

/**
 * "Mom's Metformin (500 mg)" for family medications, "your Metformin
 * (500 mg)" for the account owner's own medications.
 */
const buildSubject = (medication, familyMember) => {
  const name = String(medication?.name || "").trim() || "medication";
  const dosage = [medication?.dosage, medication?.dosageUnit].filter(Boolean).join(" ");
  const withDosage = dosage ? `${name} (${dosage})` : name;
  const memberName = familyMember?.name;
  if (memberName) {
    const memberFirst = firstOrFullName(memberName);
    return memberFirst ? `${memberFirst}'s ${withDosage}` : withDosage;
  }
  return `your ${withDosage}`;
};

const baseContext = ({ user, medication, schedule, familyMember }) => ({
  firstName: firstOrFullName(user?.name) || "there",
  subject: buildSubject(medication, familyMember),
  time: formatDoseTime(schedule),
});

const buildDueMessage = (context) => {
  const { firstName, subject, time } = baseContext(context);
  return {
    type: NOTIFICATION_TYPES.MEDICATION_DUE,
    parameters: [firstName, subject, time],
    fallbackBody: `Hi ${firstName} 👋\nIt's time for ${subject}${time ? `.\nScheduled for: ${time}` : "."}\n\nReply TAKEN once you've taken it.`,
  };
};

const buildMissedMessage = (context) => {
  const { firstName, subject, time } = baseContext(context);
  return {
    type: NOTIFICATION_TYPES.MEDICATION_MISSED,
    parameters: [firstName, subject, time],
    fallbackBody: `Hi ${firstName}, your ${subject} dose${time ? ` scheduled for ${time}` : ""} was marked as missed. Please catch up when possible.\n\nReply TAKEN once you've taken it.`,
  };
};

const buildTakenMessage = (context) => {
  const { firstName, subject } = baseContext(context);
  return {
    type: NOTIFICATION_TYPES.MEDICATION_TAKEN,
    parameters: [firstName, subject],
    fallbackBody: `Hi ${firstName}, your ${subject} dose was recorded as taken. ✅`,
  };
};

const buildReminderMessage = (context) => {
  const { firstName, subject, time } = baseContext(context);
  return {
    type: NOTIFICATION_TYPES.REMINDER,
    parameters: [firstName, subject, time],
    fallbackBody: `Hi ${firstName}, your ${subject} dose is coming up${time ? ` at ${time}` : ""}.`,
  };
};

/**
 * Greeting reply — friendly and data-aware. Includes the next upcoming dose so
 * the greeting is never generic.
 */
const buildGreeting = (user, nextDose) => {
  const firstName = firstOrFullName(user?.name) || "there";
  const lines = [`Hi ${firstName} 👋`];
  if (nextDose) {
    const subject = buildSubject(nextDose.medication, nextDose.familyMember);
    const time = formatDoseTime(nextDose.schedule);
    lines.push(`Your next dose is ${subject}${time ? ` at ${time}` : ""}.`);
  } else {
    lines.push("You have no upcoming doses scheduled right now.");
  }
  lines.push("Ask me \"What's my next dose?\", \"What have I taken today?\", or just reply TAKEN after a dose.");
  return lines.join("\n\n");
};

/**
 * Next-dose reply — the user's actual next upcoming dose from real records.
 */
const buildNextDose = (nextDose) => {
  if (!nextDose) {
    return "You don't have any upcoming doses scheduled. ❤️";
  }
  const subject = buildSubject(nextDose.medication, nextDose.familyMember);
  const time = formatDoseTime(nextDose.schedule);
  return `Your next dose is ${subject}${time ? ` at ${time}` : ""}. 💊`;
};

/**
 * Confirmation after a dose is marked taken via WhatsApp.
 */
const buildTakenConfirmation = (medication, familyMember) => {
  const subject = buildSubject(medication, familyMember);
  return `Done! ${subject} has been marked as taken. 💚`;
};

/**
 * Ambiguous TAKEN — multiple relevant doses; list them so the user can pick.
 */
const buildTakenAmbiguous = (candidates) => {
  const lines = ["Which dose did you take?"];
  candidates.forEach((candidate, index) => {
    const subject = buildSubject(candidate.medication, candidate.familyMember);
    const time = formatDoseTime(candidate.schedule);
    lines.push(`${index + 1}. ${subject}${time ? ` — ${time}` : ""}`);
  });
  lines.push('Reply "TAKEN <name>" to confirm the right one.');
  return lines.join("\n");
};

/**
 * Medication list — the user's active medications with dosage.
 */
const buildMedicationList = (medications) => {
  if (medications.length === 0) {
    return "You don't have any medications saved yet. Add one in the DoseNest app.";
  }
  const lines = ["Your current medications:"];
  medications.forEach((medication) => {
    const dosage = [medication.dosage, medication.dosageUnit].filter(Boolean).join(" ");
    const name = medication.name || "medication";
    lines.push(`• ${name}${dosage ? ` — ${dosage}` : ""}`);
  });
  return lines.join("\n");
};

/**
 * Today's doses — real dose records for today, with their current state.
 */
const buildTodayDoses = (entries) => {
  if (entries.length === 0) {
    return "You don't have any doses scheduled today. ❤️";
  }
  const lines = ["Your doses today:"];
  entries.forEach((entry) => {
    const subject = buildSubject(entry.medication, entry.familyMember);
    const time = formatDoseTime(entry.schedule);
    const state =
      entry.status === "taken"
        ? "taken ✓"
        : entry.status === "missed"
          ? "missed"
          : entry.status === "skipped"
            ? "skipped"
            : "upcoming";
    lines.push(`• ${subject}${time ? ` — ${time}` : ""} (${state})`);
  });
  return lines.join("\n");
};

/**
 * Help — concise list of supported commands.
 */
const buildHelp = () => {
  return [
    "You can ask me:",
    "• What's my next dose?",
    "• What medications am I taking?",
    "• What have I taken today?",
    "• TAKEN",
    "• TAKEN <medication name>",
    "",
    "Reply TAKEN after you've taken a dose to confirm it.",
  ].join("\n");
};

/**
 * Fallback for messages DoseNest doesn't understand — friendly, never silent.
 */
const buildUnknown = () => {
  return "I'm not sure what you mean. Try \"What's my next dose?\", \"What medications am I taking?\", or \"HELP\".";
};

/**
 * Message for the manual test endpoint. Real delivery requires an approved
 * template (business-initiated messages cannot be plain text), so it returns
 * both the template parameters ({{1}} first name) and a plain-text fallback
 * used only for simulation/preview. The template name is configurable via
 * WHATSAPP_TEMPLATE_TEST (default: dosenest_test_message).
 */
const buildTestMessage = (user) => {
  const firstName = firstOrFullName(user?.name) || "there";
  return {
    parameters: [firstName],
    body: `Hi ${firstName} 👋 This is a test message from DoseNest. Your WhatsApp reminders are working.`,
  };
};

module.exports = {
  buildDueMessage,
  buildGreeting,
  buildHelp,
  buildMedicationList,
  buildMissedMessage,
  buildNextDose,
  buildReminderMessage,
  buildSubject,
  buildTakenAmbiguous,
  buildTakenConfirmation,
  buildTakenMessage,
  buildTestMessage,
  buildTodayDoses,
  buildUnknown,
};
