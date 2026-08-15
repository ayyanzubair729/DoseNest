const { Router } = require("express");
const { protect } = require("../middleware/auth");
const {
  assertValidObjectId,
  validateMedicationInput,
  validateMedicationUpdate,
  validateScheduleInput,
} = require("../validators/medication.validators");
const medicationController = require("../controllers/medication.controller");

const router = Router();

router.use(protect);

// Static routes must be registered before the :id route.
router.get("/upcoming", medicationController.getUpcomingDoses);
router.get("/stats", medicationController.getStats);

router.get("/", medicationController.listMedications);
router.post("/", validateMedicationInput, medicationController.createMedication);
router.get("/:id", assertValidObjectId, medicationController.getMedication);
router.put("/:id", assertValidObjectId, validateMedicationUpdate, medicationController.updateMedication);
router.delete("/:id", assertValidObjectId, medicationController.deleteMedication);

// Nested schedule routes
router.get(
  "/:medicationId/schedules",
  assertValidObjectId,
  medicationController.listSchedules
);
router.post(
  "/:medicationId/schedules",
  assertValidObjectId,
  validateScheduleInput,
  medicationController.createSchedule
);
router.put(
  "/:medicationId/schedules/:scheduleId",
  assertValidObjectId,
  validateScheduleInput,
  medicationController.updateSchedule
);
router.delete(
  "/:medicationId/schedules/:scheduleId",
  assertValidObjectId,
  medicationController.deleteSchedule
);

module.exports = router;
