const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const rateLimit = require("express-rate-limit");

const apiRouter = require("./routes");
const { notFound } = require("./middleware/notFound");
const { errorHandler } = require("./middleware/errorHandler");

const app = express();

app.use(helmet());

app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true,
  })
);

// WhatsApp webhooks need the RAW body (Meta signs the exact bytes) — this
// must run before the global JSON parser consumes the stream.
app.use("/api/webhooks/whatsapp", express.raw({ type: "application/json" }));

app.use(express.json({ limit: "1mb" }));

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  // Meta delivers webhooks from shared provider IPs — never throttle them.
  skip: (req) => req.path.startsWith("/webhooks/whatsapp"),
});

app.use("/api", apiLimiter);
app.use("/api", apiRouter);

app.use(notFound);
app.use(errorHandler);

module.exports = app;