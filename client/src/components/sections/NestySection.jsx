import { motion, useReducedMotion } from "framer-motion";
import { HeartHandshake, ShieldCheck, Sparkles } from "lucide-react";
import Reveal from "../common/Reveal";
import { birdMain } from "../../utils/assets.js";

const TRAITS = [
  { icon: Sparkles, label: "Gentle nudges" },
  { icon: ShieldCheck, label: "Simple scheduling" },
  { icon: HeartHandshake, label: "Always friendly" },
];

export default function NestySection() {
  const reducedMotion = useReducedMotion();

  return (
    <section className="section nesty" id="nesty">
      <div className="container">
        <Reveal>
          <div className="section-head section-head--center">
            <span className="pill">Meet your companion</span>
            <h2>Meet Nesty, your DoseNest buddy.</h2>
            <p>
              Managing medication shouldn&apos;t feel like a hospital visit. Nesty wraps the whole
              experience in warmth, so staying on schedule feels approachable — not clinical.
            </p>
          </div>
        </Reveal>

        <motion.div
          className="nesty__media"
          initial={{ opacity: 0, scale: reducedMotion ? 1 : 0.94 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          <motion.img
            src={birdMain}
            alt="Nesty, the friendly yellow and green DoseNest bird"
            className="nesty__image"
            animate={reducedMotion ? undefined : { y: [0, -8, 0] }}
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
          />
        </motion.div>

        <Reveal delay={0.1}>
          <ul className="nesty__chips">
            {TRAITS.map(({ icon: Icon, label }) => (
              <li key={label} className="hero__chip">
                <Icon size={16} aria-hidden="true" />
                {label}
              </li>
            ))}
          </ul>
        </Reveal>
      </div>
    </section>
  );
}