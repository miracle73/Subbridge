// Design-style transaction labels: "Enugu Electric", "Nov 4 · 5:01 PM", emoji tile.
const EMOJI = { electricity: "⚡", airtime: "📱", data: "📶", cable: "📺", fund: "💰", transfer: "💸" };
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export const txEmoji = (tx) => EMOJI[tx?.category] || "🧾";

/** Short title: drops the "category - " prefix and the trailing phone/meter number. */
export function txTitle(tx) {
  let d = String(tx?.description || tx?.service || tx?.category || "Transaction").trim();
  if (tx?.category && d.toLowerCase().startsWith(`${tx.category.toLowerCase()} - `)) d = d.slice(tx.category.length + 3);
  const parts = d.split(" - ").map((p) => p.trim()).filter(Boolean);
  const named = parts.filter((p) => !/^\+?[\d\s-]{6,}$/.test(p));
  return named.join(" · ") || parts[0] || "Transaction";
}

/** "Nov 4 · 5:01 PM" from createdAt, or from the date + time fields. */
export function txWhen(tx) {
  let t = tx?.createdAt ? new Date(tx.createdAt) : null;
  if (!t || isNaN(t)) t = new Date(`${tx?.date || ""}T${(tx?.time || "00:00").replace(/\s?[AP]M$/i, "")}`);
  if (isNaN(t)) return [tx?.date, tx?.time].filter(Boolean).join(" · ");
  const h = t.getHours(), m = String(t.getMinutes()).padStart(2, "0");
  return `${MONTHS[t.getMonth()]} ${t.getDate()} · ${(h % 12) || 12}:${m} ${h < 12 ? "AM" : "PM"}`;
}

export const txStatusLabel = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : "");
