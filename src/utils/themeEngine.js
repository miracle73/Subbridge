import { StyleSheet } from "react-native";
import { C } from "./theme";

// App-wide dark mode. Every StyleSheet.create() result is recorded; switching
// mode swaps each style entry for a recoloured copy (React Native freezes style
// objects once used, so they are replaced, never edited), and the app root
// remounts so every screen and the tab bar re-render.
const registry = [];
StyleSheet.create = (obj) => {
  registry.push(obj);
  return obj;
};

const BG = {
  "#ffffff": "#161D45", "#fff": "#161D45", "#f5f7ff": "#0A0F2C", "#f4f6fd": "#0A0F2C", "#f8f9fe": "#1E2654",
  "#eef1fd": "#1E2654", "#f1f3fa": "#1E2654", "#e8edff": "#1E2654", "#eef2ff": "#1E2654", "#e6e9f5": "#252D5C",
  "#e8eaf2": "#252D5C", "#e1e5f2": "#252D5C",
};
const FG = { "#0f1636": "#F2F4FF", "#1a1d2e": "#F2F4FF", "#0a0e1a": "#F2F4FF", "#8a8fa8": "#9AA3C7", "#7a82a6": "#9AA3C7" };
const BORDER = { "#e8eaf2": "#252D5C", "#eef0f7": "#252D5C", "#e1e5f2": "#252D5C", "#ffffff": "#252D5C" };
const MAPS = {
  backgroundColor: BG, color: FG, borderColor: BORDER, borderTopColor: BORDER,
  borderBottomColor: BORDER, borderLeftColor: BORDER, borderRightColor: BORDER,
};

const C_LIGHT = { ...C };
const C_DARK = { bg: "#0A0F2C", card: "#161D45", text: "#F2F4FF", textMuted: "#9AA3C7", border: "#252D5C", inputBg: "#1E2654", primaryLight: "#1E2654" };

function darken(v) {
  if (Array.isArray(v)) return v.map(darken);
  if (!v || typeof v !== "object") return v;
  const out = {};
  Object.keys(v).forEach((k) => {
    const x = v[k];
    out[k] = MAPS[k] && typeof x === "string" ? (MAPS[k][x.toLowerCase()] || x) : x && typeof x === "object" ? darken(x) : x;
  });
  return out;
}

const snapshots = new Map(); // sheet -> its light entries, taken before the first switch

export function applyTheme(dark) {
  Object.keys(C_DARK).forEach((k) => { C[k] = dark ? C_DARK[k] : C_LIGHT[k]; });
  registry.forEach((sheet) => {
    if (Object.isFrozen(sheet)) return;
    if (!snapshots.has(sheet)) snapshots.set(sheet, { ...sheet });
    const light = snapshots.get(sheet);
    Object.keys(light).forEach((k) => {
      try { sheet[k] = dark ? darken(light[k]) : light[k]; } catch {}
    });
  });
}
