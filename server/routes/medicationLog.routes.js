const { Router } = require("express");
const { protect } = require("../middleware/auth");
const { assertValidObjectId } = require("../validators/medication.validators");
const medicationLogController = require("../controllers/medicationLog.controller");

const router = Router();

router.use(protect);

router.get("/", medicationLogController.listLogs);
router.post("/:id/taken", assertValidObjectId, medicationLogController.markTaken);
router.post("/:id/missed", assertValidObjectId, medicationLogController.markMissed);

module.exports = router;
