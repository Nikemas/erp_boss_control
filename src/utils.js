import * as XLSX from "xlsx";

export const FMT = new Intl.NumberFormat("ru-RU");
const FMT_DATETIME = new Intl.DateTimeFormat("ru-RU", {
  day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
});
const FMT_DATE = new Intl.DateTimeFormat("ru-RU", {
  day: "2-digit", month: "2-digit", year: "numeric",
});

export function money(v) {
  return `${FMT.format(Math.round(v || 0))} сом`;
}

export function fmtDate(v) {
  if (!v) return "—";
  const d = new Date(v);
  if (isNaN(d)) return "—";
  return FMT_DATE.format(d);
}

export function fmtDateTime(v) {
  if (!v) return "—";
  const d = new Date(v);
  if (isNaN(d)) return "—";
  return FMT_DATETIME.format(d);
}

// "2026-06-29" date input → RFC3339 (or null)
export function dateInputToRFC(v) {
  if (!v) return null;
  return new Date(`${v}T00:00:00`).toISOString();
}

// RFC3339 / date → "yyyy-mm-dd" for <input type=date>
export function toDateInput(v) {
  if (!v) return "";
  const d = new Date(v);
  if (isNaN(d)) return "";
  return d.toISOString().slice(0, 10);
}

// Export an array of plain objects to an .xlsx download.
export function exportXlsx(rows, filename) {
  const data = rows && rows.length ? rows : [{}];
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
  XLSX.writeFile(wb, filename.endsWith(".xlsx") ? filename : `${filename}.xlsx`);
}

// Export several sheets at once: sheets = [{ name, rows }] (rows = plain objects).
export function exportXlsxSheets(sheets, filename) {
  const wb = XLSX.utils.book_new();
  for (const { name, rows } of sheets) {
    const ws = XLSX.utils.json_to_sheet(rows && rows.length ? rows : [{}]);
    // sheet names: ≤31 chars, no []:*?/\
    XLSX.utils.book_append_sheet(wb, ws, name.replace(/[[\]:*?/\\]/g, " ").slice(0, 31));
  }
  XLSX.writeFile(wb, filename.endsWith(".xlsx") ? filename : `${filename}.xlsx`);
}

// Subscription status → russian label + badge class
const STATUS_MAP = {
  active: { label: "Активна", cls: "success" },
  pending: { label: "Ожидает", cls: "warning" },
  blocked: { label: "Заблокирована", cls: "error" },
  due_soon: { label: "Скоро истекает", cls: "warning" },
  canceled: { label: "Отменена", cls: "muted" },
  comp: { label: "Бесплатно", cls: "info" },
};
export function subStatus(s) {
  return STATUS_MAP[s] || { label: s || "—", cls: "muted" };
}
