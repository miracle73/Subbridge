import { Dimensions } from "react-native";

export const { width: W, height: H } = Dimensions.get("window");

export const C = {
  primary:      "#1A3CE8",
  primaryDark:  "#1230C0",
  primaryLight: "#EEF1FD",
  accent:       "#00C896",
  accentDark:   "#009E77",
  bg:           "#F4F6FD",
  white:        "#FFFFFF",
  dark:         "#0A0E1A",
  text:         "#1A1D2E",
  textMuted:    "#8A8FA8",
  textLight:    "#B0B5CC",
  border:       "#E8EAF2",
  debit:        "#FF4757",
  credit:       "#00C896",
  card:         "#FFFFFF",
  overlay:      "rgba(10,14,26,0.6)",
  inputBg:      "#F8F9FE",
  warning:      "#FF9F43",
};

export const F = {
  xs:  11,
  sm:  12,
  md:  14,
  base:15,
  lg:  16,
  xl:  18,
  xxl: 20,
  h3:  22,
  h2:  26,
  h1:  32,
};

export const R = {
  xs:  8,
  sm:  12,
  md:  16,
  lg:  20,
  xl:  24,
  xxl: 32,
  full:999,
};

export const S = {
  xs:  4,
  sm:  8,
  md:  12,
  base:16,
  lg:  20,
  xl:  24,
  xxl: 32,
};
