import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { C } from "../utils/theme";

/** Brand gradient with soft glow circles and gold sparkles, used behind the auth screens. */
export default function AuthBackground() {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <LinearGradient colors={[C.primary, C.primaryDark]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
      <View style={[styles.blob, { width: 300, height: 300, top: -90, right: -110 }]} />
      <View style={[styles.blob, { width: 240, height: 240, bottom: -60, left: -100, backgroundColor: "rgba(255,176,32,0.14)" }]} />
      <Text style={[styles.spark, { top: "12%", left: "12%" }]}>✦</Text>
      <Text style={[styles.spark, { top: "18%", right: "16%", fontSize: 12 }]}>✦</Text>
      <Text style={[styles.spark, { top: "30%", right: "8%", fontSize: 22 }]}>✦</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  blob: { position: "absolute", borderRadius: 999, backgroundColor: "rgba(255,255,255,0.07)" },
  spark: { position: "absolute", color: "#FFD36B", fontSize: 16, fontWeight: "800" },
});

/** Figma auth styling: glass inputs, white pill buttons, bold titles.
 *  Layered on top of each screen's own styles so layout logic stays intact. */
const FIGMA = {
  input: { backgroundColor: "rgba(255,255,255,0.12)", borderWidth: 1, borderColor: "rgba(255,255,255,0.18)", borderRadius: 16, minHeight: 56, paddingHorizontal: 20, fontSize: 15, color: "#FFFFFF" },
  btn: { backgroundColor: "#FFFFFF", borderRadius: 18, paddingVertical: 17, shadowColor: "#050A24", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.18, shadowRadius: 18, elevation: 4 },
  btnText: { color: C.primary, fontSize: 16, fontWeight: "800" },
  title: { fontSize: 28, fontWeight: "900", letterSpacing: -0.3 },
  subtitle: { color: C.onPrimaryMuted, fontSize: 15, lineHeight: 22 },
  inputToggle: { backgroundColor: "rgba(255,255,255,0.12)", borderRadius: 16, padding: 4 },
  toggleBtnActive: { backgroundColor: "#FFFFFF", borderRadius: 13 },
  toggleTextActive: { color: C.primary, fontWeight: "800" },
  linkText: { color: "#FFFFFF", fontWeight: "700" },
};
export function withAuthStyles(styles) {
  Object.keys(FIGMA).forEach((k) => { if (styles[k]) styles[k] = [styles[k], FIGMA[k]]; });
  return styles;
}
