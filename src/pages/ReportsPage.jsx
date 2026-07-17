import { useState, useEffect, useCallback } from "react";
import { api } from "../api.js";
import { Icon } from "../icons.jsx";
import {
  FMT, money, fmtDate, fmtDateTime, dateInputToRFC,
  exportXlsx, exportXlsxSheets, subStatus,
} from "../utils.js";

const LIMIT = 25;

const SORTS = [
  { value: "salesTotal", label: "По выручке" },
  { value: "salesCount", label: "По числу продаж" },
  { value: "profit", label: "По прибыли" },
  { value: "purchasesTotal", label: "По закупкам" },
  { value: "lastSale", label: "По последней продаже" },
  { value: "name", label: "По названию" },
];

const PAY_LABELS = { cash: "Наличные", card: "Карта", transfer: "Перевод", mixed: "Смешанная" };

function qty(v) {
  return FMT.format(Math.round((v || 0) * 1000) / 1000);
}

// Отчётность по постоянным клиентам: что каждый магазин продаёт и закупает за
// период — сводная таблица + drill-down по клиенту, всё выгружается в Excel.
export default function ReportsPage() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("salesTotal");
  const [page, setPage] = useState(1);

  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [detailId, setDetailId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const d = await api.getClientsReport({
        from: dateInputToRFC(from),
        to: dateInputToRFC(to),
        search, sort, page, limit: LIMIT,
      });
      setRows(d.items || []);
      setTotal(d.total || 0);
      setSummary(d.summary || null);
    } catch (e) {
      setError(e.message);
      setRows([]);
      setSummary(null);
    } finally {
      setLoading(false);
    }
  }, [from, to, search, sort, page]);

  useEffect(() => { load(); }, [load]);

  const pages = Math.max(1, Math.ceil(total / LIMIT));
  const stamp = fmtDate(new Date()).replace(/\./g, "-");

  // Полная выгрузка (все страницы по текущему фильтру), не только видимые 25 строк.
  async function doExport() {
    try {
      const all = [];
      for (let p = 1; ; p++) {
        const d = await api.getClientsReport({
          from: dateInputToRFC(from), to: dateInputToRFC(to),
          search, sort, page: p, limit: 200,
        });
        all.push(...(d.items || []));
        if (all.length >= (d.total || 0) || !(d.items || []).length) break;
      }
      exportXlsx(all.map(r => ({
        "Магазин": r.branchName,
        "Владелец": r.ownerName || "",
        "Телефон": r.ownerPhone || "",
        "Подписка": subStatus(r.subscriptionStatus).label,
        "Продаж": r.salesCount,
        "Выручка": r.salesTotal,
        "Прибыль": r.salesProfit,
        "Средний чек": Math.round(r.avgCheck),
        "Закупок": r.purchasesCount,
        "Сумма закупок": r.purchasesTotal,
        "Товаров": r.productsCount,
        "Последняя продажа": fmtDateTime(r.lastSaleAt),
      })), `clients_report_${stamp}`);
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <div className="o-content">
      <div className="o-toolbar">
        <div className="o-field"><label>С даты</label><input className="o-input sm" type="date" value={from} onChange={e => { setFrom(e.target.value); setPage(1); }} /></div>
        <div className="o-field"><label>По дату</label><input className="o-input sm" type="date" value={to} onChange={e => { setTo(e.target.value); setPage(1); }} /></div>
        <div className="o-field"><label>Поиск</label><input className="o-input sm" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Магазин, владелец…" /></div>
        <div className="o-field">
          <label>Сортировка</label>
          <select className="o-select sm" value={sort} onChange={e => { setSort(e.target.value); setPage(1); }}>
            {SORTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>
        <div className="spacer" />
        <button className="o-btn outline sm" onClick={doExport} disabled={!rows.length}>
          <Icon name="download" size={16} /> Excel
        </button>
      </div>

      {summary && (
        <div className="o-metrics" style={{ gridTemplateColumns: "repeat(5,1fr)" }}>
          <div className="o-card"><div className="o-card__title">Выручка клиентов</div><div className="o-card__value">{money(summary.salesTotal)}</div></div>
          <div className="o-card"><div className="o-card__title">Прибыль клиентов</div><div className="o-card__value">{money(summary.salesProfit)}</div></div>
          <div className="o-card"><div className="o-card__title">Продаж</div><div className="o-card__value">{FMT.format(summary.salesCount)}</div></div>
          <div className="o-card"><div className="o-card__title">Закупки</div><div className="o-card__value">{money(summary.purchasesTotal)}</div></div>
          <div className="o-card"><div className="o-card__title">Активных клиентов</div><div className="o-card__value">{FMT.format(summary.activeClients)}</div></div>
        </div>
      )}

      {error && <div className="o-error mb-16">{error}</div>}

      <div className="o-table-wrap">
        <table className="o-table">
          <thead>
            <tr>
              <th>Магазин</th><th>Подписка</th>
              <th className="num">Продаж</th><th className="num">Выручка</th>
              <th className="num">Прибыль</th><th className="num">Ср. чек</th>
              <th className="num">Закупки</th><th className="num">Товаров</th>
              <th>Последняя продажа</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={9} className="o-empty">Загрузка…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={9} className="o-empty">Нет данных за период</td></tr>
            ) : rows.map(r => {
              const st = subStatus(r.subscriptionStatus);
              return (
                <tr key={r.branchId} className="clickable" onClick={() => setDetailId(r.branchId)} style={{ cursor: "pointer" }}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{r.branchName}</div>
                    <div className="text-2" style={{ fontSize: 12 }}>{r.ownerName || "—"}</div>
                  </td>
                  <td><span className={`o-badge ${st.cls}`}>{st.label}</span></td>
                  <td className="num">{FMT.format(r.salesCount)}</td>
                  <td className="num">{money(r.salesTotal)}</td>
                  <td className="num">{money(r.salesProfit)}</td>
                  <td className="num">{money(r.avgCheck)}</td>
                  <td className="num">{money(r.purchasesTotal)}</td>
                  <td className="num">{FMT.format(r.productsCount)}</td>
                  <td>{fmtDateTime(r.lastSaleAt)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="o-pager">
        <div className="o-pager__info">Всего клиентов: {FMT.format(total)}</div>
        <div className="o-pager__btns">
          <button className="o-btn outline sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Назад</button>
          <span style={{ alignSelf: "center", fontSize: 13 }}>{page} / {pages}</span>
          <button className="o-btn outline sm" disabled={page >= pages} onClick={() => setPage(p => p + 1)}>Вперёд</button>
        </div>
      </div>

      {detailId && (
        <ClientReportModal
          branchId={detailId}
          from={from}
          to={to}
          onClose={() => setDetailId(null)}
        />
      )}
    </div>
  );
}

function ClientReportModal({ branchId, from, to, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("sold");

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const d = await api.getClientReport(branchId, {
          from: dateInputToRFC(from),
          to: dateInputToRFC(to),
        });
        if (alive) setData(d);
      } catch (e) {
        if (alive) setError(e.message);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [branchId, from, to]);

  function doExport() {
    if (!data) return;
    const s = data.summary || {};
    const stamp = fmtDate(new Date()).replace(/\./g, "-");
    exportXlsxSheets([
      {
        name: "Сводка",
        rows: [{
          "Магазин": data.branch?.name,
          "Период с": from || "—",
          "Период по": to || "—",
          "Продаж": s.salesCount,
          "Выручка": s.salesTotal,
          "Прибыль": s.salesProfit,
          "Закупок": s.purchasesCount,
          "Сумма закупок": s.purchasesTotal,
        }],
      },
      {
        name: "Продажи по товарам",
        rows: (data.topSold || []).map(p => ({
          "Товар": p.productName, "Ед.": p.unit, "Кол-во": p.qty,
          "Выручка": p.amount, "Прибыль": p.profit,
        })),
      },
      {
        name: "Закупки по товарам",
        rows: (data.topPurchased || []).map(p => ({
          "Товар": p.productName, "Ед.": p.unit, "Кол-во": p.qty, "Сумма": p.amount,
        })),
      },
      {
        name: "По дням",
        rows: (data.byDay || []).map(d => ({
          "Дата": d.day, "Продаж": d.salesCount,
          "Выручка": d.salesTotal, "Закупки": d.purchasesTotal,
        })),
      },
      {
        name: "Способы оплаты",
        rows: (data.payMethods || []).map(m => ({
          "Способ": PAY_LABELS[m.method] || m.method, "Продаж": m.count, "Сумма": m.total,
        })),
      },
    ], `client_report_${(data.branch?.name || branchId).replace(/[^\wа-яА-ЯёЁ-]+/g, "_")}_${stamp}`);
  }

  const s = data?.summary || {};
  const products = tab === "sold" ? (data?.topSold || []) : (data?.topPurchased || []);

  return (
    <div className="o-modal-bg" onClick={onClose}>
      <div className="o-modal wide" onClick={e => e.stopPropagation()}>
        <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
          <div className="o-modal-title">{loading ? "Отчёт…" : `${data?.branch?.name || ""} — отчёт`}</div>
          <div className="row gap-8">
            <button className="o-btn outline sm" onClick={doExport} disabled={!data}>
              <Icon name="download" size={16} /> Excel
            </button>
            <button className="o-btn outline sm" onClick={onClose}><Icon name="close" size={16} /></button>
          </div>
        </div>

        {error && <div className="o-error">{error}</div>}
        {loading ? (
          <div className="o-empty">Загрузка…</div>
        ) : data && (
          <>
            <div className="o-detail-grid">
              <div><div className="k">Продаж / выручка</div><div className="v">{FMT.format(s.salesCount)} · {money(s.salesTotal)}</div></div>
              <div><div className="k">Прибыль</div><div className="v">{money(s.salesProfit)}</div></div>
              <div><div className="k">Закупок / сумма</div><div className="v">{FMT.format(s.purchasesCount)} · {money(s.purchasesTotal)}</div></div>
              <div>
                <div className="k">Способы оплаты</div>
                <div className="v">
                  {(data.payMethods || []).length
                    ? data.payMethods.map(m => `${PAY_LABELS[m.method] || m.method}: ${money(m.total)}`).join(" · ")
                    : "—"}
                </div>
              </div>
            </div>

            <div className="row gap-8">
              <button className={`o-btn sm ${tab === "sold" ? "" : "outline"}`} onClick={() => setTab("sold")}>
                Продают ({(data.topSold || []).length})
              </button>
              <button className={`o-btn sm ${tab === "purchased" ? "" : "outline"}`} onClick={() => setTab("purchased")}>
                Закупают ({(data.topPurchased || []).length})
              </button>
            </div>

            <div className="o-table-wrap" style={{ maxHeight: 340, overflowY: "auto" }}>
              <table className="o-table">
                <thead>
                  <tr>
                    <th>Товар</th><th className="num">Кол-во</th>
                    <th className="num">{tab === "sold" ? "Выручка" : "Сумма закупки"}</th>
                    {tab === "sold" && <th className="num">Прибыль</th>}
                  </tr>
                </thead>
                <tbody>
                  {products.length === 0 ? (
                    <tr><td colSpan={tab === "sold" ? 4 : 3} className="o-empty">Нет данных за период</td></tr>
                  ) : products.map((p, i) => (
                    <tr key={`${p.productName}-${i}`}>
                      <td>{p.productName}</td>
                      <td className="num">{qty(p.qty)} {p.unit}</td>
                      <td className="num">{money(p.amount)}</td>
                      {tab === "sold" && <td className="num">{money(p.profit)}</td>}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
