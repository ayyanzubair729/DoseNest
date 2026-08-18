# DoseNest — WhatsApp Cloud API Setup

DoseNest sends medication reminders over WhatsApp through the **official Meta WhatsApp
Cloud API** (Graph API). No third-party SDK is used; the provider logic lives entirely in
`server/services/whatsapp/whatsapp.service.js`.

This guide explains exactly how to move from **local simulation** to **real WhatsApp
delivery**.

---

## 1. Modes at a glance

| Mode | `WHATSAPP_ENABLED` | `WHATSAPP_TEST_MODE` | What happens |
| ---- | ------------------ | -------------------- | ------------ |
| **Local simulation** (default) | `false` | `true` | Full pipeline runs; every send is simulated locally. **No real message is ever sent** — even if credentials are present, test mode always simulates. |
| **Real delivery** | `true` | `false` | Messages are sent to real WhatsApp numbers through the Cloud API using approved templates. |
| Disabled | `false` | `false` | Reminders stay in-app; no WhatsApp traffic at all. |

> ⚠️ **Safety rule:** with `WHATSAPP_TEST_MODE=true`, the service *always* simulates.
> There is no way to accidentally send a real WhatsApp message while test mode is enabled.

---

## 2. Local simulation (no Meta account needed)

In `server/.env`:

```env
WHATSAPP_ENABLED=false
WHATSAPP_TEST_MODE=true
```

All other WhatsApp variables can stay empty. Verify it works:

1. Start the server and confirm the startup log says
   `WhatsApp: enabled=false configured=false testMode=true`.
2. In the app: **Settings → WhatsApp Medication Reminders**.
3. Add your phone number (E.164, e.g. `+15551234567`), enable **"Accept WhatsApp medication
   reminders"**, save.
4. Click **Send test message** → you should see
   *"Test message simulated. No real WhatsApp message was sent."*
5. Create a medication with a schedule due in the next minute; when the reminder fires, the
   notification shows `WhatsApp: Simulated (test mode)`.

Simulation produces a synthetic `sim_...` provider id — it is clearly marked and never
confused with real delivery.

---

## 3. Real Meta WhatsApp Cloud API configuration

### 3.1 Create the Meta assets

1. Go to https://developers.facebook.com and create/login to a developer account.
2. **Create an app** → use the **Business** type → add the **WhatsApp** product.
3. In **WhatsApp → API Setup**:
   - Choose (or create) a **WhatsApp Business Account (WABA)**.
   - Add a **phone number** (a business number you can verify; you can start in test mode with
     a sandbox number for development).
   - Copy the **Phone number ID** and **Temporary access token** (or a permanent token from a
     system user).
4. Copy the **Business Account ID** (needed only for account-level API calls).

### 3.2 Environment variables

Put these in `server/.env` (never commit real values):

```env
WHATSAPP_ENABLED=true
WHATSAPP_TEST_MODE=false
WHATSAPP_ACCESS_TOKEN=<your token>
WHATSAPP_PHONE_NUMBER_ID=<your phone number id>
WHATSAPP_BUSINESS_ACCOUNT_ID=<your waba id>          # optional for sending
WHATSAPP_API_VERSION=v21.0
```

Missing credentials fail gracefully: the app keeps running, delivery is skipped, and the
settings UI explains that WhatsApp is not configured.

### 3.3 Approved message templates

Business-initiated WhatsApp messages **must use pre-approved templates**. Create these
templates in the WABA console (Meta → WhatsApp → Message templates) with the exact
parameters below, then submit them for approval. Template names are configurable via env;
the defaults are shown.

