/* global Buffer */

/**
 * Phase 8 — WhatsApp webhook processing.
 *
 * Two responsibilities, both driven by Meta Cloud API events:
 *
 *  1. Delivery status updates (sent/delivered/read/failed) matched to the
 *     existing Notification via providerMessageId — the Notification record
 *     from Phase 7 is updated in place, never recreated.
 *  2. Incoming text messages, routed through whatsapp.conversation.service.js.
 *     The conversation service identifies the intent (greeting, next dose,
 *     TAKEN, TAKEN <name>, medication list, today's doses, help, unknown),
 *     resolves data against the user's OWN records, and returns the reply
 *     (and, for TAKEN, the MedicationLog to mark taken). The confirmation
 *     reply reuses whatsapp.service.js. This is rule-based routing to real
 *     reminder/dose records — NOT an AI chatbot.
 *
 * Security:
 *  - The sender is resolved ONLY through the verified WhatsApp phone number
 *    linked to a DoseNest account. userId/notificationId/medicationId values
 *    in a webhook body are never trusted.
 *  - No medication data is modified unless the user has opted in.
 *  - Unknown senders are logged with a masked number and nothing is changed
 *    or revealed.
 *  - Logs contain event/message ids and masked numbers only.
 */

const crypto = require("crypto");
const User = require("../../models/User");
const Notification = require("../../models/Notification");
const MedicationLog = require("../../models/MedicationLog");
const WhatsAppEvent = require("../../models/WhatsAppEvent");
const AppError = require("../../utils/AppError");
const { isValidE164 } = require("../../utils/phone");
const { NOTIFICATION_TYPES } = require("../../constants/notificationTypes");
const { getConfig } = require("./whatsapp.config");
const { sendWhatsAppMessage } = require("./whatsapp.service");
const notificationService = require("../notification.service");
const conversationService = require("./whatsapp.conversation.service");

// Logging-only mask: "+15551234567" -> "+1555*****567".
const maskPhone = (value) => {
  const text = String(value || "");
  if (text.length < 6) return "***";
  return `${text.slice(0, 5)}${"*".repeat(Math.max(0, text.length - 8))}${text.slice(-3)}`;
};

const logInfo = (message, fields = {}) => {
  const line = Object.entries(fields)
    .map(([key, value]) => `${key}=${value}`)
    .join(" ");
  console.log(`[whatsapp-webhook] ${message}${line ? ` ${line}` : ""}`);
};

const logWarn = (message, fields = {}) => {
  const line = Object.entries(fields)
    .map(([key, value]) => `${key}=${value}`)
    .join(" ");
  console.warn(`[whatsapp-webhook] ${message}${line ? ` ${line}` : ""}`);
};

/**
 * GET subscription handshake (Meta Cloud API). Returns the challenge string
 * when the mode is "subscribe" and the verify token matches the configured
 * WHATSAPP_WEBHOOK_VERIFY_TOKEN; otherwise null (caller responds 403).
 */
const verifyWebhook = ({ mode, verifyToken, challenge }) => {
  const config = getConfig();
  if (
    mode === "subscribe" &&
    verifyToken &&
    config.webhookVerifyToken &&
    verifyToken === config.webhookVerifyToken &&
    challenge
  ) {
    return challenge;
  }
  return null;
};

/**
 * Verifies the X-Hub-Signature-256 header over the RAW request body using
 * WHATSAPP_APP_SECRET (if configured). When no app secret is set the check is
 * skipped so local development works without Meta — enable the secret in
 * production to require authentic Meta payloads.
 */
const verifySignature = (headers, rawBody) => {
  const config = getConfig();
  if (!config.appSecret) {
    logWarn("signature verification disabled (WHATSAPP_APP_SECRET not set)");
    return true;
  }
  const signature = headers["x-hub-signature-256"];
  if (!signature) return false;
  const expected = `sha256=${crypto
    .createHmac("sha256", config.appSecret)
    .update(rawBody)
    .digest("hex")}`;
  const received = Buffer.from(signature);
  const wanted = Buffer.from(expected);
  return received.length === wanted.length && crypto.timingSafeEqual(received, wanted);
};

/**
 * Claims a webhook event for idempotency. Returns true when this event has
 * not been processed yet, false when it is a duplicate. Fail-open on storage
 * errors (the MedicationLog guards still prevent duplicates).
 */
const claimEvent = async (eventId, kind) => {
  try {
    await WhatsAppEvent.create({ eventId, kind });
    return true;
  } catch (err) {
    if (err.code === 11000) return false;
    logWarn("event store unavailable — continuing without dedup", { eventId });
    return true;
  }
};

// Meta sends sender numbers without the leading "+".
const normalizeSender = (raw) => {
  if (!raw) return null;
  const value = String(raw).trim();
  const withPlus = value.startsWith("+") ? value : `+${value}`;
  return isValidE164(withPlus) ? withPlus : null;
};

