const whatsappDeliveryService = require("../services/whatsapp/whatsapp.delivery.service");
const whatsappWebhookService = require("../services/whatsapp/whatsapp.webhook.service");
const { sanitizeUser } = require("../services/auth.service");

const getStatus = async (req, res, next) => {
  try {
    const status = await whatsappDeliveryService.getStatusForUser(req.user);
    res.json({ success: true, data: { status } });
  } catch (err) {
    next(err);
  }
};

const updateSettings = async (req, res, next) => {
  try {
    const user = await whatsappDeliveryService.updateSettingsForUser(req.user.id, {
      phoneNumber: req.body.phoneNumber,
      whatsappRemindersEnabled: req.body.whatsappRemindersEnabled,
    });
    res.json({ success: true, data: { user: sanitizeUser(user) } });
  } catch (err) {
    next(err);
  }
};

const sendTest = async (req, res, next) => {
  try {
    const result = await whatsappDeliveryService.sendTestMessageForUser(req.user);
    res.json({ success: true, data: { delivery: result } });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/notifications/whatsapp/simulate-webhook (protected, test mode
 * only) — feeds a fabricated Meta event through the same webhook processing
 * service used for real events. Never touches the provider.
 */
const simulateWebhook = async (req, res, next) => {
  try {
    const result = await whatsappWebhookService.simulateForUser(req.user, req.body);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

module.exports = { getStatus, sendTest, simulateWebhook, updateSettings };
