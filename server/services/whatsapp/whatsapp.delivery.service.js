/**
 * WhatsApp delivery pipeline (Phase 7).
 *
 * The existing Phase 6 notification engine stays the source of truth. When a
 * notification is created, this service decides whether WhatsApp delivery
 * applies, resolves the recipient (the authenticated account owner — never an
 * arbitrary number), sends through whatsapp.service.js, and records the
 * result on the Notification record.
 *
 *   Reminder Engine → Notification → WhatsApp delivery service → WhatsApp
 *   service → Cloud API
 *
 * Idempotency: the unique (user, medication, schedule, scheduledFor, type)
 * index already guarantees one notification per dose occurrence. Delivery adds
 * a compare-and-set claim so a notification can only ever be sent once, even
 * across job restarts or concurrent runs.
 */

const User = require("../../models/User");
const Notification = require("../../models/Notification");
const AppError = require("../../utils/AppError");
const { isValidE164, normalizePhoneNumber } = require("../../utils/phone");
const { NOTIFICATION_TYPES } = require("../../constants/notificationTypes");
const { getConfig, getConnectionStatus, isConfigured } = require("./whatsapp.config");
const { sendWhatsAppMessage } = require("./whatsapp.service");
const templates = require("./whatsapp.templates");

// Only these reminder types are deliverable over WhatsApp. Adherence/system
// notices stay in-app.
const DELIVERABLE_TYPES = new Set([
  NOTIFICATION_TYPES.MEDICATION_DUE,
  NOTIFICATION_TYPES.MEDICATION_MISSED,
  NOTIFICATION_TYPES.MEDICATION_TAKEN,
  NOTIFICATION_TYPES.REMINDER,
]);

// Not serialized to clients — backend-only detail.
const templateNameForType = (config, type) => {
  switch (type) {
    case NOTIFICATION_TYPES.MEDICATION_DUE:
      return config.templates.medicationDue;
    case NOTIFICATION_TYPES.MEDICATION_MISSED:
      return config.templates.medicationMissed;
    case NOTIFICATION_TYPES.MEDICATION_TAKEN:
      return config.templates.medicationTaken;
    case NOTIFICATION_TYPES.REMINDER:
      return config.templates.reminder;
    default:
      return null;
  }
};

const builderForType = (type) => {
  switch (type) {
    case NOTIFICATION_TYPES.MEDICATION_DUE:
      return templates.buildDueMessage;
    case NOTIFICATION_TYPES.MEDICATION_MISSED:
      return templates.buildMissedMessage;
    case NOTIFICATION_TYPES.MEDICATION_TAKEN:
      return templates.buildTakenMessage;
    case NOTIFICATION_TYPES.REMINDER:
      return templates.buildReminderMessage;
    default:
      return null;
  }
};

// Friendly, secret-free reasons stored on the notification when delivery
// fails so the UI can show a human-readable state.
const friendlyDeliveryError = (result) => {
  if (result?.permanent) {
    return "WhatsApp delivery was rejected by the provider. Check the server configuration.";
  }
  return `WhatsApp delivery failed after ${result?.attempts || 1} attempt(s). The provider may be temporarily unavailable.`;
};

/**
 * Attempts WhatsApp delivery for a freshly created notification. Safe to call
 * unconditionally: it no-ops when WhatsApp is disabled, the type is not
 * deliverable, the user hasn't opted in, the phone number is missing/invalid,
 * or the notification was already delivered.
 *
 * Never throws — a delivery hiccup must not break the reminder job or the
 * request that created the notification.
 */
