import React, { useState, useCallback, useEffect } from "react";
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView, RefreshControl,
  StatusBar,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { C, F, R, S } from "../utils/theme";
import { fmt, fmtShort, formatTime } from "../utils/format";
import api from "../services/api";
import Preloader from "../components/Preloader";

const SERVICES = [
  { id: "airtime", icon: "phone-portrait-outline", label: "Airtime", screen: "Airtime" },
  { id: "data", icon: "wifi-outline", label: "Data", screen: "Data" },
  { id: "cable", icon: "tv-outline", label: "Cable TV", screen: "CableTv" },
  { id: "electricity", icon: "flash-outline", label: "Electricity", screen: "Electricity" },
];

const TX_ICONS = {
  airtime: "phone-portrait-outline", data: "wifi-outline", cable: "tv-outline",
  electricity: "flash-outline", fund: "wallet-outline", transfer: "swap-horizontal-outline",
};

export default function HomeScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [balance, setBalance] = useState(0);
  const [showBalance, setShowBalance] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [recentTx, setRecentTx] = useState([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      console.log("[Home] Loading data...");
      await api.init();

      const [profileRes, walletRes, txRes] = await Promise.all([
        api.getUserProfile(),
        api.getWalletBalance(),
        api.getRecentTransactions(),
      ]);

      console.log("[Home] Profile:", profileRes.success, profileRes.data ? Object.keys(profileRes.data) : "null");
      console.log("[Home] Wallet:", walletRes.success, walletRes.data);
      console.log("[Home] Transactions:", txRes.success, Array.isArray(txRes.data) ? txRes.data.length : "not array");

      if (profileRes.success && profileRes.data) {
        const u = profileRes.data.user || profileRes.data;
        const normalized = {
          ...u,
          firstName: u.firstName || u.firstname || "",
          lastName: u.lastName || u.lastname || "",
        };
        console.log("[Home] User:", normalized.firstName, normalized.lastName, normalized.phone);
        // Safety net: PIN-less accounts get the setup modal immediately, even on stale sessions
        if (normalized.has_pin === false) {
          navigation.replace("SetupPin", { phone: normalized.phone || "" });
          return;
        }
        setUser(normalized);
      }

      if (walletRes.success && walletRes.data) {
        setBalance(walletRes.data.balance || 0);
      }

      if (txRes.success && txRes.data) {
        const txArr = Array.isArray(txRes.data) ? txRes.data.slice(0, 5) : [];
        console.log("[Home] Recent tx count:", txArr.length);
        setRecentTx(txArr);
      }
    } catch (err) {
      console.error("[Home] Failed to load data:", err);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, []);

  const go = (screen) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.navigate(screen);
  };

  const openReceipt = (tx) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.navigate("Receipt", { tx });
  };

  if (loading) return <Preloader />;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      <LinearGradient colors={[C.primary, C.primaryDark]} style={[styles.header, { paddingTop: insets.top + S.xs }]}>
        <View style={styles.headerLeft}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{user?.firstName?.charAt(0)}{user?.lastName?.charAt(0)}</Text>
          </View>
          <View>
            <Text style={styles.greeting}>Hello, {user?.firstName}</Text>
            <Text style={styles.username}>{user?.firstName} {user?.lastName}</Text>
          </View>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.iconBtn}>
            <Ionicons name="notifications-outline" size={18} color={C.white} />
            <View style={styles.badge}><Text style={styles.badgeText}>3</Text></View>
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn} onPress={() => go("Profile")}>
            <Ionicons name="person-outline" size={18} color={C.white} />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 20 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Balance Card */}
        <LinearGradient colors={[C.primary, C.primaryDark]} style={styles.balanceCard}>
          <View style={styles.balanceTop}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: S.xs }}>
              <Text style={styles.balanceLabel}>Available Balance</Text>
              <TouchableOpacity onPress={() => setShowBalance(!showBalance)}>
                <Ionicons name={showBalance ? "eye-outline" : "eye-off-outline"} size={14} color="rgba(255,255,255,0.7)" />
              </TouchableOpacity>
            </View>
          </View>
          <Text style={styles.balanceAmount}>{fmt(balance, !showBalance)}</Text>
          <View style={styles.virtualRow}>
            <View style={styles.virtualLeft}>
              <Ionicons name="business-outline" size={14} color={C.white} />
              <View>
                <Text style={styles.bankName}>{user?.virtualAccount?.bankName || user?.bankName || "Bank"}</Text>
                <Text style={styles.accountNum}>{user?.virtualAccount?.accountNumber || user?.accountNumber || "N/A"}</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.fundBtn} onPress={() => go("Wallet")}>
              <Ionicons name="add" size={14} color={C.primary} />
              <Text style={styles.fundBtnText}>Fund Wallet</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>

        {/* Services */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Our Services</Text>
        </View>
        <View style={styles.servicesGrid}>
          {SERVICES.map((s) => (
            <TouchableOpacity key={s.id} style={styles.serviceItem} onPress={() => go(s.screen)} activeOpacity={0.6}>
              <View style={styles.serviceIcon}>
                <Ionicons name={s.icon} size={22} color={C.primary} />
              </View>
              <Text style={styles.serviceLabel}>{s.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* SubBridge Banner */}
        <View style={styles.bannerCard}>
          <LinearGradient colors={[C.primaryDark, "#1A2F6E"]} style={styles.bannerGradient}>
            <View style={styles.bannerIconWrap}>
              <Ionicons name="shield-checkmark-outline" size={22} color={C.white} />
            </View>
            <View style={styles.bannerContent}>
              <Text style={styles.bannerTitle}>SubBridge</Text>
              <Text style={styles.bannerDesc}>Your all-in-one bill payment platform. {"\n"}Airtime, Data, Cable TV & Electricity.</Text>
            </View>
          </LinearGradient>
        </View>

        {/* Recent Transactions */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Transactions</Text>
        </View>
        {recentTx.length === 0 ? (
          <View style={{ paddingHorizontal: S.xl, paddingVertical: S.lg }}>
            <Text style={{ fontSize: F.sm, color: C.textMuted, textAlign: "center" }}>No transactions yet</Text>
          </View>
        ) : (
          recentTx.map((tx) => {
            const isCredit = tx.type === "credit";
            const statusColor = tx.status === "success" ? C.credit : tx.status === "failed" ? C.debit : tx.status === "pending" ? "#F59E0B" : C.primary;
            let displayDesc = tx.description || "";
            if (tx.category && displayDesc && !displayDesc.toLowerCase().startsWith(tx.category.toLowerCase())) {
              displayDesc = tx.category + " - " + displayDesc.replace(/^[\s-]+/, "");
            } else if (tx.category && !displayDesc) {
              displayDesc = tx.category;
            }
            return (
              <TouchableOpacity key={tx.id || tx.reference} style={styles.txItem} activeOpacity={0.6} onPress={() => openReceipt(tx)}>
                <View style={[styles.txIconWrap, { backgroundColor: statusColor + "15" }]}>
                  <Ionicons name={TX_ICONS[tx.category] || "receipt-outline"} size={18} color={statusColor} />
                </View>
                <View style={styles.txInfo}>
                  <Text style={styles.txLabel}>{displayDesc || tx.service || "Transaction"}</Text>
                  <Text style={styles.txDesc}>{tx.date} {"\u00B7"} {tx.time || formatTime(tx.date || tx.createdAt)}</Text>
                </View>
                <View style={styles.txRight}>
                  <Text style={[styles.txAmount, { color: isCredit ? C.credit : C.debit }]}>
                    {isCredit ? "+" : "-"}{fmtShort(tx.amount)}
                  </Text>
                  <View style={[styles.txStatus, { backgroundColor: statusColor + "15" }]}>
                    <Text style={[styles.txStatusText, { color: statusColor }]}>
                      {tx.status || (isCredit ? "Credit" : "Debit")}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },

  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: S.xl, paddingBottom: S.sm },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: S.sm },
  avatar: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center", alignItems: "center", borderWidth: 1.5, borderColor: "rgba(255,255,255,0.4)",
  },
  avatarText: { fontSize: F.sm, fontWeight: "800", color: C.white },
  greeting: { fontSize: 10, color: "rgba(255,255,255,0.7)" },
  username: { fontSize: F.base, fontWeight: "800", color: C.white },
  headerRight: { flexDirection: "row", gap: S.xs },
  iconBtn: {
    width: 34, height: 34, borderRadius: 17, backgroundColor: "rgba(255,255,255,0.15)",
    justifyContent: "center", alignItems: "center",
  },
  badge: {
    position: "absolute", top: -2, right: -2, width: 16, height: 16, borderRadius: 8,
    backgroundColor: C.debit, justifyContent: "center", alignItems: "center",
  },
  badgeText: { fontSize: 9, fontWeight: "700", color: C.white },

  balanceCard: {
    marginHorizontal: S.xl, borderRadius: R.md, padding: S.base, marginTop: S.md,
    shadowColor: C.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 8,
  },
  balanceTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  balanceLabel: { fontSize: 11, color: "rgba(255,255,255,0.7)" },
  balanceAmount: { fontSize: 28, fontWeight: "900", color: C.white, marginTop: S.xs, letterSpacing: -1 },

  virtualRow: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.12)", borderRadius: R.xs, padding: S.sm, marginTop: S.sm,
  },
  virtualLeft: { flexDirection: "row", alignItems: "center", gap: S.xs },
  bankName: { fontSize: 11, fontWeight: "700", color: C.white },
  accountNum: { fontSize: 9, color: "rgba(255,255,255,0.7)" },
  fundBtn: {
    flexDirection: "row", alignItems: "center", gap: 3,
    backgroundColor: C.white, paddingHorizontal: S.sm, paddingVertical: S.xs, borderRadius: R.xs,
  },
  fundBtnText: { fontSize: 10, fontWeight: "700", color: C.primary },

  sectionHeader: { paddingHorizontal: S.xl, marginTop: S.md, marginBottom: S.sm },
  sectionTitle: { fontSize: F.md, fontWeight: "800", color: C.text },

  servicesGrid: { flexDirection: "row", paddingHorizontal: S.lg },
  serviceItem: { width: "25%", alignItems: "center", paddingVertical: S.sm },
  serviceIcon: {
    width: 48, height: 48, borderRadius: R.sm, backgroundColor: C.white,
    justifyContent: "center", alignItems: "center", marginBottom: S.xs,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 3, elevation: 2,
  },
  serviceLabel: { fontSize: 10, fontWeight: "600", color: C.text },

  bannerCard: { marginHorizontal: S.xl, borderRadius: R.sm, overflow: "hidden" },
  bannerGradient: {
    borderRadius: R.sm, padding: S.base, flexDirection: "row", alignItems: "center", gap: S.md, overflow: "hidden",
  },
  bannerIconWrap: {
    width: 44, height: 44, borderRadius: R.sm,
    backgroundColor: "rgba(255,255,255,0.15)", alignItems: "center", justifyContent: "center",
  },
  bannerContent: { flex: 1 },
  bannerTitle: { fontSize: F.base, fontWeight: "800", color: C.white },
  bannerDesc: { fontSize: 10, color: "rgba(255,255,255,0.8)", marginTop: 2, lineHeight: 14 },

  txItem: {
    flexDirection: "row", alignItems: "center", marginHorizontal: S.xl,
    paddingVertical: S.md, borderBottomWidth: 1, borderBottomColor: C.border,
  },
  txIconWrap: { width: 36, height: 36, borderRadius: R.xs, justifyContent: "center", alignItems: "center" },
  txInfo: { flex: 1, marginLeft: S.sm },
  txLabel: { fontSize: 13, fontWeight: "700", color: C.text },
  txDesc: { fontSize: 11, color: C.textMuted, marginTop: 1 },
  txRight: { alignItems: "flex-end" },
  txAmount: { fontSize: 13, fontWeight: "700" },
  txStatus: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: R.xs, marginTop: 4 },
  txStatusText: { fontSize: 10, fontWeight: "600" },
});
