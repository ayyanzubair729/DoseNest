import { useCallback, useEffect, useState } from "react";
import { Loader2, MessageCircle, Send } from "lucide-react";
import PageWrapper from "../components/common/PageWrapper";
import whatsappApi from "../services/whatsapp";

const PHONE_PATTERN = /^\+[1-9]\d{1,14}$/;

export default function SettingsPage() {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [optIn, setOptIn] = useState(false);
  const [fieldError, setFieldError] = useState("");
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await whatsappApi.status();
      setStatus(data);
      setPhoneNumber(data.phoneNumber || "");
      setOptIn(Boolean(data.optIn));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleSave = async (event) => {
    event.preventDefault();
    setNotice("");
    setError("");
    setFieldError("");

    const trimmed = phoneNumber.trim();

    // Consent requires a valid phone number — never save the opt-in without one.
    if (optIn && !PHONE_PATTERN.test(trimmed)) {
      setFieldError(
        "Please enter a valid international phone number before enabling WhatsApp reminders."
      );
      return;
    }

    setSaving(true);
    try {
      const updated = await whatsappApi.updateSettings({
        phoneNumber: trimmed,
        whatsappRemindersEnabled: optIn,
      });
      setPhoneNumber(updated.phoneNumber || "");
      setOptIn(updated.notificationPreferences?.whatsapp === true);
      setNotice("WhatsApp settings saved.");
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    setNotice("");
    setError("");
    setTesting(true);
    try {
      const delivery = await whatsappApi.sendTest();
      setNotice(
        delivery.simulated
          ? "Test message simulated. No real WhatsApp message was sent."
          : "Test message sent to your WhatsApp number."
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setTesting(false);
    }
  };

  const canTest = Boolean(
    status?.hasPhoneNumber && (status?.usable || status?.testMode)
  );

  return (
    <PageWrapper>
      <div className="container settings">
        <header className="settings__header">
          <h1>Settings</h1>
          <p>Manage your account and notification preferences.</p>
        </header>

        {loading ? (
          <div className="page-loader" role="status" aria-live="polite">
            <Loader2 size={22} className="spin" aria-hidden="true" />
            <span className="sr-only">Loading settings…</span>
          </div>
        ) : error && !status ? (
          <div className="empty-state">
            <h2>Couldn&apos;t load your settings</h2>
            <p>{error}</p>
            <button type="button" className="btn btn--primary" onClick={load}>
              Try again
            </button>
          </div>
        ) : (
          <section className="settings-card" aria-labelledby="wa-settings-title">
            <div className="settings-card__head">
              <span className="settings-card__title">
                <MessageCircle size={20} aria-hidden="true" />
                <h2 id="wa-settings-title">WhatsApp Medication Reminders</h2>
              </span>
              <span
                className={`status-chip${optIn ? " status-chip--on" : " status-chip--off"}`}
              >
                {optIn ? "Enabled" : "Disabled"}
              </span>
            </div>

            <p className="settings-card__desc">
              Receive your medication reminders directly on WhatsApp. You control whether
              DoseNest can send reminders to your number.
            </p>

            {/* Provider-level configuration (server state, not the user's choice). */}
            {!status?.configured && status?.testMode && (
              <div className="settings-notice">
                <strong>Development simulation is available.</strong> The server is in test mode:
                reminders are simulated locally and never sent to the provider. Provider
                configuration is <strong>not configured for real delivery</strong> — real messages
                start only once the server is configured and enabled.
              </div>
            )}

            {!status?.configured && !status?.testMode && (
              <div className="settings-notice">
                <span>
                  WhatsApp is not configured on the server yet. You can save your number and
                  preference now; reminders will start once it&apos;s enabled.
                </span>
              </div>
            )}

            {status?.configured && !status?.enabled && (
              <div className="settings-notice">
                <span>
                  The server is configured for WhatsApp but delivery is currently disabled.
                  Reminders are not being sent until it is enabled.
                </span>
              </div>
            )}

            {status?.configured && status?.enabled && (
              <div className="settings-notice settings-notice--real">
                <span>
                  Real WhatsApp delivery is enabled. Medication reminders are sent through the
                  WhatsApp Cloud API to your number.
                </span>
              </div>
            )}

            {/* Current consent state — explicit, always reflects the saved backend value. */}
            <div className="settings-state" role="status">
              {optIn ? (
                <>
                  <p className="settings-state__title">WhatsApp reminders are enabled.</p>
                  <p className="settings-state__detail">
                    Medication reminders can be sent to your saved WhatsApp number.
                  </p>
                </>
              ) : (
                <>
                  <p className="settings-state__title">WhatsApp reminders are currently off.</p>
                  <p className="settings-state__detail">
                    Enable reminders to receive medication notifications on WhatsApp.
                  </p>
                </>
              )}
            </div>

            {status?.testMode && (
              <div className="settings-dev-note">
                Development simulation active — no real WhatsApp message was sent.
              </div>
            )}

            <form className="settings-form" onSubmit={handleSave} noValidate>
              <div className="field">
                <label className="field__label" htmlFor="wa-phone">
                  WhatsApp phone number
                </label>
                <input
                  id="wa-phone"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  className={fieldError ? "field__input field__input--error" : "field__input"}
                  placeholder="+15551234567"
                  value={phoneNumber}
                  onChange={(event) => setPhoneNumber(event.target.value)}
                  disabled={saving}
                  aria-invalid={Boolean(fieldError)}
                  aria-describedby={fieldError ? "wa-phone-error" : "wa-phone-hint"}
                />
                {fieldError ? (
                  <span className="field__error" id="wa-phone-error" role="alert">
                    {fieldError}
                  </span>
                ) : (
                  <span className="field__hint" id="wa-phone-hint">
                    International format (E.164), e.g. +15551234567. Only used for your own reminders.
                  </span>
                )}
              </div>

              <div className="toggle">
                <span className="toggle__control">
                  <input
                    type="checkbox"
                    checked={optIn}
                    onChange={(event) => setOptIn(event.target.checked)}
                    disabled={saving}
                  />
                  <span className="toggle__track" aria-hidden="true">
                    <span className="toggle__knob" />
                  </span>
                </span>
                <span className="toggle__text">
                  <span className="toggle__label">Accept WhatsApp medication reminders</span>
                  <span className="toggle__hint">
                    When enabled, DoseNest may send medication reminders to this number. You can
                    disable this at any time.
                  </span>
                </span>
              </div>

              <div className="settings-form__actions">
                <button type="submit" className="btn btn--primary" disabled={saving}>
                  {saving ? (
                    <>
                      <Loader2 size={17} className="spin" aria-hidden="true" />
                      Saving…
                    </>
                  ) : (
                    "Save settings"
                  )}
                </button>
                {canTest && (
                  <button
                    type="button"
                    className="btn btn--ghost"
                    onClick={handleTest}
                    disabled={testing}
                  >
                    {testing ? (
                      <>
                        <Loader2 size={16} className="spin" aria-hidden="true" />
                        Sending…
                      </>
                    ) : (
                      <>
                        <Send size={16} aria-hidden="true" />
                        Send test message
                      </>
                    )}
                  </button>
                )}
              </div>

              {notice && (
                <p className="settings-success" role="status">
                  {notice}
                </p>
              )}
              {error && (
                <p className="auth__error" role="alert">
                  {error}
                </p>
              )}
            </form>
          </section>
        )}
      </div>
    </PageWrapper>
  );
}
