# DoseNest

> **Medication Management System**

<div align="center">
  <img src="./dosenest.png?v=2" alt="DoseNest Logo" width="400">
</div>

**Your medication companion for you and your family.**

DoseNest is a family medication management platform designed to help users organize medications for themselves and the people they care for — including parents, grandparents, children, and other family members.

It provides medication schedules, reminders, dose tracking, medication history, and optional WhatsApp notifications through the official Meta WhatsApp Cloud API.

> **Note:** DoseNest is not a medical device, diagnostic tool, or medical advice platform. It is designed to help users organize medications they already take.

---

## Features

### Medication Management

* Create and manage medications
* Create medication schedules and repeat rules
* Track doses as:

  * Taken
  * Skipped
  * Snoozed
* View medication history
* Monitor medication adherence

### Family Care

* Manage medications for yourself and family members
* Support for parents, grandparents, children, and other dependents
* Separate medication records for each family member

### Prescription Management

* Prescription upload support
* Planned AI/OCR extraction
* User confirmation before extracted information is saved

### Notifications

* In-app medication reminders
* Optional WhatsApp medication reminders
* WhatsApp delivery status tracking
* WhatsApp `TAKEN` confirmation flow

### Authentication & Security

* JWT authentication
* httpOnly cookies
* Password hashing with bcryptjs
* Session expiration
* Client-side idle timeout
* API rate limiting
* Secure HTTP headers with Helmet
* CORS protection

---

## Project Status

The repository contains the project foundation and implemented features across multiple development phases.

For the detailed implementation status and planned work, see:

**[MVP.md](./MVP.md)**

---

## Tech Stack

| Layer              | Technology                       |
| ------------------ | -------------------------------- |
| Frontend           | React 18, Vite 6, JavaScript     |
| Routing            | React Router 7                   |
| HTTP Client        | Axios                            |
| Styling            | CSS                              |
| Icons              | Lucide React                     |
| Animation          | Framer Motion                    |
| Backend            | Node.js, Express 4               |
| Database           | MongoDB                          |
| ODM                | Mongoose 8                       |
| Authentication     | JWT + httpOnly Cookies           |
| Password Hashing   | bcryptjs                         |
| Security           | Helmet, CORS, express-rate-limit |
| Tooling            | ESLint 9, Prettier, Nodemon      |
| Package Management | npm Workspaces                   |
| Messaging          | Meta WhatsApp Cloud API          |

---

## Project Architecture

```text
dose-nest/
│
├── client/                       # React + Vite frontend
│   ├── public/
│   │   └── assets/
│   │       └── bird.jpeg
│   │
│   └── src/
│       ├── components/           # Reusable UI components
│       ├── layouts/              # Application layouts
│       ├── pages/                # Application pages
│       ├── routes/               # Frontend routes
│       ├── services/             # Centralized Axios client
│       ├── store/                # State management
│       ├── hooks/                # Custom React hooks
│       ├── utils/                # Utility functions
│       └── styles/               # Global styles and design tokens
│
├── server/                       # Express + MongoDB backend
│   ├── config/                   # Database configuration
│   ├── controllers/              # Request controllers
│   ├── middleware/               # Authentication and error handling
│   ├── models/                   # MongoDB/Mongoose models
│   ├── routes/                   # API routes
│   ├── services/                 # Business logic/services
│   ├── jobs/                     # Background jobs
│   ├── utils/                    # Backend utilities
│   └── validators/               # Request validation
│
├── docs/                         # Project documentation
├── MVP.md                        # Implementation roadmap/status
├── package.json                  # Workspace configuration
└── README.md
```

### Main Backend Models

```text
User
FamilyMember
Medication
MedicationSchedule
MedicationLog
Prescription
Notification
```

---

# Getting Started

## Requirements

Before running DoseNest locally, make sure you have:

* Node.js 18+
* npm
* MongoDB

MongoDB can either run locally or be hosted remotely through a service such as MongoDB Atlas.

---

## Installation

Clone the repository and install the dependencies:

```bash
npm install
```

Create the server environment file:

```bash
copy server\.env.example server\.env
```

Then open `server/.env` and configure your environment variables.

---

## Environment Variables

