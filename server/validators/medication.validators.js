const mongoose = require("mongoose");
const AppError = require("../utils/AppError");
const { isValidTimezone } = require("../utils/timezone");

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;
const DOSAGE_UNITS = ["mg", "ml", "tablet", "capsule", "drop", "puff"];
const FREQUENCIES = ["daily", "days_of_week", "custom"];

const toDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const assertValidObjectId = (req, _res, next) => {
  const id = req.params.id || req.params.medicationId || req.params.scheduleId;
  if (!id || !mongoose.isValidObjectId(id)) {
    return next(new AppError("Invalid id.", 400));
  }
  next();
};

const validateMedicationInput = (req, _res, next) => {
  const {
    name,
    dosage,
    dosageUnit,
    form,
    instructions,
    notes,
    startDate,
    endDate,
    active,
    familyMemberId,
  } = req.body || {};

  if (!name || typeof name !== "string" || !name.trim()) {
    return next(new AppError("Medication name is required.", 400));
  }
  if (name.trim().length > 120) {
    return next(new AppError("Medication name must be 120 characters or fewer.", 400));
  }
  if (dosage !== undefined && dosage !== null && String(dosage).trim().length > 40) {
    return next(new AppError("Dosage must be 40 characters or fewer.", 400));
  }
  if (dosageUnit !== undefined && dosageUnit !== null && !DOSAGE_UNITS.includes(dosageUnit)) {
    return next(
      new AppError(`Dosage unit must be one of: ${DOSAGE_UNITS.join(", ")}.`, 400)
    );
  }

  const parsedStart = toDate(startDate);
  const parsedEnd = toDate(endDate);
  if (startDate && !parsedStart) {
    return next(new AppError("Start date is not a valid date.", 400));
  }
  if (endDate && !parsedEnd) {
    return next(new AppError("End date is not a valid date.", 400));
  }
  if (parsedStart && parsedEnd && parsedEnd < parsedStart) {
    return next(new AppError("End date cannot be before the start date.", 400));
  }

  if (familyMemberId !== undefined && familyMemberId !== null) {
    if (!mongoose.isValidObjectId(familyMemberId)) {
      return next(new AppError("Invalid family member id.", 400));
    }
    req.body.familyMemberId = familyMemberId;
  } else {
    req.body.familyMemberId = undefined;
  }

  if (req.body.schedules !== undefined) {
    if (!Array.isArray(req.body.schedules)) {
      return next(new AppError("schedules must be an array.", 400));
    }
    const cleanSchedules = [];
    for (const scheduleInput of req.body.schedules) {
      const { clean, error } = normalizeScheduleFields(scheduleInput, req.user?.timezone);
      if (error) return next(error);
      cleanSchedules.push(clean);
    }
    req.body.schedules = cleanSchedules;
  }

  req.body.name = name.trim();
  req.body.dosage = dosage ? String(dosage).trim() : undefined;
  req.body.form = form ? String(form).trim() : undefined;
  req.body.instructions = instructions ? String(instructions).trim() : undefined;
  req.body.notes = notes ? String(notes).trim() : undefined;
  req.body.startDate = parsedStart || undefined;
  req.body.endDate = parsedEnd || undefined;
  req.body.active = active === undefined ? undefined : Boolean(active);
  next();
};