| Env var | Default template name | Parameters (in order) | Example body |
| ------- | --------------------- | --------------------- | ------------ |
| `WHATSAPP_TEMPLATE_MEDICATION_DUE` | `medication_dose_reminder` → default `medication_due_reminder` | `{{1}}` first name, `{{2}}` subject, `{{3}}` time | "Hi {{1}} 👋 It's time for {{2}}. Scheduled for: {{3}}. Reply TAKEN once you've taken it." |
| `WHATSAPP_TEMPLATE_MEDICATION_MISSED` | `medication_missed_reminder` | `{{1}}` first name, `{{2}}` subject, `{{3}}` time | "Hi {{1}}, your {{2}} dose scheduled for {{3}} was marked as missed. Please catch up when possible." |
| `WHATSAPP_TEMPLATE_MEDICATION_TAKEN` | `medication_taken_confirmation` | `{{1}}` first name, `{{2}}` subject | "Hi {{1}}, your {{2}} dose was recorded as taken. ✅" |
| `WHATSAPP_TEMPLATE_REMINDER` | `medication_upcoming_reminder` | `{{1}}` first name, `{{2}}` subject, `{{3}}` time | "Hi {{1}}, your {{2}} dose is coming up at {{3}}." |
| `WHATSAPP_TEMPLATE_TEST` | `dosenest_test_message` | `{{1}}` first name | "Hi {{1}} 👋 This is a test message from DoseNest. Your WhatsApp reminders are working." |

- `subject` is a privacy-conscious summary, e.g. `Metformin (500 mg)` or
  `Mom's Metformin (500 mg)`.
- Set the template **language** with `WHATSAPP_TEMPLATE_LANGUAGE` (Cloud API format, e.g. `en`).
- **Until a template is approved, real sends for it fail** — the delivery service records the
  failure on the notification (`status: failed`) and continues; the app never crashes.
- If a required template is missing/not approved, the affected reminder is recorded as failed
  and other functionality is unaffected.

### 3.4 Subscribe the app to the WABA (required for message webhooks)

The GET verification handshake can succeed even when the app is **not** subscribed
to the WABA — the handshake is app-level, but Meta only delivers POST message
events to apps subscribed to the WABA. Without the subscription you get:

- `GET /api/webhooks/whatsapp` → `200 OK` (verification works), but
- **no** `POST /api/webhooks/whatsapp` when a WhatsApp message arrives.

Subscribe the app with:

```bash
npm run whatsapp:subscribe   # in server/ (reads server/.env)
```

The script reads `WHATSAPP_ACCESS_TOKEN` and `WHATSAPP_BUSINESS_ACCOUNT_ID`
(the WABA ID) from `server/.env`, checks the current state, then issues
`POST /{WABA-ID}/subscribed_apps`. It never prints the token. The equivalent
manual call is:

```
POST https://graph.facebook.com/{WHATSAPP_API_VERSION}/{WABA_ID}/subscribed_apps
Authorization: Bearer <access token>
```

A successful response is `{ "success": true }` (or a `basic_subscription_success`
summary). The access token must have the **`whatsapp_business_management`** and
**`whatsapp_business_messaging`** permissions.

To find your **WABA ID**: Meta for Developers → your App → **WhatsApp → API Setup**
→ the "Temporary access token" panel shows the assigned test number; the WABA ID
appears next to the WhatsApp Business Account. Alternatively use the Graph API
Explorer:

```
GET /{app-id}/owned_whatsapp_business_accounts   # not valid for all apps
```

and if that field is not accessible, use the **WhatsApp Manager URL**
(`business.facebook.com/wa/manage`) — the WABA ID is in the page URL or account
menu. Do **not** confuse: App ID (numeric, per-app), Business Portfolio ID,
WABA ID (the account the phone number belongs to), and Phone Number ID (per
phone number) are four different identifiers.

### 3.5 Verify real delivery safely

1. Set the env vars above and restart the server. The startup log should show
   `WhatsApp: enabled=true configured=true testMode=false`.
2. In **Settings**, the page should show *"Real WhatsApp delivery is enabled."*
3. Add your own verified number + opt in, then click **Send test message** — it sends the
   `WHATSAPP_TEMPLATE_TEST` template to your number. A success shows the provider message id
   (never shown to the user as secrets — only success/failure is displayed).
4. Create a due medication and confirm the reminder arrives on your WhatsApp.

---

## 4. Webhooks (delivery status + TAKEN replies)

DoseNest uses webhooks for two things:

1. **Delivery status updates** — `sent / delivered / read / failed` from Meta are matched to
   the notification via `providerMessageId` and update it in place.
2. **Incoming replies** — a user replying **TAKEN** (or **YES** / **DONE**, optionally
   `TAKEN <medication name>`) marks the corresponding medication log as taken. Duplicate
   webhook deliveries are deduplicated.

