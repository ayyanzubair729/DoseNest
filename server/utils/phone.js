/**
 * International phone number helpers. DoseNest works internationally, so no
 * country code is assumed — numbers must be supplied in E.164 format
 * (e.g. "+15551234567", "+923001234567").
 */

// E.164: a "+" followed by 1–15 digits (country code included). No spaces,
// dashes, or extension digits.
const E164_PATTERN = /^\+[1-9]\d{1,14}$/;

const isValidE164 = (value) =>
  typeof value === "string" && E164_PATTERN.test(value.trim());

/**
 * Normalizes a raw phone input into a trimmed E.164 string, or null when the
 * input is empty (used to clear the field). Returns null for clearly invalid
 * values too — callers should use isValidE164 to distinguish "cleared" from
 * "invalid".
 */
const normalizePhoneNumber = (value) => {
  if (value === undefined || value === null) return null;
  const trimmed = String(value).trim();
  return trimmed.length > 0 ? trimmed : null;
};

module.exports = { E164_PATTERN, isValidE164, normalizePhoneNumber };
