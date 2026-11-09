import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, FlatList, StatusBar } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { C, F, S } from "../utils/theme";
import api from "../services/api";

const TABS = ["All", "Transactions", "Promos"];
const KIND = {
  transaction: { icon: "wallet-outline", color: C.credit },
  promo: { icon: "flame-outline", color: C.debit },
  security: { icon: "lock-closed-outline", color: C.textMuted },
  default: { icon: "notifications-outline", color: C.primary },
};

// Alerts may arrive without a type, so sort them into tabs by their wording.
const guessKind = (t) => {
  const s = t.toLowerCase();
  if (/(promo|deal|offer|discount|cashback|bonus|% off|hot)/.test(s)) return "promo";
  if (/(fund|credit|debit|transaction|purchase|payment|paid|received|wallet|airtime|data|token|recharge)/.test(s)) return "transaction";
  if (/(login|password|pin|security)/.test(s)) return "security";
  return "default";
};

/** Figma notifications inbox: tabs + alert cards with unread dots. */
export default function NotificationsScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState("All");
  const [items, setItems] = useState([]);

  useEffect(() => {
    api.getNotifications().then((res) => {
      const list = Array.isArray(res?.data) ? res.data : res?.data?.message ? [res.data] : [];
      setItems(list.map((n, i) => ({
        id: n.id || String(i),
        title: n.title || "SubBridge",
        message: n.message || n.alert || "",
        time: n.created_at || n.time || "",
        kind: n.type || n.category || guessKind(`${n.title || ""} ${n.message || n.alert || ""}`),
        unread: n.read === false || n.is_read === false || i === 0,
      })));
    }).catch(() => {});
  }, []);

  const shown = items.filter((n) =>
    tab === "All" ? true : tab === "Transactions" ? n.kind === "transaction" : n.kind === "promo");

  return (
    <View style={[styles.container, { paddingTop: insets.top + S.sm }]}>
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />
      <View style={styles.header}>
        <TouchableOpacity style={styles.back} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color={C.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.tabs}>
        {TABS.map((t) => (
          <TouchableOpacity key={t} style={[styles.tab, tab === t && styles.tabOn]} onPress={() => setTab(t)}>
            <Text style={[styles.tabText, tab === t && { color: C.white }]}>{t}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={shown}
        keyExtractor={(n) => String(n.id)}
        contentContainerStyle={{ paddingHorizontal: S.xl, paddingBottom: 40 }}
        renderItem={({ item: n }) => {
          const k = KIND[n.kind] || KIND.default;
          return (
            <View style={[styles.card, n.unread && styles.cardUnread]}>
              <View style={[styles.icon, { backgroundColor: k.color + "24" }]}>
                <Ionicons name={k.icon} size={20} color={k.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.title} numberOfLines={1}>{n.title}</Text>
                <Text style={styles.msg} numberOfLines={2}>{n.message}</Text>
              </View>
              <View style={{ alignItems: "flex-end", gap: 10 }}>
                <Text style={styles.time}>{n.time}</Text>
                {n.unread ? <View style={styles.dot} /> : null}
              </View>
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={{ fontSize: 36 }}>🔔</Text>
            <Text style={styles.emptyTitle}>You're all caught up</Text>
            <Text style={styles.emptySub}>New alerts will show up here.</Text>
          </View>
        }
      />
    </View>
  );
}

const shadow = { shadowColor: "#1A2680", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.06, shadowRadius: 14, elevation: 2 };
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: S.xl },
  back: { width: 40, height: 40, borderRadius: 20, backgroundColor: C.white, alignItems: "center", justifyContent: "center", ...shadow },
  headerTitle: { fontSize: F.xl, fontWeight: "800", color: C.text },
  tabs: { flexDirection: "row", margin: S.xl, padding: 4, backgroundColor: C.white, borderRadius: 16, ...shadow },
  tab: { flex: 1, alignItems: "center", paddingVertical: 11, borderRadius: 13 },
  tabOn: { backgroundColor: C.primary },
  tabText: { fontSize: F.md, fontWeight: "800", color: C.textMuted },
  card: { flexDirection: "row", alignItems: "center", gap: S.md, padding: S.base, marginBottom: 10, backgroundColor: C.white, borderRadius: 18, ...shadow },
  cardUnread: { backgroundColor: "#EEF2FF" },
  icon: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  title: { fontSize: F.base, fontWeight: "800", color: C.text },
  msg: { fontSize: F.sm, color: C.textMuted, marginTop: 3, lineHeight: 17 },
  time: { fontSize: F.xs, color: C.textMuted, fontWeight: "600" },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: C.primary },
  empty: { alignItems: "center", paddingVertical: 60 },
  emptyTitle: { fontSize: F.lg, fontWeight: "800", color: C.text, marginTop: S.md },
  emptySub: { fontSize: F.sm, color: C.textMuted, marginTop: 4 },
});
