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

export const detectNetworkFromPhone = (phoneNumber) => {
  const num = String(phoneNumber).replace(/\D/g, "");
  if (num.length >= 4) {
    const prefix = num.substring(0, 4);
    const mtnPrefixes = ["0803", "0806", "0703", "0706", "0810", "0813", "0814", "0816", "0903", "0906", "0913", "0916"];
    const airtelPrefixes = ["0802", "0808", "0708", "0812", "0902", "0907", "0912"];
    const gloPrefixes = ["0805", "0807", "0705", "0811", "0815", "0905", "0915"];
    const mobile9Prefixes = ["0809", "0817", "0818", "0909", "0908", "0918"];
    if (mtnPrefixes.includes(prefix)) return "mtn";
    if (airtelPrefixes.includes(prefix)) return "airtel";
    if (gloPrefixes.includes(prefix)) return "glo";
    if (mobile9Prefixes.includes(prefix)) return "9mobile";
  }
  return null;
};

export const isEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());

export const normalizePhone = (text) => {
  let cleaned = String(text).replace(/[\s\-\(\)\.]/g, "");
  if (cleaned.startsWith("+234")) {
    cleaned = "0" + cleaned.slice(4);
  } else if (cleaned.startsWith("234") && cleaned.length > 10) {
    cleaned = "0" + cleaned.slice(3);
  }
  return cleaned;
};

/**
 * Safe phone field handler.
 *
 * The local "0" prefix is added ONLY when the user finishes typing the 10th
 * digit. It must never be applied while deleting, otherwise every backspace
 * on an 11 digit number re-adds a "0" and the field grows 00000.
 */
export const formatPhoneInput = (text, previous = "") => {
  let v = String(text ?? "");

  if (v.startsWith("+234")) {
    v = "0" + v.slice(4).replace(/\D/g, "");
  }

  v = v.replace(/[^\d+]/g, "");
  if (v.startsWith("+")) {
    v = "+" + v.slice(1).replace(/\D/g, "");
  } else {
    v = v.replace(/\D/g, "");
  }

  const previousLength = String(previous ?? "").length;
  const justCompletedTenDigits = v.length === 10 && previousLength < 10;

  if (justCompletedTenDigits && !v.startsWith("0")) {
    v = "0" + v;
  }

  if (v.length > 11) v = v.slice(0, 11);
  return v;
};

