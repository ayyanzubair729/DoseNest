const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET is not set. Check server/.env (see server/.env.example).");
}

const cookieName = "access_token";

const parseDurationToMs = (value) => {
  const match = /^(\d+)\s*(s|m|h|d|w)?$/i.exec(String(value || "").trim());
  if (!match) return null;
  const amount = Number(match[1]);
  const unit = (match[2] || "d").toLowerCase();
  const multipliers = { s: 1000, m: 60000, h: 3600000, d: 86400000, w: 604800000 };
  return amount * multipliers[unit];
};

// Access-token lifetime. JWT_ACCESS_TOKEN_EXPIRES_IN is the preferred name;
// JWT_EXPIRES_IN is kept as a legacy alias so existing .env files keep working.
const getTokenExpiresIn = () =>
  process.env.JWT_ACCESS_TOKEN_EXPIRES_IN || process.env.JWT_EXPIRES_IN || "7d";

const signToken = (userId) =>
  jwt.sign({ sub: userId.toString() }, JWT_SECRET, {
    expiresIn: getTokenExpiresIn(),
  });

const verifyToken = (token) => jwt.verify(token, JWT_SECRET);

// Keep the cookie lifetime aligned with the JWT lifetime from the environment.
const tokenExpiryMs =
  parseDurationToMs(getTokenExpiresIn()) ?? 7 * 24 * 60 * 60 * 1000;

const cookieOptions = {
  httpOnly: true,
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: tokenExpiryMs,
};

module.exports = { cookieName, cookieOptions, signToken, verifyToken };
