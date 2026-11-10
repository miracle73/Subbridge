import { useEffect, useState } from "react";
import * as SecureStore from "expo-secure-store";
import { applyTheme } from "./themeEngine";

// App-wide dark-mode flag, persisted on device and shared by every screen that reads it.
const KEY = "sb_dark_mode";
let dark = false;
const listeners = new Set();
SecureStore.getItemAsync(KEY).then((v) => { dark = v === "1"; if (dark) applyTheme(true); listeners.forEach((l) => l(dark)); }).catch(() => {});

export function setDarkMode(on) {
  dark = !!on;
  applyTheme(dark);
  listeners.forEach((l) => l(dark));
  SecureStore.setItemAsync(KEY, dark ? "1" : "0").catch(() => {});
}

export function useDarkMode() {
  const [value, setValue] = useState(dark);
  useEffect(() => { listeners.add(setValue); return () => listeners.delete(setValue); }, []);
  return [value, () => setDarkMode(!dark)];
}

export const DARK = { bg: "#0A0F2C", card: "#161D45", cardAlt: "#1E2654", text: "#F2F4FF", muted: "#9AA3C7" };

/** Builds a dark variant: each [key, override] is layered onto the light style. */
export function darkVariant(styles, overrides) {
  const out = { ...styles };
  Object.keys(overrides).forEach((k) => { if (out[k]) out[k] = [out[k], overrides[k]]; });
  return out;
}
