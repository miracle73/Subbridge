import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, StatusBar } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { C, S } from "../utils/theme";

/** Figma login announcement: shown once right after sign-in, then Okay goes to the dashboard. */
export default function AnnouncementScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const { badge = "TONIGHT ONLY", title = "Before you sleep, recharge your data 🌙", message = "Get up to 5% cashback on all data bundles bought on SubBridge tonight." } = route.params || {};

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom + S.xl }]}>
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />
      <View style={styles.art}>
        <View style={[styles.halo, { width: 310, height: 310, backgroundColor: C.primary + "14" }]} />
        <View style={[styles.halo, { width: 210, height: 210, backgroundColor: C.gold + "40" }]} />
        <Text style={{ fontSize: 130 }}>📣</Text>
        <Text style={[styles.spark, { top: 40, left: 40 }]}>✦</Text>
        <Text style={[styles.spark, { top: 30, right: 60, fontSize: 16 }]}>✦</Text>
        <Text style={[styles.spark, { bottom: 30, right: 50 }]}>✦</Text>
      </View>
      <View style={{ paddingHorizontal: S.xl }}>
        <View style={styles.badge}><Text style={styles.badgeText}>{badge}</Text></View>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.msg}>{message}</Text>
      </View>
      <View style={{ flex: 1 }} />
      <TouchableOpacity style={styles.btn} onPress={() => navigation.replace("Home")} activeOpacity={0.85}>
        <Text style={styles.btnText}>Okay, got it</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  art: { height: 340, alignItems: "center", justifyContent: "center", marginTop: S.xl },
  halo: { position: "absolute", borderRadius: 999 },
  spark: { position: "absolute", color: "#FFB020", fontSize: 22, fontWeight: "800" },
  badge: { alignSelf: "flex-start", backgroundColor: C.gold, borderRadius: 15, paddingHorizontal: 14, paddingVertical: 6 },
  badgeText: { fontSize: 12, fontWeight: "900", color: C.text },
  title: { fontSize: 26, fontWeight: "900", color: C.text, marginTop: S.base },
  msg: { fontSize: 15, color: C.textMuted, lineHeight: 22, marginTop: S.md },
  btn: { marginHorizontal: S.xl, backgroundColor: C.primary, borderRadius: 18, paddingVertical: 17, alignItems: "center", shadowColor: C.primary, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.25, shadowRadius: 16, elevation: 4 },
  btnText: { fontSize: 16, fontWeight: "800", color: C.white },
});
