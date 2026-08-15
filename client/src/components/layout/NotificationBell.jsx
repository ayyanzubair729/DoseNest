import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Bell, Check, CheckCheck, Clock, Info, Loader2, X } from "lucide-react";
import { useAuth } from "../../store/AuthContext";
import notificationsApi from "../../services/notifications";
import { birdMain } from "../../utils/assets.js";

const POLL_INTERVAL_MS = 60000;

const TYPE_ICONS = {
  medication_due: Clock,
  medication_taken: Check,
  medication_missed: X,
  reminder: Bell,
  adherence: Bell,
  system: Info,
};

const typeIcon = (type) => TYPE_ICONS[type] || Bell;

// Friendly delivery label for WhatsApp-channel notifications. Provider errors
// are never shown — only a human-readable state.
const deliveryLabel = (notification) => {
  if (notification.channel !== "whatsapp" && notification.deliveryChannel !== "whatsapp") {
    return null;
  }
  if (notification.simulated) return "WhatsApp: Simulated (test mode)";
  switch (notification.status) {
    case "sent":
      return "WhatsApp: Sent";
    case "delivered":
      return "WhatsApp: Delivered";
    case "read":
      return "WhatsApp: Read";
    case "failed":
      return "WhatsApp: Failed";
    default:
      return "WhatsApp: Pending";
  }
};

const formatRelativeTime = (iso) => {
  if (!iso) return "";
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return days === 1 ? "Yesterday" : `${days}d ago`;
};

export default function NotificationBell() {
  const { isAuthenticated, loading } = useAuth();
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [notifications, setNotifications] = useState(null); // null = not loaded yet
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState("");
  const panelRef = useRef(null);

  const loadUnread = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      setUnread(await notificationsApi.unreadCount());
    } catch {
      // Silent — the badge is a nicety; don't break the navbar on API hiccups.
    }
  }, [isAuthenticated]);

  const loadList = useCallback(async () => {
    if (!isAuthenticated) return;
    setFetching(true);
    setError("");
    try {
      const [list, count] = await Promise.all([
        notificationsApi.list({ limit: 20 }),
        notificationsApi.unreadCount(),
      ]);
      setNotifications(list);
      setUnread(count);
    } catch (err) {
      setError(err.message);
    } finally {
      setFetching(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) {
      setUnread(0);
      setNotifications(null);
      return undefined;
    }
    loadUnread();
    const interval = setInterval(loadUnread, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [isAuthenticated, loadUnread]);

  // Close the panel on outside click / Escape.
  useEffect(() => {
    if (!open) return undefined;
    function onPointerDown(event) {
      if (panelRef.current && !panelRef.current.contains(event.target)) setOpen(false);
    }
    function onKeyDown(event) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const handleToggle = async () => {
    const nextOpen = !open;
    setOpen(nextOpen);
    if (nextOpen) {
      await loadList();
    }
  };

  const handleMarkRead = async (notification) => {
    if (notification.read) return;
    // Optimistic UI update, then sync with the backend.
    setNotifications((items) =>
      items.map((item) => (item.id === notification.id ? { ...item, read: true } : item))
    );
    setUnread((count) => Math.max(0, count - 1));
    try {
      await notificationsApi.markRead(notification.id);
    } catch {
      loadList();
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationsApi.markAllRead();
      setNotifications((items) => items.map((item) => ({ ...item, read: true })));
      setUnread(0);
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading || !isAuthenticated) return null;

  return (
    <div className="notif" ref={panelRef}>
      <button
        type="button"
        className="notif__bell"
        aria-label={`Notifications${unread > 0 ? ` (${unread} unread)` : ""}`}
        aria-expanded={open}
        onClick={handleToggle}
      >
        <Bell size={19} aria-hidden="true" />
        {unread > 0 && <span className="notif__badge">{unread > 99 ? "99+" : unread}</span>}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            className="notif__panel"
            role="dialog"
            aria-label="Notifications"
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.16, ease: "easeOut" }}
          >
            <div className="notif__head">
              <h3>Notifications</h3>
              {notifications?.some((item) => !item.read) && (
                <button type="button" className="notif__mark-all" onClick={handleMarkAllRead}>
                  <CheckCheck size={14} aria-hidden="true" />
                  Mark all read
                </button>
              )}
              <button
                type="button"
                className="notif__close"
                aria-label="Close notifications"
                onClick={() => setOpen(false)}
              >
                <X size={16} aria-hidden="true" />
              </button>
            </div>

            <div className="notif__body">
              {fetching && notifications === null ? (
                <div className="notif__loader" role="status">
                  <Loader2 size={20} className="spin" aria-hidden="true" />
                  <span className="sr-only">Loading notifications…</span>
                </div>
              ) : error && notifications === null ? (
                <p className="notif__error">{error}</p>
              ) : notifications?.length === 0 ? (
                <div className="notif__empty">
                  <img src={birdMain} alt="Nesty, the DoseNest mascot" className="notif__empty-bird" />
                  <p>You&apos;re all caught up.</p>
                  <span>Reminder notifications will appear here.</span>
                </div>
              ) : (
                <ul className="notif__list">
                  {notifications?.map((notification) => {
                    const Icon = typeIcon(notification.type);
                    return (
                      <li key={notification.id}>
                        <button
                          type="button"
                          className={`notif__item${notification.read ? "" : " notif__item--unread"}`}
                          onClick={() => handleMarkRead(notification)}
                        >
                          <span className="notif__item-icon" aria-hidden="true">
                            <Icon size={14} />
                          </span>
                        <span className="notif__item-text">
                          <strong>{notification.title}</strong>
                          <span>{notification.body}</span>
                          {deliveryLabel(notification) && (
                            <span
                              className={`notif__delivery notif__delivery--${notification.status}`}
                            >
                              {deliveryLabel(notification)}
                            </span>
                          )}
                          <time>{formatRelativeTime(notification.createdAt)}</time>
                        </span>
                          {!notification.read && <span className="notif__dot" aria-hidden="true" />}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
