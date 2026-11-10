import { StyleSheet } from "react-native";
import { C } from "./theme";

// App-wide dark mode. Every StyleSheet.create() result is recorded; switching
// mode swaps light surface/text colours for their dark twins in place, and the
// app root remounts so every screen (and the tab bar) re-renders.
const registry = [];
// Return the plain object (RN would freeze it in dev, which blocks recolouring).
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

// Light values of C that change in dark mode (white stays white: it's also text on blue).
const C_LIGHT = { ...C };
const C_DARK = { bg: "#0A0F2C", card: "#161D45", text: "#F2F4FF", textMuted: "#9AA3C7", border: "#252D5C", inputBg: "#1E2654", primaryLight: "#1E2654" };

const originals = new WeakMap();
function walk(node, dark, seen) {
  if (!node || typeof node !== "object" || seen.has(node)) return;
  seen.add(node);
  if (Array.isArray(node)) { node.forEach((n) => walk(n, dark, seen)); return; }
  let orig = originals.get(node);
  Object.keys(node).forEach((k) => {
    const v = node[k];
    if (MAPS[k] && typeof v === "string") {
      if (!orig) { orig = {}; originals.set(node, orig); }
      if (!(k in orig)) orig[k] = v;
      node[k] = dark ? (MAPS[k][orig[k].toLowerCase()] || orig[k]) : orig[k];
    } else if (v && typeof v === "object") {
      walk(v, dark, seen);
    }
  });
}

export function applyTheme(dark) {
  Object.keys(C_DARK).forEach((k) => { C[k] = dark ? C_DARK[k] : C_LIGHT[k]; });
  const seen = new WeakSet();
  registry.forEach((s) => walk(s, dark, seen));
}
