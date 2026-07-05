import { useState, useEffect, useCallback } from "react";
import { Icon, Avatar } from "./icons.jsx";
import { api } from "./api.js";

const NAV = [
  { key: "dashboard", label: "Дашборд", icon: "dashboard" },
  { key: "clients", label: "Клиенты", icon: "store" },
  { key: "payments", label: "Финансы", icon: "payments" },
  { key: "partners", label: "Партнёры", icon: "handshake" },
  { key: "promo", label: "Промокоды", icon: "ticket" },
  { key: "notifications", label: "Уведомления", icon: "bell" },
  { key: "audit", label: "Аудит", icon: "history" },
  { key: "login-history", label: "История входов", icon: "login" },
  { key: "settings", label: "Настройки", icon: "settings" },
];

export default function Sidebar({ page, onPage, admin, onLogout }) {
  const [unread, setUnread] = useState(0);

  const refreshUnread = useCallback(async () => {
    try {
      const d = await api.getNotificationsUnread();
      setUnread(d?.unread ?? 0);
    } catch {
      /* best-effort badge — ignore errors */
    }
  }, []);

  // Poll the unread count (every 30s) and refresh on demand (after "mark all read"
  // or when the Notifications page is opened).
  useEffect(() => {
    refreshUnread();
    const id = setInterval(refreshUnread, 30000);
    const onChanged = () => refreshUnread();
    window.addEventListener("boss-notifications-changed", onChanged);
    return () => {
      clearInterval(id);
      window.removeEventListener("boss-notifications-changed", onChanged);
    };
  }, [refreshUnread]);

  // Refresh as soon as the user navigates to the Notifications page.
  useEffect(() => {
    if (page === "notifications") refreshUnread();
  }, [page, refreshUnread]);

  return (
    <div className="o-sidebar">
      <div className="o-sidebar__logo">
        <div className="o-sidebar__logo-title">Boss Control</div>
        <div className="o-sidebar__logo-sub">Дордой ERP · платформа</div>
      </div>

      <nav className="o-sidebar__nav">
        {NAV.map(item => (
          <button
            key={item.key}
            className={`o-nav-item${page === item.key ? " active" : ""}`}
            onClick={() => onPage(item.key)}
          >
            <Icon name={item.icon} size={20} />
            <span style={{ flex: 1, textAlign: "left" }}>{item.label}</span>
            {item.key === "notifications" && unread > 0 && (
              <span style={{
                minWidth: 18, height: 18, padding: "0 5px", borderRadius: 9,
                background: "#E53935", color: "#fff", fontSize: 11, fontWeight: 700,
                display: "inline-flex", alignItems: "center", justifyContent: "center",
              }}>
                {unread > 99 ? "99+" : unread}
              </span>
            )}
          </button>
        ))}
      </nav>

      <div className="o-sidebar__footer">
        {admin && (
          <div className="row gap-8" style={{ padding: "8px 4px 12px", marginBottom: 8 }}>
            <Avatar name={admin.name || admin.login || "?"} size={32} hue={262} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {admin.name || admin.login}
              </div>
              <div style={{ fontSize: 11, opacity: 0.7 }}>Супер-админ</div>
            </div>
          </div>
        )}
        <button className="o-nav-item" onClick={onLogout} style={{ color: "rgba(255,255,255,0.6)" }}>
          <Icon name="logout" size={18} />
          Выйти
        </button>
      </div>
    </div>
  );
}
