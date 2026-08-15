const mongoose = require("mongoose");

/**
 * Phase 8 — idempotency store for WhatsApp webhook events.
 *
 * Meta may deliver the same webhook event more than once. Before processing
 * an event (a delivery status update or an incoming message), the webhook
 * service tries to insert a row here with a stable event key:
 *
 *   - messages:  "message:<messages[].id>"
 *   - statuses:  "status:<statuses[].id>:<status>"
 *
 * A duplicate key error means the event was already processed — the handler
 * simply skips it, so the same TAKEN reply can never mark a dose twice or
 * send a second confirmation message.
 *
 * Rows expire after 7 days (Meta webhook retries fall well inside this).
 */
const whatsappEventSchema = new mongoose.Schema(
  {
    eventId: {
      type: String,
      required: true,
      unique: true,
    },
    kind: {
      type: String,
      enum: ["status", "message"],
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

whatsappEventSchema.index({ createdAt: 1 }, { expireAfterSeconds: 7 * 24 * 60 * 60 });

module.exports = mongoose.model("WhatsAppEvent", whatsappEventSchema);
