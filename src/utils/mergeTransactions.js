/**
 * Merge transaction history with mobile history to enrich receipts
 * (data plan size, plan name, network, API response).
 */

const norm = (v) => String(v ?? "").trim().toLowerCase();
const digits = (v) => String(v ?? "").replace(/\D/g, "");

const samePhone = (a, b) => {
  const x = digits(a);
  const y = digits(b);
  if (!x || !y) return false;
  const nx = x.startsWith("0") ? x : "0" + x.replace(/^234/, "");
  const ny = y.startsWith("0") ? y : "0" + y.replace(/^234/, "");
  return nx === ny;
};

const pick = (tx, keys) => {
  for (const key of keys) {
    if (tx?.[key] !== undefined && tx?.[key] !== null && tx?.[key] !== "") return tx[key];
  }
  return undefined;
};

// Providers/endpoints name the prepaid electricity token differently.
const TOKEN_KEYS = [
  "token", "electricityToken", "electricity_token", "meterToken", "meter_token",
  "tokenValue", "token_value", "unitsToken", "units_token",
];

const METER_KEYS = ["meter_number", "meterNumber", "meter"];

const pickToken = (tx) => {
  for (const key of TOKEN_KEYS) {
    const value = tx?.[key];
    if (value === undefined || value === null) continue;
    const text = String(value).trim();
    if (text && text.toLowerCase() !== "null" && text.toLowerCase() !== "none") return text;
  }
  return "";
};

const findMatching = (transaction, history) => {
  const txId = norm(pick(transaction, ["id", "transactionId", "transaction_id"]));
  const txRef = norm(pick(transaction, ["reference", "ref", "ident"]));
  const txPhone = pick(transaction, ["phone", "mobile_number", "recipient", "beneficiaryPhone"]);
  const txAmount = Number(transaction?.amount || 0);
  const txDesc = norm(transaction?.description);

  if (!Array.isArray(history) || history.length === 0) return null;

  // 1. Exact id / reference / ident match
  const exact = history.find(
    (h) =>
      (txId && [norm(h.id), norm(h.ident), norm(h.transactionId), norm(h.reference)].includes(txId)) ||
      (txRef && [norm(h.id), norm(h.ident), norm(h.transactionId), norm(h.reference)].includes(txRef))
  );
  if (exact) return exact;

  // 2. Phone + amount match
  if (txPhone && txAmount) {
    const byPhone = history.filter((h) => samePhone(h.mobile_number, txPhone));
    const byAmount = byPhone.find((h) => Number(h.plan_amount || h.amount) === txAmount);
    if (byAmount) return byAmount;
    if (byPhone.length === 1) return byPhone[0];
  }

  // 3. Description mentions the plan name / size
  if (txDesc) {
    const byDesc = history.find((h) => {
      const name = norm(pick(h, ["plan_name", "plan", "dataValue"]));
      return name && txDesc.includes(name);
    });
    if (byDesc) return byDesc;
  }

  return null;
};

