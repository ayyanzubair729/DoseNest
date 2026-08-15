import { Check } from "lucide-react";
import Reveal from "../common/Reveal";
import { birdDoctor } from "../../utils/assets.js";

const CARE_POINTS = [
  {
    title: "Profiles for everyone",
    text: "Parents, children, partners and grandparents each get their own medication profile.",
  },
  {
    title: "Schedules tracked separately",
    text: "Every family member keeps their own schedule, history and reminders.",
  },
  {
    title: "One caring dashboard",
    text: "See how your whole family is doing without juggling separate apps.",
  },
];

export default function FamilyCare() {
  return (
    <section className="section section--tint" id="family-care">
      <div className="container split split--swap">
        <div className="split__media">
          <Reveal>
            <div className="family-media">
              <span className="blob blob--pink" aria-hidden="true" />
              <span className="blob blob--mint" aria-hidden="true" />
              <img
                src={birdDoctor}
                alt="Nesty in a doctor's coat, caring for your family"
                className="family-image"
              />
            </div>
          </Reveal>
        </div>

        <div className="split__content">
          <Reveal delay={0.1}>
            <div className="section-head">
              <span className="pill">Family care</span>
              <h2>Care doesn&apos;t stop with you.</h2>
              <p>
                DoseNest is designed around the people who depend on you. Manage medication for
                the whole family from one warm, clear place.
              </p>
              <ul className="check-list">
                {CARE_POINTS.map(({ title, text }) => (
                  <li key={title}>
                    <span className="check-list__icon">
                      <Check size={15} aria-hidden="true" />
                    </span>
                    <div>
                      <strong>{title}</strong>
                      <p>{text}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}