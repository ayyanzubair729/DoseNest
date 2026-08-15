const dotenv = require("dotenv");

// Load environment variables before requiring the app so modules that read
// process.env at import time (e.g. JWT config, CORS origin) get real values.
dotenv.config();

const app = require("./app");
const connectDB = require("./config/db");
const { startReminderJob } = require("./jobs/reminderJob");
const { getConnectionStatus } = require("./services/whatsapp/whatsapp.config");

const PORT = process.env.PORT || 5000;

async function start() {
  let connected = false;
  try {
    await connectDB();
    connected = true;
  } catch (err) {
    // Keep the server running so the health endpoint can report the DB state.
    console.warn(`[dosenest] MongoDB unavailable: ${err.message}`);
  }

  app.listen(PORT, () => {
    console.log(`[dosenest] API running on http://localhost:${PORT}`);
  });

  if (connected) {
    startReminderJob();
    console.log(
      "[dosenest] Reminder job started (interval: " +
        `${process.env.REMINDER_JOB_INTERVAL_MINUTES || 1} min, ` +
        `missed grace: ${process.env.MEDICATION_MISSED_GRACE_MINUTES || 30} min)`
    );

    // Safe connection summary — never logs tokens or secrets.
    const wa = getConnectionStatus();
    console.log(
      `[dosenest] WhatsApp: enabled=${wa.enabled} configured=${wa.configured} ` +
        `testMode=${wa.testMode} apiVersion=${wa.apiVersion}`
    );
  }
}

start();
