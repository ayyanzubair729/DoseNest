import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import useHealth from "../hooks/useHealth";
import PageWrapper from "../components/common/PageWrapper";
import { useAuth } from "../store/AuthContext";
import medicationsApi from "../services/medications";
import familyMembersApi from "../services/familyMembers";
import { birdMain } from "../utils/assets.js";
import {
  CalendarCheck,
  Check,
  ChevronRight,
  CloudOff,
  Heart,
  Loader2,
  Pill,
  Plus,
  Timer,
  Users,
  Wifi,
  X,
} from "lucide-react";
const formatTime = (iso) => {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
};

export default function DashboardPage() {
  const { health, loading: healthLoading, error: healthError } = useHealth();
  const { user } = useAuth();
  const firstName = user?.name?.trim().split(/\s+/)[0] || "friend";

  const [stats, setStats] = useState(null);
  const [familyOverview, setFamilyOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [doseBusy, setDoseBusy] = useState(false);

  const loadStats = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [statsData, familyData] = await Promise.all([
        medicationsApi.stats(),
        familyMembersApi.overview(),
      ]);
      setStats(statsData);
      setFamilyOverview(familyData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    loadStats();
  }, [loadStats]);
  const handleDose = async (action) => {
    const upcoming = stats?.upcomingDose;
    if (!upcoming || doseBusy) return;
    setDoseBusy(true);
    try {
      if (action === "taken") await medicationsApi.markTaken(upcoming.id);
      else await medicationsApi.markMissed(upcoming.id);
      await loadStats();
    } catch (err) {
      setError(err.message);
    } finally {
      setDoseBusy(false);
    }
  };
  const statCards = [
    {
      label: "Active medications",
      value: stats?.activeMedications ?? 0,
      icon: Pill,
    },
    {
      label: "Today&apos;s doses",
      value: stats?.todayScheduledDoses ?? 0,
      icon: CalendarCheck,
    },
    { label: "Taken today", value: stats?.takenToday ?? 0, icon: Check },
    { label: "Missed today", value: stats?.missedToday ?? 0, icon: X },
  ];

  const upcoming = stats?.upcomingDose;

  const familySection =
    familyOverview?.memberCount === 0 ? (
      <Link to="/family-care" className="family-dashboard-cta">
        <span className="family-dashboard-cta__icon" aria-hidden="true">
          <Users size={18} />
        </span>
        <span className="family-dashboard-cta__text">
          <strong>Add someone to Family Care</strong>
          <span>Keep medications for the people you care about in one place.</span>
        </span>
        <ChevronRight size={18} aria-hidden="true" />
      </Link>
    ) : (
      familyOverview && (
        <section className="family-dashboard">
          <div className="family-dashboard__head">
            <span className="pill pill--soft">
              <Heart size={15} aria-hidden="true" />
              Family Care
            </span>
            <Link to="/family-care" className="family-dashboard__view">
              View Family Care
              <ChevronRight size={15} aria-hidden="true" />
            </Link>
          </div>
          <div className="family-dashboard__body">
            <div className="family-dashboard__stat">
              <span className="family-dashboard__value">{familyOverview.memberCount}</span>
              <span className="family-dashboard__label">
                {familyOverview.memberCount === 1 ? "person" : "people"} cared for
              </span>
            </div>
            <div className="family-dashboard__stat">
              <span className="family-dashboard__value">
                {familyOverview.adherencePct === null ? "—" : `${familyOverview.adherencePct}%`}
              </span>
              <span className="family-dashboard__label">family adherence today</span>
            </div>
            <div className="family-dashboard__stat family-dashboard__stat--wide">
              {familyOverview.upcomingDose ? (
                <>
                  <span className="family-dashboard__next">
                    <Timer size={14} aria-hidden="true" />
                    Next family dose
                  </span>
                  <span className="family-dashboard__next-name">
                    {familyOverview.upcomingDose.medicationName} ·{" "}
                    {formatTime(familyOverview.upcomingDose.scheduledFor)}
                  </span>
                </>
              ) : (
                <span className="family-dashboard__next-name">No upcoming family doses.</span>
              )}
            </div>
          </div>
        </section>
      )
    );

  return (
    <PageWrapper>
      <div className="container dashboard">
        <header className="dashboard__header">
          <div>
            <h1 className="dashboard__title">Family dashboard</h1>
            <p className="dashboard__subtitle">
              Welcome back, {firstName}. Here&apos;s what&apos;s happening with your medications.
            </p>
          </div>

          <div className="status-chip">
            {healthLoading && (
              <>
                <Loader2 size={14} className="spin" aria-hidden="true" />
                Checking API…
              </>
            )}
            {!healthLoading && healthError && (
              <>
                <CloudOff size={14} aria-hidden="true" />
                API unreachable
              </>
            )}
            {!healthLoading && !healthError && (
              <>
                <Wifi size={14} aria-hidden="true" />
                API online · Database{" "}
                {health?.database === "connected" ? "connected" : "disconnected"}
              </>
            )}
          </div>
        </header>

        {loading ? (
          <div className="page-loader" role="status" aria-live="polite">
            <Loader2 size={22} className="spin" aria-hidden="true" />
            <span className="sr-only">Loading dashboard…</span>
          </div>
        ) : error ? (
          <div className="empty-state">
            <CloudOff size={36} aria-hidden="true" />
            <h2>Couldn&apos;t load your dashboard</h2>
            <p>{error}</p>
            <button type="button" className="btn btn--primary" onClick={loadStats}>
              Try again
            </button>
          </div>
        ) : !stats || stats.totalMedications === 0 ? (
          <>
            <section className="empty-state">
              <img src={birdMain} alt="Nesty, the DoseNest mascot" className="empty-state__bird" />
              <h2>No medications added yet</h2>
              <p>
                Your dashboard will show real schedules, upcoming doses, and adherence — straight
                from your data.
              </p>
              <Link to="/medications" className="btn btn--primary">
                <Plus size={18} aria-hidden="true" />
                Add your first medication
              </Link>
            </section>
            {familySection}
          </>
        ) : (
          <>
            <div className="stats-grid">
              {statCards.map(({ label, value, icon: Icon }) => (
                <div key={label} className="stat-card">
                  <span className="stat-card__icon" aria-hidden="true">
                    <Icon size={18} />
                  </span>
                  <span className="stat-card__value">{value}</span>
                  <span className="stat-card__label">{label}</span>
                </div>
              ))}
            </div>

            <section className="upcoming-panel">
              <div className="upcoming-panel__head">
                <span className="pill">
                  <Timer size={15} aria-hidden="true" />
                  Next dose
                </span>
              </div>

              {upcoming ? (
                <div className="upcoming-dose">
                  <div className="upcoming-dose__info">
                    <h3>{upcoming.medicationName}</h3>
                    <p>
                      {[upcoming.dosage, upcoming.dosageUnit].filter(Boolean).join(" ") ||
                        "Dose not specified"}
                      {upcoming.scheduleTime ? ` · ${formatTime(upcoming.scheduledFor)}` : ""}
                    </p>
                  </div>
                  <div className="upcoming-dose__actions">
                    <button
                      type="button"
                      className="btn btn--primary btn--sm"
                      onClick={() => handleDose("taken")}
                      disabled={doseBusy}
                    >
                      <Check size={16} aria-hidden="true" />
                      Taken
                    </button>
                    <button
                      type="button"
                      className="btn btn--ghost btn--sm"
                      onClick={() => handleDose("missed")}
                      disabled={doseBusy}
                    >
                      Missed
                    </button>
                  </div>
                </div>
              ) : (
                <p className="upcoming-panel__empty">No upcoming doses.</p>
              )}
            </section>

            {familySection}
          </>
        )}
      </div>
    </PageWrapper>
  );
}
