import { useState } from "react";
import { Link } from "react-router-dom";
import PageWrapper from "../components/common/PageWrapper";
import FamilyMemberForm from "../components/family/FamilyMemberForm";
import ConfirmModal from "../components/medications/ConfirmModal";
import useFamilyMembers from "../hooks/useFamilyMembers";
import familyMembersApi from "../services/familyMembers";
import { birdMain } from "../utils/assets.js";
import {
  ChevronRight,
  CloudOff,
  Heart,
  Loader2,
  Pencil,
  Pill,
  Plus,
  Timer,
  Trash2,
} from "lucide-react";

const formatTime = (iso) => {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
};

const AVATAR_COLORS = ["#79b851", "#f6c453", "#e88b9d", "#8b9de8", "#79b8a8", "#c79b56"];

const pickColor = (name) => {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
};

function AdherenceSummary({ summary }) {
  if (!summary) return null;
  const { todayScheduledDoses: scheduled, takenToday, missedToday, adherencePct, upcomingDose } =
    summary;

  if (scheduled === 0) {
    return <p className="family-card__adherence family-card__adherence--neutral">No doses scheduled today.</p>;
  }

  return (
    <div className="family-card__adherence">
      <div className="family-card__adherence-bar" aria-hidden="true">
        <span
          className="family-card__adherence-fill"
          style={{ width: `${Math.max(adherencePct ?? 0, 0)}%` }}
        />
      </div>
      <div className="family-card__adherence-row">
        <span>
          <strong>{takenToday}</strong> taken · <strong>{missedToday}</strong> missed
        </span>
        <span className="family-card__adherence-pct">{adherencePct === null ? "—" : `${adherencePct}%`}</span>
      </div>
      {upcomingDose && (
        <span className="family-card__next">
          <Timer size={13} aria-hidden="true" />
          Next: {upcomingDose.medicationName} · {formatTime(upcomingDose.scheduledFor)}
        </span>
      )}
    </div>
  );
}

export default function FamilyCarePage() {
  const { familyMembers, loading, error, reload } = useFamilyMembers();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [notice, setNotice] = useState("");

  const flash = (message) => {
    setNotice(message);
    window.setTimeout(() => setNotice(""), 4000);
  };

  const handleSaved = async (_member, message) => {
    setShowForm(false);
    setEditing(null);
    flash(message);
    await reload();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await familyMembersApi.remove(deleteTarget.id);
      setDeleteTarget(null);
      flash(`${deleteTarget.name} removed from Family Care.`);
      await reload();
    } catch (err) {
      setDeleteTarget(null);
      flash(err.message);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <PageWrapper>
      <div className="container family-care">
        <header className="medications__header">
          <div>
            <h1 className="dashboard__title">Family Care</h1>
            <p className="dashboard__subtitle">
              Keep track of medications for the people you care about — all in one place.
            </p>
          </div>
          <button type="button" className="btn btn--primary btn--lg" onClick={() => setShowForm(true)}>
            <Plus size={18} aria-hidden="true" />
            Add family member
          </button>
        </header>

        {notice && (
          <p className="med-notice" role="status">
            {notice}
          </p>
        )}

        {loading ? (
          <div className="page-loader" role="status" aria-live="polite">
            <Loader2 size={22} className="spin" aria-hidden="true" />
            <span className="sr-only">Loading Family Care…</span>
          </div>
        ) : error ? (
          <div className="empty-state">
            <CloudOff size={36} aria-hidden="true" />
            <h2>Couldn&apos;t load Family Care</h2>
            <p>{error}</p>
            <button type="button" className="btn btn--primary" onClick={reload}>
              Try again
            </button>
          </div>
        ) : familyMembers.length === 0 ? (
          <div className="empty-state">
            <img src={birdMain} alt="Nesty, the DoseNest mascot" className="empty-state__bird" />
            <h2>Care for the people who matter.</h2>
            <p>
              Add a family member to keep their medication schedules and progress organized in one
              place.
            </p>
            <button type="button" className="btn btn--primary" onClick={() => setShowForm(true)}>
              <Plus size={18} aria-hidden="true" />
              Add Family Member
            </button>
          </div>
        ) : (
          <div className="family-grid">
            {familyMembers.map((member) => {
              const summary = member.summary || {};
              const color = member.avatarColor || pickColor(member.name);
              return (
                <article key={member.id} className="family-card">
                  <div className="family-card__top">
                    <span className="family-card__avatar" style={{ backgroundColor: color }} aria-hidden="true">
                      {member.name.charAt(0).toUpperCase()}
                    </span>
                    <div className="family-card__identity">
                      <h3>{member.name}</h3>
                      <span className="family-card__relation">{member.relationshipLabel}</span>
                    </div>
                    <div className="family-card__menu">
                      <button
                        type="button"
                        className="family-card__icon-btn"
                        aria-label={`Edit ${member.name}`}
                        onClick={() => setEditing(member)}
                      >
                        <Pencil size={15} aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        className="family-card__icon-btn family-card__icon-btn--danger"
                        aria-label={`Remove ${member.name}`}
                        onClick={() => setDeleteTarget(member)}
                      >
                        <Trash2 size={15} aria-hidden="true" />
                      </button>
                    </div>
                  </div>

                  <div className="family-card__stats">
                    <span className="family-card__stat">
                      <Pill size={14} aria-hidden="true" />
                      {summary.activeMedicationCount ?? 0} active med{summary.activeMedicationCount === 1 ? "" : "s"}
                    </span>
                    <span className="family-card__stat">
                      <Heart size={14} aria-hidden="true" />
                      {summary.todayScheduledDoses ?? 0} dose{summary.todayScheduledDoses === 1 ? "" : "s"} today
                    </span>
                  </div>

                  <AdherenceSummary summary={member.summary} />

                  <Link to={`/family-care/${member.id}`} className="btn btn--ghost btn--sm family-card__link">
                    View details
                    <ChevronRight size={15} aria-hidden="true" />
                  </Link>
                </article>
              );
            })}
          </div>
        )}
      </div>

      {(showForm || editing) && (
        <FamilyMemberForm
          initial={editing}
          onClose={() => {
            setShowForm(false);
            setEditing(null);
          }}
          onSaved={handleSaved}
        />
      )}

      {deleteTarget && (
        <ConfirmModal
          title="Remove this family member?"
          message={`"${deleteTarget.name}" and their Family Care entry will be removed. Medications already assigned to them will need to be reassigned or deleted separately.`}
          busy={deleting}
          confirmLabel="Remove"
          onConfirm={handleDelete}
          onClose={() => setDeleteTarget(null)}
        />
      )}
    </PageWrapper>
  );
}
