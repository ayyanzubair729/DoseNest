/**
 * WhatsApp Cloud API configuration — everything comes from environment
 * variables (server/.env). No credentials are ever hardcoded or committed.
 *
 * Provider: Meta WhatsApp Cloud API (official Graph API).
 * See https://developers.facebook.com/docs/whatsapp/cloud-api
 *
 * The master switch is WHATSAPP_ENABLED; it defaults to FALSE so the app runs
 * without attempting any provider calls until explicitly enabled.
 */

const parsePositiveInt = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const getConfig = () => {
  const enabled = process.env.WHATSAPP_ENABLED === "true";
  const testMode = process.env.WHATSAPP_TEST_MODE === "true";

  const accessToken = (process.env.WHATSAPP_ACCESS_TOKEN || "").trim();
  const phoneNumberId = (process.env.WHATSAPP_PHONE_NUMBER_ID || "").trim();

  return {
    // Master switches.
    enabled,
    testMode,

    // Provider credentials (never logged, never exposed to the client).
    accessToken,
    phoneNumberId,
    businessAccountId: (process.env.WHATSAPP_BUSINESS_ACCOUNT_ID || "").trim(),
    apiVersion: (process.env.WHATSAPP_API_VERSION || "v21.0").trim(),

    // Delivery behavior.
    maxRetries: parsePositiveInt(process.env.WHATSAPP_MAX_RETRIES, 2),
    retryDelayMs: parsePositiveInt(process.env.WHATSAPP_RETRY_DELAY_MS, 2000),
    requestTimeoutMs: parsePositiveInt(process.env.WHATSAPP_REQUEST_TIMEOUT_MS, 10000),

    // Phase 8 — webhooks. `webhookVerifyToken` is the value Meta echoes during
    // the GET subscription handshake; `appSecret` optionally enables
    // X-Hub-Signature-256 verification of incoming POST events.
    webhookVerifyToken: (process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || "").trim(),
    appSecret: (process.env.WHATSAPP_APP_SECRET || "").trim(),

    // Phase 8 — how long after a scheduled dose a "TAKEN" reply is accepted.
    takenConfirmationWindowMinutes: parsePositiveInt(
      process.env.WHATSAPP_TAKEN_CONFIRMATION_WINDOW_MINUTES,
      90
    ),

    // Pre-approved template configuration (names must be created in the WABA
    // console; the language code follows the Cloud API format, e.g. "en").
    templateLanguage: (process.env.WHATSAPP_TEMPLATE_LANGUAGE || "en").trim(),
    templates: {
      medicationDue: (process.env.WHATSAPP_TEMPLATE_MEDICATION_DUE || "medication_due_reminder").trim(),
      medicationMissed: (process.env.WHATSAPP_TEMPLATE_MEDICATION_MISSED || "medication_missed_reminder").trim(),
      medicationTaken: (process.env.WHATSAPP_TEMPLATE_MEDICATION_TAKEN || "medication_taken_confirmation").trim(),
      reminder: (process.env.WHATSAPP_TEMPLATE_REMINDER || "medication_upcoming_reminder").trim(),
      test: (process.env.WHATSAPP_TEMPLATE_TEST || "dosenest_test_message").trim(),
    },
  };
};

/**
 * True when the environment supplies enough credentials to talk to the Cloud
 * API (access token + phone number ID). A missing WABA id is tolerated — it is
 * not required to send messages.
 */
const isConfigured = (config = getConfig()) =>
  Boolean(config.accessToken && config.phoneNumberId);

/**
 * Safe connection summary — contains no secrets. Used by the status endpoint
 * and startup logging.
 */
const getConnectionStatus = (config = getConfig()) => ({
  configured: isConfigured(config),
  enabled: config.enabled,
  testMode: config.testMode,
  apiVersion: config.apiVersion,
  templateLanguage: config.templateLanguage,
});

module.exports = { getConfig, getConnectionStatus, isConfigured };
