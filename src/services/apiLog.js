import * as FileSystem from "expo-file-system";

// TEMPORARY debug facility: records every API request/response so the
// exact traffic can be inspected in-app (Profile → API Logs).
// Remove this (and its calls in api.js) once the app is confirmed.
const LOG_FILE = FileSystem.documentDirectory + "api-log.json";
const MAX_ENTRIES = 100;
const MAX_STR = 2500;

const trim = (s) => {
  let str;
  if (typeof s === "string") str = s;
  else { try { str = JSON.stringify(s); } catch { str = String(s); } }
  if (!str) return "";
  return str.length > MAX_STR ? str.slice(0, MAX_STR) + "…" : str;
};

async function loadFile() {
  try {
    const raw = await FileSystem.readAsStringAsync(LOG_FILE);
    const parsed = JSON.parse(raw);
    return { entries: Array.isArray(parsed.entries) ? parsed.entries : [] };
  } catch {
    return { entries: [] };
  }
}

async function saveFile(data) {
  try {
    await FileSystem.writeAsStringAsync(LOG_FILE, JSON.stringify(data));
  } catch (e) {
    console.log("[ApiLog] save failed:", e?.message);
  }
}

export const ApiLog = {
  /** Fire-and-forget from the API layer — never blocks or throws upward. */
  async record(entry) {
    try {
      const data = await loadFile();
      const item = {
        id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
        at: new Date().toISOString(),
        ...entry,
      };
      data.entries = [item, ...data.entries].slice(0, MAX_ENTRIES);
      await saveFile(data);
    } catch (e) {
      console.log("[ApiLog] record failed:", e?.message);
    }
  },

  async list() {
    const data = await loadFile();
    return data.entries;
  },

  async clear() {
    await saveFile({ entries: [] });
  },
};
