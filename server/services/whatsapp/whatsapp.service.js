/* global setTimeout, fetch, AbortSignal */

/**
 * WhatsApp provider service — the ONLY module allowed to talk to the
 * WhatsApp Cloud API. The rest of the application goes through
 * whatsapp.delivery.service.js; nothing else calls the provider directly.
 *
 * Responsibilities:
 *  - real sends via the official Meta Cloud API (global fetch, no new deps)
 *  - simulation in test mode (clearly distinguished from real sends)
 *  - limited retries for transient failures only
 *  - safe logging (IDs only — never tokens, secrets, or full phone numbers)
 */

const { getConfig, isConfigured } = require("./whatsapp.config");

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Mask a phone number for logs: "+15551234567" -> "+1555*****567".
const maskRecipient = (recipient) => {
  const value = String(recipient || "");
  if (value.length < 6) return "***";
  return `${value.slice(0, 5)}${"*".repeat(Math.max(0, value.length - 8))}${value.slice(-3)}`;
};

// Transient failures (retryable): network errors and 408/429/5xx responses.
// Everything else (4xx auth/config/validation) is permanent — no retries.
const isTransientStatus = (status) =>
  status === 408 || status === 429 || status >= 500;

const logAttempt = (level, message, fields) => {
  const line = Object.entries(fields)
    .map(([key, value]) => `${key}=${value}`)
    .join(" ");
  if (level === "error") console.error(`[whatsapp] ${message} ${line}`);
  else console.log(`[whatsapp] ${message} ${line}`);
};

const buildRequestPayload = (config, { recipient, template, body }) => {
  if (template) {
    return {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: recipient,
      type: "template",
      template: {
        name: template.name,
        language: { code: config.templateLanguage },
        components: [
          {
            type: "body",
            parameters: (template.parameters || []).map((value) => ({
              type: "text",
              text: String(value),
            })),
          },
        ],
      },
    };
  }
  return {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: recipient,
    type: "text",
    text: { preview_url: false, body: String(body || "") },
  };
};

/**
 * Sends one WhatsApp message (template or plain text).
 *
 * Returns { ok, simulated, attempts, providerMessageId?, error?, permanent? }.
 * - simulated: true when the message was simulated in test mode — it never
 *   claims a real provider delivery.
 * - permanent: true when the failure is a config/auth error and retrying
 *   would be pointless.
 */
const sendWhatsAppMessage = async ({ recipient, template, body }) => {
  const config = getConfig();
  const attemptsTotal = config.maxRetries + 1;
  const recipientMasked = maskRecipient(recipient);

  // Simulation path: WHATSAPP_TEST_MODE=true ALWAYS simulates — even when
  // credentials are present. There is no way to accidentally send a real
  // WhatsApp message while test mode is enabled (Phase 9 safety requirement).
  // A synthetic `sim_`-prefixed id is returned so delivery-status webhook
  // simulation can reference it — it can never be confused with a real Meta
  // message id.
  if (config.testMode) {
    const syntheticId = `sim_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    logAttempt("info", "simulated (test mode)", {
      recipient: recipientMasked,
      providerMessageId: syntheticId,
    });
    return { ok: true, simulated: true, attempts: 1, providerMessageId: syntheticId };
  }

  if (!isConfigured(config)) {
    // Guard: should be filtered upstream (delivery pipeline checks config).
    return { ok: false, simulated: false, attempts: 0, error: "not_configured", permanent: true };
  }

  const url = `https://graph.facebook.com/${config.apiVersion}/${config.phoneNumberId}/messages`;
  const payload = buildRequestPayload(config, { recipient, template, body });
  const headers = {
    Authorization: `Bearer ${config.accessToken}`,
    "Content-Type": "application/json",
  };

  let lastError = "";
  for (let attempt = 1; attempt <= attemptsTotal; attempt += 1) {
    logAttempt("info", "send attempt", {
      attempt,
      total: attemptsTotal,
      recipient: recipientMasked,
      type: template ? "template" : "text",
    });

    try {
      const response = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(config.requestTimeoutMs),
      });

      if (response.ok) {
        const json = await response.json().catch(() => ({}));
        const providerMessageId = json?.messages?.[0]?.id || null;
        logAttempt("info", "sent", {
          attempt,
          providerMessageId: providerMessageId || "none",
          recipient: recipientMasked,
        });
        return { ok: true, simulated: false, attempts: attempt, providerMessageId };
      }

      const errorBody = await response.json().catch(() => ({}));
      lastError = errorBody?.error?.message || `HTTP ${response.status}`;
      logAttempt("error", "provider response failure", {
        status: response.status,
        error: lastError,
        attempt,
        recipient: recipientMasked,
      });

      if (!isTransientStatus(response.status)) {
        // Permanent: auth/config/validation error. Retrying will not help.
        return {
          ok: false,
          simulated: false,
          attempts: attempt,
          error: lastError,
          permanent: true,
        };
      }
    } catch (err) {
      lastError = err?.name === "TimeoutError" ? "request timeout" : (err?.message || "network error");
      logAttempt("error", "send error", {
        error: lastError,
        attempt,
        recipient: recipientMasked,
      });
      // Network/timeout errors are transient.
    }

    if (attempt < attemptsTotal) {
      await sleep(config.retryDelayMs);
      logAttempt("info", "retrying", { attempt, delayMs: config.retryDelayMs });
    }
  }

  logAttempt("error", "final failure after retries", {
    attempts: attemptsTotal,
    error: lastError,
  });
  return { ok: false, simulated: false, attempts: attemptsTotal, error: lastError, transient: true };
};

module.exports = { sendWhatsAppMessage };
