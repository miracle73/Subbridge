import React, { useState, useEffect, useCallback } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, StatusBar } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { C, F, R, S } from "../utils/theme";
import { formatDateTime } from "../utils/format";
import { ApiLog } from "../services/apiLog";

// TEMPORARY debug screen — shows exact API request/response traffic.
// Remove along with src/services/apiLog.js and the ApiLog calls in api.js.
export default function ApiLogsScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [entries, setEntries] = useState(null);
  const [expandedId, setExpandedId] = useState(null);

  const refresh = useCallback(async () => {
    const list = await ApiLog.list();
    setEntries(list);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const clearAll = () => {
    Alert.alert("Clear API logs?", "All recorded request/response entries will be removed.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Clear",
        style: "destructive",
        onPress: async () => {
          await ApiLog.clear();
          setEntries([]);
        },
      },
    ]);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <LinearGradient colors={[C.primary, C.primaryDark]} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={C.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>API Logs</Text>
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
            <Ionicons name="pulse-outline" size={48} color={C.primary} />
            <Text style={styles.emptyTitle}>No API calls recorded</Text>
            <Text style={styles.emptyText}>Every request the app makes to the backend will appear here with its exact payload and response.</Text>
          </View>
        ) : (
          <>
            <Text style={styles.debugNote}>Temporary debug view — latest {entries.length} calls (tap to expand)</Text>
            {entries.map((e) => {
              const expanded = expandedId === e.id;
              return (
                <TouchableOpacity
                  key={e.id}
                  style={styles.card}
                  activeOpacity={0.7}
                  onPress={() => setExpandedId(expanded ? null : e.id)}
                >
                  <View style={styles.cardTop}>
                    <View style={[styles.badge, { backgroundColor: (e.ok ? C.success || "#1A9E56" : C.debit) + "12" }]}>
                      <Text style={[styles.badgeText, { color: e.ok ? C.success || "#1A9E56" : C.debit }]}>
                        {e.status === 0 ? "NET ERR" : e.status}
                      </Text>
                    </View>
                    <Text style={styles.cardMethod}>{e.method}</Text>
                    <Text style={styles.cardTime}>{e.ms != null ? `${e.ms}ms` : ""}</Text>
                  </View>
                  <Text style={styles.cardEndpoint} numberOfLines={expanded ? undefined : 1}>{e.endpoint}</Text>
                  {e.msg ? <Text style={styles.cardMsg} numberOfLines={expanded ? undefined : 1}>{e.msg}</Text> : null}
                  <Text style={styles.cardMeta}>{e.at ? formatDateTime(e.at) : ""}</Text>

                  {expanded ? (
                    <View style={styles.detailBox}>
                      <Text style={styles.detailLabel}>REQUEST</Text>
                      <Text style={styles.detailText}>{e.req || "(empty)"}</Text>
                      <Text style={styles.detailLabel}>RESPONSE</Text>
                      <Text style={styles.detailText}>{e.error ? `ERROR: ${e.error}` : e.res || "(empty)"}</Text>
                    </View>
                  ) : null}
                </TouchableOpacity>
              );
            })}
          </>
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
  debugNote: { fontSize: F.xs, color: C.textLight, marginBottom: S.xs },
  card: {
    backgroundColor: C.white, borderRadius: R.md, padding: S.base,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 1,
  },
  cardTop: { flexDirection: "row", alignItems: "center", gap: S.sm },
  badge: {
    flexDirection: "row", alignItems: "center", borderRadius: R.sm,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  badgeText: { fontSize: 11, fontWeight: "700" },
  cardMethod: { fontSize: 11, fontWeight: "700", color: C.textMuted },
  cardTime: { fontSize: 11, color: C.textLight, marginLeft: "auto" },
  cardEndpoint: { fontSize: F.md, fontWeight: "700", color: C.text, marginTop: 6 },
  cardMsg: { fontSize: F.sm, color: C.textMuted, marginTop: 2 },
  cardMeta: { fontSize: 11, color: C.textLight, marginTop: 4 },
  detailBox: {
    marginTop: S.md, backgroundColor: C.bg || "#F5F6FA",
    borderRadius: R.sm, padding: S.sm, gap: 4,
  },
  detailLabel: { fontSize: 10, fontWeight: "800", color: C.textLight, marginTop: 4 },
  detailText: { fontSize: 11, color: C.text, lineHeight: 16 },
  emptyWrap: { alignItems: "center", paddingVertical: 60, paddingHorizontal: S.lg, gap: S.sm },
  emptyTitle: { fontSize: F.lg, fontWeight: "700", color: C.text },
  emptyText: { fontSize: F.sm, color: C.textMuted, textAlign: "center", lineHeight: 20 },
});
