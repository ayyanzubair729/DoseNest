import { useCallback, useEffect, useState } from "react";
import PageWrapper from "../components/common/PageWrapper";
import MedicationCard from "../components/medications/MedicationCard";
import MedicationForm from "../components/medications/MedicationForm";
import ConfirmModal from "../components/medications/ConfirmModal";
import medicationsApi from "../services/medications";
import useFamilyMembers from "../hooks/useFamilyMembers";
import { birdMain } from "../utils/assets.js";
import { CloudOff, Loader2, Plus } from "lucide-react";

export default function MedicationsPage() {
  const { familyMembers } = useFamilyMembers();
  const [medications, setMedications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setMedications(await medicationsApi.list());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleSaved = async (savedMedication, message) => {
    setShowForm(false);
    setEditing(null);
    setNotice(message);
    await load();
    window.setTimeout(() => setNotice(""), 4000);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await medicationsApi.remove(deleteTarget.id);
      setDeleteTarget(null);
      setNotice("Medication deleted.");
      await load();
      window.setTimeout(() => setNotice(""), 4000);
    } catch (err) {
      setNotice(err.message);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <PageWrapper>
      <div className="container medications">
        <header className="medications__header">
          <div>
            <h1 className="dashboard__title">Medications</h1>
            <p className="dashboard__subtitle">
              Your medication list and their schedules, straight from your data.
            </p>
          </div>
          <button type="button" className="btn btn--primary btn--lg" onClick={() => setShowForm(true)}>
            <Plus size={18} aria-hidden="true" />
            Add medication
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
            <span className="sr-only">Loading medications…</span>
          </div>
        ) : error ? (
          <div className="empty-state">
            <CloudOff size={36} aria-hidden="true" />
            <h2>Couldn&apos;t load your medications</h2>
            <p>{error}</p>
            <button type="button" className="btn btn--primary" onClick={load}>
              Try again
            </button>
          </div>
        ) : medications.length === 0 ? (
          <div className="empty-state">
            <img src={birdMain} alt="Nesty, the DoseNest mascot" className="empty-state__bird" />
            <h2>Your nest is empty</h2>
            <p>No medications added yet. Add your first medication to get started.</p>
            <button type="button" className="btn btn--primary" onClick={() => setShowForm(true)}>
              <Plus size={18} aria-hidden="true" />
              Add your first medication
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
      </div>

      {(showForm || editing) && (
        <MedicationForm
          initial={editing}
          familyMembers={familyMembers}
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
