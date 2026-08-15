const authService = require("../services/auth.service");
const { cookieName, cookieOptions } = require("../utils/jwt");

// /api/auth/me — restore the authenticated session. Returns only safe user
// data plus non-secret session config; never passwords, tokens, or secrets.
const me = (req, res) => {
  res.json({
    success: true,
    data: {
      user: req.user,
      session: authService.getSessionConfig(),
    },
  });
};

const register = async (req, res, next) => {
  try {
    const { user, token } = await authService.register(req.body);
    res.cookie(cookieName, token, cookieOptions);
    res.status(201).json({ success: true, data: { user } });
  } catch (err) {
    next(err);
  }
};

const login = async (req, res, next) => {
  try {
    const { user, token } = await authService.login(req.body);
    res.cookie(cookieName, token, cookieOptions);
    res.json({ success: true, data: { user } });
  } catch (err) {
    next(err);
  }
};

const logout = (req, res) => {
  // clearCookie must not receive maxAge or the cookie is re-set with a future
  // expiry instead of being deleted.
  const clearOptions = { ...cookieOptions };
  delete clearOptions.maxAge;
  res.clearCookie(cookieName, clearOptions);
  res.json({ success: true, message: "Logged out successfully." });
};

module.exports = { register, login, me, logout };
