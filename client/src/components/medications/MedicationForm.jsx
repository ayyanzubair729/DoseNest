import { useRef, useState } from "react";
import { Loader2, Plus, Trash2, X } from "lucide-react";
import medicationsApi from "../../services/medications";

const DOSAGE_UNITS = ["mg", "ml", "tablet", "capsule", "drop", "puff"];
const FREQUENCIES = ["daily", "days_of_week", "custom"];
const WEEKDAYS = [
  { value: 0, label: "Sun" },
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
];
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

const newScheduleRow = () => ({
  key: `s-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  id: null,
  time: "08:00",
  frequency: "daily",
  daysOfWeek: [],
  active: true,
  removed: false,
});

const toDateInputValue = (iso) => {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60000).toISOString().slice(0, 10);
};

export default function MedicationForm({
  initial = null,
  onClose,
  onSaved,
  familyMembers = [],
  initialFamilyMemberId = "",
}) {
  const isEdit = Boolean(initial);

  const [forWhom, setForWhom] = useState(initialFamilyMemberId || "");
  const [name, setName] = useState(initial?.name || "");
  const [dosage, setDosage] = useState(initial?.dosage || "");
  const [dosageUnit, setDosageUnit] = useState(initial?.dosageUnit || "");
  const [form, setForm] = useState(initial?.form || "");
  const [instructions, setInstructions] = useState(initial?.instructions || "");
  const [notes, setNotes] = useState(initial?.notes || "");
  const [startDate, setStartDate] = useState(toDateInputValue(initial?.startDate));
  const [endDate, setEndDate] = useState(toDateInputValue(initial?.endDate));
  const [active, setActive] = useState(initial ? initial.active : true);

  const [schedules, setSchedules] = useState(() => {
    if (initial?.schedules?.length) {
      return initial.schedules.map((schedule) => ({
        key: schedule.id,
        id: schedule.id,
        time: schedule.time,
        frequency: schedule.frequency,
        daysOfWeek: schedule.daysOfWeek || [],
        active: schedule.active,
        removed: false,
      }));
    }
    return [newScheduleRow()];
  });

  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  // Ref guard: state updates are async, so `submitting` alone cannot stop two
  // submits landing in the same event tick (e.g. a fast double-click on Save).
  const submittingRef = useRef(false);

  const updateRow = (key, patch) =>
    setSchedules((rows) => rows.map((row) => (row.key === key ? { ...row, ...patch } : row)));

  const toggleDay = (key, day) =>
    setSchedules((rows) =>
      rows.map((row) => {
        if (row.key !== key) return row;
        const has = row.daysOfWeek.includes(day);
        return {
          ...row,
          daysOfWeek: has
            ? row.daysOfWeek.filter((d) => d !== day)
            : [...row.daysOfWeek, day].sort((a, b) => a - b),
        };
      })
    );

  const validate = () => {
    const next = {};
    if (!name.trim()) next.name = "Medication name is required.";
    if (startDate && endDate && endDate < startDate) {
      next.endDate = "End date cannot be before the start date.";
    }

    const activeRows = schedules.filter((row) => !row.removed);
    if (activeRows.length === 0) {
      next.schedules = "Add at least one schedule.";
    } else {
      const badTime = activeRows.some((row) => !TIME_PATTERN.test(row.time || ""));
      const badDays = activeRows.some(
        (row) =>
          (row.frequency === "days_of_week" || row.frequency === "custom") &&
          row.daysOfWeek.length === 0
      );
      if (badTime) next.schedules = "Each schedule needs a valid time (HH:mm).";
      else if (badDays) next.schedules = "Select at least one day for day-based schedules.";
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const collectPayload = () => {
    const scheduleRows = schedules
      .filter((row) => !row.removed)
      .map(({ time, frequency, daysOfWeek, active: sActive }) => ({
        time,
        frequency,
        daysOfWeek,
        active: sActive,
      }));
    return {
      name: name.trim(),
      dosage: dosage.trim() || undefined,
      dosageUnit: dosageUnit || undefined,
      form: form.trim() || undefined,
      instructions: instructions.trim() || undefined,
      notes: notes.trim() || undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      active,
      familyMemberId: forWhom || undefined,
      schedules: scheduleRows,
    };
  };

  const ownerLabel = initial?.familyMemberName || null;
  const visibleSchedules = schedules.filter((row) => !row.removed);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFormError("");
    if (submittingRef.current || submitting || !validate()) return;

    submittingRef.current = true;
    setSubmitting(true);
    try {
      if (!isEdit) {
        const created = await medicationsApi.create(collectPayload());
        onSaved(created, "Medication added. 🎉");
      } else {
        const payload = collectPayload();
        const { schedules: _stripped, ...medicationInput } = payload;
        const updated = await medicationsApi.update(initial.id, medicationInput);

        // Remove schedules the user deleted from the form. A retry (or a
        // double-click) can re-attempt an already-deleted schedule — the
        // desired end state is already reached, so a not-found is fine.
        const removedIds = schedules
          .filter((row) => row.removed && row.id)
          .map((row) => row.id);
        await Promise.all(
          removedIds.map((id) =>
            medicationsApi.deleteSchedule(initial.id, id).catch((err) => {
              if (err.message === "Schedule not found.") return;
              throw err;
            })
          )
        );

        // Add only rows the user created in this form session (no id yet).
        // collectPayload strips ids, so it must NOT be used here — otherwise
        // every existing schedule would be re-created on each save.
        const addedRows = schedules
          .filter((row) => !row.removed && !row.id)
          .map(({ time, frequency, daysOfWeek, active: sActive }) => ({
            time,
            frequency,
            daysOfWeek,
            active: sActive,
          }));
        await Promise.all(
          addedRows.map((row) => medicationsApi.createSchedule(initial.id, row))
        );

        onSaved(updated, "Medication updated.");
      }
    } catch (err) {
      setFormError(err.message);
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-label={isEdit ? "Edit medication" : "Add medication"}>
      <div className="modal">
        <div className="modal__header">
          <h2>{isEdit ? "Edit medication" : "Add medication"}</h2>
          <button type="button" className="modal__close" aria-label="Close" onClick={onClose}>
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        <form className="med-form" onSubmit={handleSubmit} noValidate>
          {isEdit ? (
            <p className="med-form__owner">
              Medication for <strong>{ownerLabel || "Me"}</strong>
            </p>
          ) : (
            <div className="field">
              <label className="field__label" htmlFor="med-for-whom">
                Who is this medication for?
              </label>
              <select
                id="med-for-whom"
                className="field__input"
                value={forWhom}
                onChange={(event) => setForWhom(event.target.value)}
                disabled={submitting}
              >
                <option value="">Me</option>
                {familyMembers.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="field">
            <label className="field__label" htmlFor="med-name">
              Medication name
            </label>
            <input
              id="med-name"
              type="text"
              className={errors.name ? "field__input field__input--error" : "field__input"}
              placeholder="e.g. Metformin"
              value={name}
              onChange={(event) => setName(event.target.value)}
              disabled={submitting}
            />
            {errors.name && <span className="field__error">{errors.name}</span>}
          </div>

          <div className="med-form__row">
            <div className="field">
              <label className="field__label" htmlFor="med-dosage">
                Dosage
              </label>
              <input
                id="med-dosage"
                type="text"
                inputMode="decimal"
                className="field__input"
                placeholder="e.g. 500"
                value={dosage}
                onChange={(event) => setDosage(event.target.value)}
                disabled={submitting}
              />
            </div>
            <div className="field">
              <label className="field__label" htmlFor="med-unit">
                Unit
              </label>
              <select
                id="med-unit"
                className="field__input"
                value={dosageUnit}
                onChange={(event) => setDosageUnit(event.target.value)}
                disabled={submitting}
              >
                <option value="">—</option>
                {DOSAGE_UNITS.map((unit) => (
                  <option key={unit} value={unit}>
                    {unit}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label className="field__label" htmlFor="med-form">
                Form
              </label>
              <input
                id="med-form"
                type="text"
                className="field__input"
                placeholder="e.g. tablet"
                value={form}
                onChange={(event) => setForm(event.target.value)}
                disabled={submitting}
              />
            </div>
          </div>

          <div className="med-form__row">
            <div className="field">
              <label className="field__label" htmlFor="med-start">
                Start date
              </label>
              <input
                id="med-start"
                type="date"
                className="field__input"
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
                disabled={submitting}
              />
            </div>
            <div className="field">
              <label className="field__label" htmlFor="med-end">
                End date
              </label>
              <input
                id="med-end"
                type="date"
                className={errors.endDate ? "field__input field__input--error" : "field__input"}
                value={endDate}
                onChange={(event) => setEndDate(event.target.value)}
                disabled={submitting}
              />
              {errors.endDate && <span className="field__error">{errors.endDate}</span>}
            </div>
          </div>

          <div className="field">
            <label className="field__label" htmlFor="med-instructions">
              Instructions
            </label>
            <textarea
              id="med-instructions"
              rows={2}
              className="field__input"
              placeholder="e.g. Take with food"
              value={instructions}
              onChange={(event) => setInstructions(event.target.value)}
              disabled={submitting}
            />
          </div>

          <div className="field">
            <label className="field__label" htmlFor="med-notes">
              Notes
            </label>
            <textarea
              id="med-notes"
              rows={2}
              className="field__input"
              placeholder="Anything else worth remembering"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              disabled={submitting}
            />
          </div>

          <label className="check-field">
            <input
              type="checkbox"
              checked={active}
              onChange={(event) => setActive(event.target.checked)}
              disabled={submitting}
            />
            <span>Active medication</span>
          </label>

          <div className="med-form__schedules">
            <div className="med-form__schedules-head">
              <h3>Schedules</h3>
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                onClick={() => setSchedules((rows) => [...rows, newScheduleRow()])}
                disabled={submitting}
              >
                <Plus size={15} aria-hidden="true" />
                Add time
              </button>
            </div>

            {visibleSchedules.map((row) => (
              <div key={row.key} className="schedule-row">
                <div className="field">
                  <label className="field__label">Time</label>
                  <input
                    type="time"
                    className="field__input"
                    value={row.time}
                    onChange={(event) => updateRow(row.key, { time: event.target.value })}
                    disabled={submitting}
                  />
                </div>
                <div className="field">
                  <label className="field__label">Frequency</label>
                  <select
                    className="field__input"
                    value={row.frequency}
                    onChange={(event) => updateRow(row.key, { frequency: event.target.value })}
                    disabled={submitting}
                  >
                    {FREQUENCIES.map((freq) => (
                      <option key={freq} value={freq}>
                        {freq.replace(/_/g, " ")}
                      </option>
                    ))}
                  </select>
                </div>
                {(row.frequency === "days_of_week" || row.frequency === "custom") && (
                  <div className="field">
                    <span className="field__label">Days</span>
                    <div className="days-picker">
                      {WEEKDAYS.map(({ value, label }) => (
                        <button
                          key={value}
                          type="button"
                          className={`day-pill${row.daysOfWeek.includes(value) ? " day-pill--on" : ""}`}
                          aria-pressed={row.daysOfWeek.includes(value)}
                          onClick={() => toggleDay(row.key, value)}
                          disabled={submitting}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {visibleSchedules.length > 1 && (
                  <button
                    type="button"
                    className="schedule-row__remove"
                    aria-label="Remove schedule"
                    onClick={() => updateRow(row.key, { removed: true })}
                    disabled={submitting}
                  >
                    <Trash2 size={16} aria-hidden="true" />
                  </button>
                )}
              </div>
            ))}
            {errors.schedules && <span className="field__error">{errors.schedules}</span>}
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
                "Add medication"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
