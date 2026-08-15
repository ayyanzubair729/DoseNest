import axios from "axios";

const api = axios.create({
  baseURL: "/api",
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

// Endpoints that legitimately return 401 (bad credentials) — these must never
// be treated as session expiry.
const AUTH_PATHS = ["/auth/login", "/auth/register"];

// ---- Session-expiry notification (registered by AuthProvider) ----
let unauthorizedHandler = null;
let notifiedThisEpoch = false;

// In-memory "session expired" signal. Passed via a module store instead of
// navigation state because ProtectedRoute's own redirect can overwrite the
// history entry during the same render cycle.
let sessionExpiredFlag = false;

export function setSessionExpired() {
  sessionExpiredFlag = true;
}

export function clearSessionExpired() {
  sessionExpiredFlag = false;
}

/** Non-destructive read for the login page (cleared on successful login). */
export function peekSessionExpired() {
  return sessionExpiredFlag;
}

/**
 * Registers the handler invoked when an authenticated request returns 401.
 * The handler receives no arguments; AuthProvider clears auth state and
 * redirects to login. Only one handler can be active.
 */
export function onUnauthorized(handler) {
  unauthorizedHandler = handler;
  notifiedThisEpoch = false;
}

export function clearUnauthorizedHandler() {
  unauthorizedHandler = null;
}

/** Resets the once-per-session guard after a fresh login. */
export function resetUnauthorizedNotified() {
  notifiedThisEpoch = false;
}

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const url = error.config?.url || "";

    // A 401 on a non-auth endpoint means the session expired while in use.
    // Notify once per session epoch to avoid repeated redirects from parallel
    // requests (e.g. notification polling + page data).
    if (status === 401 && unauthorizedHandler && !notifiedThisEpoch) {
      const isAuthEndpoint = AUTH_PATHS.some((path) => url.includes(path));
      if (!isAuthEndpoint) {
        notifiedThisEpoch = true;
        unauthorizedHandler();
      }
    }

    const message =
      error.response?.data?.message || "Something went wrong. Please try again later.";
    return Promise.reject(new Error(message));
  }
);

export default api;
