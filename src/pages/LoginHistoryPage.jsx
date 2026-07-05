import { useState, useEffect, useCallback } from "react";
import { api } from "../api.js";
import { Icon } from "../icons.jsx";
import { fmtDateTime, exportXlsx } from "../utils.js";

const LIMIT = 50;

export default function LoginHistoryPage() {
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState(""); // branchId filter (entered manually or via deep-link)
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = { page, limit: LIMIT };
      if (search.trim()) params.branchId = search.trim();
      const d = await api.getLoginHistory(params);
      setRows(d.items || []);
      setTotal(d.total || 0);
    } catch (e) {
      setError(e.message);
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => { load(); }, [load]);

  function doExport() {
    exportXlsx(rows.map(r => ({
      Время: fmtDateTime(r.createdAt),
      Пользователь: r.userName || r.userId,
      Логин: r.userLogin || "",
      Магазин: r.branchName || r.branchId || "",
      IP: r.ip || "",
      Устройство: r.userAgent || "",
    })), `login_history_page_${page}`);
  }

  const pages = Math.max(1, Math.ceil(total / LIMIT));

  return (
    <div className="o-content">
      <div className="o-toolbar">
        <form
          className="row gap-8"
          onSubmit={(e) => { e.preventDefault(); setPage(1); load(); }}
        >
          <input
            className="o-input"
            placeholder="Фильтр по ID магазина…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ minWidth: 220 }}
          />
          <button className="o-btn outline sm" type="submit"><Icon name="search" size={16} /> Найти</button>
          {search && (
            <button className="o-btn outline sm" type="button" onClick={() => { setSearch(""); setPage(1); }}>Сброс</button>
          )}
        </form>
        <div className="grow" />
        <button className="o-btn outline sm" onClick={doExport} disabled={!rows.length}><Icon name="download" size={16} /> Excel</button>
      </div>

      {error && <div className="o-error mb-16">{error}</div>}

      <div className="o-table-wrap">
        <table className="o-table">
          <thead><tr><th>Время</th><th>Пользователь</th><th>Магазин</th><th>IP</th><th>Устройство</th></tr></thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="o-empty">Загрузка…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={5} className="o-empty">Записей нет</td></tr>
            ) : rows.map(r => (
              <tr key={r.id}>
                <td>{fmtDateTime(r.createdAt)}</td>
                <td>
                  {r.userName || "—"}
                  {r.userLogin && <span className="text-2" style={{ fontSize: 12 }}> · {r.userLogin}</span>}
                </td>
                <td>{r.branchName || (r.branchId ? `#${r.branchId}` : "—")}</td>
                <td className="text-2" style={{ fontSize: 12 }}>{r.ip || "—"}</td>
                <td className="text-2" style={{ fontSize: 12, maxWidth: 320, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {r.userAgent || "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="o-pager">
        <div className="o-pager__info">Страница {page} из {pages} · всего {total}</div>
        <div className="o-pager__btns">
          <button className="o-btn outline sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Назад</button>
          <button className="o-btn outline sm" disabled={page >= pages} onClick={() => setPage(p => p + 1)}>Вперёд</button>
        </div>
      </div>
    </div>
  );
}
