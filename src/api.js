const BASE = import.meta.env.VITE_API_URL || "http://localhost:8080/api/v1";

const TOKEN_KEY = "boss_token";
const REFRESH_KEY = "boss_refresh";
const ADMIN_KEY = "boss_admin";

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}
function getRefresh() {
  return localStorage.getItem(REFRESH_KEY);
}

export function saveTokens(access, refresh) {
  if (access) localStorage.setItem(TOKEN_KEY, access);
  if (refresh) localStorage.setItem(REFRESH_KEY, refresh);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem(ADMIN_KEY);
}

export function saveAdmin(admin) {
  localStorage.setItem(ADMIN_KEY, JSON.stringify(admin));
}

export function getAdmin() {
  try {
    return JSON.parse(localStorage.getItem(ADMIN_KEY));
  } catch {
    return null;
  }
}

// Notify the app shell that the session is dead → show login again.
function onSessionExpired() {
  clearToken();
  window.dispatchEvent(new Event("boss-logout"));
}

async function tryRefresh() {
  const refresh_token = getRefresh();
  if (!refresh_token) return false;
  try {
    const res = await fetch(`${BASE}/admin/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token }),
    });
    if (!res.ok) return false;
    const data = await res.json();
    if (data.access_token) {
      saveTokens(data.access_token, null);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

async function rawRequest(path, opts, token) {
  const headers = { "Content-Type": "application/json", ...(opts.headers || {}) };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return fetch(`${BASE}${path}`, { ...opts, headers });
}

async function request(path, opts = {}, _retried = false) {
  let res = await rawRequest(path, opts, getToken());

  if (res.status === 401 && !path.startsWith("/admin/auth/")) {
    if (!_retried) {
      const ok = await tryRefresh();
      if (ok) {
        res = await rawRequest(path, opts, getToken());
        if (res.status !== 401) return finish(res);
      }
    }
    onSessionExpired();
    throw new Error("Unauthorized");
  }

  return finish(res);
}

async function finish(res) {
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    let msg = text;
    try {
      const j = JSON.parse(text);
      msg = j.error || j.message || text;
    } catch {
      /* not json */
    }
    throw new Error(msg || `HTTP ${res.status}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

function qs(params = {}) {
  const clean = {};
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== "") clean[k] = v;
  }
  const s = new URLSearchParams(clean).toString();
  return s ? "?" + s : "";
}

export const api = {
  // Auth
  login: (login, password) =>
    request("/admin/auth/login", {
      method: "POST",
      body: JSON.stringify({ login, password }),
    }),

  // Stats
  getOverview: () => request("/admin/stats/overview"),

  // Clients
  getClients: (params) => request(`/admin/clients${qs(params)}`),
  getClient: (branchId) => request(`/admin/clients/${branchId}`),
  updateClient: (branchId, body) =>
    request(`/admin/clients/${branchId}`, { method: "PUT", body: JSON.stringify(body) }),
  blockClient: (branchId) =>
    request(`/admin/clients/${branchId}/block`, { method: "POST" }),
  unblockClient: (branchId) =>
    request(`/admin/clients/${branchId}/unblock`, { method: "POST" }),
  deleteClient: (branchId) =>
    request(`/admin/clients/${branchId}`, { method: "DELETE" }),
  blockUser: (userId, reason) =>
    request(`/admin/users/${userId}/block`, { method: "POST", body: JSON.stringify({ reason: reason || "" }) }),
  unblockUser: (userId) =>
    request(`/admin/users/${userId}/unblock`, { method: "POST" }),
  setSubscription: (branchId, body) =>
    request(`/admin/clients/${branchId}/subscription`, { method: "POST", body: JSON.stringify(body) }),
  impersonate: (branchId) =>
    request(`/admin/clients/${branchId}/impersonate`, { method: "POST" }),
  impersonateStop: (branchId) =>
    request(`/admin/clients/${branchId}/impersonate/stop`, { method: "POST" }),

  // Payments
  getPayments: (params) => request(`/admin/payments${qs(params)}`),

  // Partners
  getPartners: () => request("/admin/partners"),
  createPartner: (body) =>
    request("/admin/partners", { method: "POST", body: JSON.stringify(body) }),
  updatePartner: (id, body) =>
    request(`/admin/partners/${id}`, { method: "PUT", body: JSON.stringify(body) }),
  deletePartner: (id) =>
    request(`/admin/partners/${id}`, { method: "DELETE" }),
  getPartnerStats: (id) => request(`/admin/partners/${id}/stats`),

  // Promo codes
  getPromoCodes: () => request("/admin/promo-codes"),
  createPromoCode: (body) =>
    request("/admin/promo-codes", { method: "POST", body: JSON.stringify(body) }),
  updatePromoCode: (id, body) =>
    request(`/admin/promo-codes/${id}`, { method: "PUT", body: JSON.stringify(body) }),
  deletePromoCode: (id) =>
    request(`/admin/promo-codes/${id}`, { method: "DELETE" }),

  // Audit + presence
  getAudit: (params) => request(`/admin/audit${qs(params)}`),
  getPresence: (params) => request(`/admin/presence${qs(params)}`),
  getLoginHistory: (params) => request(`/admin/login-history${qs(params)}`),

  // Notifications (Boss Control event feed)
  getNotifications: (params) => request(`/admin/notifications${qs(params)}`),
  getNotificationsUnread: () => request("/admin/notifications/unread-count"),
  markNotificationsRead: () => request("/admin/notifications/read", { method: "POST" }),
  markNotificationRead: (id) => request(`/admin/notifications/${id}/read`, { method: "POST" }),
};
