import { Link } from "react-router-dom";
import Reveal from "../common/Reveal";

export default function CtaSection() {
  return (
    <section className="cta" id="cta">
      <div className="container">
        <Reveal>
          <div className="cta__panel">
            <span className="cta__blob cta__blob--y" aria-hidden="true" />
            <span className="cta__blob cta__blob--p" aria-hidden="true" />
            <h2>Take the stress out of staying on schedule.</h2>
            <p>
              Join DoseNest and keep your own medications — and your family&apos;s — calmly on
              track, reminders included.
            </p>
            <div className="cta__actions">
              <Link to="/register" className="btn btn--primary btn--lg">
                Get started
              </Link>
              <Link to="/login" className="btn btn--ghost btn--lg">
                Log in
              </Link>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}