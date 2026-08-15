import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, LogOut, Menu, Settings, X } from "lucide-react";
import BrandMark from "../brand/BrandMark";
import NotificationBell from "./NotificationBell";
import { useAuth } from "../../store/AuthContext";

const NAV_LINKS = [
  { label: "Home", href: "#home" },
  { label: "How It Works", href: "#how-it-works" },
  { label: "Features", href: "#features" },
  { label: "Family Care", href: "#family-care" },
  { label: "WhatsApp", href: "#whatsapp" },
  { label: "About", href: "#about" },
];

const AUTH_LINKS = [
  { label: "Dashboard", to: "/dashboard" },
  { label: "Medications", to: "/medications" },
  { label: "Family Care", to: "/family-care" },
];

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const { user, isAuthenticated, loading, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const userMenuRef = useRef(null);

  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === "Escape") {
        setMenuOpen(false);
        setUserMenuOpen(false);
      }
    }

    function handleViewportChange(event) {
      if (event.matches) setMenuOpen(false);
    }

    document.addEventListener("keydown", handleKeyDown);
    const desktopQuery = window.matchMedia("(min-width: 881px)");
    desktopQuery.addEventListener("change", handleViewportChange);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      desktopQuery.removeEventListener("change", handleViewportChange);
    };
  }, []);

  // Close the account dropdown on outside click.
  useEffect(() => {
    if (!userMenuOpen) return undefined;
    function onPointerDown(event) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [userMenuOpen]);

  const firstName = user?.name?.trim().split(/\s+/)[0] || "";
  const initial = firstName.charAt(0).toUpperCase();

  const handleLogout = async () => {
    try {
      await logout();
    } finally {
      setMenuOpen(false);
      setUserMenuOpen(false);
      navigate("/");
    }
  };

  // Section links (#home, #features, …) only exist on the landing page. When
  // the user is elsewhere (e.g. the login page), clicking one should take them
  // to the homepage section instead of silently changing the URL hash.
  const handleSectionClick = (event, href) => {
    if (pathname === "/") return; // native anchor scroll on the homepage
    event.preventDefault();
    // Absolute path so the hash resolves against "/", not the current route.
    navigate(`/${href}`);
  };

  return (
    <header className="navbar">
      <nav className="navbar__inner container" aria-label="Primary">
        <BrandMark />

        {loading ? null : isAuthenticated ? (
          <>
            <div className="navbar__auth" aria-label="Primary">
              {AUTH_LINKS.map((link) => (
                <Link key={link.to} to={link.to} className="navbar__auth-link">
                  {link.label}
                </Link>
              ))}
            </div>

            <div className="navbar__tools">
              <NotificationBell />

              <div className="user-menu" ref={userMenuRef}>
                <button
                  type="button"
                  className="user-menu__toggle"
                  aria-haspopup="menu"
                  aria-expanded={userMenuOpen}
                  aria-label={`Account menu for ${user.name}`}
                  onClick={() => setUserMenuOpen((open) => !open)}
                >
                  <span className="user-menu__avatar" aria-hidden="true">
                    {initial}
                  </span>
                  <span className="user-menu__name">{firstName}</span>
                  <ChevronDown
                    size={14}
                    aria-hidden="true"
                    className={userMenuOpen ? "user-menu__chevron user-menu__chevron--open" : "user-menu__chevron"}
                  />
                </button>

                <AnimatePresence>
                  {userMenuOpen && (
                    <motion.div
                      className="user-menu__dropdown"
                      role="menu"
                      aria-label="Account"
                      initial={{ opacity: 0, y: -8, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -8, scale: 0.98 }}
                      transition={{ duration: 0.16, ease: "easeOut" }}
                    >
                      <div className="user-menu__head">
                        <strong>{user.name}</strong>
                        <span>{user.email}</span>
                      </div>
                      <Link
                        to="/settings"
                        role="menuitem"
                        className="user-menu__item"
                        onClick={() => setUserMenuOpen(false)}
                      >
                        <Settings size={16} aria-hidden="true" />
                        Settings
                      </Link>
                      <button
                        type="button"
                        role="menuitem"
                        className="user-menu__item user-menu__item--danger"
                        onClick={handleLogout}
                      >
                        <LogOut size={16} aria-hidden="true" />
                        Log out
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </>
        ) : (
          <div className="navbar__links">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="navbar__link"
                onClick={(event) => handleSectionClick(event, link.href)}
              >
                {link.label}
              </a>
            ))}
            <div className="navbar__actions">
              <Link to="/login" className="btn btn--ghost btn--sm">
                Log in
              </Link>
              <Link to="/register" className="btn btn--primary btn--sm">
                Get started
              </Link>
            </div>
          </div>
        )}

        <button
          type="button"
          className="navbar__toggle"
          aria-label="Toggle navigation menu"
          aria-expanded={menuOpen}
          aria-controls="navbar-menu"
          onClick={() => setMenuOpen((open) => !open)}
        >
          {menuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>

        <AnimatePresence>
          {menuOpen && (
            <motion.div
              id="navbar-menu"
              className="navbar__menu"
              role="dialog"
              aria-label="Navigation menu"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
            >
              {NAV_LINKS.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="navbar__menu-link"
                  onClick={(event) => {
                    setMenuOpen(false);
                    handleSectionClick(event, link.href);
                  }}
                >
                  {link.label}
                </a>
              ))}
              {!loading && isAuthenticated && (
                <p className="navbar__menu-user">
                  Signed in as <strong>{user.name}</strong>
                </p>
              )}
              <div className="navbar__menu-actions">
                {loading ? null : isAuthenticated ? (
                  <>
                    <Link
                      to="/dashboard"
                      className="btn btn--ghost"
                      onClick={() => setMenuOpen(false)}
                    >
                      Dashboard
                    </Link>
                    <Link
                      to="/medications"
                      className="btn btn--ghost"
                      onClick={() => setMenuOpen(false)}
                    >
                      Medications
                    </Link>
                    <Link
                      to="/family-care"
                      className="btn btn--ghost"
                      onClick={() => setMenuOpen(false)}
                    >
                      Family Care
                    </Link>
                    <Link
                      to="/settings"
                      className="btn btn--ghost"
                      onClick={() => setMenuOpen(false)}
                    >
                      Settings
                    </Link>
                    <button
                      type="button"
                      className="btn btn--ghost"
                      onClick={() => {
                        setMenuOpen(false);
                        handleLogout();
                      }}
                    >
                      Log out
                    </button>
                  </>
                ) : (
                  <>
                    <Link to="/login" className="btn btn--ghost" onClick={() => setMenuOpen(false)}>
                      Log in
                    </Link>
                    <Link
                      to="/register"
                      className="btn btn--primary"
                      onClick={() => setMenuOpen(false)}
                    >
                      Get started
                    </Link>
                  </>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>
    </header>
  );
}