export const mergeTransactionData = async (transaction, api) => {
  if (!transaction) return transaction;

  const merged = { ...transaction };

  const category = norm(transaction.category);
  const description = norm(transaction.description);
  const label = norm(transaction.label);
  const looksLikeData =
    category.includes("data") ||
    norm(transaction.type).includes("data") ||
    description.includes("data");
  const looksLikeElectricity =
    category.includes("electric") ||
    label.includes("electric") ||
    norm(transaction.type).includes("electric") ||
    description.includes("electric");

  // The token is sometimes already on the transaction itself.
  if (looksLikeElectricity) {
    const ownToken = pickToken(transaction);
    if (ownToken) merged.token = ownToken;
    const ownMeter = pick(transaction, METER_KEYS);
    if (ownMeter && !pick(merged, METER_KEYS)) merged.meterNumber = ownMeter;
  }

  if (!looksLikeData && !looksLikeElectricity) return merged;

  try {
    const historyRes = await api.getMobileHistory();
    const history = historyRes?.success && Array.isArray(historyRes.data) ? historyRes.data : [];
    let matchingTx = findMatching(transaction, history);

    // Electricity history rows can also be matched on the meter number.
    if (!matchingTx && looksLikeElectricity) {
      const meter = digits(pick(transaction, METER_KEYS));
      if (meter) {
        matchingTx = history.find((h) => digits(pick(h, METER_KEYS)) === meter) || null;
      }
    }

    if (matchingTx) {
      const size = pick(matchingTx, ["size", "dataValue", "plan_name", "planName"]);
      const planName = pick(matchingTx, ["plan_name", "planName", "plan", "description"]);
      const network = pick(matchingTx, ["plan_network", "network_name", "network", "provider"]);
      const apiResponse = pick(matchingTx, ["api_response", "apiResponse", "response"]);
      const txPhone = pick(matchingTx, ["mobile_number", "phone"]);

      if (size && !merged.size) merged.size = size;
      if (planName && !merged.planName) merged.planName = planName;
      if (network && !merged.network) merged.network = network;
      if (apiResponse && !merged.api_response) merged.api_response = apiResponse;
      if (txPhone && !merged.phone) merged.phone = txPhone;
      if (matchingTx.ident && !merged.reference) merged.reference = matchingTx.ident;

      if (looksLikeElectricity) {
        const token = pickToken(matchingTx);
        if (token && !merged.token) merged.token = token;
        const meter = pick(matchingTx, METER_KEYS);
        if (meter && !merged.meterNumber) merged.meterNumber = meter;
      }
    }
  } catch (err) {
    console.log("[mergeTransactions] enrich failed:", err?.message);
  }

  return merged;
};

const MONTHS = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
  jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
};

const parseDatePart = (value) => {
  if (!value) return null;
  const s = String(value).trim();
  if (!s) return null;

  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])).getTime();

  m = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})/);
  if (m) return new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1])).getTime();

  m = s.match(/^([A-Za-z]{3,})\s+(\d{1,2}),?\s*(\d{4})/);
  if (m) {
    const month = MONTHS[m[1].slice(0, 3).toLowerCase()];
    if (month !== undefined) return new Date(Number(m[3]), month, Number(m[2])).getTime();
  }

  return null;
};

const parseTimePart = (value) => {
  if (!value) return 0;
  const m = String(value).trim().match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(am|pm)?/i);
  if (!m) return 0;
  let hours = Number(m[1]);
  const minutes = Number(m[2]);
  const seconds = Number(m[3] || 0);
  const meridiem = (m[4] || "").toLowerCase();
  if (meridiem === "pm" && hours < 12) hours += 12;
  if (meridiem === "am" && hours === 12) hours = 0;
  return hours * 3600000 + minutes * 60000 + seconds * 1000;
};

const txTimestamp = (tx) => {
  if (!tx) return 0;

  const raw = tx.created_at || tx.createdAt || tx.timestamp || tx.date_time || tx.dateTime;
  if (raw) {
    const numeric = Number(raw);
    if (!Number.isNaN(numeric) && String(Math.trunc(numeric)).length >= 12) return numeric;
    const parsed = parseDatePart(raw);
    if (parsed !== null) return parsed + parseTimePart(tx.time);
  }

  const date = parseDatePart(tx.date);
  if (date !== null) return date + parseTimePart(tx.time);

  const time = parseTimePart(tx.time);
  if (date === null && time > 0) return time;

  return 0;
};

/**
 * Shared ordering used by the dashboard "Recent Transactions" list and the
 * full transaction history list so both always render the same order.
 */
export const sortTransactions = (transactions) => {
  if (!Array.isArray(transactions)) return [];
  return [...transactions].sort((a, b) => {
    const diff = txTimestamp(b) - txTimestamp(a);
    if (diff !== 0) return diff;
    const dateA = String(a?.date || "");
    const dateB = String(b?.date || "");
    if (dateA !== dateB) return dateB.localeCompare(dateA);
    const timeA = String(a?.time || "");
    const timeB = String(b?.time || "");
    if (timeA !== timeB) return timeB.localeCompare(timeA);
    return String(b?.id ?? "").localeCompare(String(a?.id ?? ""));
  });
};

export const mergeMultipleTransactions = async (transactions, api) => {
  if (!Array.isArray(transactions)) return transactions;

  const mergedTransactions = [];
  for (const tx of transactions) {
    const mergedTx = await mergeTransactionData(tx, api);
    mergedTransactions.push(mergedTx);
  }

  return mergedTransactions;
};
