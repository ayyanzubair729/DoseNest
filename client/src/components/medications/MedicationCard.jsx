import { Pencil, Pill, Trash2 } from "lucide-react";

const FREQUENCY_LABELS = {
  daily: "Daily",
  days_of_week: "Selected days",
  custom: "Custom",
};

const formatScheduleTime = (time) => {
  if (!time) return "";
  const [hours, minutes] = time.split(":").map(Number);
  const period = hours >= 12 ? "PM" : "AM";
  const displayHours = hours % 12 === 0 ? 12 : hours % 12;
  return `${displayHours}:${String(minutes).padStart(2, "0")} ${period}`;
};

export default function MedicationCard({ medication, onEdit, onDelete }) {
  const dosageText = [medication.dosage, medication.dosageUnit].filter(Boolean).join(" ");

  return (
    <article className={`med-card${medication.active ? "" : " med-card--inactive"}`}>
      <div className="med-card__header">
        <span className="med-card__icon" aria-hidden="true">
          <Pill size={18} />
        </span>
        <div className="med-card__title">
          <h3>{medication.name}</h3>
          <p>
            {dosageText || "Dose not specified"}
            {medication.form ? ` · ${medication.form}` : ""}
          </p>
        </div>
        <span className={`med-card__status${medication.active ? "" : " med-card__status--off"}`}>
          {medication.active ? "Active" : "Inactive"}
        </span>
      </div>

      {medication.familyMemberName && (
        <p className="med-card__for">For {medication.familyMemberName}</p>
      )}

      {medication.schedules?.length > 0 && (
        <ul className="med-card__schedules">
          {medication.schedules.map((schedule) => (
            <li key={schedule.id} className="med-card__schedule">
              <span className="med-card__time">{formatScheduleTime(schedule.time)}</span>
              <span className="med-card__freq">
                {FREQUENCY_LABELS[schedule.frequency] || schedule.frequency}
                {schedule.frequency === "days_of_week" && schedule.daysOfWeek?.length
                  ? ` (${schedule.daysOfWeek
                      .map((day) => ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][day])
                      .join(", ")})`
                  : ""}
              </span>
            </li>
          ))}
        </ul>
      )}

      {medication.instructions && (
        <p className="med-card__instructions">{medication.instructions}</p>
      )}

      <div className="med-card__actions">
        <button
          type="button"
          className="btn btn--ghost btn--sm"
          onClick={() => onEdit(medication)}
        >
          <Pencil size={15} aria-hidden="true" />
          Edit
        </button>
        <button
          type="button"
          className="btn btn--ghost btn--sm med-card__delete"
          onClick={() => onDelete(medication)}
        >
          <Trash2 size={15} aria-hidden="true" />
          Delete
        </button>
      </div>
    </article>
  );
}
