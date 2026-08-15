const { Router } = require("express");
const whatsappWebhookController = require("../controllers/whatsappWebhook.controller");

const router = Router();

// Public on purpose — Meta calls these without a DoseNest session. Security
// comes from the verify-token handshake and signature verification, not JWT.
// The RAW body is captured app-level (server/app.js) before the JSON parser
// so X-Hub-Signature-256 can be verified over the exact bytes Meta sent.
router.get("/", whatsappWebhookController.verify);
router.post("/", whatsappWebhookController.handleEvent);

module.exports = router;
