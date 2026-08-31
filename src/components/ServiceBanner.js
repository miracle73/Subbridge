import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { C, F, R, S } from "../utils/theme";

export default function ServiceBanner({ icon, title, subtitle }) {
  return (
    <LinearGradient colors={[C.primaryDark, "#1A2F6E"]} style={styles.banner}>
      <View style={styles.iconWrap}>
        <Ionicons name={icon} size={22} color={C.white} />
      </View>
      <View style={styles.textWrap}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: "row", alignItems: "center", gap: S.md,
    marginHorizontal: S.xl, marginTop: S.md, marginBottom: S.sm,
    borderRadius: R.md, padding: S.base,
  },
  iconWrap: {
    width: 44, height: 44, borderRadius: R.sm,
    backgroundColor: "rgba(255,255,255,0.15)", alignItems: "center", justifyContent: "center",
  },
  textWrap: { flex: 1 },
  title: { fontSize: F.md, fontWeight: "800", color: C.white },
  subtitle: { fontSize: 11, color: "rgba(255,255,255,0.75)", marginTop: 2 },
});
