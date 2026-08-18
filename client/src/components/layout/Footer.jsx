import { Link } from "react-router-dom";
import { ShieldCheck } from "lucide-react";
import BrandMark from "../brand/BrandMark";

const PRODUCT_LINKS = [
  { label: "How It Works", href: "#how-it-works" },
  { label: "Features", href: "#features" },
  { label: "Family Care", href: "#family-care" },
  { label: "WhatsApp", href: "#whatsapp" },
];

const LEGAL_LINKS = [
  { label: "Privacy", to: "/privacy" },
  { label: "Terms", to: "/terms" },
];

const ACCOUNT_LINKS = [
  { label: "Log in", to: "/login" },
  { label: "Register", to: "/register" },
];

export default function Footer() {
  return (
    <footer className="footer" id="about">
      <div className="container">
        <div className="footer__grid">
          <div className="footer__brand">
            <BrandMark />
            <p className="footer__desc">
              Your medication companion for you and your family — schedules, reminders and
              adherence in one warm, simple place.
            </p>
            <p className="footer__safety">
              <ShieldCheck size={15} aria-hidden="true" />
              DoseNest organizes the medications you already take. It does not diagnose,
              prescribe, or give medical advice.
            </p>
          </div>

          <nav className="footer__col" aria-label="Product">
            <h4>Product</h4>
            <ul>
              {PRODUCT_LINKS.map((link) => (
                <li key={link.label}>
                  <a href={link.href}>{link.label}</a>
                </li>
              ))}
            </ul>
          </nav>

          <nav className="footer__col" aria-label="Company">
            <h4>Company</h4>
            <ul>
              <li>
                <a href="#about">About</a>
              </li>
              <li>
                <a href="https://github.com/ayyanzubair729" target="_blank" rel="noopener noreferrer">
                  GitHub
                </a>
              </li>
              <li>
                <a href="mailto:hello@dosenest.app">Contact</a>
              </li>
            </ul>
          </nav>

          <nav className="footer__col" aria-label="Legal">
            <h4>Legal</h4>
            <ul>
              {LEGAL_LINKS.map((link) => (
                <li key={link.label}>
                  <Link to={link.to}>{link.label}</Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav className="footer__col" aria-label="Account">
            <h4>Account</h4>
            <ul>
              {ACCOUNT_LINKS.map((link) => (
                <li key={link.label}>
                  <Link to={link.to}>{link.label}</Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <div className="footer__bottom">
          <span>&copy; {new Date().getFullYear()} DoseNest. All rights reserved.</span>
          <span>Made with care — medication management for you and your family.</span>
        </div>
      </div>
    </footer>
  );
}