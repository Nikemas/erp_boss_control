import { useState, useEffect, useCallback } from "react";
import { api } from "../api.js";
import { Icon } from "../icons.jsx";
import { FMT, money, fmtDate, fmtDateTime, subStatus, dateInputToRFC, toDateInput } from "../utils.js";

const STATUS_OPTIONS = [
  { v: "", l: "Все статусы" },
  { v: "active", l: "Активна" },
  { v: "pending", l: "Ожидает" },
  { v: "blocked", l: "Заблокирована" },
  { v: "due_soon", l: "Скоро истекает" },
  { v: "canceled", l: "Отменена" },
  { v: "comp", l: "Бесплатно" },
];
const LIMIT = 20;

function StatusBadge({ status }) {
  const s = subStatus(status);
  return <span className={`o-badge ${s.cls}`}>{s.label}</span>;
}

export default function ClientsPage() {
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState(null); // branchId of open detail

  useEffect(() => {
    const t = setTimeout(() => { setDebounced(search); setPage(1); }, 350);
    return () => clearTimeout(t);
  }, [search]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const d = await api.getClients({ search: debounced, status, page, limit: LIMIT });
      setRows(d.items || []);
      setTotal(d.total || 0);
    } catch (e) {
      setError(e.message);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [debounced, status, page]);

  useEffect(() => { load(); }, [load]);

  const pages = Math.max(1, Math.ceil(total / LIMIT));

  return (
    <div className="o-content">
      <div className="o-toolbar">
        <div className="o-field grow">
          <label>Поиск</label>
          <input
            className="o-input sm"
            placeholder="магазин, владелец, телефон, логин"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="o-field">
          <label>Статус подписки</label>
          <select className="o-select sm" value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}>
            {STATUS_OPTIONS.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
          </select>
        </div>
      </div>

      {error && <div className="o-error mb-16">{error}</div>}

      <div className="o-table-wrap">
        <table className="o-table">
          <thead>
            <tr>
              <th>Магазин</th>
              <th>Владелец</th>
              <th>Телефон</th>
              <th className="num">Польз.</th>
              <th>Подписка</th>
              <th>Оплачено до</th>
              <th>Промо / партнёр</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="o-empty">Загрузка…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={7} className="o-empty">Клиенты не найдены</td></tr>
            ) : rows.map(r => (
              <tr key={r.branchId} className="clickable" onClick={() => setSelected(r.branchId)}>
                <td>
                  <div className="font-500">{r.branchName}</div>
                  {r.isBlocked && <span className="o-badge error" style={{ marginTop: 4 }}>Заблокирован</span>}
                </td>
                <td>{r.ownerName || "—"}<div className="text-2" style={{ fontSize: 12 }}>{r.ownerLogin}</div></td>
                <td>{r.ownerPhone || "—"}</td>
                <td className="num">{FMT.format(r.usersCount || 0)}</td>
                <td><StatusBadge status={r.comp ? "comp" : r.subscriptionStatus} /></td>
                <td>{fmtDate(r.paidUntil)}</td>
                <td>{r.promoCode || r.partnerName || "—"}</td>
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

      {selected && (
        <ClientDetail
          branchId={selected}
          onClose={() => setSelected(null)}
          onChanged={() => { load(); }}
        />
      )}
    </div>
  );
}

function Field({ k, v }) {
  return (<><div className="k">{k}</div><div className="v">{v}</div></>);
}

function ClientDetail({ branchId, onClose, onChanged }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState("");

  // sub-forms
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editAddr, setEditAddr] = useState("");

  const [subOpen, setSubOpen] = useState(false);
  const [subPrice, setSubPrice] = useState("");
  const [subPaidUntil, setSubPaidUntil] = useState("");
  const [subComp, setSubComp] = useState(false);
  const [subReason, setSubReason] = useState("");

  const [imp, setImp] = useState(null); // impersonation result

  const reload = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const d = await api.getClient(branchId);
      setData(d);
      setEditName(d.branch?.name || "");
      setEditAddr(d.branch?.address || "");
      setSubPrice(d.subscription?.monthlyPrice ?? "");
      setSubPaidUntil(toDateInput(d.subscription?.paidUntil));
      setSubComp(!!d.subscription?.comp);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [branchId]);

  useEffect(() => { reload(); }, [reload]);

  function flash(msg) {
    setToast(msg);
    setTimeout(() => setToast(""), 2500);
  }

  async function run(fn, okMsg) {
    setBusy(true);
    setError("");
    try {
      await fn();
      flash(okMsg);
      await reload();
      onChanged();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function saveEdit() {
    await run(() => api.updateClient(branchId, { name: editName, address: editAddr }), "Сохранено");
    setEditing(false);
  }

  async function saveSub() {
    await run(() => api.setSubscription(branchId, {
      monthlyPrice: Number(subPrice) || 0,
      paidUntil: dateInputToRFC(subPaidUntil),
      comp: subComp,
      compReason: subReason,
    }), "Подписка обновлена");
    setSubOpen(false);
  }

  async function doDelete() {
    if (!window.confirm("Удалить клиента? Действие мягкое, но требует подтверждения.")) return;
    await run(() => api.deleteClient(branchId), "Удалено");
    onClose();
  }

  async function doImpersonate() {
    setBusy(true);
    setError("");
    try {
      const res = await api.impersonate(branchId);
      setImp(res);
      flash("Получен токен клиента");
      onChanged();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function stopImpersonate() {
    await run(() => api.impersonateStop(branchId), "Сессия клиента завершена");
    setImp(null);
  }

  const b = data?.branch;
  const sub = data?.subscription;
  const red = data?.redemption;

  return (
    <div className="o-modal-bg" onClick={onClose}>
      <div className="o-modal wide" onClick={e => e.stopPropagation()}>
        {toast && <div className="o-notif">{toast}</div>}
        <div className="row" style={{ justifyContent: "space-between" }}>
          <div className="o-modal-title">{loading ? "Клиент…" : b?.name}</div>
          <button className="o-btn outline sm" onClick={onClose}><Icon name="close" size={16} /></button>
        </div>

        {error && <div className="o-error">{error}</div>}

        {loading ? (
          <div className="o-empty">Загрузка…</div>
        ) : !data ? (
          <div className="o-empty">Нет данных</div>
        ) : (
          <>
            {/* Branch + actions */}
            <div className="o-block">
              <div className="o-block-title">Магазин</div>
              {editing ? (
                <div className="o-modal-form">
                  <div className="o-field">
                    <label>Название</label>
                    <input className="o-input sm" value={editName} onChange={e => setEditName(e.target.value)} />
                  </div>
                  <div className="o-field">
                    <label>Адрес</label>
                    <input className="o-input sm" value={editAddr} onChange={e => setEditAddr(e.target.value)} />
                  </div>
                  <div className="o-modal-actions">
                    <button className="o-btn outline sm" onClick={() => setEditing(false)} disabled={busy}>Отмена</button>
                    <button className="o-btn primary sm" onClick={saveEdit} disabled={busy}>Сохранить</button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="o-detail-grid">
                    <Field k="Адрес" v={b?.address || "—"} />
                    <Field k="Статус" v={b?.isBlocked ? "Заблокирован" : "Активен"} />
                    <Field k="Создан" v={fmtDate(b?.createdAt)} />
                  </div>
                  <div className="o-modal-actions" style={{ marginTop: 12 }}>
                    <button className="o-btn outline sm" onClick={() => setEditing(true)} disabled={busy}>
                      <Icon name="edit" size={14} /> Изменить
                    </button>
                    {b?.isBlocked ? (
                      <button className="o-btn outline sm" onClick={() => run(() => api.unblockClient(branchId), "Разблокирован")} disabled={busy}>
                        Разблокировать
                      </button>
                    ) : (
                      <button className="o-btn danger sm" onClick={() => run(() => api.blockClient(branchId), "Заблокирован")} disabled={busy}>
                        <Icon name="block" size={14} /> Заблокировать
                      </button>
                    )}
                    <button className="o-btn danger sm" onClick={doDelete} disabled={busy}>
                      <Icon name="delete" size={14} /> Удалить
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Owner */}
            <div className="o-block">
              <div className="o-block-title">Владелец</div>
              <div className="o-detail-grid">
                <Field k="Имя" v={data.owner?.name || "—"} />
                <Field k="Логин" v={data.owner?.login || "—"} />
                <Field k="Телефон" v={data.owner?.phone || "—"} />
                <Field k="Последний вход" v={fmtDateTime(data.owner?.lastLoginAt)} />
              </div>
            </div>

            {/* Subscription */}
            <div className="o-block">
              <div className="o-block-title">Подписка</div>
              {subOpen ? (
                <div className="o-modal-form">
                  <div className="o-field">
                    <label>Цена в месяц (сом)</label>
                    <input className="o-input sm" type="number" value={subPrice} onChange={e => setSubPrice(e.target.value)} />
                  </div>
                  <div className="o-field">
                    <label>Оплачено до</label>
                    <input className="o-input sm" type="date" value={subPaidUntil} onChange={e => setSubPaidUntil(e.target.value)} />
                  </div>
                  <label className="o-check">
                    <input type="checkbox" checked={subComp} onChange={e => setSubComp(e.target.checked)} />
                    Бесплатно (comp)
                  </label>
                  {subComp && (
                    <div className="o-field">
                      <label>Причина (comp)</label>
                      <input className="o-input sm" value={subReason} onChange={e => setSubReason(e.target.value)} />
                    </div>
                  )}
                  <div className="o-modal-actions">
                    <button className="o-btn outline sm" onClick={() => setSubOpen(false)} disabled={busy}>Отмена</button>
                    <button className="o-btn primary sm" onClick={saveSub} disabled={busy}>Сохранить</button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="o-detail-grid">
                    <Field k="Статус" v={<StatusBadge status={sub?.comp ? "comp" : sub?.status} />} />
                    <Field k="Цена/мес" v={sub ? money(sub.monthlyPrice) : "—"} />
                    <Field k="Оплачено до" v={fmtDate(sub?.paidUntil)} />
                    <Field k="Comp" v={sub?.comp ? "Да" : "Нет"} />
                  </div>
                  <div className="o-modal-actions" style={{ marginTop: 12 }}>
                    <button className="o-btn primary sm" onClick={() => setSubOpen(true)} disabled={busy}>
                      Изменить подписку
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Redemption */}
            {red && (
              <div className="o-block">
                <div className="o-block-title">Промокод / привлечение</div>
                <div className="o-detail-grid">
                  <Field k="Код" v={red.code || "—"} />
                  <Field k="Тип" v={red.type || "—"} />
                  <Field k="Партнёр" v={red.partnerName || "—"} />
                  <Field k="Регистрация" v={fmtDate(red.registeredAt)} />
                  <Field k="Первая оплата" v={fmtDate(red.firstPaidAt)} />
                </div>
              </div>
            )}

            {/* Users list */}
            <div className="o-block">
              <div className="o-block-title">Пользователи ({(data.users || []).length})</div>
              <div className="o-table-wrap" style={{ border: "none" }}>
                <table className="o-table">
                  <thead><tr><th>Имя</th><th>Логин</th><th>Роль</th><th>Статус</th><th>Был онлайн</th><th></th></tr></thead>
                  <tbody>
                    {(data.users || []).length === 0 ? (
                      <tr><td colSpan={6} className="o-empty">Нет пользователей</td></tr>
                    ) : data.users.map(us => (
                      <tr key={us.id}>
                        <td>{us.name}</td>
                        <td>{us.login}</td>
                        <td>{us.role}</td>
                        <td>
                          {us.blockedAt
                            ? <span className="o-badge error" title={us.blockedReason || ""}>Заблокирован</span>
                            : us.isActive
                              ? <span className="o-badge success">Активен</span>
                              : <span className="o-badge muted">Неактивен</span>}
                        </td>
                        <td>{fmtDateTime(us.lastSeenAt)}</td>
                        <td>
                          {us.blockedAt ? (
                            <button className="o-btn outline sm" disabled={busy}
                              onClick={() => run(() => api.unblockUser(us.id), "Пользователь разблокирован")}>
                              Разблокировать
                            </button>
                          ) : (
                            <button className="o-btn danger sm" disabled={busy}
                              onClick={() => {
                                const reason = window.prompt("Причина блокировки (попадёт в журнал):", "");
                                if (reason === null) return; // cancelled
                                run(() => api.blockUser(us.id, reason), "Пользователь заблокирован");
                              }}>
                              Блок
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Recent payments */}
            <div className="o-block">
              <div className="o-block-title">Последние платежи</div>
              <div className="o-table-wrap" style={{ border: "none" }}>
                <table className="o-table">
                  <thead><tr><th>Дата</th><th>Провайдер</th><th className="num">Сумма</th><th className="num">Мес.</th><th>Статус</th></tr></thead>
                  <tbody>
                    {(data.payments || []).length === 0 ? (
                      <tr><td colSpan={5} className="o-empty">Платежей нет</td></tr>
                    ) : data.payments.map(pm => (
                      <tr key={pm.id}>
                        <td>{fmtDateTime(pm.paidAt || pm.createdAt)}</td>
                        <td>{pm.provider}</td>
                        <td className="num">{money(pm.amount)}</td>
                        <td className="num">{pm.months}</td>
                        <td>{pm.status === "paid" ? <span className="o-badge success">Оплачен</span> : <span className="o-badge warning">Ожидает</span>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Impersonation */}
            <div className="o-block">
              <div className="o-block-title">Войти как клиент</div>
              <div className="text-2" style={{ fontSize: 13, marginBottom: 10 }}>
                Данные клиента уже показаны выше (просмотр только для чтения). Кнопка получает
                короткоживущий токен владельца — он предназначен для будущего входа из Flutter-приложения.
                Вызов фиксируется в журнале аудита.
              </div>
              {imp ? (
                <>
                  <div className="o-code">{imp.access_token}</div>
                  <div className="text-2 mt-8" style={{ fontSize: 12 }}>
                    Действует до: {fmtDateTime(imp.expiresAt)}
                    {imp.user?.name ? ` · пользователь: ${imp.user.name}` : ""}
                  </div>
                  <div className="o-modal-actions" style={{ marginTop: 12 }}>
                    <button className="o-btn outline sm" onClick={stopImpersonate} disabled={busy}>Завершить сессию</button>
                  </div>
                </>
              ) : (
                <button className="o-btn primary sm" onClick={doImpersonate} disabled={busy}>
                  <Icon name="login" size={14} /> Войти как клиент
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
