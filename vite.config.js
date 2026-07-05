import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  // Деплой под подпутём https://erp.erpsystemsales.com/boss/ (тот же origin, что
  // и API → без CORS). Ассеты получают префикс /boss/.
  base: "/boss/",
  plugins: [react()],
});
