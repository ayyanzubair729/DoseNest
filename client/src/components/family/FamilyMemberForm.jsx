import { useState } from "react";
import { Loader2, X } from "lucide-react";
import familyMembersApi from "../../services/familyMembers";

const RELATIONSHIPS = [
  { value: "partner", label: "Partner" },
  { value: "parent", label: "Parent" },
  { value: "grandparent", label: "Grandparent" },
  { value: "child", label: "Child" },
  { value: "sibling", label: "Sibling" },
  { value: "other", label: "Other" },
];

const toDateInputValue = (iso) => {
  if (!iso) return "";
  return typeof iso === "string" ? iso.slice(0, 10) : "";
};

export default function FamilyMemberForm({ initial = null, onClose, onSaved }) {
  const isEdit = Boolean(initial);

  const [name, setName] = useState(initial?.name || "");
  const [relationship, setRelationship] = useState(initial?.relationship || "");
  const [dateOfBirth, setDateOfBirth] = useState(toDateInputValue(initial?.dateOfBirth));
  const [notes, setNotes] = useState(initial?.notes || "");

  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const validate = () => {
    const next = {};
    if (!name.trim()) next.name = "Name is required.";
    if (dateOfBirth && new Date(dateOfBirth) > new Date()) {
      next.dateOfBirth = "Date of birth cannot be in the future.";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFormError("");
    if (submitting || !validate()) return;

    const payload = {
      name: name.trim(),
      relationship: relationship || "other",
      dateOfBirth: dateOfBirth || undefined,
      notes: notes.trim() || undefined,
    };

    setSubmitting(true);
    try {
      if (isEdit) {
        const updated = await familyMembersApi.update(initial.id, payload);
        onSaved(updated, "Family member updated.");
      } else {
        const created = await familyMembersApi.create(payload);
        onSaved(created, `${created.name} added to Family Care. 💚`);
      }
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={isEdit ? "Edit family member" : "Add family member"}
    >
      <div className="modal">
        <div className="modal__header">
          <h2>{isEdit ? "Edit family member" : "Add family member"}</h2>
          <button type="button" className="modal__close" aria-label="Close" onClick={onClose}>
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        <form className="med-form" onSubmit={handleSubmit} noValidate>
          <div className="field">
            <label className="field__label" htmlFor="member-name">
              Name
            </label>
            <input
              id="member-name"
              type="text"
              className={errors.name ? "field__input field__input--error" : "field__input"}
              placeholder="e.g. Mom, Dad, Sara"
              value={name}
              onChange={(event) => setName(event.target.value)}
              disabled={submitting}
            />
            {errors.name && <span className="field__error">{errors.name}</span>}
          </div>

          <div className="field">
            <label className="field__label" htmlFor="member-relationship">
              Relationship
            </label>
            <select
              id="member-relationship"
              className="field__input"
              value={relationship}
              onChange={(event) => setRelationship(event.target.value)}
              disabled={submitting}
            >
              <option value="">Select…</option>
              {RELATIONSHIPS.map(({ value, label }) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div className="med-form__row">
            <div className="field">
              <label className="field__label" htmlFor="member-dob">
                Date of birth
              </label>
              <input
                id="member-dob"
                type="date"
                className={
                  errors.dateOfBirth ? "field__input field__input--error" : "field__input"
                }
                value={dateOfBirth}
                onChange={(event) => setDateOfBirth(event.target.value)}
                disabled={submitting}
              />
              {errors.dateOfBirth && <span className="field__error">{errors.dateOfBirth}</span>}
            </div>
          </div>

          <div className="field">
            <label className="field__label" htmlFor="member-notes">
              Notes
            </label>
            <textarea
              id="member-notes"
              rows={2}
              className="field__input"
              placeholder="e.g. Allergies, preferences, anything worth remembering"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              disabled={submitting}
            />
          </div>

          {formError && (
            <p className="auth__error" role="alert">
              {formError}
            </p>
          )}

          <div className="modal__actions">
            <button type="button" className="btn btn--ghost" onClick={onClose} disabled={submitting}>
              Cancel
            </button>
            <button type="submit" className="btn btn--primary" disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 size={17} className="spin" aria-hidden="true" />
                  Saving…
                </>
              ) : isEdit ? (
                "Save changes"
              ) : (
                "Add family member"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
