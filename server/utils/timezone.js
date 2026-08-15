/**
 * Timezone helpers built on the built-in `Intl` API (no external packages,
 * no fragile manual offset arithmetic). All functions treat an IANA zone
 * string (e.g. "America/New_York", "Asia/Karachi") as the source of truth.
 */

const normalizeZone = (timeZone) => {
  try {
    // Throws RangeError for invalid zone names.
    new Intl.DateTimeFormat("en-US", { timeZone });
    return timeZone;
  } catch {
    return "UTC";
  }
};

const isValidTimezone = (timeZone) => {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone });
    return true;
  } catch {
    return false;
  }
};

// DateTimeFormat construction is expensive — cache one formatter per zone.
const formatterCache = new Map();
const getFormatter = (timeZone) => {
  if (!formatterCache.has(timeZone)) {
    formatterCache.set(
      timeZone,
      new Intl.DateTimeFormat("en-US", {
        timeZone,
        hour12: false,
        weekday: "short",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })
    );
  }
  return formatterCache.get(timeZone);
};

/**
 * Breaks a UTC Date into calendar components as seen in `timeZone`.
 * Returns { year, month (0-based), day, hour, minute, weekday (0=Sun) }.
 */
const utcToLocalParts = (date, timeZone) => {
  const dtf = getFormatter(timeZone);
  const parts = dtf.formatToParts(date);
  const get = (type) => parts.find((part) => part.type === type)?.value;

  const WEEKDAYS = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return {
    year: Number(get("year")),
    month: Number(get("month")) - 1,
    day: Number(get("day")),
    hour: Number(get("hour")) % 24, // some engines emit "24" for midnight
    minute: Number(get("minute")),
    second: Number(get("second")),
    weekday: WEEKDAYS[get("weekday")] ?? 0,
  };
};

/**
 * The UTC offset (in minutes) of `timeZone` at the given UTC instant.
 * Positive for zones ahead of UTC (e.g. +05:00 → 300).
 */
const getZoneOffsetMinutes = (date, timeZone) => {
  const local = utcToLocalParts(date, timeZone);
  const asUtc = Date.UTC(
    local.year,
    local.month,
    local.day,
    local.hour,
    local.minute,
    local.second,
    0
  );
  return Math.round((asUtc - date.getTime()) / 60000);
};

/**
 * Builds the UTC instant for a wall-clock time ("HH:MM") on a given calendar
 * date in `timeZone`. Converges across DST transitions with a second pass.
 */
const localTimeToUtc = (year, monthIndex, day, hours, minutes, timeZone) => {
  const zone = normalizeZone(timeZone);
  let utc = Date.UTC(year, monthIndex, day, hours, minutes, 0, 0);
  for (let i = 0; i < 2; i += 1) {
    const offset = getZoneOffsetMinutes(new Date(utc), zone);
    utc = Date.UTC(year, monthIndex, day, hours, minutes, 0, 0) - offset * 60000;
  }
  return new Date(utc);
};

/**
 * Advances a UTC instant by one calendar day as seen in `timeZone`
 * (handles DST 23/25-hour days correctly).
 */
const addLocalDays = (date, days, timeZone) => {
  const zone = normalizeZone(timeZone);
  const local = utcToLocalParts(date, zone);
  const targetDay = local.day + days;
  // Walk through month lengths in the zone's own calendar.
  let year = local.year;
  let month = local.month;
  let day = targetDay;
  while (true) {
    const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
    if (day <= daysInMonth) break;
    day -= daysInMonth;
    month += 1;
    if (month > 11) {
      month = 0;
      year += 1;
    }
  }
  return localTimeToUtc(year, month, day, local.hour, local.minute, zone);
};

module.exports = {
  addLocalDays,
  getZoneOffsetMinutes,
  isValidTimezone,
  localTimeToUtc,
  normalizeZone,
  utcToLocalParts,
};
