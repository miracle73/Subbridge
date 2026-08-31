export const fmt = (n, hidden = false) => {
  if (hidden) return "\u20A6 \u2022\u2022\u2022\u2022\u2022\u2022";
  return `\u20A6${Number(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export const fmtShort = (n) =>
  `\u20A6${Number(n).toLocaleString("en-US", { minimumFractionDigits: 0 })}`;

export const timeOfDay = () => {
  const h = new Date().getHours();
  if (h < 12) return "Morning";
  if (h < 17) return "Afternoon";
  return "Evening";
};

export const genTxRef = () =>
  "SBR" + Date.now().toString().slice(-8).toUpperCase();

export const formatDate = (dateStr) => {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-NG", { month: "short", day: "numeric", year: "numeric" });
};

export const formatTime = (dateStr) => {
  const d = new Date(dateStr);
  return d.toLocaleTimeString("en-NG", { hour: "numeric", minute: "2-digit", hour12: true });
};

export const formatDateTime = (dateStr) => `${formatDate(dateStr)} \u00B7 ${formatTime(dateStr)}`;
