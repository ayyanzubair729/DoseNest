const { Router } = require("express");
const healthRouter = require("./health.routes");
const authRouter = require("./auth.routes");
const medicationRouter = require("./medication.routes");
const medicationLogRouter = require("./medicationLog.routes");
const familyMemberRouter = require("./familyMember.routes");
const notificationRouter = require("./notification.routes");
const whatsappWebhookRouter = require("./whatsappWebhook.routes");

const router = Router();

router.use("/health", healthRouter);
router.use("/auth", authRouter);
router.use("/medications", medicationRouter);
router.use("/medication-logs", medicationLogRouter);
router.use("/family-members", familyMemberRouter);
router.use("/notifications", notificationRouter);
// Phase 8 — provider webhooks (public, no JWT; verified via token/signature).
router.use("/webhooks/whatsapp", whatsappWebhookRouter);

module.exports = router;