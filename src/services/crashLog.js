import * as FileSystem from "expo-file-system/legacy";
import * as SecureStore from "expo-secure-store";
import Constants from "expo-constants";
import { Platform } from "react-native";

const LOG_FILE = FileSystem.documentDirectory + "crash-log.json";
const MARKER_KEY = "subbridge_keygen_marker";
const MAX_ENTRIES = 20;

const meta = () => ({
  os: `${Platform.OS} ${Platform.Version}`,
  app: Constants.expoConfig?.version || "1.0.0",
});

async function loadFile() {
  try {
    const raw = await FileSystem.readAsStringAsync(LOG_FILE);
    const parsed = JSON.parse(raw);
    return {
      entries: Array.isArray(parsed.entries) ? parsed.entries : [],
      pending: typeof parsed.pending === "number" ? parsed.pending : 0,
    };
  } catch {
    return { entries: [], pending: 0 };
  }
}

async function saveFile(data) {
  try {
    await FileSystem.writeAsStringAsync(LOG_FILE, JSON.stringify(data));
  } catch (e) {
    console.log("[CrashLog] save failed:", e?.message);
  }
}

export const CrashLog = {
  async record(entry) {
    const data = await loadFile();
    const item = {
      id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      at: new Date().toISOString(),
      ...meta(),
      ...entry,
    };
    data.entries = [item, ...data.entries].slice(0, MAX_ENTRIES);
    data.pending += 1;
    await saveFile(data);
  },

  async list() {
    const data = await loadFile();
    return data.entries;
  },

  async clear() {
    await saveFile({ entries: [], pending: 0 });
  },

  async markSeen() {
    const data = await loadFile();
    if (data.pending > 0) {
      data.pending = 0;
      await saveFile(data);
    }
  },

  // --- RSA keygen attempt marker -------------------------------------
  // Written to disk BEFORE the native key step runs and cleared only
  // after it finishes. If the process dies natively (SIGSEGV/abort the
  // JS error handlers never run), the marker survives and is harvested
  // on the next launch as hard evidence of where the app died.

  async beginKeygen(stage) {
    try {
      await SecureStore.setItemAsync(MARKER_KEY, JSON.stringify({ stage, at: new Date().toISOString() }));
    } catch (e) {
      console.log("[CrashLog] beginKeygen failed:", e?.message);
    }
  },

  async setKeygenStage(stage) {
    try {
      const raw = await SecureStore.getItemAsync(MARKER_KEY);
      if (!raw) return;
      const marker = JSON.parse(raw);
      marker.stage = stage;
      await SecureStore.setItemAsync(MARKER_KEY, JSON.stringify(marker));
    } catch {}
  },

  async endKeygen() {
    try {
      await SecureStore.deleteItemAsync(MARKER_KEY);
    } catch {}
  },

  // Check the marker + pending entries. Returns true when there is
  // something new the user has not seen yet (drives the launch alert).
  async harvest() {
    let foundNew = false;
    try {
      const raw = await SecureStore.getItemAsync(MARKER_KEY);
      if (raw) {
        await SecureStore.deleteItemAsync(MARKER_KEY);
        let marker = {};
        try { marker = JSON.parse(raw); } catch {}
        await this.record({
          type: "keygen-crash",
          title: "App crashed during fingerprint key setup",
          detail:
            `The app died while running the RSA key step (stage: ${marker.stage || "unknown"}). ` +
            `This is a native crash — the JavaScript error handler could not run. ` +
            `Occurred: ${marker.at || "unknown"}`,
        });
        foundNew = true;
      }
    } catch (e) {
      console.log("[CrashLog] harvest marker failed:", e?.message);
    }
    const data = await loadFile();
    return foundNew || data.pending > 0;
  },

  async hasKeygenCrash() {
    try {
      const entries = await this.list();
      return entries.some((e) => e.type === "keygen-crash");
    } catch {
      return false;
    }
  },
};
