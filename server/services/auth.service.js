const bcrypt = require("bcryptjs");
const User = require("../models/User");
const AppError = require("../utils/AppError");
const { signToken } = require("../utils/jwt");

const sanitizeUser = (user) => ({
  id: user._id.toString(),
  name: user.name,
  email: user.email,
  role: user.role,
  // Non-sensitive account config the validators and UI rely on.
  timezone: user.timezone,
  phoneNumber: user.phoneNumber || null,
  notificationPreferences: user.notificationPreferences,
});

const register = async ({ name, email, password }) => {
  const existing = await User.findOne({ email });
  if (existing) {
    throw new AppError("An account with this email already exists.", 409);
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await User.create({ name, email, password: passwordHash });

  return { user: sanitizeUser(user), token: signToken(user._id) };
};

const login = async ({ email, password }) => {
  const user = await User.findOne({ email }).select("+password");
  if (!user) {
    throw new AppError("Invalid email or password.", 401);
  }

  const passwordMatches = await bcrypt.compare(password, user.password);
  if (!passwordMatches) {
    throw new AppError("Invalid email or password.", 401);
  }

  return { user: sanitizeUser(user), token: signToken(user._id) };
};

const getUserById = async (id) => {
  const user = await User.findById(id);
  if (!user) {
    throw new AppError("Your account could not be found. Please log in again.", 401);
  }
  return sanitizeUser(user);
};

/**
 * Non-secret session configuration shared with the frontend. The JWT itself
 * is the hard session expiry; the idle timeout is a client-side inactivity
 * guard driven by this value (0 disables it).
 */
const getSessionConfig = () => {
  const raw = Number(process.env.SESSION_IDLE_TIMEOUT_MINUTES);
  const idleTimeoutMinutes = Number.isFinite(raw) && raw > 0 ? raw : 60;
  return { idleTimeoutMinutes };
};

module.exports = { getSessionConfig, getUserById, login, register, sanitizeUser };
