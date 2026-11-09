import React, { useState, useCallback } from "react";
import { View, Text, TouchableOpacity, StyleSheet, StatusBar } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { C, F, R, S } from "../../utils/theme";
import { fmt } from "../../utils/format";
import api from "../../services/api";
import Preloader from "../../components/Preloader";

export default function WalletScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [balance, setBalance] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    console.log("[Wallet] Fetching data...");
    try {
      const [profileRes, balanceRes] = await Promise.all([
        api.getUserProfile(),
        api.getWalletBalance(),
      ]);
      console.log("[Wallet] Profile:", profileRes.success, profileRes.data ? Object.keys(profileRes.data) : "null");
      console.log("[Wallet] Balance:", balanceRes.success, balanceRes.data);
      if (profileRes.success && profileRes.data) {
        const u = profileRes.data.user || profileRes.data;
        setUser({
          ...u,
          firstName: u.firstName || u.firstname || "",
          lastName: u.lastName || u.lastname || "",
        });
      }
      if (balanceRes.success && balanceRes.data) setBalance(balanceRes.data);
    } catch (err) {
      console.error("[Wallet] Fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) return <Preloader />;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* Blue Header */}
      <LinearGradient colors={[C.primary, C.primaryDark]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.header, { paddingTop: insets.top + S.sm }, { overflow: "hidden", borderBottomLeftRadius: 28, borderBottomRightRadius: 28 }]}><View pointerEvents="none" style={{ position: "absolute", width: 220, height: 220, borderRadius: 110, top: -90, right: -60, backgroundColor: "rgba(255,255,255,0.08)" }} /><View pointerEvents="none" style={{ position: "absolute", width: 140, height: 140, borderRadius: 70, bottom: -70, left: -30, backgroundColor: "rgba(255,176,32,0.18)" }} /><Text pointerEvents="none" style={{ position: "absolute", top: 14, right: 70, color: "#FFD36B", fontSize: 14 }}>✦</Text>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={C.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Wallet</Text>
        <View style={{ width: 22 }} />
      </LinearGradient>

      <View style={styles.content}>
        {/* Balance Card */}
        <LinearGradient colors={[C.primary, C.primaryDark]} style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Wallet Balance</Text>
          <Text style={styles.balanceAmount}>{fmt(balance?.balance || 0)}</Text>
        </LinearGradient>

        {/* Virtual Account */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="business-outline" size={20} color={C.primary} />
            <Text style={styles.cardTitle}>Virtual Account</Text>
          </View>
          <View style={styles.accountRow}>
            <Text style={styles.accountLabel}>Bank</Text>
            <Text style={styles.accountValue}>{balance?.bankName || user?.virtualAccount?.bankName || "Bank"}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.accountRow}>
            <Text style={styles.accountLabel}>Account Number</Text>
            <Text style={[styles.accountValue, styles.accountNumber]}>{balance?.accountNumber || user?.virtualAccount?.accountNumber || "N/A"}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.accountRow}>
            <Text style={styles.accountLabel}>Account Name</Text>
            <Text style={styles.accountValue}>{user?.firstName} {user?.lastName}</Text>
          </View>
        </View>

        <View style={styles.infoCard}>
          <Ionicons name="information-circle-outline" size={18} color={C.primary} />
          <Text style={styles.infoText}>Transfer to this account from any bank app to fund your wallet instantly.</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },

  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: S.xl, paddingBottom: S.base },
  headerTitle: { fontSize: F.lg, fontWeight: "800", color: C.white },

  content: { padding: S.xl },

  balanceCard: {
    borderRadius: R.lg, padding: S.xl, marginBottom: S.xl,
    shadowColor: C.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 8,
  },
  balanceLabel: { fontSize: F.sm, color: "rgba(255,255,255,0.7)" },
  balanceAmount: { fontSize: 36, fontWeight: "900", color: C.white, marginTop: S.xs, letterSpacing: -1 },

  card: {
    backgroundColor: C.white, borderRadius: R.lg, padding: S.xl,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: S.sm, marginBottom: S.lg },
  cardTitle: { fontSize: F.lg, fontWeight: "800", color: C.text },
  accountRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: S.md },
  accountLabel: { fontSize: F.md, color: C.textMuted },
  accountValue: { fontSize: F.md, fontWeight: "700", color: C.text },
  accountNumber: { fontSize: F.xl, fontWeight: "900", color: C.primary, letterSpacing: 2 },
  divider: { height: 1, backgroundColor: C.border },

  infoCard: {
    flexDirection: "row", alignItems: "center", gap: S.sm, marginTop: S.xl,
    backgroundColor: C.primaryLight, borderRadius: R.sm, padding: S.md,
  },
  infoText: { flex: 1, fontSize: F.sm, color: C.text, lineHeight: 18 },
});
