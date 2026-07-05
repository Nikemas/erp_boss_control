import { useState } from "react";
import { api, saveTokens, saveAdmin } from "../api.js";

export default function LoginPage({ onLogin }) {
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await api.login(login, password);
      saveTokens(data.access_token, data.refresh_token);
      saveAdmin(data.admin);
      onLogin(data.admin);
    } catch (err) {
      setError(err.message || "Ошибка входа");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="o-login">
      <div className="o-login-card">
        <div className="o-login-logo">
          <div className="o-login-logo-icon">BC</div>
          <div className="o-login-logo-title">Boss Control</div>
          <div className="o-login-logo-sub">Платформа · Дордой ERP</div>
        </div>
        <form className="o-login-form" onSubmit={handleSubmit}>
          {error && <div className="o-error">{error}</div>}
          <div className="o-field">
            <label>Логин</label>
            <input
              className="o-input"
              value={login}
              onChange={e => setLogin(e.target.value)}
              autoFocus
              autoComplete="username"
              required
            />
          </div>
          <div className="o-field">
            <label>Пароль</label>
            <input
              className="o-input"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </div>
          <button
            className="o-btn primary"
            style={{ width: "100%", justifyContent: "center", height: 48, fontSize: 15 }}
            disabled={loading}
          >
            {loading ? "Вхожу…" : "Войти"}
          </button>
        </form>
      </div>
    </div>
  );
}
