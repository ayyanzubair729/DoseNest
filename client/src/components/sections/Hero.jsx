import { Link } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Bell, ClipboardCheck, MessageCircle, Users } from "lucide-react";
import { birdMain, downloadBg, homepageShot } from "../../utils/assets.js";

const INDICATORS = [
  { icon: Bell, label: "Medication reminders" },
  { icon: Users, label: "Family care" },
  { icon: MessageCircle, label: "WhatsApp notifications" },
  { icon: ClipboardCheck, label: "Medication tracking" },
];

export default function Hero() {
  const reducedMotion = useReducedMotion();

  return (
    <section
      className="hero"
      id="home"
      style={{ backgroundImage: `url(${downloadBg})` }}
    >
      <div className="container hero__inner">
        <div className="hero__copy">
          <span className="pill">Your medication, thoughtfully managed.</span>
          <h1 className="hero__title">
            Never miss the care <span className="accent">that matters.</span>
          </h1>
          <p className="hero__subtitle">
            DoseNest helps individuals and families manage medications, schedules, reminders and
            adherence from one warm, simple place — with gentle WhatsApp reminders when you need them.
          </p>

          <div className="hero__cta">
            <Link to="/register" className="btn btn--primary btn--lg">
              Get started
            </Link>
            <a href="#how-it-works" className="btn btn--ghost btn--lg">
              See how it works <ArrowRight size={18} aria-hidden="true" />
            </a>
          </div>

          <ul className="hero__chips">
            {INDICATORS.map(({ icon: Icon, label }) => (
              <li key={label} className="hero__chip">
                <Icon size={16} aria-hidden="true" />
                {label}
              </li>
            ))}
          </ul>
        </div>

        <motion.div
          className="hero__visual"
          initial={{ opacity: 0, y: reducedMotion ? 0 : 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15, ease: "easeOut" }}
        >
          <motion.div className="hero__media">
            <motion.img
              src={homepageShot}
              alt="The DoseNest app showing medication schedules and reminders"
              className="hero__image"
              animate={reducedMotion ? undefined : { y: [0, -9, 0] }}
              transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
            />
          </motion.div>

          <motion.div
            className="float-card float-card--wa"
            animate={reducedMotion ? undefined : { y: [0, -6, 0] }}
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 0.8 }}
          >
            <img src={birdMain} alt="" className="float-card__avatar" />
            <div className="float-card__text">
              <strong>Nesty</strong>
              <p>It&apos;s time for your medication. Don&apos;t forget your dose. 💚</p>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
