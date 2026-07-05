import { useState, useEffect, useCallback } from "react";
import { api } from "../api.js";
import { Icon } from "../icons.jsx";
import { fmtDateTime, exportXlsx } from "../utils.js";

const LIMIT = 50;

export default function AuditPage() {
  const [rows, setRows] = useState([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const d = await api.getAudit({ page, limit: LIMIT });
      // endpoint returns a bare array
      setRows(Array.isArray(d) ? d : (d.items || []));
    } catch (e) {
      setError(e.message);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => { load(); }, [load]);

  function doExport() {
    exportXlsx(rows.map(r => ({
      ID: r.id, Админ: r.adminLogin, Действие: r.action,
      "Тип объекта": r.targetType, "ID объекта": r.targetId,
      Детали: typeof r.detail === "object" ? JSON.stringify(r.detail) : r.detail,
      IP: r.ip, Время: fmtDateTime(r.createdAt),
    })), `audit_page_${page}`);
  }

  const hasNext = rows.length >= LIMIT;

  return (
    <div className="o-content">
      <div className="o-toolbar">
        <div className="grow" />
        <button className="o-btn outline sm" onClick={doExport} disabled={!rows.length}><Icon name="download" size={16} /> Excel</button>
      </div>

      {error && <div className="o-error mb-16">{error}</div>}

      <div className="o-table-wrap">
        <table className="o-table">
          <thead><tr><th>Время</th><th>Админ</th><th>Действие</th><th>Объект</th><th>Детали</th><th>IP</th></tr></thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="o-empty">Загрузка…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={6} className="o-empty">Записей нет</td></tr>
            ) : rows.map(r => (
              <tr key={r.id}>
                <td>{fmtDateTime(r.createdAt)}</td>
                <td>{r.adminLogin}</td>
                <td><span className="o-badge muted">{r.action}</span></td>
                <td>{r.targetType}{r.targetId ? ` #${r.targetId}` : ""}</td>
                <td className="text-2" style={{ fontSize: 12, maxWidth: 280, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {typeof r.detail === "object" ? JSON.stringify(r.detail) : (r.detail || "—")}
                </td>
                <td className="text-2" style={{ fontSize: 12 }}>{r.ip || "—"}</td>
              </tr>
            ))}
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
