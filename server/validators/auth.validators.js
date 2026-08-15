const AppError = require("../utils/AppError");

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const normalizeEmail = (value) =>
  typeof value === "string" ? value.trim().toLowerCase() : value;

const validateRegister = (req, _res, next) => {
  const { name, email, password } = req.body || {};

  if (!name || typeof name !== "string" || !name.trim()) {
    return next(new AppError("Please provide your name.", 400));
  }
  if (name.trim().length < 2 || name.trim().length > 60) {
    return next(new AppError("Name must be between 2 and 60 characters.", 400));
  }
  if (!email || typeof email !== "string" || !EMAIL_PATTERN.test(normalizeEmail(email))) {
    return next(new AppError("Please provide a valid email address.", 400));
  }
  if (!password || typeof password !== "string") {
    return next(new AppError("Please provide a password.", 400));
  }
  if (password.length < 8 || password.length > 72) {
    return next(new AppError("Password must be between 8 and 72 characters.", 400));
  }

  req.body.name = name.trim();
  req.body.email = normalizeEmail(email);
  next();
};

const validateLogin = (req, _res, next) => {
  const { email, password } = req.body || {};

  if (!email || typeof email !== "string" || !EMAIL_PATTERN.test(normalizeEmail(email))) {
    return next(new AppError("Please provide a valid email address.", 400));
  }
  if (!password || typeof password !== "string" || password.length === 0) {
    return next(new AppError("Please provide your password.", 400));
  }

  req.body.email = normalizeEmail(email);
  next();
};

module.exports = { validateRegister, validateLogin };
