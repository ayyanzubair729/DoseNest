const AppError = require("../utils/AppError");
const { verifyToken } = require("../utils/jwt");
const { parseCookies } = require("../utils/cookies");
const authService = require("../services/auth.service");

const extractToken = (req) => {
  const cookies = parseCookies(req);
  if (cookies.access_token) {
    return cookies.access_token;
  }

  const header = req.headers.authorization;
  if (header && header.startsWith("Bearer ")) {
    return header.slice(7).trim();
  }

  return null;
};

const protect = async (req, res, next) => {
  try {
    const token = extractToken(req);
    if (!token) {
      return next(new AppError("You are not logged in. Please log in to continue.", 401));
    }

    let payload;
    try {
      payload = verifyToken(token);
    } catch {
      return next(new AppError("Your session has expired. Please log in again.", 401));
    }

    if (!payload.sub || typeof payload.sub !== "string") {
      return next(new AppError("Your session is invalid. Please log in again.", 401));
    }

    const user = await authService.getUserById(payload.sub);
    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
};

module.exports = { protect };