/**
 * Delivery status event: id -> providerMessageId on the Notification.
 * Updates the existing record in place (status/deliveredAt/readAt/error).
 */
const handleDeliveryStatus = async (status) => {
  const messageId = status?.id;
  const statusName = status?.status; // sent | delivered | read | failed
  if (!messageId || !["sent", "delivered", "read", "failed"].includes(statusName)) {
    return { result: "ignored", reason: "unrecognized-status" };
  }

  const eventId = `status:${messageId}:${statusName}`;
  const claimed = await claimEvent(eventId, "status");
  if (!claimed) return { result: "duplicate", reason: "already-processed" };

  const notification = await Notification.findOne({ providerMessageId: messageId });
  if (!notification) {
    logInfo("status event for unknown message", { messageId, status: statusName });
    return { result: "ignored", reason: "unknown-message" };
  }

  // "sent" is already recorded at send time; delivered/read/failed advance it.
  const patch = {};
  if (statusName === "delivered") {
    patch.status = "delivered";
    patch.deliveredAt = new Date();
    patch.deliveryError = null;
  } else if (statusName === "read") {
    patch.status = "read";
    patch.readAt = new Date();
    patch.read = true;
  } else if (statusName === "failed") {
    patch.status = "failed";
    patch.deliveryError =
      status.errors?.[0]?.title || "WhatsApp delivery was reported as failed by the provider.";
  }

  if (Object.keys(patch).length > 0) {
    await Notification.updateOne({ _id: notification._id }, { $set: patch });
  }
  logInfo("status processed", {
    messageId,
    status: statusName,
    notificationId: notification._id.toString(),
    userId: notification.user.toString(),
  });
  return { result: "processed", reason: statusName };
};

/**
 * Confirmation reply to the user's own number (user-initiated, so a plain
 * text message is allowed by the Cloud API). Fire-and-forget so the webhook
 * response is never blocked by provider retries.
 */
const replyText = (user, body) => {
  sendWhatsAppMessage({ recipient: user.phoneNumber, body })
    .then((result) => {
      if (result.ok) {
        logInfo("confirmation reply sent", {
          userId: user._id.toString(),
          simulated: Boolean(result.simulated),
          providerMessageId: result.providerMessageId || "none",
        });
      } else {
        logWarn("confirmation reply failed", {
          userId: user._id.toString(),
          error: result.error,
        });
      }
    })
    .catch((err) => {
      logWarn("confirmation reply error", { userId: user._id.toString(), error: err.message });
    });
};

/**
 * Marks the eligible dose as taken. Atomic guarded update — if the log was
 * already taken (or marked missed/skipped by a race), nothing changes and no
 * confirmation is sent. The MedicationLog stays the source of truth; the
 * in-app MEDICATION_TAKEN notification is created for history only (deliver
 * is false — the WhatsApp reply above is the confirmation ack).
 */
const markDoseTaken = async (userId, log) => {
  const result = await MedicationLog.updateOne(
    { _id: log._id, status: { $in: ["upcoming", "missed"] } },
    { $set: { status: "taken", takenAt: new Date(), takenSource: "whatsapp" } }
  );
  if (result.modifiedCount === 0) {
    logInfo("dose already taken — no change", {
      userId,
      medicationLogId: log._id.toString(),
    });
    return false;
  }

  try {
    await notificationService.createForDose(
      userId,
      {
        type: NOTIFICATION_TYPES.MEDICATION_TAKEN,
        medication: log.medication,
        schedule: log.schedule,
        medicationLog: log,
        familyMember: log.familyMember,
        scheduledFor: log.scheduledFor,
      },
      { deliver: false }
    );
  } catch (err) {
    // Non-fatal: the log state is persisted; only the history entry failed.
    logWarn("could not create taken notification", { userId, error: err.message });
  }

  logInfo("dose marked taken via WhatsApp", {
    userId,
    medicationLogId: log._id.toString(),
    medicationId: (log.medication?._id || log.medication)?.toString?.(),
  });
  return true;
};

/**
 * Incoming message: resolves the sender through their registered phone
 * number, honors opt-in, and routes the message through the conversation
 * service. Idempotency is preserved: every event id is claimed exactly once.
 */
