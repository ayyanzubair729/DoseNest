const { Router } = require("express");
const rateLimit = require("express-rate-limit");
const authController = require("../controllers/auth.controller");
const { validateLogin, validateRegister } = require("../validators/auth.validators");
const { protect } = require("../middleware/auth");

const router = Router();

// Stricter, per-IP limit for credential endpoints (the global /api limiter
// still applies on top). Prevents brute-force login/registration attempts
// without locking out normal users.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many attempts. Please try again later." },
});

router.post("/register", authLimiter, validateRegister, authController.register);
router.post("/login", authLimiter, validateLogin, authController.login);
router.post("/logout", authController.logout);
router.get("/me", protect, authController.me);

module.exports = router;
