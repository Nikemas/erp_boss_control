import { useState, useEffect, useCallback } from "react";
import { api } from "../api.js";
import { Icon } from "../icons.jsx";
import { fmtDateTime, exportXlsx } from "../utils.js";

const LIMIT = 50;

// type → human label + badge variant.
const TYPES = {
  new_registration:   { label: "Регистрация",          badge: "info" },
  new_payment:        { label: "Оплата",               badge: "success" },
  promo_used:         { label: "Промокод",             badge: "info" },
  subscription_ended: { label: "Подписка закончилась", badge: "warning" },
  payment_error:      { label: "Ошибка оплаты",        badge: "error" },
  user_blocked:       { label: "Блокировка",           badge: "error" },
};

function typeInfo(t) {
  return TYPES[t] || { label: t, badge: "muted" };
}

export default function NotificationsPage() {
  const [rows, setRows] = useState([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const d = await api.getNotifications({ page, limit: LIMIT });
      setRows(Array.isArray(d) ? d : (d.items || []));
    } catch (e) {
      setError(e.message);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => { load(); }, [load]);

  // Refresh the feed live when a WS push arrives (useBossWS fires this event).
  useEffect(() => {
    const onChanged = () => load();
    window.addEventListener("boss-notifications-changed", onChanged);
    return () => window.removeEventListener("boss-notifications-changed", onChanged);
  }, [load]);

  async function markAllRead() {
    setBusy(true);
    try {
      await api.markNotificationsRead();
      // Notify the shell so the sidebar badge refreshes immediately.
      window.dispatchEvent(new Event("boss-notifications-changed"));
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  function doExport() {
    exportXlsx(rows.map(r => ({
      Тип: typeInfo(r.type).label,
      Заголовок: r.title,
      Текст: r.body,
      Объект: `${r.targetType || ""}${r.targetId ? " #" + r.targetId : ""}`,
      Прочитано: r.readAt ? "да" : "нет",
      Время: fmtDateTime(r.createdAt),
    })), `notifications_page_${page}`);
  }

  const hasNext = rows.length >= LIMIT;
  const hasUnread = rows.some(r => !r.readAt);

  return (
    <div className="o-content">
      <div className="o-toolbar">
        <div className="grow" />
        <button className="o-btn outline sm" onClick={markAllRead} disabled={busy || !hasUnread}>
          <Icon name="check" size={16} /> Отметить все прочитанными
        </button>
        <button className="o-btn outline sm" onClick={doExport} disabled={!rows.length}>
          <Icon name="download" size={16} /> Excel
        </button>
      </div>

      {error && <div className="o-error mb-16">{error}</div>}

      <div className="o-table-wrap">
        <table className="o-table">
          <thead><tr><th>Время</th><th>Тип</th><th>Событие</th><th>Объект</th><th></th></tr></thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="o-empty">Загрузка…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={5} className="o-empty">Уведомлений нет</td></tr>
            ) : rows.map(r => {
              const t = typeInfo(r.type);
              return (
                <tr key={r.id} style={r.readAt ? { opacity: 0.6 } : undefined}>
                  <td>{fmtDateTime(r.createdAt)}</td>
                  <td><span className={`o-badge ${t.badge}`}>{t.label}</span></td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{r.title}</div>
                    <div className="text-2" style={{ fontSize: 12 }}>{r.body}</div>
                  </td>
                  <td className="text-2" style={{ fontSize: 12 }}>
                    {r.targetType}{r.targetId ? ` #${r.targetId}` : ""}
                  </td>
                  <td>{!r.readAt && (
                    <span title="Не прочитано" style={{
                      display: "inline-block", width: 8, height: 8,
                      borderRadius: "50%", background: "var(--primary)",
                    }} />
                  )}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="o-pager">
        <div className="o-pager__info">Страница {page}</div>
        <div className="o-pager__btns">
          <button className="o-btn outline sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Назад</button>
          <button className="o-btn outline sm" disabled={!hasNext} onClick={() => setPage(p => p + 1)}>Вперёд</button>
        </div>
      </div>
    </div>
  );
}
