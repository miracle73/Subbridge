import React, { useState, useCallback } from "react";
import { View, Text, TouchableOpacity, StyleSheet, FlatList, StatusBar } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { C, F, R, S } from "../../utils/theme";
import { fmtShort, formatDate, formatTime } from "../../utils/format";
import api from "../../services/api";
import Preloader from "../../components/Preloader";

const FILTERS = ["All", "Debit", "Credit"];
const TX_ICONS = {
  airtime: "phone-portrait-outline", data: "wifi-outline", cable: "tv-outline",
  electricity: "flash-outline", fund: "wallet-outline", transfer: "swap-horizontal-outline",
};

export default function TransactionsScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [filter, setFilter] = useState("All");
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState([]);

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    console.log("[Transactions] Fetching filter:", filter);
    try {
      const res = await api.getTransactionHistory(0, 50, filter === "All" ? null : filter);
      console.log("[Transactions] Result:", res.success, Array.isArray(res.data) ? res.data.length : "not array");
      if (res.success && res.data) {
        setTransactions(Array.isArray(res.data) ? res.data : res.data.results || []);
      }
    } catch (err) {
      console.error("[Transactions] Fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useFocusEffect(
    useCallback(() => {
      fetchTransactions();
    }, [fetchTransactions])
  );

  const filtered = transactions.filter((tx) => {
    if (filter === "Debit") return tx.type === "debit";
    if (filter === "Credit") return tx.type === "credit";
    return true;
  }).sort((a, b) => {
    const dateA = a.date || "";
    const dateB = b.date || "";
    if (dateA !== dateB) return dateB.localeCompare(dateA);
    const timeA = a.time || "";
    const timeB = b.time || "";
    return timeA.localeCompare(timeB);
  });

  if (loading) return <Preloader />;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <LinearGradient colors={[C.primary, C.primaryDark]} style={styles.header}>
        <View style={{ width: 22 }} />
        <Text style={styles.headerTitle}>Transactions</Text>
        <View style={{ width: 22 }} />
      </LinearGradient>

      <View style={styles.filters}>
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.filterChip, filter === f && styles.filterActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.filterText, filter === f && { color: C.white }]}>{f}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.count}>{filtered.length} transactions</Text>

      <FlatList
        data={filtered}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
          renderItem={({ item: tx }) => {
            const isCredit = tx.type === "credit";
            const statusColor = tx.status === "success" ? C.credit : tx.status === "failed" ? C.debit : tx.status === "pending" ? "#F59E0B" : C.primary;
            let displayDesc = tx.description || "";
            if (tx.category && displayDesc && !displayDesc.toLowerCase().startsWith(tx.category.toLowerCase())) {
              displayDesc = tx.category + " - " + displayDesc.replace(/^[\s-]+/, "");
            } else if (tx.category && !displayDesc) {
              displayDesc = tx.category;
            }
            return (
              <TouchableOpacity style={styles.txItem} activeOpacity={0.6} onPress={() => navigation.navigate("Receipt", { tx })}>
                <View style={[styles.txIconWrap, { backgroundColor: statusColor + "15" }]}>
                  <Ionicons name={TX_ICONS[tx.category] || "receipt-outline"} size={20} color={statusColor} />
                </View>
                <View style={styles.txInfo}>
                  <Text style={styles.txLabel}>{displayDesc || tx.category}</Text>
                  <Text style={styles.txDesc}>{tx.date} {"\u00B7"} {tx.time}</Text>
                </View>
                <View style={styles.txRight}>
                  <Text style={[styles.txAmount, { color: isCredit ? C.credit : C.debit }]}>
                    {isCredit ? "+" : "-"} {fmtShort(tx.amount)}
                  </Text>
                  <View style={[styles.txTag, { backgroundColor: statusColor + "15" }]}>
                    <Text style={[styles.txTagText, { color: statusColor }]}>
                      {tx.status || (isCredit ? "Credit" : "Debit")}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          }}
        ListEmptyComponent={<Text style={styles.empty}>No transactions found</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: S.xl, paddingVertical: S.base },
  headerTitle: { fontSize: F.lg, fontWeight: "800", color: C.white },
  filters: { flexDirection: "row", gap: S.sm, paddingHorizontal: S.xl, paddingVertical: S.md },
  filterChip: { paddingHorizontal: S.base, paddingVertical: S.sm, borderRadius: R.xs, backgroundColor: C.inputBg },
  filterActive: { backgroundColor: C.primary },
  filterText: { fontSize: F.sm, fontWeight: "600", color: C.text },
  count: { fontSize: F.sm, color: C.textMuted, paddingHorizontal: S.xl, marginBottom: S.sm },
  list: { paddingHorizontal: S.xl },
  txItem: { flexDirection: "row", alignItems: "center", paddingVertical: S.md, borderBottomWidth: 1, borderBottomColor: C.border },
  txIconWrap: { width: 44, height: 44, borderRadius: R.sm, justifyContent: "center", alignItems: "center" },
  txInfo: { flex: 1, marginLeft: S.md },
  txLabel: { fontSize: F.md, fontWeight: "700", color: C.text },
  txDesc: { fontSize: F.sm, color: C.textMuted, marginTop: 2 },
  txDate: { fontSize: F.xs, color: C.textLight, marginTop: 2 },
  txRight: { alignItems: "flex-end", gap: 4 },
  txAmount: { fontSize: F.md, fontWeight: "700" },
  txTag: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: R.xs },
  txTagText: { fontSize: F.xs, fontWeight: "600" },
  empty: { fontSize: F.md, color: C.textMuted, textAlign: "center", marginTop: S.xxl },
});
