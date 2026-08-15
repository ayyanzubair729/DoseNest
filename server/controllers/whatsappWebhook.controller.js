const whatsappWebhookService = require("../services/whatsapp/whatsapp.webhook.service");

/**
 * GET /api/webhooks/whatsapp — Meta subscription handshake. Responds with the
 * challenge only when the verify token matches configuration.
 */
const verify = (req, res) => {
  const challenge = whatsappWebhookService.verifyWebhook({
    mode: req.query["hub.mode"],
    verifyToken: req.query["hub.verify_token"],
    challenge: req.query["hub.challenge"],
  });
  if (challenge !== null) {
    return res.type("text/plain").send(challenge);
  }
  return res.status(403).json({ success: false, message: "Webhook verification failed." });
};

/**
 * POST /api/webhooks/whatsapp — provider events (delivery status + incoming
 * messages). The body is parsed from the raw buffer so the X-Hub-Signature-256
 * HMAC can be verified against exactly what Meta sent.
 */
const handleEvent = async (req, res, next) => {
  try {
    const raw = req.body; // Buffer (express.raw)
    const payload = JSON.parse(raw.toString("utf8"));
    if (!whatsappWebhookService.verifySignature(req.headers, raw)) {
      return res.status(403).json({ success: false, message: "Invalid webhook signature." });
    }
    const stats = await whatsappWebhookService.processWebhookPayload(payload);
    // Always acknowledge — Meta retries non-2xx responses, and the service
    // itself is idempotent.
    return res.status(200).json({ success: true, stats });
  } catch (err) {
    if (err instanceof SyntaxError) {
      return res.status(400).json({ success: false, message: "Invalid JSON body." });
    }
    return next(err);
  }
};

module.exports = { handleEvent, verify };
