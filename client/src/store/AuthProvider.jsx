import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "./AuthContext";
import authApi from "../services/auth";
import useIdleTimeout from "../hooks/useIdleTimeout";
import {
  clearSessionExpired,
  clearUnauthorizedHandler,
  onUnauthorized,
  resetUnauthorizedNotified,
  setSessionExpired,
} from "../services/api";

export default function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [idleTimeoutMinutes, setIdleTimeoutMinutes] = useState(0);

  // Refs so the 401 handler and idle guard always see the current session.
  const userRef = useRef(user);
  userRef.current = user;
  const expiredHandledRef = useRef(false);

  const navigate = useNavigate();

  // Restore the session from the backend on startup. Never trust stale
  // frontend state: an invalid/expired cookie simply means "not logged in".
  useEffect(() => {
    let active = true;

    authApi
      .me()
      .then(({ user: currentUser, session }) => {
        if (!active) return;
        setUser(currentUser);
        setIdleTimeoutMinutes(session?.idleTimeoutMinutes || 0);
      })
      .catch(() => {
        if (active) setUser(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  // Global 401 handling: an authenticated request rejected with 401 means the
  // session expired while the user was active. Clear state and redirect once.
  useEffect(() => {
    onUnauthorized(() => {
      if (expiredHandledRef.current) return;
      if (!userRef.current) return; // no live session to expire
      expiredHandledRef.current = true;
      setSessionExpired();
      setUser(null);
      navigate("/login", { replace: true });
    });

    return () => clearUnauthorizedHandler();
  }, [navigate]);

  const login = useCallback(async ({ email, password }) => {
    const currentUser = await authApi.login({ email, password });
    expiredHandledRef.current = false;
    clearSessionExpired();
    resetUnauthorizedNotified();
    setUser(currentUser);
    return currentUser;
  }, []);

  const register = useCallback(async ({ name, email, password }) => {
    const currentUser = await authApi.register({ name, email, password });
    expiredHandledRef.current = false;
    clearSessionExpired();
    resetUnauthorizedNotified();
    setUser(currentUser);
    return currentUser;
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } finally {
      // Clear client-side session state (cached user) regardless of the API
      // result; protected routes then redirect to login.
      setUser(null);
    }
  }, []);

  // Idle session guard: after `idleTimeoutMinutes` of genuine inactivity the
  // client clears the session (cookie + state) and asks for re-authentication.
  // The JWT lifetime remains the hard server-side expiry.
  const handleIdleExpire = useCallback(async () => {
    if (expiredHandledRef.current) return;
    expiredHandledRef.current = true;
    try {
      await authApi.logout();
    } catch {
      // Cookie may already be gone; state still clears below.
    } finally {
      setSessionExpired();
      setUser(null);
      navigate("/login", { replace: true });
    }
  }, [navigate]);

  useIdleTimeout({
    enabled: Boolean(user) && idleTimeoutMinutes > 0,
    minutes: idleTimeoutMinutes,
    onExpire: handleIdleExpire,
  });

  const value = useMemo(
    () => ({
      user,
      loading,
      isAuthenticated: Boolean(user),
      login,
      register,
      logout,
    }),
    [user, loading, login, register, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
