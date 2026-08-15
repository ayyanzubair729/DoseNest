import { Activity, MessageCircle, Pill, Users } from "lucide-react";

const ITEMS = [
  { icon: Pill, label: "Personal medication management" },
  { icon: Users, label: "Family care" },
  { icon: MessageCircle, label: "WhatsApp reminders" },
  { icon: Activity, label: "Medication tracking" },
];

export default function ValueStrip() {
  return (
    <div className="value-strip" aria-label="What DoseNest offers">
      <div className="container value-strip__inner">
        {ITEMS.map(({ icon: Icon, label }) => (
          <div className="value-item" key={label}>
            <span className="value-item__icon">
              <Icon size={18} aria-hidden="true" />
            </span>
            <span>{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}