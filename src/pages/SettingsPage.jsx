const APP_VERSION = "0.0.1";

export default function SettingsPage({ admin }) {
  const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:8080/api/v1";
  return (
    <div className="o-content">
      <div className="o-card" style={{ maxWidth: 560 }}>
        <h3 className="o-section-title">О приложении</h3>
        <div className="o-detail-grid">
          <div className="k">Приложение</div><div className="v">Boss Control — платформенная админка</div>
          <div className="k">Версия</div><div className="v">{APP_VERSION}</div>
          <div className="k">API</div><div className="v">{apiUrl}</div>
          <div className="k">Администратор</div><div className="v">{admin?.name || admin?.login || "—"}</div>
          <div className="k">Логин</div><div className="v">{admin?.login || "—"}</div>
        </div>
        <div className="o-divider" />
        <div className="text-2" style={{ fontSize: 13, lineHeight: 1.6 }}>
          Это супер-админ панель платформы Дордой ERP. Управление клиентами (магазинами),
          подписками, платежами, партнёрами и промокодами. Все действия фиксируются в журнале аудита.
        </div>
      </div>
    </div>
  );
}