const deliverForNotification = async (notification) => {
  const notificationId = notification?._id?.toString?.() || notification?.toString?.();
  const config = getConfig();

  const logSkip = (reason) => {
    console.log(`[whatsapp] skipped notificationId=${notificationId} reason=${reason}`);
    return { skipped: true, reason };
  };

  try {
    if (!notification || typeof notification === "string") {
      return logSkip("missing-notification");
    }

    // 1. Only reminder-type notifications are deliverable.
    if (!DELIVERABLE_TYPES.has(notification.type)) {
      return logSkip("type-not-deliverable");
    }

    // 2. Master switch — REAL provider traffic requires the switch to be on.
    //    In test mode the pipeline still runs but every send is simulated
    //    locally (no provider contact), so simulation works with the safe
    //    development config WHATSAPP_ENABLED=false + WHATSAPP_TEST_MODE=true.
    if (!config.enabled && !config.testMode) {
      return logSkip("whatsapp-disabled");
    }

    // 3. Without credentials (and outside test mode) there is nothing to send.
    if (!config.testMode && !isConfigured(config)) {
      return logSkip("not-configured");
    }

    // 4. Recipient + consent: the authenticated account owner's own number,
    //    and only when they explicitly opted in. Family medications are
    //    delivered to the owner too — never to an arbitrary family member.
    const user = await User.findById(notification.user).select(
      "name phoneNumber notificationPreferences"
    );
    if (!user || !user.phoneNumber || !isValidE164(user.phoneNumber)) {
      return logSkip("no-valid-recipient");
    }
    if (user.notificationPreferences?.whatsapp !== true) {
      return logSkip("not-opted-in");
    }

    // 5. Idempotency: claim the notification atomically. Only one caller can
    //    win the claim; already-sent notifications are skipped.
    const claim = await Notification.findOneAndUpdate(
      {
        _id: notification._id,
        status: { $nin: ["sent", "delivered"] },
      },
      {
        $set: { deliveryAttemptedAt: new Date() },
        $inc: { attempts: 1 },
      },
      { new: true }
    );
    if (!claim) {
      return logSkip("already-delivered");
    }

    // 6. Rebuild the message from REAL records (the notification only stores
    //    ids; the user/medication/schedule rows are the source of truth).
    const populated = await Notification.findById(notification._id)
      .populate("medication", "name dosage dosageUnit form")
      .populate("schedule", "time")
      .populate("familyMember", "name");
    if (!populated) {
      return { skipped: true, reason: "missing-notification" };
    }

    const builder = builderForType(notification.type);
    const message = builder({
      user,
      medication: populated.medication,
      schedule: populated.schedule,
      familyMember: populated.familyMember,
    });
    const templateName = templateNameForType(config, notification.type);

    const result = await sendWhatsAppMessage({
      recipient: user.phoneNumber,
      template: {
        name: templateName,
        parameters: message.parameters,
      },
      body: message.fallbackBody,
    });

    // 7. Record the delivery outcome on the notification (source record).
    const patch = {
      deliveryChannel: "whatsapp",
      attempts: result.attempts,
    };
    if (result.ok) {
      patch.status = "sent";
      patch.sentAt = new Date();
      patch.simulated = Boolean(result.simulated);
      patch.deliveryError = null;
      if (result.providerMessageId) patch.providerMessageId = result.providerMessageId;
    } else {
      patch.status = "failed";
      patch.deliveryError = friendlyDeliveryError(result);
    }
    await Notification.updateOne({ _id: notification._id }, { $set: patch });

    if (result.ok) {
      console.log(
        `[whatsapp] delivered notificationId=${notificationId} userId=${user._id}` +
          ` simulated=${Boolean(result.simulated)}` +
          ` providerMessageId=${result.providerMessageId || "none"}`
      );
    } else {
      console.error(
        `[whatsapp] failed notificationId=${notificationId} userId=${user._id}` +
          ` attempts=${result.attempts} error=${result.error}`
      );
    }

    return { delivered: true, simulated: Boolean(result.simulated) };
  } catch (err) {
    // Never propagate: record the failure and move on.
    console.error(
      `[whatsapp] delivery error notificationId=${notificationId} message=${err.message}`
    );
    try {
      await Notification.updateOne(
        { _id: notification._id },
        { $set: { status: "failed", deliveryError: "WhatsApp delivery failed unexpectedly.", deliveryChannel: "whatsapp" } }
      );
    } catch {
      // Best effort only.
    }
    return { delivered: false, error: err.message };
  }
};

