/* global setTimeout, clearTimeout, setInterval, clearInterval */

const { runReminderEngine } = require("../services/reminder.service");

let running = false;
let timer = null;

const getIntervalMinutes = () => {
  const value = Number(process.env.REMINDER_JOB_INTERVAL_MINUTES);
  return Number.isFinite(value) && value > 0 ? value : 1;
};

const runOnce = async () => {
  if (running) return;
  running = true;
  try {
    const counts = await runReminderEngine();
    console.log(
      `[reminder-job] ok due=${counts.due} reminder=${counts.reminder} missed=${counts.missed} missedMarked=${counts.missedMarked}`
    );
  } catch (err) {
    console.error(`[reminder-job] error: ${err.message}`);
  } finally {
    running = false;
  }
};

/**
 * Starts the periodic reminder job. Returns a stop function for tests/cleanup.
 */
const startReminderJob = () => {
  const intervalMs = getIntervalMinutes() * 60 * 1000;

  // Run shortly after startup, then on the configured interval.
  const first = setTimeout(runOnce, 1000);
  timer = setInterval(runOnce, intervalMs);
  timer.unref?.();
  first.unref?.();

  return () => {
    clearTimeout(first);
    if (timer) clearInterval(timer);
    timer = null;
  };
};

module.exports = { runOnce, startReminderJob };