const handleIncomingMessage = async (message) => {
  const messageId = message?.id;
  if (!messageId) return { result: "ignored", reason: "no-message-id" };

  const eventId = `message:${messageId}`;
  const claimed = await claimEvent(eventId, "message");
  if (!claimed) return { result: "duplicate", reason: "already-processed" };

  const rawText = message.text?.body || "";
  const text = String(rawText).trim();
  const from = normalizeSender(message.from);
  if (!text || !from) return { result: "ignored", reason: "no-text-or-sender" };

  const user = await User.findOne({ phoneNumber: from });
  if (!user) {
    // Never reveal whether a number belongs to a DoseNest account.
    logInfo("ignored: sender not registered", { sender: maskPhone(from) });
    return { result: "ignored", reason: "unknown-sender" };
  }
  const userId = user._id.toString();

  // The opt-in gate applies to ALL incoming message handling, not just TAKEN.
  // A linked phone number is never treated as consent by itself.
  if (user.notificationPreferences?.whatsapp !== true) {
    logInfo("ignored: sender not opted in", { userId, sender: maskPhone(from) });
    return { result: "ignored", reason: "not-opted-in" };
  }

  const outcome = await conversationService.handleTextMessage({ user, text });

  // A TAKEN confirmation has a target MedicationLog — persist it atomically.
  if (outcome.logToConfirm) {
    const updated = await markDoseTaken(userId, outcome.logToConfirm);
    if (updated) {
      replyText(user, outcome.reply);
      logInfo("taken confirmed", { userId, intent: outcome.intent, reason: "taken-confirmed" });
      return { result: "processed", reason: "taken-confirmed" };
    }
    replyText(user, "This dose is already marked as taken. 💛");
    logInfo("taken ignored — already recorded", { userId, intent: outcome.intent });
    return { result: "ignored", reason: "already-taken" };
  }

  replyText(user, outcome.reply);
  logInfo("message processed", { userId, intent: outcome.intent, sender: maskPhone(from) });
  return { result: "processed", reason: `intent:${outcome.intent}` };
};

/**
 * Processes a full Meta webhook payload: entry -> changes -> statuses and
 * messages. Never throws for event-level problems; returns a safe summary.
 */
const processWebhookPayload = async (payload) => {
  const stats = { statuses: 0, messages: 0, duplicates: 0, ignored: 0 };
  for (const entry of payload?.entry || []) {
    for (const change of entry.changes || []) {
      const value = change.value || {};
      for (const status of value.statuses || []) {
        const outcome = await handleDeliveryStatus(status);
        if (outcome.result === "duplicate") stats.duplicates += 1;
        else if (outcome.result === "ignored") stats.ignored += 1;
        else stats.statuses += 1;
      }
      for (const message of value.messages || []) {
        const outcome = await handleIncomingMessage(message);
        if (outcome.result === "duplicate") stats.duplicates += 1;
        else if (outcome.result === "ignored") stats.ignored += 1;
        else stats.messages += 1;
      }
    }
  }
  return stats;
};

/**
 * Development/test-mode simulation — exercises the SAME processing pipeline
 * as a real Meta webhook with a payload fabricated from the authenticated
 * user's own records. Only allowed when WHATSAPP_TEST_MODE=true. Never a
 * production medication endpoint; no real provider request is made.
 */
const simulateForUser = async (user, { event, providerMessageId, medicationName, messageBody } = {}) => {
  const config = getConfig();
  if (!config.testMode) {
    throw new AppError("Webhook simulation is only available when WHATSAPP_TEST_MODE=true.", 403);
  }

  // req.user comes from auth middleware as a sanitized user ({ id } string),
  // while db-fetched users have { _id } — accept both.
  const userId = user?._id?.toString?.() || user?.id;

  let payload;
  if (event === "taken" || event === "message") {
    if (!user.phoneNumber || !isValidE164(user.phoneNumber)) {
      throw new AppError("Add your WhatsApp phone number in Settings first.", 400);
    }
    const body = messageBody || `TAKEN${medicationName ? ` ${medicationName}` : ""}`;
    payload = {
      entry: [
        {
          changes: [
            {
              value: {
                messages: [
                  {
                    id: `sim_msg_${Date.now()}`,
                    from: user.phoneNumber.replace(/^\+/, ""),
                    text: { body },
                  },
                ],
              },
            },
          ],
        },
      ],
    };
  } else if (["sent", "delivered", "read", "failed"].includes(event)) {
    if (!providerMessageId) {
      throw new AppError("providerMessageId is required for delivery-status events.", 400);
    }
    // Ownership: the simulated status may only reference the caller's own
    // notification (the real webhook never receives user ids).
    const owned = await Notification.findOne({ providerMessageId, user: userId });
    if (!owned) {
      throw new AppError("No notification with that provider message id was found.", 404);
    }
    payload = {
      entry: [
        {
          changes: [
            {
              value: {
                statuses: [
                  { id: providerMessageId, status: event, timestamp: Math.floor(Date.now() / 1000) },
                ],
              },
            },
          ],
        },
      ],
    };
  } else {
    throw new AppError("Unsupported simulated event. Use taken, sent, delivered, read or failed.", 400);
  }

  const stats = await processWebhookPayload(payload);
  return { event, stats };
};

module.exports = {
  handleDeliveryStatus,
  handleIncomingMessage,
  processWebhookPayload,
  simulateForUser,
  verifySignature,
  verifyWebhook,
};
