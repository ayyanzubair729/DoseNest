import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import PageWrapper from "../components/common/PageWrapper";
import MedicationCard from "../components/medications/MedicationCard";
import MedicationForm from "../components/medications/MedicationForm";
import ConfirmModal from "../components/medications/ConfirmModal";
import medicationsApi from "../services/medications";
import familyMembersApi from "../services/familyMembers";
import { birdMain } from "../utils/assets.js";
import {
  ArrowLeft,
  CalendarCheck,
  Check,
  CloudOff,
  Heart,
  Loader2,
  Pill,
  Plus,
  Timer,
  X,
} from "lucide-react";

const formatTime = (iso) => {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
};

export default function FamilyMemberDetailPage() {
  const { id } = useParams();

  const [member, setMember] = useState(null);
  const [medications, setMedications] = useState([]);
  const [familyMembers, setFamilyMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [doseBusy, setDoseBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [memberData, meds, members] = await Promise.all([
        familyMembersApi.get(id),
        medicationsApi.list({ familyMemberId: id }),
        familyMembersApi.list(),
      ]);
      setMember(memberData);
      setMedications(meds);
      setFamilyMembers(members);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const flash = (message) => {
    setNotice(message);
    window.setTimeout(() => setNotice(""), 4000);
  };

  const handleSaved = async (_medication, message) => {
    setShowForm(false);
    setEditing(null);
    flash(message);
    await load();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await medicationsApi.remove(deleteTarget.id);
      setDeleteTarget(null);
      flash("Medication deleted.");
      await load();
    } catch (err) {
      flash(err.message);
    } finally {
      setDeleting(false);
    }
  };

  const handleDose = async (action) => {
    const upcoming = member?.summary?.upcomingDose;
    if (!upcoming || doseBusy) return;
    setDoseBusy(true);
    try {
      if (action === "taken") await medicationsApi.markTaken(upcoming.id);
      else await medicationsApi.markMissed(upcoming.id);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setDoseBusy(false);
    }
  };

  const summary = member?.summary || {};
  const upcoming = summary.upcomingDose;

  return (
    <PageWrapper>
      <div className="container family-detail">
        <Link to="/family-care" className="family-detail__back">
          <ArrowLeft size={15} aria-hidden="true" />
          Back to Family Care
        </Link>

        {loading ? (
          <div className="page-loader" role="status" aria-live="polite">
            <Loader2 size={22} className="spin" aria-hidden="true" />
            <span className="sr-only">Loading family member…</span>
          </div>
        ) : error ? (
          <div className="empty-state">
            <CloudOff size={36} aria-hidden="true" />
            <h2>Couldn&apos;t load this family member</h2>
            <p>{error}</p>
            <button type="button" className="btn btn--primary" onClick={load}>
              Try again
            </button>
          </div>
        ) : (
          <>
            <header className="family-detail__header">
              <div className="family-detail__identity">
                <span
                  className="family-card__avatar family-card__avatar--lg"
                  style={{ backgroundColor: member.avatarColor }}
                  aria-hidden="true"
                >
                  {member.name.charAt(0).toUpperCase()}
                </span>
                <div>
                  <h1 className="dashboard__title">{member.name}</h1>
                  <p className="dashboard__subtitle">
                    {member.relationshipLabel}
                    {member.dateOfBirth ? ` · Born ${member.dateOfBirth}` : ""}
                  </p>
                </div>
              </div>
              <button type="button" className="btn btn--primary" onClick={() => setShowForm(true)}>
                <Plus size={18} aria-hidden="true" />
                Add medication
              </button>
            </header>

            {member.notes && <p className="family-detail__notes">{member.notes}</p>}

            {notice && (
              <p className="med-notice" role="status">
                {notice}
              </p>
            )}

            <div className="family-detail__stats">
              <div className="stat-card">
                <span className="stat-card__icon" aria-hidden="true">
                  <Pill size={18} />
                </span>
                <span className="stat-card__value">{summary.activeMedicationCount ?? 0}</span>
                <span className="stat-card__label">Active medications</span>
              </div>
              <div className="stat-card">
                <span className="stat-card__icon" aria-hidden="true">
                  <CalendarCheck size={18} />
                </span>
                <span className="stat-card__value">{summary.todayScheduledDoses ?? 0}</span>
                <span className="stat-card__label">Doses today</span>
              </div>
              <div className="stat-card">
                <span className="stat-card__icon" aria-hidden="true">
                  <Check size={18} />
                </span>
                <span className="stat-card__value">{summary.takenToday ?? 0}</span>
                <span className="stat-card__label">Taken today</span>
              </div>
              <div className="stat-card">
                <span className="stat-card__icon" aria-hidden="true">
                  <X size={18} />
                </span>
                <span className="stat-card__value">{summary.missedToday ?? 0}</span>
                <span className="stat-card__label">Missed today</span>
              </div>
              <div className="stat-card stat-card--accent">
                <span className="stat-card__icon" aria-hidden="true">
                  <Heart size={18} />
                </span>
                <span className="stat-card__value">
                  {summary.adherencePct === null ? "—" : `${summary.adherencePct}%`}
                </span>
                <span className="stat-card__label">Adherence</span>
              </div>
            </div>

            <section className="upcoming-panel">
              <div className="upcoming-panel__head">
                <span className="pill">
                  <Timer size={15} aria-hidden="true" />
                  Next dose for {member.name.split(" ")[0]}
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
                <p className="upcoming-panel__empty">No upcoming doses for {member.name.split(" ")[0]}.</p>
              )}
            </section>

            <section className="family-detail__meds">
              <div className="medications__header">
                <div>
                  <h2 className="dashboard__title dashboard__title--sm">Medications</h2>
                  <p className="dashboard__subtitle">Everything prescribed for {member.name}.</p>
                </div>
              </div>

              {medications.length === 0 ? (
                <div className="empty-state">
                  <img src={birdMain} alt="Nesty, the DoseNest mascot" className="empty-state__bird" />
                  <h2>No medications for {member.name.split(" ")[0]} yet</h2>
                  <p>Add their first medication to start tracking doses and adherence.</p>
                  <button type="button" className="btn btn--primary" onClick={() => setShowForm(true)}>
                    <Plus size={18} aria-hidden="true" />
                    Add medication for {member.name.split(" ")[0]}
                  </button>
                </div>
              ) : (
                <div className="med-grid">
                  {medications.map((medication) => (
                    <MedicationCard
                      key={medication.id}
                      medication={medication}
                      onEdit={(med) => setEditing(med)}
                      onDelete={(med) => setDeleteTarget(med)}
                    />
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>

      {(showForm || editing) && (
        <MedicationForm
          initial={editing}
          familyMembers={familyMembers}
          initialFamilyMemberId={id}
          onClose={() => {
            setShowForm(false);
            setEditing(null);
          }}
          onSaved={handleSaved}
        />
      )}

      {deleteTarget && (
        <ConfirmModal
          title="Delete this medication?"
          message={`"${deleteTarget.name}" and its schedules and dose history will be permanently removed. This cannot be undone.`}
          busy={deleting}
          onConfirm={handleDelete}
          onClose={() => setDeleteTarget(null)}
        />
      )}
    </PageWrapper>
  );
}
