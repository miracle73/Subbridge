import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, StatusBar } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { C, F, R, S } from "../utils/theme";
import { formatDateTime } from "../utils/format";
import { CrashLog } from "../services/crashLog";

const typeLabel = (type) => {
  if (type === "keygen-crash") return "Native crash";
  if (type === "js-fatal") return "Fatal JS error";
  if (type === "js-error") return "JS error";
  return "Crash";
};

export default function CrashLogsScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [entries, setEntries] = useState(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      const list = await CrashLog.list();
      if (alive) setEntries(list);
      CrashLog.markSeen();
    })();
    return () => { alive = false; };
  }, []);

  const clearAll = () => {
    Alert.alert("Clear crash logs?", "All recorded crash entries will be removed.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Clear",
        style: "destructive",
        onPress: async () => {
          await CrashLog.clear();
          setEntries([]);
        },
      },
    ]);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <LinearGradient colors={[C.primary, C.primaryDark]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.header, { overflow: "hidden", borderBottomLeftRadius: 28, borderBottomRightRadius: 28 }]}><View pointerEvents="none" style={{ position: "absolute", width: 220, height: 220, borderRadius: 110, top: -90, right: -60, backgroundColor: "rgba(255,255,255,0.08)" }} /><View pointerEvents="none" style={{ position: "absolute", width: 140, height: 140, borderRadius: 70, bottom: -70, left: -30, backgroundColor: "rgba(255,176,32,0.18)" }} /><Text pointerEvents="none" style={{ position: "absolute", top: 14, right: 70, color: "#FFD36B", fontSize: 14 }}>✦</Text>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={C.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Crash Logs</Text>
        {entries && entries.length > 0 ? (
          <TouchableOpacity onPress={clearAll} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="trash-outline" size={20} color={C.white} />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 22 }} />
        )}
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.scroll}>
        {entries === null ? (
          <Text style={styles.emptyText}>Loading...</Text>
        ) : entries.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Ionicons name="checkmark-circle-outline" size={48} color={C.primary} />
            <Text style={styles.emptyTitle}>No crashes recorded</Text>
            <Text style={styles.emptyText}>If the app closes unexpectedly, the details will appear here the next time you open the app.</Text>
          </View>
        ) : (
          entries.map((e) => (
            <View key={e.id} style={styles.card}>
              <View style={styles.cardTop}>
                <View style={styles.badge}>
                  <Ionicons name="warning-outline" size={12} color={C.debit} />
                  <Text style={styles.badgeText}>{typeLabel(e.type)}</Text>
                </View>
                <Text style={styles.cardTime}>{e.at ? formatDateTime(e.at) : ""}</Text>
              </View>
              <Text style={styles.cardTitle}>{e.title || "Crash"}</Text>
              {e.detail ? <Text style={styles.cardDetail}>{e.detail}</Text> : null}
              <Text style={styles.cardMeta}>
                {[e.os, e.app ? `v${e.app}` : null].filter(Boolean).join("  ·  ")}
              </Text>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  header: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingHorizontal: S.xl, paddingVertical: S.base,
  },
  headerTitle: { fontSize: F.lg, fontWeight: "800", color: C.white },
  scroll: { padding: S.xl, gap: S.md },
  card: {
    backgroundColor: C.white, borderRadius: R.md, padding: S.base,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 1,
  },
  cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: S.xs },
  badge: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: C.debit + "12", borderRadius: R.sm, paddingHorizontal: 8, paddingVertical: 3,
  },
  badgeText: { fontSize: 11, fontWeight: "700", color: C.debit },
  cardTime: { fontSize: F.sm, color: C.textLight },
  cardTitle: { fontSize: F.md, fontWeight: "700", color: C.text, marginTop: 4 },
  cardDetail: { fontSize: F.sm, color: C.textMuted, marginTop: 6, lineHeight: 19 },
  cardMeta: { fontSize: 11, color: C.textLight, marginTop: S.sm },
  emptyWrap: { alignItems: "center", paddingVertical: 60, paddingHorizontal: S.lg, gap: S.sm },
  emptyTitle: { fontSize: F.lg, fontWeight: "700", color: C.text },
  emptyText: { fontSize: F.sm, color: C.textMuted, textAlign: "center", lineHeight: 20 },
});
