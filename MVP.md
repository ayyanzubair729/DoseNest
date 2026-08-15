# DoseNest MVP

> Living source of truth for the DoseNest project. Update this file whenever a
> significant architectural or feature change is made.

## Product Vision

DoseNest is a medication companion and family medication management platform. It helps a person
manage their own medications and the medications of the people they care for — parents,
grandparents, children, and other family members — with clear schedules, gentle reminders, and a
trusted history of what was taken, skipped, or snoozed.

## Problem We Are Solving

Families often manage several medications across multiple people. Reminders are scattered, there
is no shared record of whether doses were actually taken, and children or elderly relatives rely
on someone else to stay on top of their schedule. DoseNest centralizes medication management for
the whole family in one warm, simple, trustworthy place.

## Target Users

- People who take multiple medications and want a clear schedule.
- Caregivers juggling medication for parents, grandparents, partners, or children.
- Families that want a shared, honest record of medication adherence.

## Core Features

Planned for the MVP (not all implemented yet — see Current Development Phase):

- Manage your own medications.
- Manage medications for family members (Family Care Mode).
- Create medication schedules and send reminders.
- Track whether doses were taken, skipped, or snoozed.
- Monitor adherence and review medication history.
- Upload prescriptions and optionally extract info with AI (user must confirm before saving).
- Receive reminders through WhatsApp (**implemented — Phase 7**, opt-in per user).
- Notification preferences per user.
- Family-wide medication activity view.
- Personalized medication and adherence insights.

## Future Features

- WhatsApp response handling (replying "TAKEN" to a message to log a dose).
- Scheduled notification jobs (beyond the current setInterval reminder job).
- Prescription image upload with AI/OCR extraction and user confirmation flow.
- Medication adherence analytics and insights.
- Timezone-aware scheduling.
- Cloud image storage.
- Email notifications.

## Tech Stack

**Frontend:** React, Vite, JavaScript, React Router, Axios, Lucide React, Framer Motion, modern
CSS (design tokens + utility classes). No TypeScript, no Next.js.

**Backend:** Node.js, Express.js, JavaScript, MongoDB, Mongoose.

**Auth:** JWT with bcryptjs, httpOnly cookies where appropriate.

**Security/quality:** helmet, cors, express-rate-limit, dotenv, centralized error handling,
middleware validation, environment-variable secrets.

**Tooling:** ESLint, Prettier, Nodemon, npm workspaces, concurrently.

## Architecture

```
dose-nest/
├── client/                 React + Vite frontend
│   ├── public/assets/      Static assets (bird.jpeg goes here)
│   └── src/
│       ├── components/     Reusable UI (brand mark, layout, common)
│       ├── layouts/        Layout wrappers (e.g. PublicLayout)
│       ├── pages/          Route-level pages
│       ├── routes/         Central route table
│       ├── services/       Centralized API client (axios)
│       ├── store/          Global state (placeholder, not built yet)
│       ├── hooks/          Shared hooks (e.g. useHealth)
│       ├── utils/          Helpers (placeholder)
│       └── styles/         Design tokens + global CSS
├── server/                 Express + Mongoose API
│   ├── config/             DB connection
│   ├── controllers/        Route handlers (keep focused/one per concern)
│   ├── middleware/         auth (placeholder), notFound, errorHandler
│   ├── models/             Mongoose models
│   ├── routes/             Express route tables
│   ├── services/           Business logic layer (placeholder)
│   ├── jobs/               Scheduled jobs (placeholder — WhatsApp, reminders)
│   ├── utils/              AppError and shared helpers
│   └── validators/         Request validation (placeholder)
└── docs/                   Working notes
```

## Database Models

All models are scaffolded but not wired to routes yet. Relationships:

```
User
 ├── FamilyMembers
 │      ├── Medications
 │      │      └── MedicationSchedules
 │      └── MedicationLogs
 ├── Prescriptions
 └── Notifications
```

| Model              | Purpose                                                              |
| ------------------ | -------------------------------------------------------------------- |
| `User`             | Account, role, notification preferences.                              |
| `FamilyMember`     | A person in the user's care (relationship, optional dateOfBirth + notes; owner = `user`). |
| `Medication`       | A medication the authenticated user manages (owner = `user`).         |
| `MedicationSchedule` | When/how often a medication is taken (time, frequency, days, timezone, owner = `user`). |
| `MedicationLog`    | One logged dose occurrence: upcoming / taken / missed / skipped / snoozed (owner = `user`). |
| `Prescription`     | Uploaded prescription; pending vs confirmed AI extraction.            |
| `Notification`     | Reminders and system notices (channel + status).                      |

## API Structure

Base path `/api`. Central rate limit and route mount in `server/app.js` and `server/routes/index.js`.

- `GET /api/health` — liveness + DB status. **Implemented.**
- `POST /api/auth/register` — create account + httpOnly JWT cookie. **Implemented (Phase 3).**
- `POST /api/auth/login` — sign in + httpOnly JWT cookie. **Implemented (Phase 3).**
- `GET /api/auth/me` — current authenticated user + non-secret session config
  (`session.idleTimeoutMinutes`), used to restore the session on page refresh
  (protected). **Implemented (Phase 3, hardened in Phase 6.5).**
- `POST /api/auth/logout` — clear the auth cookie. **Implemented (Phase 3).**
- `GET /api/medications` — list the authenticated user's medications (active/search filters).
  **Implemented (Phase 4).**
- `POST /api/medications` — create a medication (optional inline schedules). **Implemented (Phase 4).**
- `GET/PUT/DELETE /api/medications/:id` — read/update/delete own medication. **Implemented (Phase 4).**
- `GET /api/medications/upcoming` — next doses computed from active schedules + materialized logs.
  **Implemented (Phase 4).**
- `GET /api/medications/stats` — dashboard statistics. **Implemented (Phase 4).**
- `/api/medications/:medicationId/schedules` GET/POST/PUT/DELETE — schedule CRUD.
  **Implemented (Phase 4).**
- `GET /api/medication-logs`, `POST /api/medication-logs/:id/taken|missed` — dose tracking.
  **Implemented (Phase 4).**
