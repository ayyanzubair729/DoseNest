import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import PageWrapper from "../components/common/PageWrapper";
import { useAuth } from "../store/AuthContext";
import { registerBackground } from "../utils/assets.js";
import { Loader2, UserPlus } from "lucide-react";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function RegisterPage() {
  const { register, isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

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
    if (!name.trim()) {
      next.name = "Name is required.";
    } else if (name.trim().length < 2) {
      next.name = "Name must be at least 2 characters.";
    }
    if (!email.trim()) {
      next.email = "Email is required.";
    } else if (!EMAIL_PATTERN.test(email.trim())) {
      next.email = "Please enter a valid email address.";
    }
    if (!password) {
      next.password = "Password is required.";
    } else if (password.length < 8) {
      next.password = "Password must be at least 8 characters.";
    }
    if (!confirmPassword) {
      next.confirmPassword = "Please confirm your password.";
    } else if (confirmPassword !== password) {
      next.confirmPassword = "Passwords do not match.";
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
      await register({
        name: name.trim(),
        email: email.trim(),
        password,
      });
      navigate("/dashboard", { replace: true });
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
        style={{ backgroundImage: `url(${registerBackground})` }}
      >
        <div className="container auth__inner">
        <div className="auth__card">
          <UserPlus size={28} aria-hidden="true" />
          <h1>Create your account</h1>
          <p className="auth__note">Start managing medications for you and your family.</p>

          <form className="auth__form" onSubmit={handleSubmit} noValidate>
            <label className="field">
              <span className="field__label">Name</span>
              <input
                type="text"
                name="name"
                autoComplete="name"
                className={errors.name ? "field__input field__input--error" : "field__input"}
                placeholder="Your name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                disabled={submitting}
              />
              {errors.name && <span className="field__error">{errors.name}</span>}
            </label>

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
                autoComplete="new-password"
                className={errors.password ? "field__input field__input--error" : "field__input"}
                placeholder="At least 8 characters"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                disabled={submitting}
              />
              {errors.password && <span className="field__error">{errors.password}</span>}
            </label>

            <label className="field">
              <span className="field__label">Confirm password</span>
              <input
                type="password"
                name="confirmPassword"
                autoComplete="new-password"
                className={
                  errors.confirmPassword ? "field__input field__input--error" : "field__input"
                }
                placeholder="Repeat your password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                disabled={submitting}
              />
              {errors.confirmPassword && (
                <span className="field__error">{errors.confirmPassword}</span>
              )}
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
                  Creating account…
                </>
              ) : (
                "Get started"
              )}
            </button>
          </form>

          <p className="auth__note">
            Already have an account?{" "}
            <Link to="/login" className="auth__link">
              Log in
            </Link>
          </p>
        </div>
        </div>
      </section>
    </PageWrapper>
  );
}