const normalizeScheduleFields = (input = {}, defaultTimezone = "UTC") => {
  const { time, frequency, daysOfWeek, startDate, endDate, timezone, active } = input;

  if (timezone !== undefined && timezone !== null && !isValidTimezone(timezone)) {
    return { clean: null, error: new AppError("Invalid timezone.", 400) };
  }

  if (!time || !TIME_PATTERN.test(String(time))) {
    return {
      clean: null,
      error: new AppError("Schedule time must be in HH:MM (24-hour) format.", 400),
    };
  }
  if (frequency !== undefined && !FREQUENCIES.includes(frequency)) {
    return {
      clean: null,
      error: new AppError(`Frequency must be one of: ${FREQUENCIES.join(", ")}.`, 400),
    };
  }
  if (daysOfWeek !== undefined) {
    if (
      !Array.isArray(daysOfWeek) ||
      daysOfWeek.some((d) => !Number.isInteger(d) || d < 0 || d > 6)
    ) {
      return {
        clean: null,
        error: new AppError(
          "daysOfWeek must be an array of numbers 0 (Sunday) through 6 (Saturday).",
          400
        ),
      };
    }
  }

  const parsedStart = toDate(startDate);
  const parsedEnd = toDate(endDate);
  if (startDate && !parsedStart) {
    return { clean: null, error: new AppError("Schedule start date is not a valid date.", 400) };
  }
  if (endDate && !parsedEnd) {
    return { clean: null, error: new AppError("Schedule end date is not a valid date.", 400) };
  }
  if (parsedStart && parsedEnd && parsedEnd < parsedStart) {
    return { clean: null, error: new AppError("Schedule end date cannot be before the start date.", 400) };
  }

  const clean = {
    time: String(time),
    frequency: frequency || "daily",
    daysOfWeek: daysOfWeek || [],
    startDate: parsedStart || undefined,
    endDate: parsedEnd || undefined,
    timezone: timezone || defaultTimezone || "UTC",
    active: active === undefined ? true : Boolean(active),
  };
  return { clean, error: null };
};

const validateMedicationUpdate = (req, _res, next) => {
  const { name, dosage, dosageUnit, startDate, endDate, active, schedules } = req.body || {};

  // Ownership is immutable — a medication can never be reassigned via update.
  delete req.body.familyMemberId;

  if (name !== undefined) {
    if (typeof name !== "string" || !name.trim()) {
      return next(new AppError("Medication name cannot be empty.", 400));
    }
    if (name.trim().length > 120) {
      return next(new AppError("Medication name must be 120 characters or fewer.", 400));
    }
    req.body.name = name.trim();
  }
  if (dosage !== undefined && dosage !== null) {
    if (String(dosage).trim().length > 40) {
      return next(new AppError("Dosage must be 40 characters or fewer.", 400));
    }
    req.body.dosage = String(dosage).trim();
  }
  if (dosageUnit !== undefined && dosageUnit !== null) {
    if (!DOSAGE_UNITS.includes(dosageUnit)) {
      return next(
        new AppError(`Dosage unit must be one of: ${DOSAGE_UNITS.join(", ")}.`, 400)
      );
    }
    req.body.dosageUnit = dosageUnit;
  }

  const parsedStart = toDate(startDate);
  const parsedEnd = toDate(endDate);
  if (startDate && !parsedStart) {
    return next(new AppError("Start date is not a valid date.", 400));
  }
  if (endDate && !parsedEnd) {
    return next(new AppError("End date is not a valid date.", 400));
  }
  if (parsedStart && parsedEnd && parsedEnd < parsedStart) {
    return next(new AppError("End date cannot be before the start date.", 400));
  }
  if (startDate !== undefined) req.body.startDate = parsedStart || undefined;
  if (endDate !== undefined) req.body.endDate = parsedEnd || undefined;
  if (active !== undefined) req.body.active = Boolean(active);

  if (schedules !== undefined) {
    if (!Array.isArray(schedules)) {
      return next(new AppError("schedules must be an array.", 400));
    }
    const cleanSchedules = [];
    for (const scheduleInput of schedules) {
      const { clean, error } = normalizeScheduleFields(scheduleInput, req.user?.timezone);
      if (error) return next(error);
      cleanSchedules.push(clean);
    }
    req.body.schedules = cleanSchedules;
  }

  next();
};

const validateScheduleInput = (req, _res, next) => {
  const { clean, error } = normalizeScheduleFields(req.body, req.user?.timezone);
  if (error) return next(error);
  req.body = clean;
  next();
};

module.exports = {
  assertValidObjectId,
  validateMedicationInput,
  validateMedicationUpdate,
  validateScheduleInput,
};