/**
 * Safe status for the authenticated user (no secrets). The user's own phone
 * number is included so the settings UI can show what's configured.
 */
const getStatusForUser = async (user) => {
  const status = getConnectionStatusSafe(getConfig());
  return {
    ...status,
    optIn: user.notificationPreferences?.whatsapp === true,
    phoneNumber: user.phoneNumber || null,
    hasPhoneNumber: Boolean(user.phoneNumber && isValidE164(user.phoneNumber)),
  };
};

const getConnectionStatusSafe = (config = getConfig()) => {
  const { configured, enabled, testMode, apiVersion, templateLanguage } = getConnectionStatus(config);
  return {
    configured: Boolean(configured),
    enabled: Boolean(enabled),
    testMode: Boolean(testMode),
    apiVersion,
    templateLanguage,
    usable: Boolean(configured && enabled),
  };
};

/**
 * Updates the authenticated user's WhatsApp settings (phone number + opt-in).
 * Returns the updated user document.
 */
const updateSettingsForUser = async (userId, { phoneNumber, whatsappRemindersEnabled }) => {
  const user = await User.findById(userId);
  if (!user) throw new AppError("User not found.", 404);

  if (phoneNumber !== undefined) {
    const normalized = normalizePhoneNumber(phoneNumber);
    if (normalized !== null && !isValidE164(normalized)) {
      throw new AppError(
        "Phone number must be in international format, e.g. +15551234567 (E.164).",
        400
      );
    }
    user.phoneNumber = normalized;
  }

  // Explicit consent rule (Phase 8A): enabling WhatsApp reminders requires a
  // valid E.164 phone number on the account — a phone number alone is never
  // treated as consent, and consent is never stored without one.
  if (whatsappRemindersEnabled !== undefined) {
    if (whatsappRemindersEnabled) {
      const phone = user.phoneNumber || null;
      if (!phone || !isValidE164(phone)) {
        throw new AppError(
          "Please enter a valid international phone number before enabling WhatsApp reminders.",
          400
        );
      }
    }
    user.notificationPreferences = {
      ...(user.notificationPreferences || {}),
      whatsapp: Boolean(whatsappRemindersEnabled),
    };
  }

  await user.save();
  return user;
};

/**
 * Sends a test WhatsApp message to the authenticated user's own number.
 * Never accepts a recipient from the request.
 */
const sendTestMessageForUser = async (user) => {
  const config = getConfig();

  if (!user.phoneNumber || !isValidE164(user.phoneNumber)) {
    throw new AppError("Add your WhatsApp phone number in Settings first.", 400);
  }
  if (!config.enabled && !config.testMode) {
    throw new AppError("WhatsApp is disabled on the server.", 400);
  }
  if (!config.testMode && !isConfigured(config)) {
    throw new AppError("WhatsApp is not configured on the server.", 400);
  }

  const message = templates.buildTestMessage(user);
  const result = await sendWhatsAppMessage({
    recipient: user.phoneNumber,
    // Real delivery requires an approved template for business-initiated
    // messages — plain text would be rejected by Meta. In test mode the send
    // is simulated, so the template name is irrelevant there.
    ...(config.testMode
      ? { body: message.body }
      : { template: { name: config.templates.test, parameters: message.parameters } }),
  });

  if (!result.ok) {
    throw new AppError(
      result.permanent
        ? "WhatsApp rejected the test message. Check the server configuration."
        : "Could not send the test message. The WhatsApp provider may be temporarily unavailable.",
      502
    );
  }

  return {
    status: "sent",
    simulated: Boolean(result.simulated),
    providerMessageId: result.providerMessageId || null,
  };
};

module.exports = {
  deliverForNotification,
  getConnectionStatusSafe,
  getStatusForUser,
  sendTestMessageForUser,
  updateSettingsForUser,
};
