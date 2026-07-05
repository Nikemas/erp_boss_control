import { useState, useEffect } from "react";
import { api } from "../api.js";
import { FMT, money } from "../utils.js";

function Card({ title, value, sub }) {
  return (
    <div className="o-card">
      <div className="o-card__title">{title}</div>
      <div className="o-card__value">{value}</div>
      {sub && <div className="o-card__sub">{sub}</div>}
    </div>
  );
}

function Skeletons({ n = 4 }) {
  return Array.from({ length: n }).map((_, i) => (
    <div key={i} className="o-card">
      <div className="o-skel" style={{ height: 13, width: "50%", marginBottom: 12 }} />
      <div className="o-skel" style={{ height: 32, width: "70%" }} />
    </div>
  ));
}

export default function DashboardPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const d = await api.getOverview();
        if (!cancelled) setData(d);
      } catch (e) {
        if (!cancelled) setError(e.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const u = data?.users || {};
  const sh = data?.shops || {};
  const p = data?.payments || {};
  const s = data?.subscriptions || {};

  return (
    <div className="o-content">
      {error && <div className="o-error mb-16">{error}</div>}

      <h3 className="o-section-title">Пользователи</h3>
      <div className="o-metrics">
        {loading ? <Skeletons /> : (
          <>
            <Card title="Всего" value={FMT.format(u.total || 0)} sub={`активных: ${FMT.format(u.active || 0)} · неактивных: ${FMT.format(u.inactive || 0)}`} />
            <Card title="Онлайн сейчас" value={FMT.format(u.onlineNow || 0)} />
            <Card title="Новых сегодня" value={FMT.format(u.newToday || 0)} sub={`за месяц: ${FMT.format(u.newMonth || 0)}`} />
            <Card title="Новых за год" value={FMT.format(u.newYear || 0)} />
          </>
        )}
      </div>

      <h3 className="o-section-title">Магазины</h3>
      <div className="o-metrics">
        {loading ? <Skeletons n={3} /> : (
          <>
            <Card title="Всего магазинов" value={FMT.format(sh.total || 0)} />
            <Card title="Активных" value={FMT.format(sh.active || 0)} />
            <Card title="Заблокировано" value={FMT.format(sh.blocked || 0)} />
          </>
        )}
      </div>

      <h3 className="o-section-title">Платежи</h3>
      <div className="o-metrics">
        {loading ? <Skeletons /> : (
          <>
            <Card title="Сумма всего" value={money(p.sumTotal)} sub={`платежей: ${FMT.format(p.countTotal || 0)}`} />
            <Card title="За сегодня" value={money(p.sumDay)} />
            <Card title="За месяц" value={money(p.sumMonth)} />
            <Card title="За год" value={money(p.sumYear)} />
          </>
        )}
      </div>

      <h3 className="o-section-title">Подписки</h3>
      <div className="o-metrics">
        {loading ? <Skeletons /> : (
          <>
            <Card title="Активные" value={FMT.format(s.active || 0)} />
            <Card title="Ожидают" value={FMT.format(s.pending || 0)} />
            <Card title="Заблокированы" value={FMT.format(s.blocked || 0)} />
            <Card title="Бесплатные (comp)" value={FMT.format(s.comp || 0)} />
          </>
        )}
      </div>
    </div>
  );
}