> ⚠️ Before testing incoming messages, make sure the app is subscribed to the
> WABA (see §3.4). A successful GET handshake alone does **not** mean Meta will
> deliver POST message events.

### 4.1 Webhook URL

```
https://<your-server-domain>/api/webhooks/whatsapp
```

In the Meta app dashboard: **WhatsApp → Configuration → Webhook → Edit**, set the callback
URL above and a verify token, then **Verify and save**. Meta will call
`GET <url>?hub.mode=subscribe&hub.verify_token=<token>&hub.challenge=<challenge>`;
DoseNest echoes the challenge only when the token matches.

### 4.2 Environment variables

```env
WHATSAPP_WEBHOOK_VERIFY_TOKEN=<a long random string>
WHATSAPP_APP_SECRET=<your app secret>   # optional but recommended for real delivery
```

`WHATSAPP_APP_SECRET` enables **X-Hub-Signature-256** verification of incoming POST bodies
(HMAC-SHA256 over the exact raw bytes — timing-safe compare). If the secret is not set,
signature checks are skipped (acceptable locally; enable it in production).

### 4.3 Subscribe to fields

In **WhatsApp → Configuration → Webhook fields**, subscribe to at least:

- `messages` (incoming messages, e.g. TAKEN)
- `message_deliveries` (delivered status)
- `message_reads` (read status)
- `message_failures` (failed status)

### 4.4 Local webhook testing (no Meta needed)

localhost cannot receive Meta webhooks. With `WHATSAPP_TEST_MODE=true`, use the protected
endpoint to feed fabricated events through the **same** webhook processing service:

```
POST /api/notifications/whatsapp/simulate-webhook   (authenticated, test mode only)
```

Body examples:

```json
{ "event": "delivered", "providerMessageId": "sim_<id from a simulated notification>" }
{ "event": "taken" }
{ "event": "taken", "medicationName": "Metformin" }
{ "event": "failed", "providerMessageId": "sim_<id>" }
```

The GET handshake can be tested directly:
`GET /api/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=<token>&hub.challenge=abc`
→ returns `abc` for a valid token, `403` otherwise.

---

## 5. TAKEN reply behavior

- The sender is resolved **only** through the phone number registered on their DoseNest
  account (normalized to E.164). Unknown numbers do nothing (masked log, nothing revealed).
- WhatsApp reminders must be **opted in** — otherwise the reply is ignored.
- The **most recent eligible** dose (scheduled within
  `WHATSAPP_TAKEN_CONFIRMATION_WINDOW_MINUTES`, default 90) is marked taken.
- If several doses are eligible, DoseNest does **not** guess — it asks which medication, and
  `TAKEN <name>` matches your real medication records.
- Confirmation replies ("Got it 💛 …") are user-initiated, so they may be plain text.
- Replies are idempotent: the same webhook/message id is processed once; already-taken doses
  are no-ops.

---

## 6. Security notes

- Credentials live only in `server/.env` (git-ignored); they are never exposed to the
  frontend, API responses, logs, or errors.
- Logs contain masked phone numbers + message/notification ids only.
- Webhook POSTs are validated with Meta's HMAC signature when `WHATSAPP_APP_SECRET` is set.
- Incoming `userId`/`notificationId`/`medicationId` values in webhook payloads are never
  trusted — account identity comes from the verified phone number.
- Helmet, CORS, and rate limiting remain active; webhook routes are exempt from the global
  API limiter so Meta's shared IPs are never throttled.

---

## 7. Testing checklist

Local simulation:

1. Server boots with `enabled=false configured=false testMode=true`.
2. Settings save phone + opt-in; test message simulated; no Meta request.
3. A due reminder produces a `medication_due` notification with
   `WhatsApp: Simulated (test mode)`.

Webhook simulation (test mode):

4. GET verification: bad token → 403; good token → challenge.
5. Simulate `delivered`/`read`/`failed` → notification status updates.
6. Simulate `taken` → medication log becomes taken; confirmation reply simulated.
7. Same event twice → deduplicated.

Real delivery (only with credentials + approved templates):

8. Settings shows "Real WhatsApp delivery is enabled."
9. Test message arrives on your number.
10. A due reminder arrives; replying TAKEN marks it taken; a second TAKEN is a no-op.
