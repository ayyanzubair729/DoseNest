const medicationService = require("../services/medication.service");
const scheduleService = require("../services/schedule.service");

const listMedications = async (req, res, next) => {
  try {
    const { active, search, familyMemberId } = req.query;
    const medications = await medicationService.listForUser(req.user.id, {
      active,
      search,
      familyMemberId,
    });
    res.json({ success: true, data: { medications } });
  } catch (err) {
    next(err);
  }
};

const createMedication = async (req, res, next) => {
  try {
    const medication = await medicationService.createForUser(req.user.id, req.body);
    res.status(201).json({ success: true, data: { medication } });
  } catch (err) {
    next(err);
  }
};

const getMedication = async (req, res, next) => {
  try {
    const medication = await medicationService.getForUser(req.user.id, req.params.id);
    res.json({ success: true, data: { medication } });
  } catch (err) {
    next(err);
  }
};

const updateMedication = async (req, res, next) => {
  try {
    const medication = await medicationService.updateForUser(req.user.id, req.params.id, req.body);
    res.json({ success: true, data: { medication } });
  } catch (err) {
    next(err);
  }
};

const deleteMedication = async (req, res, next) => {
  try {
    await medicationService.deleteForUser(req.user.id, req.params.id);
    res.json({ success: true, message: "Medication deleted." });
  } catch (err) {
    next(err);
  }
};

const getUpcomingDoses = async (req, res, next) => {
  try {
    const doses = await medicationService.getUpcomingDoses(req.user.id, req.query.limit);
    res.json({ success: true, data: { doses } });
  } catch (err) {
    next(err);
  }
};

const getStats = async (req, res, next) => {
  try {
    const stats = await medicationService.getStats(req.user.id);
    res.json({ success: true, data: { stats } });
  } catch (err) {
    next(err);
  }
};

const listSchedules = async (req, res, next) => {
  try {
    const schedules = await scheduleService.listSchedulesForMedication(
      req.user.id,
      req.params.medicationId
    );
    res.json({ success: true, data: { schedules } });
  } catch (err) {
    next(err);
  }
};

const createSchedule = async (req, res, next) => {
  try {
    // The schedule may only attach to a medication the user owns.
    const medication = await medicationService.getForUser(req.user.id, req.params.medicationId);
    const schedule = await scheduleService.createSchedule(
      req.user.id,
      medication.id,
      req.body
    );
    res.status(201).json({ success: true, data: { schedule } });
  } catch (err) {
    next(err);
  }
};

const updateSchedule = async (req, res, next) => {
  try {
    const schedule = await scheduleService.updateSchedule(
      req.user.id,
      req.params.medicationId,
      req.params.scheduleId,
      req.body
    );
    res.json({ success: true, data: { schedule } });
  } catch (err) {
    next(err);
  }
};

const deleteSchedule = async (req, res, next) => {
  try {
    await scheduleService.deleteSchedule(
      req.user.id,
      req.params.medicationId,
      req.params.scheduleId
    );
    res.json({ success: true, message: "Schedule deleted." });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createMedication,
  createSchedule,
  deleteMedication,
  deleteSchedule,
  getMedication,
  getStats,
  getUpcomingDoses,
  listMedications,
  listSchedules,
  updateMedication,
  updateSchedule,
};
