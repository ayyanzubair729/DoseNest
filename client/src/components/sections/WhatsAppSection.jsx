import { Check } from "lucide-react";
import Reveal from "../common/Reveal";
import { birdPhone, whatsappLogo } from "../../utils/assets.js";

const HIGHLIGHTS = [
  "Reminders delivered straight to WhatsApp",
  "No second app to install or check",
  "Clear reminder status for every dose",
];

export default function WhatsAppSection() {
  return (
    <section className="section" id="whatsapp">
      <div className="container split">
        <div className="split__content">
          <Reveal>
            <div className="section-head">
              <span className="pill pill--whatsapp">
                <img src={whatsappLogo} alt="" className="pill__icon" />
                WhatsApp reminders
              </span>
              <h2>Your reminders, where you already are.</h2>
              <p>
                Doses shouldn&apos;t depend on opening an app. DoseNest plans to send medication
                reminders to the WhatsApp chats you already use every day.
              </p>
              <ul className="check-list">
                {HIGHLIGHTS.map((item) => (
                  <li key={item}>
                    <span className="check-list__icon">
                      <Check size={15} aria-hidden="true" />
                    </span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <p className="note-text">
                This section is a UI demonstration only — WhatsApp delivery will be wired up in a
                later development phase.
              </p>
            </div>
          </Reveal>
        </div>

        <div className="split__media">
          <Reveal delay={0.1}>
            <div className="wa-card" aria-label="Example WhatsApp reminder">
              <div className="wa-card__header">
                <img src={birdPhone} alt="Nesty holding a phone" className="wa-card__avatar" />
                <div>
                  <strong>Nesty</strong>
                  <span>DoseNest reminders</span>
                </div>
                <img src={whatsappLogo} alt="" className="wa-card__brand" />
              </div>
              <div className="wa-card__body">
                <div className="wa-bubble">
                  <p>
                    It&apos;s time for your 8:00 PM medication.
                    <br />
                    Don&apos;t forget your dose. 💚
                  </p>
                  <time>8:00 PM  ·  Now</time>
                </div>
              </div>
              <div className="wa-card__footer">Delivered · dose pending</div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}