/**
 * Centralized notification types. Never scatter raw strings across the
 * codebase — always reference these constants.
 */
const NOTIFICATION_TYPES = {
  MEDICATION_DUE: "medication_due",
  MEDICATION_TAKEN: "medication_taken",
  MEDICATION_MISSED: "medication_missed",
  REMINDER: "reminder",
  ADHERENCE: "adherence",
  SYSTEM: "system",
};

const NOTIFICATION_TYPE_LIST = Object.values(NOTIFICATION_TYPES);

const NOTIFICATION_TYPE_LABELS = {
  [NOTIFICATION_TYPES.MEDICATION_DUE]: "Medication due",
  [NOTIFICATION_TYPES.MEDICATION_TAKEN]: "Dose taken",
  [NOTIFICATION_TYPES.MEDICATION_MISSED]: "Dose missed",
  [NOTIFICATION_TYPES.REMINDER]: "Reminder",
  [NOTIFICATION_TYPES.ADHERENCE]: "Adherence",
  [NOTIFICATION_TYPES.SYSTEM]: "System",
};

module.exports = {
  NOTIFICATION_TYPES,
  NOTIFICATION_TYPE_LIST,
  NOTIFICATION_TYPE_LABELS,
};