| Variable                                     | Description                           | Example                              |
| -------------------------------------------- | ------------------------------------- | ------------------------------------ |
| `NODE_ENV`                                   | Application environment               | `development`                        |
| `PORT`                                       | Backend server port                   | `5000`                               |
| `MONGODB_URI`                                | MongoDB connection string             | `mongodb://127.0.0.1:27017/dosenest` |
| `JWT_SECRET`                                 | Secret used to sign JWTs              | `generate_a_long_random_value`       |
| `JWT_ACCESS_TOKEN_EXPIRES_IN`                | JWT expiration time                   | `7d`                                 |
| `JWT_EXPIRES_IN`                             | Legacy token expiration alias         | `7d`                                 |
| `SESSION_IDLE_TIMEOUT_MINUTES`               | Client inactivity timeout             | `60`                                 |
| `CLIENT_URL`                                 | Frontend URL used for CORS            | `http://localhost:5173`              |
| `WHATSAPP_ENABLED`                           | Enable WhatsApp delivery              | `false`                              |
| `WHATSAPP_TEST_MODE`                         | Simulate WhatsApp messages            | `false`                              |
| `WHATSAPP_ACCESS_TOKEN`                      | Meta Cloud API access token           | —                                    |
| `WHATSAPP_PHONE_NUMBER_ID`                   | WhatsApp business phone number ID     | —                                    |
| `WHATSAPP_BUSINESS_ACCOUNT_ID`               | Optional WhatsApp business account ID | —                                    |
| `WHATSAPP_API_VERSION`                       | Meta Graph API version                | `v21.0`                              |
| `WHATSAPP_MAX_RETRIES`                       | Maximum provider retries              | `2`                                  |
| `WHATSAPP_RETRY_DELAY_MS`                    | Retry delay                           | `2000`                               |
| `WHATSAPP_REQUEST_TIMEOUT_MS`                | API request timeout                   | `10000`                              |
| `WHATSAPP_TEMPLATE_LANGUAGE`                 | WhatsApp template language            | `en`                                 |
| `WHATSAPP_TEMPLATE_MEDICATION_DUE`           | Medication due template               | `medication_due_reminder`            |
| `WHATSAPP_TEMPLATE_MEDICATION_MISSED`        | Missed medication template            | `medication_missed_reminder`         |
| `WHATSAPP_TEMPLATE_MEDICATION_TAKEN`         | Taken confirmation template           | `medication_taken_confirmation`      |
| `WHATSAPP_TEMPLATE_REMINDER`                 | Upcoming reminder template            | `medication_upcoming_reminder`       |
| `WHATSAPP_WEBHOOK_VERIFY_TOKEN`              | Meta webhook verification token       | —                                    |
| `WHATSAPP_APP_SECRET`                        | Optional webhook signature secret     | —                                    |
| `WHATSAPP_TAKEN_CONFIRMATION_WINDOW_MINUTES` | Validity window for `TAKEN` replies   | `90`                                 |

> Never commit real secrets or API credentials. Environment files are git-ignored.

---

# Running the Project

From the project root:

```bash
npm run dev
```

This starts both the frontend and backend.

### Individual Services

Start the backend:

```bash
npm run dev:server
```

Start the frontend:

```bash
npm run dev:client
```

Build the frontend:

```bash
npm run build
```

Run linting:

```bash
npm run lint
```

Format the project:

```bash
npm run format
```

Start the production server:

```bash
npm start
```

---

## Local URLs

Frontend:

```text
http://localhost:5173
```

Backend:

```text
http://localhost:5000
```

Health check:

```text
http://localhost:5000/api/health
```

The Vite development server proxies `/api` requests to the backend.

---

# WhatsApp Integration

DoseNest supports optional medication reminders through the **official Meta WhatsApp Cloud API**.

WhatsApp works as a delivery channel on top of the application's notification engine.

```text
Medication Reminder
        ↓
Notification
        ↓
MongoDB
        ↓
WhatsApp Delivery Service
        ↓
Meta WhatsApp Cloud API
        ↓
User's WhatsApp
```

WhatsApp integration supports:

* Medication due reminders
* Missed medication reminders
* Medication taken confirmations
* Upcoming reminders
* Delivery status tracking
* `TAKEN` replies
* Webhook processing
* Test-mode simulation

For the complete WhatsApp configuration guide, see:

**[docs/WHATSAPP_SETUP.md](docs/WHATSAPP_SETUP.md)**

---

## WhatsApp Safety

WhatsApp delivery is disabled by default:

```env
WHATSAPP_ENABLED=false
```

For local development, test mode can be enabled:

```env
WHATSAPP_TEST_MODE=true
```

In test mode:

* No real WhatsApp messages are sent
* Messages are simulated locally
* The system marks simulated messages clearly
* Provider credentials are not required

Real delivery requires:

```env
WHATSAPP_ENABLED=true
```

along with valid Meta credentials and approved WhatsApp message templates.

---

## WhatsApp User Consent

Users must explicitly opt in before receiving WhatsApp reminders.

Users can enable reminders from:

```text
Settings
→ WhatsApp Medication Reminders
```

They must:

1. Provide their phone number in E.164 format.
2. Enable WhatsApp medication reminders.
3. Confirm the configuration.

A phone number alone does not enable WhatsApp delivery.

Reminders are only sent to the account owner's verified number.

---

## WhatsApp Message Templates

Business-initiated WhatsApp messages require approved templates.

DoseNest expects the following default templates:

| Template                        | Parameters                   |
| ------------------------------- | ---------------------------- |
| `medication_due_reminder`       | First name, medication, time |
| `medication_missed_reminder`    | First name, medication, time |
| `medication_taken_confirmation` | First name, medication       |
| `medication_upcoming_reminder`  | First name, medication, time |

