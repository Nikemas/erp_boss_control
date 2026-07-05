import { useEffect, useRef } from "react";
import { getToken } from "./api.js";

// Derive the WS origin from VITE_API_URL. It may be absolute
// ("http://localhost:8080/api/v1") in dev or relative ("/api/v1") in prod — in the
// relative case we build the URL from the current page origin.
function wsBase() {
  const base = import.meta.env.VITE_API_URL || "http://localhost:8080/api/v1";
  if (/^https?:\/\//.test(base)) return base.replace(/^http/, "ws");
  const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${proto}//${window.location.host}${base}`;
}

// useBossWS keeps a live WebSocket to the Boss Control platform channel (/admin/ws)
// open while `enabled`. On each pushed notification it fires the existing
// "boss-notifications-changed" event so the sidebar badge and the notifications feed
// refresh instantly. Reconnects after 5s if the socket drops. Polling stays as the
// fallback, so a missed/late WS event is still picked up.
export function useBossWS(enabled) {
  const wsRef = useRef(null);

  useEffect(() => {
    if (!enabled) return undefined;

    let stopped = false;
    let reconnectTimer = null;

    function connect() {
      const token = getToken();
      if (!token) return;

      const ws = new WebSocket(`${wsBase()}/admin/ws?token=${encodeURIComponent(token)}`);
      wsRef.current = ws;

      ws.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data);
          if (data && data.type === "notification") {
            window.dispatchEvent(new CustomEvent("boss-notifications-changed", { detail: data.payload }));
          }
        } catch {
          /* ignore malformed frames */
        }
      };

      ws.onclose = () => {
        if (stopped) return;
        reconnectTimer = setTimeout(() => { if (!stopped) connect(); }, 5000);
      };
      ws.onerror = () => { try { ws.close(); } catch { /* noop */ } };
    }

    connect();

    return () => {
      stopped = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      const ws = wsRef.current;
      wsRef.current = null;
      if (ws) { try { ws.close(); } catch { /* noop */ } }
    };
  }, [enabled]);
}
