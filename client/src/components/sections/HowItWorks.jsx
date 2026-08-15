import { motion, useReducedMotion } from "framer-motion";
import { Bell, ClipboardCheck, Clock, PlusCircle } from "lucide-react";
import Reveal from "../common/Reveal";
import { faviconBird, medicine } from "../../utils/assets.js";

const STEPS = [
  {
    number: "01",
    icon: PlusCircle,
    title: "Add your medications",
    text: "List each medication with its dosage, frequency and instructions, for you or a family member.",
  },
  {
    number: "02",
    icon: Clock,
    title: "Set your schedule",
    text: "Choose times and repeat patterns that match the way you actually take them.",
  },
  {
    number: "03",
    icon: Bell,
    title: "Receive reminders",
    text: "Gentle WhatsApp reminders arrive when it's time to take each dose.",
  },
  {
    number: "04",
    icon: ClipboardCheck,
    title: "Track adherence",
    text: "Log taken, missed or snoozed doses and keep an honest medication history.",
  },
];

const stepsContainerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.2 },
  },
};

const stepCardVariants = {
  hidden: { opacity: 0, y: 40 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease: [0.34, 1.56, 0.64, 1] },
  },
};

export default function HowItWorks() {
  const reducedMotion = useReducedMotion();

  return (
    <section className="section" id="how-it-works">
      <motion.img
        src={faviconBird}
        alt=""
        aria-hidden="true"
        className="steps-deco steps-deco--one"
        animate={reducedMotion ? undefined : { y: [0, -10, 0] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.img
        src={faviconBird}
        alt=""
        aria-hidden="true"
        className="steps-deco steps-deco--two"
        animate={reducedMotion ? undefined : { y: [0, 8, 0] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 1.2 }}
      />
      <motion.img
        src={medicine}
        alt=""
        aria-hidden="true"
        className="steps-deco steps-deco--three"
        animate={reducedMotion ? undefined : { y: [0, -8, 0], rotate: [0, -15, 0] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 0.6 }}
      />
      <motion.img
        src={medicine}
        alt=""
        aria-hidden="true"
        className="steps-deco steps-deco--four"
        animate={reducedMotion ? undefined : { y: [0, 10, 0], rotate: [0, 15, 0] }}
        transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut", delay: 1.8 }}
      />

      <div className="container">
        <Reveal>
          <div className="section-head section-head--center">
            <span className="pill">How it works</span>
            <h2>Medication care, in four simple steps</h2>
            <p>Set everything up once, and DoseNest keeps track from there.</p>
          </div>
        </Reveal>

        <motion.div
          className="steps"
          initial={reducedMotion ? undefined : "hidden"}
          whileInView={reducedMotion ? undefined : "visible"}
          viewport={{ once: false, margin: "-80px" }}
          variants={stepsContainerVariants}
        >
          {STEPS.map(({ number, icon: Icon, title, text }) => (
            <motion.div key={number} variants={stepCardVariants}>
              <article className="step-card">
                <span className="step-card__number">{number}</span>
                <span className="feature-card__icon">
                  <Icon size={22} aria-hidden="true" />
                </span>
                <h3>{title}</h3>
                <p>{text}</p>
              </article>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
