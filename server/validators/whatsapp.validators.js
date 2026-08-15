const AppError = require("../utils/AppError");
const { isValidE164, normalizePhoneNumber } = require("../utils/phone");

/**
 * Validates PUT /api/notifications/whatsapp/settings.
 * - phoneNumber: optional; must be E.164 when provided. Empty string clears it.
 * - whatsappRemindersEnabled: optional boolean (explicit opt-in).
 * At least one field is required.
 */
const validateWhatsAppSettings = (req, _res, next) => {
  const { phoneNumber, whatsappRemindersEnabled } = req.body || {};

  if (phoneNumber === undefined && whatsappRemindersEnabled === undefined) {
    return next(
      new AppError("Provide a phone number and/or a WhatsApp reminders preference.", 400)
    );
  }

  if (phoneNumber !== undefined && phoneNumber !== null) {
    if (typeof phoneNumber !== "string") {
      return next(new AppError("Phone number must be a string.", 400));
    }
    const normalized = normalizePhoneNumber(phoneNumber);
    if (normalized !== null && !isValidE164(normalized)) {
      return next(
        new AppError(
          "Phone number must be in international format, e.g. +15551234567 (E.164).",
          400
        )
      );
    }
    // "" (empty) normalizes to null -> explicit clear.
    req.body.phoneNumber = normalized;
  } else if (phoneNumber === null) {
    // Explicit null -> clear the stored number.
    req.body.phoneNumber = null;
  }
  // Undefined -> the field is not part of this update; never clear it.

  if (whatsappRemindersEnabled !== undefined && typeof whatsappRemindersEnabled !== "boolean") {
    return next(new AppError("whatsappRemindersEnabled must be a boolean.", 400));
  }

  next();
};

module.exports = { validateWhatsAppSettings };