Template names can be configured through environment variables.

---

# WhatsApp Webhooks

DoseNest uses webhooks to process:

* Message delivery status
* Sent events
* Delivered events
* Read events
* Failed events
* Incoming `TAKEN` messages

### Routes

| Method | Endpoint                 | Purpose                               |
| ------ | ------------------------ | ------------------------------------- |
| `GET`  | `/api/webhooks/whatsapp` | Meta webhook verification             |
| `POST` | `/api/webhooks/whatsapp` | Delivery events and incoming messages |

Webhook events are matched to existing notifications using the provider message ID.

This prevents duplicate notification records.

---

## TAKEN Command

Users can confirm a medication dose by replying:

```text
TAKEN
```

The system:

1. Identifies the sender's verified WhatsApp account.
2. Confirms that WhatsApp reminders are enabled.
3. Finds the most recent eligible dose.
4. Marks the medication log as taken.
5. Updates adherence information.
6. Sends a confirmation response.

The system also supports:

```text
TAKEN <medication name>
```

when multiple eligible doses exist.

If the medication cannot be identified, DoseNest asks the user for clarification instead of guessing.

---

## Webhook Security

Webhook processing includes:

* Verification token validation
* Optional `X-Hub-Signature-256` verification
* Sender identity verification
* WhatsApp opt-in validation
* Duplicate event protection
* Protection against arbitrary recipient numbers
* Test-mode isolation

Client-provided `userId`, `notificationId`, or `medicationId` values are not trusted for identifying the sender or modifying medication records.

---

# Authentication & Session Management

DoseNest uses JWT-based authentication with httpOnly cookies.

### Session Behavior

* JWT access tokens expire after a finite period.
* Default token lifetime is `7d`.
* Tokens are stored in httpOnly cookies.
* Tokens are not stored in `localStorage`.
* Cookies use `SameSite=Lax`.
* Production cookies use `Secure`.
* Sessions are validated through:

```text
GET /api/auth/me
```

### Session Expiration

When a session expires:

1. Authentication state is cleared.
2. The user is redirected to `/login`.
3. A session-expired message is displayed.
4. Authentication loops are prevented.

### Idle Timeout

The client can enforce an inactivity timeout using:

```env
SESSION_IDLE_TIMEOUT_MINUTES=60
```

The timeout resets when the user interacts through:

* Mouse/pointer
* Keyboard
* Touch
* Wheel

The JWT expiration remains the final server-side authentication boundary.

---

# Security

DoseNest includes several security measures:

* Environment-based secrets
* JWT authentication
* httpOnly authentication cookies
* bcryptjs password hashing
* Helmet security headers
* CORS restrictions
* API rate limiting
* Login/register throttling
* No credentials in frontend code
* No sensitive credentials in API responses
* Masked phone numbers in logs
* WhatsApp credentials stored only on the server
* Webhook signature verification
* Duplicate webhook protection

Passwords are hashed using bcryptjs with a cost factor of 12.

Login and registration endpoints are additionally rate-limited to help prevent abuse.

---

# Development Architecture

The frontend communicates with the Express backend through REST APIs.

```text
React + Vite
     │
     │ Axios
     ▼
Express API
     │
     ├── Authentication
     ├── Medication Management
     ├── Scheduling
     ├── Notifications
     ├── WhatsApp Integration
     │
     ▼
MongoDB
```

The application also contains an in-process reminder mechanism for notification generation.

---

# Future Roadmap

The following features are planned and are not currently implemented:

* Advanced scheduled reminder jobs
* Prescription AI/OCR extraction
* Medication adherence analytics
* Predictive adherence insights
* Recommendation engine
* Cloud image storage
* Email notifications

The project roadmap is maintained in:

**[MVP.md](./MVP.md)**

---

# VS Code Extensions

Recommended extensions for development:

* **ESLint** — `dbaeumer.vscode-eslint`
* **Prettier** — `esbenp.prettier-vscode`
* **ES7+ React/Redux/JS Snippets** — `dsznajder.es7-react-js-snippets`
* **MongoDB for VS Code** — `mongodb.mongodb-vscode`
* **GitLens** — `eamodio.gitlens`

The repository includes a `.prettierrc` configuration.

For consistent formatting, enable **Format on Save** in VS Code.

---

# Deployment

DoseNest is currently **not deployed**.

The planned deployment architecture is:

```text
Frontend
   ↓
Static Hosting / Express
   ↓
Express API
   ↓
MongoDB Atlas
```

Production deployment requires:

1. Build the frontend:

```bash
npm run build
```

2. Configure MongoDB:

```env
MONGODB_URI=<production-mongodb-uri>
```

3. Configure a strong JWT secret:

```env
JWT_SECRET=<strong-random-secret>
```

4. Set:

```env
NODE_ENV=production
```

5. Configure the production frontend URL:

```env
CLIENT_URL=<production-frontend-url>
```

CI/CD, automated tests, and containerization can be added as the project evolves.

---