- `GET/POST /api/family-members`, `GET/PUT/DELETE /api/family-members/:id` — family member CRUD
  (ownership-scoped). **Implemented (Phase 5).**
- `GET /api/family-members/summary` — dashboard family overview (people cared for, next family
  dose, today's family adherence). **Implemented (Phase 5).**
- `GET /api/medications?familyMemberId=…` — list medications for one of the user's family
  members (ownership verified). **Implemented (Phase 5).**
- `GET /api/notifications`, `GET /api/notifications/unread-count`,
  `PUT /api/notifications/:id/read`, `PUT /api/notifications/read-all`,
  `GET /api/notifications/next` — internal notification engine API (protected).
  **Implemented (Phase 6).**
- `GET /api/notifications/whatsapp/status` — safe WhatsApp connection + user
  preference status (configured / enabled / test mode / opt-in / own phone
  number — no secrets). **Implemented (Phase 7).**
- `PUT /api/notifications/whatsapp/settings` — update the authenticated user's
  WhatsApp phone number (E.164) and opt-in preference (backend-validated).
  **Implemented (Phase 7).**
- `POST /api/notifications/whatsapp/test` — send a test message **only to the
  authenticated user's own number** (never an arbitrary recipient); simulated
  in test mode without credentials. **Implemented (Phase 7).**

Planned (not implemented): `/api/prescriptions`, `/api/insights`.

Responses follow `{ success, data? | message? }`. Errors flow through a centralized error handler.

## Authentication

**Implemented (Phase 3).** JWT + bcryptjs with an httpOnly cookie (`access_token`, SameSite=Lax,
Secure in production) set by the API and cleared on logout. `server/middleware/auth.js` now
contains the real `protect` guard, which reads the cookie (or an `Authorization: Bearer` header),
verifies the JWT, loads the user from the DB, and attaches `req.user`. Passwords are hashed with
bcryptjs (cost 12); `JWT_SECRET`/`JWT_EXPIRES_IN` come from environment only. Responses never
include the password hash.

## Frontend Pages

Implemented:

- `/` **Polished public homepage (Phase 1).** Sections: Navbar, Hero, Value Strip, How It Works,
  Core Features, WhatsApp (UI demo), Family Care, Nesty intro, CTA, Footer.
- `/dashboard` **Protected** dashboard with real stats (active medications, today's doses,
  taken/missed today) and an interactive "next dose" panel (Taken / Missed) from
  `/api/medications/stats`; empty state with an "Add your first medication" CTA.
- `/medications` **Protected** responsive medication-management page: cards with schedule
  summaries, add/edit modal form, delete confirmation, empty/loading/error states. The add form
  includes a "Who is this medication for?" picker (Me + family members from the API).
- `/family-care` **Protected** Family Care dashboard: responsive family member cards with
  dynamic summaries (active medications, today's doses, adherence bar, next dose), add/edit/remove
  modals, Nesty empty state.
- `/family-care/:id` **Protected** family member detail: live stats (active meds, doses today,
  taken/missed today, adherence), interactive next-dose panel, and that member's medication grid
  with add/edit/delete (reuses the medication components).
- `/login` Real login form (email + password) wired to `POST /api/auth/login`.
- `/register` Real registration form (name, email, password, confirm) wired to
  `POST /api/auth/register`.
- `*` Friendly 404 page.

Planned: onboarding, medication history/adherence views, prescriptions (upload + AI confirm),
notifications, settings, insights.

## Design System

- Palette: soft yellow, warm green, light mint, soft pink, lavender accents, warm off-white
  background, dark charcoal/navy text. Defined as CSS custom properties in
  `client/src/styles/tokens.css`.
- Rounded shapes, subtle shadows, gentle gradients, spacious layout, strong type hierarchy.
- Page patterns: `.section`, `.section--tint`, `.section-head` (eyebrow pill + heading + subtext),
  `.pill`, `.features-grid`, `.steps`, `.split`, `.check-list`, `.value-strip`, `.cta__panel`.
- Buttons: `.btn` + `--primary`, `--ghost`, `--lg`, `--sm`; subtle hover lift and press scale.
- Framer Motion used sparingly: shared `Reveal` wrapper (fade-up on scroll, honors
  `prefers-reduced-motion` via `useReducedMotion`), gentle mascot/visual floats, animated mobile
  menu, page fade-in. No bouncing or constant motion.
- No horizontal overflow: `overflow-x: clip` on body plus responsive breakpoints (1024 / 900 / 880 /
  860 / 640).
- No hardcoded dashboard numbers anywhere. All data must come from the backend.

## Mascot / Brand Guidelines

- Mascot: **Nesty** — a friendly yellow-and-green bird, the DoseNest identity.
- The brand wordmark is rendered in text (`Dose` + green `Nest`) with a circular Nesty avatar
  (`bird-phone.png`) in the navbar/footer. A dedicated logo PNG was removed by the owner and is not
  used; do not re-add image logos without the asset.
- All mascot imagery lives in `client/src/assets/Images/` and is imported through the central
  asset map `client/src/utils/assets.js` (never hardcode public paths).
- Assets in use: `bird-main.png` (hero float bubble, Nesty section, dashboard & 404 empty states),
  `bird-doctor.png` (Family Care), `bird-phone.png` (navbar brand avatar, WhatsApp chat
  avatar), `homepage.png` (hero screenshot card), `whatsapp logo.png` (WhatsApp section badge),
  `download.jpg` (hero section background), `favicon.png` + `medicine.png` (floating decorations
  in How It Works).
- **Favicon**: the browser tab icon is `favicon.png` (256×256 Nesty artwork), injected via import
  in `main.jsx`. The `favicon.png` file in `client/src/assets/Images/` was cropped to the Nesty
  artwork and downscaled to 256×256; it is also reused as small floating decorations in the
  How It Works section.
- Use the bird strategically (hero, empty states, section visuals), not on every element.
- Never replace or redesign the bird. No otter/pill/robot/generic icons as mascot.

## Current Development Phase

**Phase 9 — Real WhatsApp readiness & reminder response flow (complete).** Test mode now always
simulates (impossible to send real messages accidentally), the real-mode test message uses an
approved template, TAKEN replies accept YES/DONE aliases with a helpful reply for other messages,
reminder content includes the "Reply TAKEN" hint, the Settings UI distinguishes real vs simulated
delivery, and `docs/WHATSAPP_SETUP.md` documents the full Meta configuration. Real delivery is
wired but not end-to-end verified (requires Meta credentials + approved templates).

## Completed Tasks

Phase 0 — Project foundation:

- [x] Empty-workspace inspection.
- [x] Folder structure for client, server, docs.
- [x] npm workspaces setup; root scripts (`dev`, `dev:server`, `dev:client`, `build`, `lint`,
      `format`, `start`).
- [x] Packages installed (frontend + backend) with `npm audit` clean.
- [x] Vite configured (port 5173, `/api` proxy to `:5000`).
- [x] Express app with helmet, cors (credentials), JSON body parsing, rate limiting.
- [x] Centralized error handler + 404 handler.
- [x] `GET /api/health` endpoint reporting API + DB status.
- [x] Mongoose connection module (`server/config/db.js`).
- [x] Placeholder Mongoose models: User, FamilyMember, Medication, MedicationSchedule,
      MedicationLog, Prescription, Notification.
- [x] Placeholder `server/middleware/auth.js` (returns 501).
- [x] Axios client with centralized error mapping (`client/src/services/api.js`).
- [x] React router shell with home, dashboard, login, register, 404 pages.
- [x] Design tokens + global CSS.
- [x] ESLint (flat config) + Prettier for both workspaces.
- [x] `.env.example` (server), local `.env`, .gitignore.

Phase 1 — Homepage:

- [x] Central asset map `client/src/utils/assets.js`; favicon injected via import in `main.jsx`
      (removed the dead `/assets/bird.jpeg` reference from `index.html`).
- [x] BrandMark rebuilt as text wordmark + Nesty avatar (logo PNG deleted by owner — not used).
- [x] Navbar: brand, section anchors (Home / How It Works / Features / Family Care / WhatsApp /
      About), Log in + Get started, animated responsive mobile menu (Esc + viewport close).
- [x] Hero: eyebrow, "Never miss the care that matters.", CTAs, 4 value chips, `download.jpg` as
      a bright full-bleed section background (no dimming overlay) with the `homepage.png` screenshot
      displayed directly (no white card) and the floating Nesty reminder bubble; subtle Framer
      Motion entrance + float.
- [x] Value strip (4 compact items: personal management / family care / WhatsApp / tracking).
- [x] How It Works: 4 numbered steps.
- [x] Core Features: 6 cards (management, reminders, tracking, family care, prescriptions with
      "AI coming" badge, personalized companion).
- [x] WhatsApp section: UI-only mock chat card with Nesty + whatsapp logo; explicit disclaimer.
- [x] Family Care section ("Care doesn't stop with you.") with `bird-doctor.png`.
- [x] Nesty intro section with `bird-main.png` idle float.
- [x] CTA panel on soft green/yellow/pink gradient with decorative blobs.
- [x] Footer: brand + description + product/company/legal/account columns, safety note, legal links
      (`/privacy`, `/terms` still 404 — pages not built).
- [x] Shared `Reveal` animation component honoring `prefers-reduced-motion`.
- [x] Dashboard + 404 updated to use `bird-main.png` (no more missing bird.jpeg).
- [x] Responsive CSS for desktop / laptop / tablet / mobile; `overflow-x: clip` guard.
- [x] Validated with headless Chrome + CDP (see report): no overflow at 1280/1024/768/390, all
      images load, no console errors/exceptions, mobile menu opens/closes.

## Phase 3 — Authentication (complete)

- [x] `POST /api/auth/register` — validates name/email/password, normalizes email, prevents
      duplicates (409), hashes with bcryptjs (cost 12), creates the user, sets an httpOnly JWT
      cookie, returns a safe user object.
- [x] `POST /api/auth/login` — normalizes email, generic "Invalid email or password." on failure,
      sets the httpOnly JWT cookie on success.
- [x] `GET /api/auth/me` — protected; returns the authenticated user's safe profile.
- [x] `POST /api/auth/logout` — clears the auth cookie.
- [x] Real `protect` JWT middleware (cookie or Bearer token; expired/malformed/missing → 401).
- [x] Validation middleware (`server/validators/auth.validators.js`); hand-rolled, no new deps.
- [x] Duplicate-key (E11000) handling in the central error handler.
- [x] Frontend `AuthProvider`/`useAuth` restores the session via `/api/auth/me` on startup (no
      flash of authenticated content), exposes login/register/logout.
- [x] `ProtectedRoute` guard for `/dashboard` (redirects to `/login` with the intended destination).
- [x] Navbar shows Log in / Get started when signed out and Dashboard + user chip + Log out when
      signed in (desktop + mobile menus).
- [x] Real login/register forms with validation, loading states, backend error display, and
      post-auth redirects.
- [x] User ownership foundation: future models (Medication, schedules, logs, family members,
      prescriptions, notifications) can reference `User`; auth attaches `req.user`.

## Phase 4 — Medication management core (complete)

- [x] **Ownership**: every Medication, MedicationSchedule, and MedicationLog carries a required
      `user` ref; every query is scoped to `req.user.id`. The frontend never sends a userId — the
      backend derives ownership from the session. Cross-user access returns 404 (no leakage).
- [x] **Medication CRUD** (`/api/medications`): list (active/search filters), create (with optional
      inline schedules), get, update (owner immutable), delete (cascades schedules + logs).
- [x] **Schedules** (`/api/medications/:medicationId/schedules`): time (HH:mm), frequency
      (daily / days_of_week / custom), daysOfWeek, start/end dates, timezone, active.
- [x] **Upcoming dose calculation**: next occurrence computed from active schedules within
      date bounds; dose logs are materialized idempotently (unique user+medication+schedule+time)
      so future WhatsApp/notification jobs can answer "what's due for whom, now?".
- [x] **Dose tracking** (`/api/medication-logs`): statuses upcoming/taken/missed (plus existing
      skipped/snoozed), `takenAt` capture, guard rails against invalid transitions.
- [x] **Dashboard stats** (`/api/medications/stats`): active medications, today's doses,
      taken today, missed today, next upcoming dose — all from MongoDB, zero hardcoded numbers.
- [x] **Frontend**: `/medications` page (responsive grid, cards with schedule summaries,
      loading/error/empty states), reusable add/edit modal form, delete confirmation,
      dashboard stats + taken/missed actions, dynamic navbar link.
- [x] **Validation**: hand-rolled middleware for medication + schedule payloads (names, dosage
      units, time format, days 0-6, date ranges) and ObjectId guards.

## Phase 5 — Family Care (complete)

- [x] **Family member CRUD** (`/api/family-members`): create (ownership assigned from the session,
      never from the client), list, get, update (owner immutable), delete.
- [x] **Safe deletion**: removing a family member is blocked (409) while they still have
      medications — no silent data loss; the UI explains that medications must be reassigned or
      deleted first.
- [x] **Personal vs family medications**: the existing Medication model is reused — `familyMember`
      is optional. `null` = the primary user's own medication; a member ref = that person's
      medication under the authenticated account. Backward compatible: all Phase 4 records work
      unchanged (no migration).
- [x] **Family member assignment**: `POST /api/medications` accepts `familyMemberId`, which the
      backend verifies belongs to `req.user.id` (404 otherwise). Ownership can never be changed via
      `PUT` (field stripped). `GET /api/medications?familyMemberId=…` filters with the same check.
- [x] **Family adherence (from real logs)**: per member — doses scheduled/taken/missed today and
      adherence % (`taken/scheduled`, `null` when nothing is scheduled today — never a fake 100%).
      Logs materialized from family schedules carry `familyMember` so queries stay cheap.
- [x] **Dashboard Family Care summary**: when the user has family members — people cared for,
      next family dose, today's family adherence; when none — a compact "Add someone to Family
      Care" CTA.
- [x] **Frontend**: `/family-care` (cards + add/edit/remove modals + Nesty empty state
      "Care for the people who matter."), `/family-care/:id` (stats, next-dose actions, member
      medication list reusing MedicationCard/Form/ConfirmModal), "Who is this medication for?"
      picker in the add-medication form (options from the API), "For X" chips on medication cards,
      navbar link (desktop + mobile), responsive grids.

## Phase 6.5 — Authentication & session hardening (complete)

- [x] **Session expiration**: access tokens have a finite lifetime driven by
      `JWT_ACCESS_TOKEN_EXPIRES_IN` (legacy alias `JWT_EXPIRES_IN` still supported), default 7d.
      The httpOnly cookie's `Max-Age` stays aligned with the token lifetime.
- [x] **Token storage**: unchanged — the JWT lives only in an **httpOnly, SameSite=Lax,
      Secure-in-production cookie**. The frontend never reads it; no tokens in React state or
      localStorage (already the architecture — documented, no restructuring needed).
- [x] **Authentication state on refresh**: the app always restores the session via
      `GET /api/auth/me` on startup — it never assumes "logged in" from stale frontend state.
      Valid cookie → authenticated; invalid/expired → logged out, protected routes redirect.
- [x] **401 handling (global)**: the axios client centralizes session-expiry handling. Any
      non-auth 401 fires a single, once-per-session handler (registered by `AuthProvider`) that
      clears auth state and redirects to `/login` with a friendly "Your session has expired. Please
      log in again." message. Login/register 401s (bad credentials) are never treated as expiry;
      no infinite redirect or retry loops.
- [x] **Idle session**: `SESSION_IDLE_TIMEOUT_MINUTES` (default 60, 0 disables) drives a
      lightweight client-side inactivity guard (`useIdleTimeout`) that resets on meaningful
      interaction (pointer, keyboard, touch, wheel) and logs out + clears the cookie after
      genuine inactivity. The JWT remains the hard server-side expiry; the architecture is
      documented as a soft client guard (stateless JWT — no fragile server-side idle session).
- [x] **Logout**: clears the httpOnly cookie server-side, clears client auth state, and returns
      home. All protected routes then redirect to `/login` (frontend guard) while the backend
      keeps enforcing `protect` on every API.
- [x] **Protected route audit**: every mutating/read API under `/api` (medications, schedules,
      medication logs, family members, notifications, WhatsApp status/settings/test) runs through
      `protect`; no route relies on frontend-only protection.
- [x] **Ownership security**: every query is scoped to `req.user.id` (verified cross-user access
      returns 404). User ids are never accepted from the client.
- [x] **Login security**: generic "Invalid email or password." for bad credentials, per-IP
      `authLimiter` (20 attempts / 15 min) on login + register on top of the global API limiter,
      bcryptjs (cost 12) hashing, passwords `select: false` and never serialized.
- [x] **`/api/auth/me` safety**: returns only the sanitized user (no password, tokens, or
      secrets) plus non-secret session config.
- [x] **Navigation (single row)**: the authenticated header is a compact single-row layout on
      desktop/laptop — primary links (Dashboard, Medications, Family Care), notification bell, and
      a compact account dropdown (avatar + name → Settings / Log out). No wrapping, overlap, or
      overflow at 1024px+ (verified in headless Chrome).
- [x] **Mobile navigation**: at ≤880px the header collapses to the hamburger menu with the full
      authenticated set (Dashboard, Medications, Family Care, Settings, Log out); accessible labels,
      Escape/outside-click close, visible focus states; no horizontal overflow at 390px (verified).
- [x] **Auth loading state**: `AuthProvider.loading` gates `ProtectedRoute` and the navbar while
      `/api/auth/me` resolves — no flash of login-then-dashboard.
- [x] **Environment variables**: `JWT_ACCESS_TOKEN_EXPIRES_IN` and `SESSION_IDLE_TIMEOUT_MINUTES`
      added to `server/.env.example` (placeholders only; no secrets).
- [x] **Security headers**: Helmet configuration untouched and still applied.

## Phase 6 — Smart reminder & notification engine (complete)

- [x] **Due-dose detection**: a reminder engine (`server/services/reminder.service.js`) computes
      due doses from REAL data — active medications + schedules (frequency, daysOfWeek, dates),
      materialized `MedicationLog` occurrences, and the current time. Nothing is hardcoded.
- [x] **Notification generation**: centralized types (`medication_due`, `medication_taken`,
      `medication_missed`, `reminder`, `adherence`, `system`) in `server/constants/notificationTypes.js`;
      titles/bodies are derived from the actual medication/family-member records.
- [x] **Duplicate prevention**: a unique sparse index
      `(user, medication, schedule, scheduledFor, type)` guarantees one notification per dose
      occurrence + type — the job can run any number of times safely.
- [x] **Missed-dose logic (backend-owned)**: a dose becomes missed after
      `MEDICATION_MISSED_GRACE_MINUTES` (default 30, env-configurable) past its scheduled time;
      the engine marks it missed and emits a `medication_missed` notification.
- [x] **Reminder job**: `server/jobs/reminderJob.js` runs on `REMINDER_JOB_INTERVAL_MINUTES`
      (default 1 min) via `setInterval` (no new dependencies), with an overlap guard, started
      from `server.js` after a successful DB connection. Tolerant of late executions (time-window
      logic, no exact-millisecond equality).
- [x] **Timezone handling**: dependency-free IANA helpers in `server/utils/timezone.js` (Intl API).
      Occurrences are computed in each schedule's `timezone` (wall-clock times converted to exact
      UTC instants, DST-safe); `User` gained a `timezone` field (default `"UTC"`).
- [x] **Notification preferences**: `User.notificationPreferences.remindersEnabled` and
      `defaultReminderOffsetMinutes` (existing field reused) power advance `reminder`
      notifications within the lead window.
- [x] **Notification API**: `GET /api/notifications` (unread/type/limit filters, newest first),
      `GET /api/notifications/unread-count`, `PUT /api/notifications/:id/read` (ownership-checked),
      `PUT /api/notifications/read-all`, `GET /api/notifications/next` (next upcoming reminder).
- [x] **Notification UI**: a navbar bell with a live unread badge (hidden at 0), a dropdown panel
      with type icons, relative timestamps, read/unread states, optimistic mark-read,
      mark-all-read, polling (60 s), outside-click/Escape close, Nesty empty state, and a
      responsive fixed-panel layout on mobile.
- [x] **Family Care integration**: one engine for personal AND family medications — notifications
      carry `familyMember` context and the account owner receives both.
- [x] **Performance**: indexed due/missed queries (`{status, scheduledFor}`), lean materialization,
      batched missed updates, one prefs query for reminder lead times.

## Phase 7 — WhatsApp integration (complete, PAUSED pending Phase 6.5 verification)

- [x] **Provider**: official **Meta WhatsApp Cloud API** (Graph API) — no third-party SDK or
      abstraction; provider HTTP logic is isolated in `server/services/whatsapp/whatsapp.service.js`.
- [x] **Environment configuration**: `WHATSAPP_ENABLED` (default `false` — no provider traffic until
      explicitly enabled), `WHATSAPP_TEST_MODE`, `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`,
      optional `WHATSAPP_BUSINESS_ACCOUNT_ID`, `WHATSAPP_API_VERSION`, `WHATSAPP_MAX_RETRIES`,
      `WHATSAPP_RETRY_DELAY_MS`, `WHATSAPP_REQUEST_TIMEOUT_MS`, template names + language.
      Placeholders in `server/.env.example`; real values live only in `server/.env` (git-ignored).
      Missing credentials fail gracefully — the app runs, delivery is skipped, and the settings UI
      explains that WhatsApp is not configured.
- [x] **User WhatsApp number**: `User.phoneNumber` (E.164, backend-validated, international — no
      country hardcoded). Users provide/update their own number via the Settings page; never a
      developer/test number stored as application data.
- [x] **WhatsApp opt-in**: `User.notificationPreferences.whatsapp` (existing field, default `false`).
      The backend checks consent before every send; nothing is ever sent without explicit opt-in.
- [x] **WhatsApp service**: `server/services/whatsapp/` — `whatsapp.config.js` (env config),
      `whatsapp.templates.js` (centralized message builders), `whatsapp.service.js` (the only module
      that calls the provider), `whatsapp.delivery.service.js` (delivery pipeline + status/settings/test
      operations). Architecture: `Reminder Engine → Notification → WhatsApp delivery service →
      WhatsApp service → Cloud API`.
- [x] **Notification delivery**: when the Phase 6 engine creates a `medication_due`, `medication_missed`,
      `medication_taken`, or `reminder` notification, the delivery pipeline checks WhatsApp enabled +
      configured + user opt-in + valid phone, builds the template from REAL database records, sends,
      and stores the result. Adherence/system notifications stay in-app. Delivery never blocks or breaks
      the reminder job (non-throwing).
- [x] **Delivery status**: the Notification model tracks `deliveryChannel`, `deliveryAttemptedAt`,
      `deliveredAt`, `deliveryError`, `providerMessageId`, `attempts`, and `simulated`; the existing
      `status` field (pending/sent/delivered/read/failed) is reused as the delivery state. Existing
      notification data is untouched.
- [x] **Idempotency**: two layers — the Phase 6 unique
      `(user, medication, schedule, scheduledFor, type)` index (one notification per occurrence) and a
      compare-and-set claim in the delivery pipeline (a notification is only ever sent once, even across
      job restarts or retries).
- [x] **Retry behavior**: limited retries (`WHATSAPP_MAX_RETRIES`, default 2) with a delay
      (`WHATSAPP_RETRY_DELAY_MS`) for transient failures only (network/timeouts, 408, 429, 5xx).
      Permanent config/auth errors are never retried; the final failure state is recorded on the
      notification.
- [x] **Rate limiting / safety**: the reminder job's existing overlap guard prevents concurrent runs;
      sends are sequential (no bursts). WhatsApp requests never block API responses (the reminder job
      is a background process).
- [x] **Test mode**: `WHATSAPP_TEST_MODE=true` with no credentials simulates messages locally. Simulated
      sends are clearly marked (`simulated: true`, UI label "WhatsApp: Simulated (test mode)") and never
      pretend a real message was delivered.
- [x] **Manual test endpoint**: `POST /api/notifications/whatsapp/test` — authenticated, sends only to the
      caller's own number, gated on enabled/test-mode config, returns safe delivery info (no secrets).
- [x] **Notification UI integration**: the notification bell shows friendly delivery states for
      WhatsApp-channel notifications (Sent / Delivered / Failed / Pending / Simulated). Raw provider
      errors are never exposed.
- [x] **Settings UI**: new protected `/settings` page with a minimal WhatsApp section — add/update phone
      number, enable/disable reminders, see whether WhatsApp is configured, send a test message.
      No credentials are ever displayed.
- [x] **Connection status**: `GET /api/notifications/whatsapp/status` returns safe status only
      (configured / enabled / disabled / test mode + the user's own opt-in and phone presence) — never
      tokens or API secrets.
- [x] **Privacy**: family medications are delivered to the account owner's own number; messages contain
      only a concise subject (e.g. "Mom's Metformin (500 mg)") — no instructions, notes, or unnecessary
      medical details. No family-member phone numbers are stored or messaged in the MVP.
- [x] **Logging**: safe server-side logs for attempts, successes, failures, and retries with
      `notificationId`, `userId`, and `providerMessageId` — never tokens, authorization headers, or
      full phone numbers (recipients are masked).

## Phase 8 — WhatsApp webhooks & bidirectional medication confirmation (complete)

- [x] **Phase 7 configuration correction**: the development `server/.env` was missing every WhatsApp
      variable. Added `WHATSAPP_ENABLED=false` + `WHATSAPP_TEST_MODE=true` (local simulation — no real
      provider request is ever made), the Phase 7 retry/timeout/template configuration, and the Phase 8
      webhook variables. `server/.env` is git-ignored; `.env.example` documents every variable.
- [x] **Local simulation vs real delivery (UI clarity)**: the Settings page now distinguishes
      "Provider configuration: not configured for real delivery" from "Development simulation: available".
      Simulated sends are always marked `simulated: true` and never shown as real deliveries.
- [x] **Environment variables (Phase 8)**: `WHATSAPP_WEBHOOK_VERIFY_TOKEN` (Meta subscription
      handshake), optional `WHATSAPP_APP_SECRET` (X-Hub-Signature-256 verification), and
      `WHATSAPP_TAKEN_CONFIRMATION_WINDOW_MINUTES` (default 90) — all in `server/.env` and
      `.env.example`.
- [x] **Webhook routes**: public `GET /api/webhooks/whatsapp` (verification handshake) and
      `POST /api/webhooks/whatsapp` (provider events) — **no JWT**; security comes from the
      verify-token handshake and (when configured) Meta's HMAC signature over the raw body.
      Webhook POST bodies are parsed from a raw buffer so the signature check is exact.
- [x] **Delivery status webhooks**: `sent` / `delivered` / `read` / `failed` events are matched to the
      existing Notification by `providerMessageId` and update it in place (status, `deliveredAt`,
      `readAt`, friendly `deliveryError`) — the Phase 7 record is preserved, never duplicated.
- [x] **Incoming messages — TAKEN command**: case-insensitive and whitespace-tolerant (`TAKEN`,
      `taken`, `Taken`, `  TAKEN`). Only an explicitly recognized `TAKEN` command triggers anything;
      other messages are ignored (no chatbot).
- [x] **Sender identity (never body-supplied ids)**: the sender is resolved only through the verified
      WhatsApp phone number linked to a DoseNest account. `userId`/`notificationId`/`medicationId`
      values in a webhook payload are never trusted.
- [x] **Opt-in enforcement**: a TAKEN reply is only processed when the account owner has WhatsApp
      reminders enabled; otherwise no medication record is modified (log-only).
- [x] **Dose identification**: the most recent eligible `MedicationLog` for the sender — status
      `upcoming`/`missed` and scheduled within the confirmation window — is confirmed. If multiple
      eligible doses exist the system does NOT guess: it replies asking for the medication name.
- [x] **`TAKEN <medication name>`**: the name is matched dynamically against real MongoDB data
      (case-insensitive prefix/exact); ambiguous or unmatched names get a clarification reply.
- [x] **Confirmation window**: `WHATSAPP_TAKEN_CONFIRMATION_WINDOW_MINUTES` (default 90) — a reminder
      outside the window is never auto-marked taken.
- [x] **MedicationLog update**: an atomic guarded update marks the dose taken (with `takenAt`); the
      existing unique log index and the guard prevent duplicates; already-taken doses are a no-op.
      The MedicationLog remains the source of truth — no separate WhatsApp adherence system.
- [x] **Confirmation message**: after a successful TAKEN, a plain-text reply is sent to the user's own
      number ("Got it 💛 … has been marked as taken.") with the medication name (and family member
      subject) pulled dynamically from MongoDB. In test mode the reply is simulated.
- [x] **Webhook idempotency**: a `WhatsAppEvent` store (unique event key + 7-day TTL) deduplicates
      duplicate Meta deliveries — the same TAKEN event can never mark a dose twice, recreate logs, or
      resend confirmations. The pipeline fails open (log-level guards still protect) if the store
      errors.
- [x] **Unknown senders**: numbers not linked to a DoseNest account are logged with a masked phone
      and nothing is modified or revealed.
- [x] **Family medications**: family reminders belong to the account owner; a valid TAKEN may confirm
      the owner's family-medication log. Cross-account manipulation is impossible — identity is the
      verified phone number.
- [x] **Safe logging**: event type, provider message/event ids, masked sender numbers, and processing
      results — never tokens, verification tokens, authorization headers, full phone numbers, or
      unnecessary medication detail.
- [x] **Development webhook simulation**: protected `POST /api/notifications/whatsapp/simulate-webhook`
      (test mode only) exercises the SAME webhook processing service with fabricated events —
      `sent`, `delivered`, `read`, `failed`, and `TAKEN`. Ownership-checked: delivery-status
      simulation only references the caller's own notifications.
- [x] **Adherence/dashboard**: a WhatsApp-confirmed dose writes the same `MedicationLog` row the
      dashboard reads — adherence reflects the change with no WhatsApp-specific calculations.

## Phase 8A — WhatsApp user opt-in UX (complete)

- [x] **Explicit consent**: the existing `User.notificationPreferences.whatsapp` field is the single
      source of truth. The Settings page now presents a clear **"Accept WhatsApp medication
      reminders"** toggle — default **OFF**, and the UI wording never implies automatic enrollment
      ("Receive your medication reminders directly on WhatsApp. You control whether DoseNest can
      send reminders to your number.").
- [x] **Phone number requirement**: WhatsApp reminders require BOTH a valid E.164 phone number AND
      the explicit opt-in. The backend now rejects saving `whatsappRemindersEnabled=true` when the
      account has no valid phone (400: "Please enter a valid international phone number before
      enabling WhatsApp reminders."), and the frontend blocks the same case before calling the API.
      A phone number alone never enables delivery.
- [x] **Default OFF**: new accounts have `notificationPreferences.whatsapp = false` and no phone;
      no phone number or reminder automatically opts a user in.
- [x] **Toggle persistence**: the toggle connects to the existing `PUT
      /api/notifications/whatsapp/settings` endpoint; on/off state is stored in MongoDB and the
      Settings page restores it from `GET /api/notifications/whatsapp/status` on load (verified
      across page refreshes).
- [x] **Backend validation**: E.164 validation stays in the existing validators (no frontend-only
      trust). Bug fixed: an update that omitted `phoneNumber` previously cleared the stored number
      (the validator converted absent → `null`); now only an explicit `null`/empty value clears it,
      so disabling reminders never destroys the saved number.
- [x] **State-based UI**: the section shows "WhatsApp reminders are currently off" + "Enable
      reminders to receive medication notifications on WhatsApp" when disabled, and "WhatsApp
      reminders are enabled" + "Medication reminders can be sent to your saved WhatsApp number"
      when enabled, always reflecting the persisted backend value.
- [x] **Test mode indicator**: a subtle (non-warning) note — "Development simulation active —
      messages are simulated locally and are not sent to WhatsApp" — appears when the server runs
      with `WHATSAPP_TEST_MODE=true`.
- [x] **Test message**: the existing "Send test message" button stays gated on a saved valid phone
      and usable/test-mode server config; in test mode it returns the simulated result ("Test
      message simulated. No real WhatsApp message was sent.") — never faked as real delivery.
- [x] **Backend safety**: the delivery pipeline still independently checks the opt-in preference and
      phone validity before any send — manually modified frontend state cannot enable delivery.
- [x] **Security**: the settings endpoints remain JWT-protected; the user is resolved from the
      session, never from a client-supplied userId.
- [x] **Accessibility/responsive**: the toggle is a real checkbox (keyboard + screen-reader
      friendly) styled as a switch from existing design tokens; layout stacks cleanly on mobile.

## Testing & Fix — duplicate "Dose missed" notifications (complete)

**Reported:** the Notifications panel showed multiple identical "Dose missed" notifications for the
same Extor 500 mg dose occurrence, despite the Phase 7 idempotency claims.

**Diagnosis (confirmed in MongoDB — duplicates were real records):**

- **Root cause — duplicate schedules.** Extor accumulated multiple schedules at the same times
  (e.g. three 10:00 schedules across Aug 12–13). The source was the medication edit form's
  schedule-duplication bug (every edit save re-created all schedules) — since fixed. Duplicate
  schedules → `materializeLogWindow` created one MedicationLog per schedule per occurrence; the
  log unique index `{user, medication, schedule, scheduledFor}` treats different schedule ids
  (or null) as different occurrences, so multiple logs coexisted for one real dose.
- **One notification per log.** The reminder engine emits a missed notification per log, and
  `createForDose`'s dedup key included `schedule` — different schedules = different keys.
- **Sparse-index gap.** Deleting a schedule nulled the schedule on its logs; those logs then
  produced notifications with NO schedule field, which the sparse unique index (which includes
  `schedule`) does not index at all — not even deduplicated.
- **Evidence:** Extor `2026-08-12T10:00` → 3 missed notifications; `2026-08-12T05:00` → 2;
  `2026-08-13T10:00` → 2. Single reminder job (one server, overlap guard confirmed) — not a
  multiple-instance issue. Frontend renders DB records faithfully.

**Minimal fix (no architecture change, no WhatsApp/UI change, no data deletion):**

- `server/services/notification.service.js` (`createForDose`): dedup on the real occurrence key
  `(user, medication, scheduledFor, type)` — `schedule` removed from the lookup. One notification
  per dose occurrence regardless of duplicate/orphaned logs, and schedule-less notifications are
  now deduplicated too. The existing DB unique index stays as a secondary guard.
- `server/services/schedule.service.js` (`deleteSchedule`): a deleted schedule's **upcoming**
  logs are now marked `skipped` (not left `upcoming` with `schedule: null`), so orphaned logs can
  never become missed, be counted in adherence, or produce notifications. Taken/missed history is
  untouched.
- **Retroactive non-destructive cleanup:** 27 existing orphaned logs (`schedule: null`,
  `status: upcoming`) across Extor's deleted 03:00/05:00/10:00 schedules and the test medication's
  deleted 08:00 schedule were flipped to `skipped` (reversible status change; nothing deleted).

**Verified:** with two duplicate schedules materializing two logs per occurrence,
`createForDose` now yields exactly **1** notification per occurrence (second call deduped) for all
7 window days; deleting a schedule leaves 0 upcoming logs with `schedule: null` (all skipped).
Existing duplicate notifications remain in the database as history (no automatic deletion) — they
can be removed manually if desired. Lint + production build pass.

## Phase 9 — Real WhatsApp readiness & reminder response flow (complete)

- [x] **Audit:** Phase 7/8 already wired the provider service, delivery pipeline, templates,
      opt-in UI, webhooks, and TAKEN handling. Phase 9 closed the remaining gaps for real
      delivery (no architecture change, no second reminder system).
- [x] **Test-mode safety (critical):** `WHATSAPP_TEST_MODE=true` now ALWAYS simulates — even
      when real credentials are present — so it is impossible to accidentally send a real
      WhatsApp message while test mode is enabled.
- [x] **Real test message:** the "Send test message" button now sends the configured approved
      template (`WHATSAPP_TEMPLATE_TEST`, default `dosenest_test_message`, `{{1}}` first name)
      in real mode — plain text is rejected by Meta for business-initiated messages. In test
      mode it stays simulated. Failures are recorded gracefully.
- [x] **Reply aliases:** TAKEN replies accept **YES** and **DONE** as aliases (case- and
      whitespace-insensitive, optionally followed by a medication name). Unsupported messages
      get a short helpful reply ("Hi! You can reply TAKEN when you've taken your medication…")
      for opted-in users — no chatbot.
- [x] **Reminder content:** due/missed message builders now include "Reply TAKEN once you've
      taken it." in the simulation/preview fallback body (the approved template body is
      provider-controlled and documented in `docs/WHATSAPP_SETUP.md`).
- [x] **UI clarity:** the Settings page shows "Real WhatsApp delivery is enabled" (green notice)
      when configured + enabled, and the simulation note now reads "Development simulation
      active — no real WhatsApp message was sent." Never displays credentials.
- [x] **Environment config:** `WHATSAPP_TEMPLATE_TEST` added to `server/.env.example`;
      sections clearly split into LOCAL SIMULATION / REAL WHATSAPP / WEBHOOK.
- [x] **Developer guide:** `docs/WHATSAPP_SETUP.md` documents Meta app setup, credentials,
      approved-template contracts, webhook URL/verify token/fields, local webhook simulation,
      TAKEN behavior, security, and the full testing checklist.
- [x] **Already complete from Phase 8 (verified):** GET/POST webhook, X-Hub-Signature-256
      verification (timing-safe), idempotent event processing (WhatsAppEvent store), delivery
      status mapping (sent/delivered/read/failed), opt-in + E.164 validation, confirmation
      window, unknown-sender privacy, safe logging.
- [x] **TAKEN source tracking:** MedicationLog now records `takenSource` (`"whatsapp"` for
      TAKEN replies, `"manual"` for in-app confirmation); serialized in the logs API so the
      UI/adherence can distinguish how a dose was confirmed.
- [x] **Verified (Phase 9 runtime):** with `WHATSAPP_ENABLED=true` + fake credentials +
      `WHATSAPP_TEST_MODE=true`, test messages and reminder deliveries still simulate with a
      `sim_` provider id and no provider request (test-mode safety). Webhook GET verification
      (200 valid / 403 invalid), HMAC signature (correct → processed, wrong → 403), delivery
      status events (sent → delivered → read, failed), TAKEN + YES/DONE aliases (idempotent —
      duplicate TAKEN creates no second log/notification), unsupported messages → helpful
      reply, unknown-sender privacy, and `takenSource: "whatsapp"` persisted.
- [x] **Not claimed:** real delivery was NOT tested end-to-end (no Meta credentials/templates in
      this environment). Simulation tests pass; the provider integration is wired per the
      Cloud API spec and ready to verify once credentials are configured.

## Current Task

None running. Waiting for the next instruction.

## Next Tasks

1. Medication history page (browse past logs, filters).
2. Build `/privacy` and `/terms` pages (footer links currently 404).
3. `git init`, first commit, remote setup.

## Deliberately Not Implemented Yet

- Prescription upload, AI/OCR extraction, confirmation flow (Features card shows an "AI coming" badge).
- AI prescription OCR, AI medication extraction, advanced AI assistant — **NOT IMPLEMENTED (Phase 8+).**
- Advanced adherence analytics / insights (the dashboard shows live basic stats) — **NOT IMPLEMENTED.**
- Predictive insights / recommendation engine — **NOT IMPLEMENTED.**
- External family member accounts (family members have no login in Phase 5 — the account owner
  manages everything).
- WhatsApp delivery in a production sense requires real Meta credentials + approved templates; local
  development runs with `WHATSAPP_ENABLED=false` or simulated test mode.
- Any hardcoded demo or seed data.
- Cloud image storage, email notifications.
- `/privacy` and `/terms` pages (footer links present, pages not built).

## Important Technical Decisions

- **npm workspaces** for a single root `npm install` and combined scripts.
- **Central API client** so all requests share base URL, credentials, and error mapping.
- **Central error handler** keeps controller code thin.
- **Health endpoint decoupled from DB**: express starts even if MongoDB is down and reports DB
  status in `/api/health` — useful for liveness checks in development.
- **Models designed for scale**: schedules carry `timezone`; logs carry `scheduledFor`; reminders
  target `Notification.channel`; prescriptions separate raw extraction from `confirmed` state.
- **No fake data**: UI renders empty states until real APIs exist.

## Known Issues

- No dedicated logo image (owner deleted `dosenest lgo.png`); brand is a text wordmark + Nesty
  avatar. Re-add an image logo only if the owner supplies the asset.
- `/privacy` and `/terms` footer links currently fall through to the 404 page.
- WhatsApp delivery requires real Meta Cloud API credentials + approved templates to send actual
  messages; until then the pipeline runs in disabled or simulated test mode (by design).
- No automated tests yet.
- `react-router-dom` pinned to v7 (^7.18.2) to avoid a CVE found in v6.x.

## Future Improvements

- Add test tooling (Vitest + Supertest) before feature code grows.
- Add per-route rate limits and validator schemas when auth/CRUD lands.
- Add `server/validators` validation on every mutating endpoint.
- Consider a `seed/` script clearly separated from app code for demos.
- CI (lint + build + tests) via GitHub Actions.