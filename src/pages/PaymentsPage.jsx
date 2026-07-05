import { useState, useEffect, useCallback } from "react";
import { api } from "../api.js";
import { Icon } from "../icons.jsx";
import { FMT, money, fmtDateTime, fmtDate, dateInputToRFC, exportXlsx } from "../utils.js";

const LIMIT = 25;

export default function PaymentsPage() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [status, setStatus] = useState("");
  const [provider, setProvider] = useState("");
  const [page, setPage] = useState(1);

  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [sum, setSum] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const d = await api.getPayments({
        from: dateInputToRFC(from),
        to: dateInputToRFC(to),
        status, provider, page, limit: LIMIT,
      });
      setRows(d.items || []);
      setTotal(d.total || 0);
      setSum(d.sum || 0);
    } catch (e) {
      setError(e.message);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [from, to, status, provider, page]);

  useEffect(() => { load(); }, [load]);

  const pages = Math.max(1, Math.ceil(total / LIMIT));

  function doExport() {
    exportXlsx(rows.map(r => ({
      ID: r.id,
      Магазин: r.branchName,
      "Заказ": r.orderId,
      Провайдер: r.provider,
      Сумма: r.amount,
      Месяцев: r.months,
      Статус: r.status,
      "Оплачен": fmtDateTime(r.paidAt),
      "Создан": fmtDateTime(r.createdAt),
    })), `payments_${fmtDate(new Date()).replace(/\./g, "-")}`);
  }

  return (
    <div className="o-content">
      <div className="o-toolbar">
        <div className="o-field"><label>С даты</label><input className="o-input sm" type="date" value={from} onChange={e => { setFrom(e.target.value); setPage(1); }} /></div>
        <div className="o-field"><label>По дату</label><input className="o-input sm" type="date" value={to} onChange={e => { setTo(e.target.value); setPage(1); }} /></div>
        <div className="o-field">
          <label>Статус</label>
          <select className="o-select sm" value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}>
            <option value="">Все</option>
            <option value="paid">Оплачен</option>
            <option value="pending">Ожидает</option>
          </select>
        </div>
        <div className="o-field"><label>Провайдер</label><input className="o-input sm" value={provider} onChange={e => { setProvider(e.target.value); setPage(1); }} placeholder="bakai…" /></div>
        <div className="spacer" />
        <button className="o-btn outline sm" onClick={doExport} disabled={!rows.length}>
          <Icon name="download" size={16} /> Excel
        </button>
      </div>

      <div className="o-metrics" style={{ gridTemplateColumns: "repeat(2,1fr)" }}>
        <div className="o-card"><div className="o-card__title">Сумма (по фильтру)</div><div className="o-card__value">{money(sum)}</div></div>
        <div className="o-card"><div className="o-card__title">Платежей</div><div className="o-card__value">{FMT.format(total)}</div></div>
      </div>

      {error && <div className="o-error mb-16">{error}</div>}

      <div className="o-table-wrap">
        <table className="o-table">
          <thead>
            <tr><th>Дата</th><th>Магазин</th><th>Заказ</th><th>Провайдер</th><th className="num">Сумма</th><th className="num">Мес.</th><th>Статус</th></tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="o-empty">Загрузка…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={7} className="o-empty">Платежей нет</td></tr>
            ) : rows.map(r => (
              <tr key={r.id}>
                <td>{fmtDateTime(r.paidAt || r.createdAt)}</td>
                <td>{r.branchName}</td>
                <td className="text-2" style={{ fontSize: 12 }}>{r.orderId}</td>
                <td>{r.provider}</td>
                <td className="num">{money(r.amount)}</td>
                <td className="num">{r.months}</td>
                <td>{r.status === "paid" ? <span className="o-badge success">Оплачен</span> : <span className="o-badge warning">Ожидает</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="o-pager">
        <div className="o-pager__info">Всего: {FMT.format(total)}</div>
        <div className="o-pager__btns">
          <button className="o-btn outline sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Назад</button>
          <span style={{ alignSelf: "center", fontSize: 13 }}>{page} / {pages}</span>
          <button className="o-btn outline sm" disabled={page >= pages} onClick={() => setPage(p => p + 1)}>Вперёд</button>
        </div>
      </div>
    </div>
  );
}
