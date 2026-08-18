/* global fetch */

/**
 * Development/admin helper — subscribes the Meta app to the WhatsApp Business
 * Account (WABA) so the configured webhook receives real message events.
 *
 * Meta's Cloud API does NOT deliver POST webhooks until the app is subscribed
 * to the WABA:
 *
 *   POST /{WABA_ID}/subscribed_apps
 *
 * This is a one-time setup action, not part of normal request handling.
 *
 * Usage:
 *   npm run whatsapp:subscribe
 *
 * Reads from environment (server/.env, loaded via dotenv):
 *   WHATSAPP_ACCESS_TOKEN          — required
 *   WHATSAPP_BUSINESS_ACCOUNT_ID   — required (the WABA ID)
 *   WHATSAPP_API_VERSION           — optional, defaults to v21.0
 *
 * The script:
 *   - validates required variables
 *   - checks the current subscription state (GET)
 *   - subscribes the app (POST)
 *   - never prints the access token
 *   - never stores credentials
 */

const dotenv = require("dotenv");
const fs = require("fs");
const path = require("path");

// Explicitly load server/.env relative to THIS script (scripts/ -> server/),
// independent of the current working directory. Works from the repo root with
// `npm --prefix server run whatsapp:subscribe` or from inside server/.
const ENV_FILE = path.resolve(__dirname, "..", ".env");
const envLoaded = dotenv.config({ path: ENV_FILE });

const ACCESS_TOKEN = (process.env.WHATSAPP_ACCESS_TOKEN || "").trim();
const WABA_ID = (process.env.WHATSAPP_BUSINESS_ACCOUNT_ID || "").trim();
const API_VERSION = (process.env.WHATSAPP_API_VERSION || "v21.0").trim();

const maskToken = (token) => {
  if (!token) return "<missing>";
  return `${token.slice(0, 4)}...${token.slice(-4)}`;
};

const fail = (message) => {
  console.error(`[whatsapp:subscribe] ${message}`);
  process.exit(1);
};

const validate = () => {
  if (!fs.existsSync(ENV_FILE)) {
    fail(`environment file not found at ${ENV_FILE}`);
  }
  if (envLoaded?.error) {
    fail(`failed to load ${ENV_FILE}: ${envLoaded.error.message}`);
  }
  if (Object.prototype.hasOwnProperty.call(process.env, "WHATSAPP_ACCESS_TOKEN") && !ACCESS_TOKEN) {
    console.warn(
      `[whatsapp:subscribe] loaded ${ENV_FILE} but WHATSAPP_ACCESS_TOKEN is EMPTY (key exists, no value).`
    );
  }
  if (!ACCESS_TOKEN) fail("WHATSAPP_ACCESS_TOKEN is not set in server/.env.");
  if (!WABA_ID) {
    fail(
      "WHATSAPP_BUSINESS_ACCOUNT_ID (the WABA ID) is not set in server/.env. " +
        "Find it under Meta for Developers > App > WhatsApp > API Setup, " +
        "or in the URL of WhatsApp Manager (business.facebook.com/wa/manage)."
    );
  }
};

const call = async (method, endpoint, body) => {
  const response = await fetch(`https://graph.facebook.com/${API_VERSION}/${endpoint}`, {
    method,
    headers: {
      Authorization: `Bearer ${ACCESS_TOKEN}`,
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const json = await response.json().catch(() => ({}));
  return { status: response.status, json };
};

const main = async () => {
  validate();

  console.log(`[whatsapp:subscribe] version=${API_VERSION} waba=${WABA_ID}`);
  console.log(`[whatsapp:subscribe] token=${maskToken(ACCESS_TOKEN)}`);

  console.log("[whatsapp:subscribe] checking current subscription state (GET subscribed_apps)...");
  const getResult = await call("GET", `${WABA_ID}/subscribed_apps`);
  if (getResult.status >= 400) {
    const err = getResult.json?.error;
    fail(
      `GET subscribed_apps failed (HTTP ${getResult.status}): ` +
        `${err?.message || "unknown error"} ` +
        "(check that the token is valid and has whatsapp_business_management + whatsapp_business_messaging permissions)."
    );
  }
  const subscribed = getResult.json?.data || [];
  const alreadySubscribed = subscribed.some((app) => app?.link);
  if (alreadySubscribed) {
    console.log("[whatsapp:subscribe] app is already subscribed to this WABA.");
  } else {
    console.log(
      "[whatsapp:subscribe] app is NOT subscribed — subscribing now (POST subscribed_apps)..."
    );
    const postResult = await call("POST", `${WABA_ID}/subscribed_apps`);
    if (postResult.status >= 400) {
      const err = postResult.json?.error;
      fail(
        `POST subscribed_apps failed (HTTP ${postResult.status}): ` +
          `${err?.message || "unknown error"}`
      );
    }
    console.log(`[whatsapp:subscribe] subscription request accepted (HTTP ${postResult.status}).`);
  }

  console.log(
    "[whatsapp:subscribe] done. Incoming WhatsApp messages to the test number should now " +
      "arrive as POST /api/webhooks/whatsapp at the configured callback URL."
  );
  process.exit(0);
};

main().catch((err) => {
  fail(err.message);
});
