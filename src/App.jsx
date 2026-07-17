import { useState, useEffect } from "react";
import "./app.css";
import { getAdmin, clearToken, getToken } from "./api.js";
import LoginPage from "./pages/LoginPage.jsx";
import DashboardPage from "./pages/DashboardPage.jsx";
import ClientsPage from "./pages/ClientsPage.jsx";
import PaymentsPage from "./pages/PaymentsPage.jsx";
import ReportsPage from "./pages/ReportsPage.jsx";
import PartnersPage from "./pages/PartnersPage.jsx";
import PromoPage from "./pages/PromoPage.jsx";
import NotificationsPage from "./pages/NotificationsPage.jsx";
import AuditPage from "./pages/AuditPage.jsx";
import LoginHistoryPage from "./pages/LoginHistoryPage.jsx";
import SettingsPage from "./pages/SettingsPage.jsx";
import Sidebar from "./Sidebar.jsx";
import { Icon } from "./icons.jsx";
import { useBossWS } from "./useBossWS.js";

const PAGE_TITLES = {
  dashboard: "Дашборд",
  clients: "Клиенты",
  payments: "Финансы",
  reports: "Отчёты по клиентам",
  partners: "Партнёры",
  promo: "Промокоды",
  notifications: "Уведомления",
  audit: "Журнал аудита",
  "login-history": "История входов",
  settings: "Настройки",
};

export default function App() {
  // logged-in if we have both an admin record and a token
  const [admin, setAdmin] = useState(() => (getToken() ? getAdmin() : null));
  const [page, setPage] = useState("dashboard");

  // Live notification channel — open only while logged in.
  useBossWS(!!admin);

  // api.js fires this when a 401 cannot be recovered via refresh
  useEffect(() => {
    const handler = () => setAdmin(null);
    window.addEventListener("boss-logout", handler);
    return () => window.removeEventListener("boss-logout", handler);
  }, []);

  function handleLogin(a) {
    setAdmin(a);
    setPage("dashboard");
  }

  function handleLogout() {
    clearToken();
    setAdmin(null);
  }

  if (!admin) {
    return <LoginPage onLogin={handleLogin} />;
  }

  return (
    <div className="o-layout">
      <Sidebar page={page} onPage={setPage} admin={admin} onLogout={handleLogout} />
      <div className="o-main">
        <header className="o-topbar">
          <div className="o-topbar__title">{PAGE_TITLES[page]}</div>
          <button className="o-btn outline" style={{ gap: 6 }} onClick={() => window.location.reload()}>
            <Icon name="refresh" size={16} />
            Обновить
          </button>
        </header>
        <main>
          {page === "dashboard" && <DashboardPage />}
          {page === "clients" && <ClientsPage />}
          {page === "payments" && <PaymentsPage />}
          {page === "reports" && <ReportsPage />}
          {page === "partners" && <PartnersPage />}
          {page === "promo" && <PromoPage />}
          {page === "notifications" && <NotificationsPage />}
          {page === "audit" && <AuditPage />}
          {page === "login-history" && <LoginHistoryPage />}
          {page === "settings" && <SettingsPage admin={admin} />}
        </main>
      </div>
    </div>
  );
}
