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
  buildMissedMessage,
  buildReminderMessage,
  buildSubject,
  buildTakenMessage,
  buildTestMessage,
};
