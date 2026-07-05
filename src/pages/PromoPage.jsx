import { useState, useEffect, useCallback } from "react";
import { api } from "../api.js";
import { Icon } from "../icons.jsx";
import { FMT, fmtDate, toDateInput, dateInputToRFC } from "../utils.js";

export default function PromoPage() {
  const [list, setList] = useState([]);
  const [partners, setPartners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [form, setForm] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [codes, prts] = await Promise.all([api.getPromoCodes(), api.getPartners()]);
      setList(codes || []);
      setPartners(prts || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  function openCreate() {
    setForm({ id: null, code: "", type: "partner", partnerId: "", maxUses: "", validUntil: "", freeGrantMonths: "", isActive: true, makeFree: false });
  }
  function openEdit(c) {
    setForm({
      id: c.id, code: c.code, type: c.type, partnerId: c.partnerId || "",
      maxUses: c.maxUses ?? "", validUntil: toDateInput(c.validUntil),
      freeGrantMonths: c.freeGrantMonths ?? "", isActive: c.isActive, makeFree: false,
    });
  }

  const partnerName = (pid) => partners.find(p => p.id === pid)?.fullName || "—";

  function validate() {
    if (form.id) return null;
    if (!form.code.trim()) return "Укажите код";
    if (form.type === "free" && !(Number(form.freeGrantMonths) > 0)) return "Для бесплатного кода нужно freeGrantMonths > 0";
    if (form.type === "partner" && !form.partnerId) return "Для партнёрского кода выберите партнёра";
    return null;
  }

  async function save() {
    const v = validate();
    if (v) { setError(v); return; }
    setBusy(true);
    setError("");
    try {
      if (form.id) {
        const body = {
          isActive: form.isActive,
          maxUses: form.maxUses === "" ? null : Number(form.maxUses),
          validUntil: dateInputToRFC(form.validUntil),
          freeGrantMonths: form.freeGrantMonths === "" ? null : Number(form.freeGrantMonths),
        };
        if (form.partnerId) body.partnerId = form.partnerId;
        if (form.makeFree) body.makeFree = true;
        await api.updatePromoCode(form.id, body);
      } else {
        const body = {
          code: form.code.trim(),
          type: form.type,
          maxUses: form.maxUses === "" ? null : Number(form.maxUses),
          validUntil: dateInputToRFC(form.validUntil),
        };
        if (form.type === "partner") body.partnerId = form.partnerId;
        if (form.type === "free") body.freeGrantMonths = Number(form.freeGrantMonths);
        await api.createPromoCode(body);
      }
      setForm(null);
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function del(c) {
    if (!window.confirm(`Удалить промокод «${c.code}»?`)) return;
    setBusy(true);
    try {
      await api.deletePromoCode(c.id);
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="o-content">
      <div className="o-toolbar">
        <div className="grow" />
        <button className="o-btn primary sm" onClick={openCreate}><Icon name="add" size={16} /> Промокод</button>
      </div>

      {error && !form && <div className="o-error mb-16">{error}</div>}

      <div className="o-table-wrap">
        <table className="o-table">
          <thead><tr><th>Код</th><th>Тип</th><th>Партнёр</th><th className="num">Исп.</th><th>Действует до</th><th className="num">Мес.</th><th>Статус</th><th></th></tr></thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} className="o-empty">Загрузка…</td></tr>
            ) : list.length === 0 ? (
              <tr><td colSpan={8} className="o-empty">Промокодов нет</td></tr>
            ) : list.map(c => (
              <tr key={c.id}>
                <td className="font-500">{c.code}</td>
                <td>{c.type === "free" ? <span className="o-badge info">Бесплатный</span> : <span className="o-badge muted">Партнёрский</span>}</td>
                <td>{c.type === "partner" ? partnerName(c.partnerId) : "—"}</td>
                <td className="num">{FMT.format(c.usedCount || 0)}{c.maxUses ? ` / ${c.maxUses}` : ""}</td>
                <td>{fmtDate(c.validUntil)}</td>
                <td className="num">{c.freeGrantMonths || "—"}</td>
                <td>{c.isActive ? <span className="o-badge success">Активен</span> : <span className="o-badge muted">Выключен</span>}</td>
                <td>
                  <div className="row gap-8">
                    <button className="o-btn outline sm" onClick={() => openEdit(c)}><Icon name="edit" size={14} /></button>
                    <button className="o-btn danger sm" onClick={() => del(c)}><Icon name="delete" size={14} /></button>
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
            <div className="o-modal-title">{form.id ? "Изменить промокод" : "Новый промокод"}</div>
            {error && <div className="o-error">{error}</div>}
            <div className="o-modal-form">
              {!form.id && (
                <>
                  <div className="o-field"><label>Код *</label><input className="o-input sm" value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} /></div>
                  <div className="o-field">
                    <label>Тип *</label>
                    <select className="o-select sm" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                      <option value="partner">Партнёрский</option>
                      <option value="free">Бесплатный</option>
                    </select>
                  </div>
                </>
              )}
              {(form.type === "partner") && (
                <div className="o-field">
                  <label>Партнёр {form.id ? "" : "*"}</label>
                  <select className="o-select sm" value={form.partnerId} onChange={e => setForm({ ...form, partnerId: e.target.value })}>
                    <option value="">— выбрать —</option>
                    {partners.map(p => <option key={p.id} value={p.id}>{p.fullName}</option>)}
                  </select>
                </div>
              )}
              {(form.type === "free") && (
                <div className="o-field"><label>Бесплатных месяцев {form.id ? "" : "*"}</label><input className="o-input sm" type="number" min="1" value={form.freeGrantMonths} onChange={e => setForm({ ...form, freeGrantMonths: e.target.value })} /></div>
              )}
              <div className="o-field"><label>Лимит использований</label><input className="o-input sm" type="number" value={form.maxUses} onChange={e => setForm({ ...form, maxUses: e.target.value })} placeholder="без лимита" /></div>
              <div className="o-field"><label>Действует до</label><input className="o-input sm" type="date" value={form.validUntil} onChange={e => setForm({ ...form, validUntil: e.target.value })} /></div>
              {form.id && (
                <>
                  <label className="o-check"><input type="checkbox" checked={form.isActive} onChange={e => setForm({ ...form, isActive: e.target.checked })} /> Активен</label>
                  <label className="o-check"><input type="checkbox" checked={form.makeFree} onChange={e => setForm({ ...form, makeFree: e.target.checked })} /> Сделать бесплатным (makeFree)</label>
                </>
              )}
            </div>
            <div className="o-modal-actions">
              <button className="o-btn outline sm" onClick={() => setForm(null)} disabled={busy}>Отмена</button>
              <button className="o-btn primary sm" onClick={save} disabled={busy}>Сохранить</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
