import { useEffect, useRef } from "react";

// Meaningful interaction resets the idle timer. Pointer/keyboard/touch plus
// scrolling/wheel covers real usage without over-listening.
const ACTIVITY_EVENTS = ["pointerdown", "keydown", "touchstart", "wheel"];

/**
 * Client-side inactivity guard. While `enabled`, any of the ACTIVITY_EVENTS
 * resets a `minutes`-long timer; when it fires, `onExpire` is called once.
 *
 * This is a soft guard — the hard session expiry remains the JWT lifetime
 * enforced by the backend. When `minutes` is 0 (or `enabled` false) no timer
 * is armed.
 */
export default function useIdleTimeout({ enabled, minutes, onExpire }) {
  const onExpireRef = useRef(onExpire);
  onExpireRef.current = onExpire;

  useEffect(() => {
    if (!enabled || !(minutes > 0)) return undefined;

    let timer = null;

    const clear = () => {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
    };

    const arm = () => {
      clear();
      timer = setTimeout(() => {
        onExpireRef.current();
      }, minutes * 60 * 1000);
    };

    const onActivity = () => arm();

    arm();
    ACTIVITY_EVENTS.forEach((eventName) =>
      window.addEventListener(eventName, onActivity, { passive: true })
    );

    return () => {
      clear();
      ACTIVITY_EVENTS.forEach((eventName) => window.removeEventListener(eventName, onActivity));
    };
  }, [enabled, minutes]);
}
