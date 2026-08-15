const { Router } = require("express");
const { protect } = require("../middleware/auth");
const { assertValidObjectId } = require("../validators/notification.validators");
const { validateWhatsAppSettings } = require("../validators/whatsapp.validators");
const notificationController = require("../controllers/notification.controller");
const whatsappController = require("../controllers/whatsapp.controller");

const router = Router();

router.use(protect);

// Static routes must be registered before the :id route.
router.get("/unread-count", notificationController.getUnreadCount);
router.put("/read-all", notificationController.markAllRead);
router.get("/next", notificationController.getNextReminder);

// Phase 7 — WhatsApp delivery (all protected; the test endpoint only ever
// sends to the authenticated user's own number).
router.get("/whatsapp/status", whatsappController.getStatus);
router.put("/whatsapp/settings", validateWhatsAppSettings, whatsappController.updateSettings);
router.post("/whatsapp/test", whatsappController.sendTest);
// Phase 8 — dev webhook simulation (protected, test-mode only, same service
// as real Meta events).
router.post("/whatsapp/simulate-webhook", whatsappController.simulateWebhook);

router.get("/", notificationController.listNotifications);
router.put("/:id/read", assertValidObjectId, notificationController.markNotificationRead);

module.exports = router;
