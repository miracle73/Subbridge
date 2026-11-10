import React from "react";
import { FadeIn, Float, Sparkle } from "./Motion";
import { View, Text, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { C, F, S } from "../utils/theme";

/** Figma hero card at the top of each payment screen. */
export default function ServiceBanner({ icon, title, subtitle }) {
  return (
    <FadeIn><LinearGradient colors={[C.primary, C.primaryDark]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.banner}>
      <Float style={[styles.blob, { width: 150, height: 150, top: -50, right: -30, backgroundColor: "rgba(255,176,32,0.28)" }]} range={10} />
      <View style={[styles.blob, { width: 90, height: 90, bottom: -40, left: 120 }]} />
      <Sparkle style={{ top: 14, right: 86 }} size={14} />
      <View style={styles.textWrap}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </View>
      <View style={styles.iconWrap}>
        <Ionicons name={icon} size={26} color={C.white} />
      </View>
    </LinearGradient></FadeIn>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: "row", alignItems: "center", gap: S.md, overflow: "hidden",
    marginHorizontal: S.xl, marginTop: S.md, marginBottom: S.sm,
    borderRadius: 24, paddingHorizontal: S.xl, paddingVertical: 26,
    shadowColor: "#1A2680", shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.18, shadowRadius: 20, elevation: 5,
  },
  blob: { position: "absolute", borderRadius: 999, backgroundColor: "rgba(255,255,255,0.08)" },
  spark: { position: "absolute", top: 14, right: 86, color: "#FFD36B", fontSize: 14, fontWeight: "800" },
  iconWrap: { width: 56, height: 56, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.18)", alignItems: "center", justifyContent: "center" },
  textWrap: { flex: 1 },
  title: { fontSize: F.xxl, fontWeight: "900", color: C.white },
  subtitle: { fontSize: F.sm, color: C.onPrimaryMuted, marginTop: 4, fontWeight: "600" },
});
