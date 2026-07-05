import { useState, useEffect, useCallback } from "react";
import { api } from "../api.js";
import { Icon } from "../icons.jsx";
import { FMT, money, fmtDate, exportXlsx, subStatus } from "../utils.js";

const EMPTY = { fullName: "", phone: "", email: "", commissionRate: "", note: "", isActive: true };

export default function PartnersPage() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [form, setForm] = useState(null); // {id?, ...fields}
  const [busy, setBusy] = useState(false);
  const [statsId, setStatsId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setList(await api.getPartners() || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  function openCreate() { setForm({ ...EMPTY }); }
  function openEdit(p) {
    setForm({
      id: p.id, fullName: p.fullName || "", phone: p.phone || "", email: p.email || "",
      commissionRate: p.commissionRate ?? "", note: p.note || "", isActive: p.isActive,
    });
  }

  async function save() {
    setBusy(true);
    setError("");
    try {
      const body = {
        fullName: form.fullName,
        phone: form.phone,
        email: form.email,
        commissionRate: Number(form.commissionRate) || 0,
        note: form.note,
      };
      if (form.id) {
        body.isActive = form.isActive;
        await api.updatePartner(form.id, body);
      } else {
        await api.createPartner(body);
      }
      setForm(null);
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function del(p) {
    if (!window.confirm(`Удалить партнёра «${p.fullName}»?`)) return;
    setBusy(true);
    try {
      await api.deletePartner(p.id);
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  function doExport() {
    exportXlsx(list.map(p => ({
      ID: p.id, ФИО: p.fullName, Телефон: p.phone, Email: p.email,
      "Комиссия %": p.commissionRate, Активен: p.isActive ? "да" : "нет",
      Заметка: p.note, Создан: fmtDate(p.createdAt),
    })), "partners");
  }

  return (
    <div className="o-content">
      <div className="o-toolbar">
        <div className="grow" />
        <button className="o-btn outline sm" onClick={doExport} disabled={!list.length}><Icon name="download" size={16} /> Excel</button>
        <button className="o-btn primary sm" onClick={openCreate}><Icon name="add" size={16} /> Партнёр</button>
      </div>

      {error && <div className="o-error mb-16">{error}</div>}

      <div className="o-table-wrap">
        <table className="o-table">
          <thead><tr><th>ФИО</th><th>Телефон</th><th>Email</th><th className="num">Комиссия</th><th>Статус</th><th></th></tr></thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="o-empty">Загрузка…</td></tr>
            ) : list.length === 0 ? (
              <tr><td colSpan={6} className="o-empty">Партнёров нет</td></tr>
            ) : list.map(p => (
              <tr key={p.id} className="clickable" onClick={() => setStatsId(p.id)}>
                <td className="font-500">{p.fullName}</td>
                <td>{p.phone || "—"}</td>
                <td>{p.email || "—"}</td>
                <td className="num">{p.commissionRate ?? 0}%</td>
                <td>{p.isActive ? <span className="o-badge success">Активен</span> : <span className="o-badge muted">Выключен</span>}</td>
                <td onClick={e => e.stopPropagation()}>
                  <div className="row gap-8">
                    <button className="o-btn outline sm" onClick={() => openEdit(p)}><Icon name="edit" size={14} /></button>
                    <button className="o-btn danger sm" onClick={() => del(p)}><Icon name="delete" size={14} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {form && (
        <div className="o-modal-bg" onClick={() => !busy && setForm(null)}>
          <div className="o-modal" onClick={e => e.stopPropagation()}>
            <div className="o-modal-title">{form.id ? "Изменить партнёра" : "Новый партнёр"}</div>
            {error && <div className="o-error">{error}</div>}
            <div className="o-modal-form">
              <div className="o-field"><label>ФИО *</label><input className="o-input sm" value={form.fullName} onChange={e => setForm({ ...form, fullName: e.target.value })} /></div>
              <div className="o-field"><label>Телефон</label><input className="o-input sm" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></div>
              <div className="o-field"><label>Email</label><input className="o-input sm" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
              <div className="o-field"><label>Комиссия, %</label><input className="o-input sm" type="number" value={form.commissionRate} onChange={e => setForm({ ...form, commissionRate: e.target.value })} /></div>
              <div className="o-field"><label>Заметка</label><input className="o-input sm" value={form.note} onChange={e => setForm({ ...form, note: e.target.value })} /></div>
              {form.id && (
                <label className="o-check"><input type="checkbox" checked={form.isActive} onChange={e => setForm({ ...form, isActive: e.target.checked })} /> Активен</label>
              )}
            </div>
            <div className="o-modal-actions">
              <button className="o-btn outline sm" onClick={() => setForm(null)} disabled={busy}>Отмена</button>
              <button className="o-btn primary sm" onClick={save} disabled={busy || !form.fullName}>Сохранить</button>
            </div>
          </div>
        </div>
      )}

      {statsId && <PartnerStats id={statsId} onClose={() => setStatsId(null)} />}
    </div>
  );
}

function PartnerStats({ id, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const d = await api.getPartnerStats(id);
        if (!cancelled) setData(d);
      } catch (e) {
        if (!cancelled) setError(e.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id]);

  return (
    <div className="o-modal-bg" onClick={onClose}>
      <div className="o-modal wide" onClick={e => e.stopPropagation()}>
        <div className="row" style={{ justifyContent: "space-between" }}>
          <div className="o-modal-title">{data?.partner?.fullName || "Статистика партнёра"}</div>
          <button className="o-btn outline sm" onClick={onClose}><Icon name="close" size={16} /></button>
        </div>
        {error && <div className="o-error">{error}</div>}
        {loading ? <div className="o-empty">Загрузка…</div> : !data ? <div className="o-empty">Нет данных</div> : (
          <>
            <div className="o-metrics">
              <div className="o-card"><div className="o-card__title">Регистраций</div><div className="o-card__value">{FMT.format(data.registrations || 0)}</div></div>
              <div className="o-card"><div className="o-card__title">Платящих</div><div className="o-card__value">{FMT.format(data.paidClients || 0)}</div></div>
              <div className="o-card"><div className="o-card__title">Активных</div><div className="o-card__value">{FMT.format(data.activeClients || 0)}</div></div>
              <div className="o-card"><div className="o-card__title">Выручка</div><div className="o-card__value">{money(data.revenueTotal)}</div></div>
            </div>
            <div className="o-block">
              <div className="o-block-title">По месяцам</div>
              <div className="o-table-wrap" style={{ border: "none" }}>
                <table className="o-table">
                  <thead><tr><th>Месяц</th><th className="num">Регистраций</th><th className="num">Выручка</th></tr></thead>
                  <tbody>
                    {(data.byMonth || []).length === 0 ? (
                      <tr><td colSpan={3} className="o-empty">Нет данных</td></tr>
                    ) : data.byMonth.map(m => (
                      <tr key={m.month}><td>{m.month}</td><td className="num">{FMT.format(m.registrations || 0)}</td><td className="num">{money(m.revenue)}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="o-block">
              <div className="o-block-title">Клиенты партнёра ({(data.clients || []).length})</div>
              <div className="o-table-wrap" style={{ border: "none" }}>
                <table className="o-table">
                  <thead><tr><th>Магазин</th><th>Владелец</th><th>Телефон</th><th>Промокод</th><th>Зарегистрирован</th><th>Первая оплата</th><th>Подписка</th></tr></thead>
                  <tbody>
                    {(data.clients || []).length === 0 ? (
                      <tr><td colSpan={7} className="o-empty">Клиентов нет</td></tr>
                    ) : data.clients.map(c => {
                      const st = subStatus(c.subscriptionStatus);
                      return (
                        <tr key={c.branchId}>
                          <td className="font-500">{c.branchName || "—"}</td>
                          <td>
                            {c.ownerName || "—"}
                            {c.ownerLogin && <span className="text-2" style={{ fontSize: 12 }}> · {c.ownerLogin}</span>}
                          </td>
                          <td>{c.ownerPhone || "—"}</td>
                          <td className="text-2" style={{ fontSize: 12 }}>{c.code || "—"}</td>
                          <td>{fmtDate(c.registeredAt)}</td>
                          <td>{c.firstPaidAt ? fmtDate(c.firstPaidAt) : "—"}</td>
                          <td><span className={`o-badge ${st.cls}`}>{st.label}</span></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="text-2" style={{ fontSize: 12 }}>
              Комиссия не рассчитывается — показывается ставка {data.partner?.commissionRate ?? 0}% для справки.
            </div>
          </>
        )}
      </div>
    </div>
  );
}
