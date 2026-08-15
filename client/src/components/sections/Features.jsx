import { Bell, Check, ClipboardCheck, FileText, Pill, Sparkles, Users } from "lucide-react";
import Reveal from "../common/Reveal";

const FEATURES = [
  {
    icon: Pill,
    title: "Medication management",
    text: "Keep every medication in one place and plan it the way it was prescribed.",
    points: ["Add medications", "Dosage, frequency & instructions", "Simple scheduling"],
  },
  {
    icon: Bell,
    title: "Smart reminders",
    text: "Scheduled reminders that gently nudge — wherever you already are.",
    points: ["Scheduled medication reminders", "WhatsApp notifications", "Reminder status"],
  },
  {
    icon: ClipboardCheck,
    title: "Medication tracking",
    text: "Know exactly what has been taken, missed, or is coming up next.",
    points: ["Taken, missed & upcoming", "Adherence history", "Clear daily overview"],
  },
  {
    icon: Users,
    title: "Family care",
    text: "Support everyone you look after with separate, private medication profiles.",
    points: ["Schedules per family member", "Track dependents", "One account, whole family"],
  },
  {
    icon: FileText,
    title: "Prescription management",
    text: "Store prescriptions safely, ready for a future AI-assist that you always review.",
    points: ["Backed-up prescriptions", "AI extraction coming", "You review before saving"],
    badge: "AI coming",
  },
  {
    icon: Sparkles,
    title: "Personalized companion",
    text: "Nesty makes managing medication feel friendly, warm and human — never clinical.",
    points: ["Friendly guidance", "Approachable reminders", "Made to feel personal"],
  },
];

export default function Features() {
  return (
    <section className="section section--tint" id="features">
      <div className="container">
        <Reveal>
          <div className="section-head section-head--center">
            <span className="pill">Features</span>
            <h2>Everything you need to stay on track</h2>
            <p>A warm, focused toolkit for medication with the people you care for.</p>
          </div>
        </Reveal>

        <div className="features-grid">
          {FEATURES.map(({ icon: Icon, title, text, points, badge }, index) => (
            <Reveal key={title} delay={(index % 3) * 0.08}>
              <article className="feature-card">
                <div className="feature-card__top">
                  <span className="feature-card__icon">
                    <Icon size={22} aria-hidden="true" />
                  </span>
                  {badge && <span className="feature-card__badge">{badge}</span>}
                </div>
                <h3>{title}</h3>
                <p className="feature-card__text">{text}</p>
                <ul className="feature-card__list">
                  {points.map((point) => (
                    <li key={point}>
                      <Check size={15} aria-hidden="true" />
                      {point}
                    </li>
                  ))}
                </ul>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}