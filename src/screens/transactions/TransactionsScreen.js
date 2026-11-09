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
import { sortTransactions } from "../../utils/mergeTransactions";

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

  const filtered = sortTransactions(
    transactions.filter((tx) => {
      if (filter === "Debit") return tx.type === "debit";
      if (filter === "Credit") return tx.type === "credit";
      return true;
    })
  );

  if (loading) return <Preloader />;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />
      <Text style={styles.pageTitle}>Transactions</Text>

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

      <Text style={styles.count}>ALL · {filtered.length} TRANSACTIONS</Text>

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
                  <Text style={[styles.txAmount, { color: isCredit ? C.credit : C.text }]}>
                    {isCredit ? "+" : "-"}{fmtShort(tx.amount)}
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

const shadow = { shadowColor: "#1A2680", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.06, shadowRadius: 14, elevation: 2 };
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  pageTitle: { fontSize: 26, fontWeight: "900", color: C.text, paddingHorizontal: S.xl, paddingTop: S.lg },
  filters: { flexDirection: "row", marginHorizontal: S.xl, marginVertical: S.lg, padding: 4, backgroundColor: C.white, borderRadius: 16, ...shadow },
  filterChip: { flex: 1, alignItems: "center", paddingVertical: 11, borderRadius: 13 },
  filterActive: { backgroundColor: C.primary },
  filterText: { fontSize: F.md, fontWeight: "800", color: C.textMuted },
  count: { fontSize: 11, fontWeight: "800", letterSpacing: 1, color: C.textMuted, paddingHorizontal: S.xl, marginBottom: S.md },
  list: { paddingHorizontal: S.xl, paddingBottom: 120 },
  txItem: { flexDirection: "row", alignItems: "center", padding: S.md, marginBottom: 10, backgroundColor: C.white, borderRadius: 18, ...shadow },
  txIconWrap: { width: 42, height: 42, borderRadius: 13, justifyContent: "center", alignItems: "center" },
  txInfo: { flex: 1, marginLeft: S.md },
  txLabel: { fontSize: F.base, fontWeight: "700", color: C.text },
  txDesc: { fontSize: F.sm, color: C.textMuted, marginTop: 3 },
  txDate: { fontSize: F.xs, color: C.textLight, marginTop: 2 },
  txRight: { alignItems: "flex-end", gap: 6 },
  txAmount: { fontSize: F.base, fontWeight: "800" },
  txTag: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10 },
  txTagText: { fontSize: 11, fontWeight: "800", textTransform: "capitalize" },
  empty: { fontSize: F.md, color: C.textMuted, textAlign: "center", marginTop: S.xxl },
});
