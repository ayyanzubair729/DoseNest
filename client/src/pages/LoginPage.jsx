import { useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import PageWrapper from "../components/common/PageWrapper";
import { useAuth } from "../store/AuthContext";
import { peekSessionExpired } from "../services/api";
import { birdPhone, loginBackground } from "../utils/assets.js";
import { Loader2, Lock } from "lucide-react";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function LoginPage() {
  const { login, isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const from = location.state?.from || "/dashboard";

  // Session-expired signal set by the 401 handler / idle guard before this
  // page mounts; cleared on successful login. A normal visit never shows it.
  const sessionExpired = peekSessionExpired();

  if (loading) {
    return (
      <PageWrapper>
        <div className="page-loader" role="status" aria-live="polite">
          <Loader2 size={22} className="spin" aria-hidden="true" />
          <span className="sr-only">Loading…</span>
        </div>
      </PageWrapper>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const validate = () => {
    const next = {};
    if (!email.trim()) {
      next.email = "Email is required.";
    } else if (!EMAIL_PATTERN.test(email.trim())) {
      next.email = "Please enter a valid email address.";
    }
    if (!password) {
      next.password = "Password is required.";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFormError("");
    if (submitting || !validate()) return;

    setSubmitting(true);
    try {
      await login({ email: email.trim(), password });
      navigate(from, { replace: true });
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PageWrapper>
      <section
        className="auth"
        style={{ backgroundImage: `url(${loginBackground})` }}
      >
        <div className="container auth__inner">
        <div className="auth__stack">
        <img
          src={birdPhone}
          alt="Nesty, the DoseNest mascot"
          className="auth__bird"
          aria-hidden="true"
        />
        <div className="auth__card">
          <Lock size={28} aria-hidden="true" />
          <h1>Welcome back</h1>
          <p className="auth__note">Log in to manage medications for you and your family.</p>

          {sessionExpired && (
            <p className="auth__notice" role="status">
              Your session has expired. Please log in again.
            </p>
          )}

          <form className="auth__form" onSubmit={handleSubmit} noValidate>
            <label className="field">
              <span className="field__label">Email</span>
              <input
                type="email"
                name="email"
                autoComplete="email"
                className={errors.email ? "field__input field__input--error" : "field__input"}
                placeholder="you@example.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                disabled={submitting}
              />
              {errors.email && <span className="field__error">{errors.email}</span>}
            </label>

            <label className="field">
              <span className="field__label">Password</span>
              <input
                type="password"
                name="password"
                autoComplete="current-password"
                className={errors.password ? "field__input field__input--error" : "field__input"}
                placeholder="Your password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                disabled={submitting}
              />
              {errors.password && <span className="field__error">{errors.password}</span>}
            </label>

            {formError && (
              <p className="auth__error" role="alert">
                {formError}
              </p>
            )}

            <button type="submit" className="btn btn--primary btn--lg auth__submit" disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 size={18} className="spin" aria-hidden="true" />
                  Signing in…
                </>
              ) : (
                "Sign in"
              )}
            </button>
          </form>

          <p className="auth__note">
            New to DoseNest?{" "}
            <Link to="/register" className="auth__link">
              Create an account
            </Link>
          </p>
        </div>
        </div>
        </div>
      </section>
    </PageWrapper>
  );
}
