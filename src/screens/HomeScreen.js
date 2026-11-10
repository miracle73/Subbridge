import { useDarkMode, darkVariant, DARK } from "../utils/darkMode";
import { FadeIn, PressScale, Float, Sparkle } from "../components/Motion";
import React, { useState, useCallback, useEffect, useRef } from "react";
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView, RefreshControl,
  StatusBar, Linking, Image,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as Clipboard from "expo-clipboard";
import { useFocusEffect, useIsFocused } from "@react-navigation/native";
import { C, F, R, S } from "../utils/theme";
import { fmt, fmtShort, formatTime } from "../utils/format";
import api from "../services/api";
import { sortTransactions } from "../utils/mergeTransactions";
import Preloader from "../components/Preloader";
import Toast from "../components/Toast";
import AddMoneySheet from "../components/AddMoneySheet";

const SERVICES = [
  { id: "airtime", icon: "phone-portrait-outline", label: "Airtime", screen: "Airtime", tint: "#E8EDFF", color: "#1A3CE8" },
  { id: "data", icon: "wifi-outline", label: "Data", screen: "Data", tint: "#FFF3D6", color: "#E08A00" },
  { id: "cable", icon: "tv-outline", label: "Cable TV", screen: "CableTv", tint: "#E3F8EE", color: "#0E9F5A" },
  { id: "electricity", icon: "flash-outline", label: "Electricity", screen: "Electricity", tint: "#FFE8E6", color: "#F04438" },
  { id: "a2c", icon: "swap-horizontal-outline", label: "Airtime to Cash", screen: "AirtimeToCash", tint: "#EFE6FF", color: "#7A3CE8" },
  { id: "ref", icon: "people-outline", label: "Referral", screen: "Rewards", tint: "#E0F6FF", color: "#0A8BC2" },
];

const TX_ICONS = {
  airtime: "phone-portrait-outline", data: "wifi-outline", cable: "tv-outline",
  electricity: "flash-outline", fund: "wallet-outline", transfer: "swap-horizontal-outline",
};

export default function HomeScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [dark, toggleDark] = useDarkMode();
  const st = dark ? darkStyles : styles;
  const [balance, setBalance] = useState(0);
  const [showBalance, setShowBalance] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [recentTx, setRecentTx] = useState([]);
  const [wallet, setWallet] = useState(null);
  const [referralBalance, setReferralBalance] = useState(0);
  const [showAdd, setShowAdd] = useState(false);
  const [toastMsg, setToastMsg] = useState("");
  const [toastType, setToastType] = useState("error");
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState("");
  const notificationShownRef = React.useRef(false);
  const isFocused = useIsFocused();

  const bankName = wallet?.bankName || user?.virtualAccount?.bankName || user?.bankName || "Bank";
  const acctNo = wallet?.accountNumber || user?.virtualAccount?.accountNumber || user?.accountNumber || "";

  const showToast = (msg, type = "error") => { setToastType(type); setToastMsg(msg); };

  const copyAccount = async () => {
    if (!acctNo) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await Clipboard.setStringAsync(acctNo);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    showToast("Account number copied", "success");
  };

  const onAddSelect = () => {
    showToast("Transfer to the account above to fund your wallet", "success");
  };

  const isFocusedRef = useRef(true);
  const firstLoadRef = useRef(true);

  const loadData = useCallback(async () => {
    try {
      if (firstLoadRef.current) setLoading(true);
      console.log("[Home] Loading data...");
      await api.init();

      const [profileRes, walletRes, txRes, referralRes, alertsRes] = await Promise.all([
        api.getUserProfile(),
        api.getWalletBalance(),
        api.getTransactionHistory(0, 50),
        api.getReferralDashboard(),
        api.getNotifications(),
      ]);

      // Show notification alert modal if exists
      const hasAlert = alertsRes?.data?.has_alert || alertsRes?.data?.alert || alertsRes?.success && alertsRes.data && alertsRes.data.length > 0;
      const alertMsg = alertsRes?.data?.message || alertsRes?.data?.alert || (Array.isArray(alertsRes.data) ? alertsRes.data[0]?.message || alertsRes.data[0]?.title : "");
      if (hasAlert && alertMsg && !notificationShownRef.current && isFocusedRef.current) {
        notificationShownRef.current = true;
        setNotificationMessage(alertMsg);
        setShowNotificationModal(true);
      }

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
        setWallet(walletRes.data);
        setBalance(walletRes.data.balance || 0);
      }

      if (referralRes.success && referralRes.data) {
        setReferralBalance(referralRes.data.referralBalance || 0);
      }

      if (txRes.success && txRes.data) {
        const txArr = sortTransactions(Array.isArray(txRes.data) ? txRes.data : []).slice(0, 5);
        console.log("[Home] Recent tx count:", txArr.length);
        setRecentTx(txArr);
      }
    } catch (err) {
      console.error("[Home] Failed to load data:", err);
    } finally {
      setLoading(false);
      firstLoadRef.current = false;
    }
  }, [navigation]);

  useFocusEffect(
    useCallback(() => {
      isFocusedRef.current = true;
      // Re-arm the notice so it appears on every dashboard load.
      // The overlay is rendered inside this screen only, so it can never
      // appear over the auth screens.
      notificationShownRef.current = false;
      loadData();
      return () => {
        isFocusedRef.current = false;
        setShowNotificationModal(false);
      };
    }, [loadData])
  );

  useEffect(() => {
    if (!showNotificationModal) return;
    const timer = setTimeout(() => {
      setShowNotificationModal(false);
    }, 6000);
    return () => clearTimeout(timer);
  }, [showNotificationModal]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const go = (screen) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.navigate(screen);
  };

  const openReceipt = (tx) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.navigate("Receipt", { tx });
  };

  if (loading) return <Preloader />;

  const first = user?.firstName || "";
  const initials = `${user?.firstName?.charAt(0) || ""}${user?.lastName?.charAt(0) || ""}`;
  const acctName = user?.virtualAccount?.accountName || [user?.firstName, user?.lastName].filter(Boolean).join(" ") || "Your account";
  const hour = new Date().getHours();
  const greet = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <View style={st.container}>
      <StatusBar barStyle={dark ? "light-content" : "dark-content"} translucent backgroundColor="transparent" />

      <View style={[st.header, { paddingTop: insets.top + S.md }]}>
        <View style={st.headerLeft}>
          <View style={st.avatar}><Text style={st.avatarText}>{initials}</Text></View>
          <View>
            <Text style={st.greeting}>{greet} 👋</Text>
            <Text style={st.username}>{first}</Text>
          </View>
        </View>
        <View style={st.headerRight}>
          <TouchableOpacity style={st.iconBtn} onPress={toggleDark}>
            <Ionicons name={dark ? "sunny-outline" : "moon-outline"} size={18} color={dark ? C.gold : C.text} />
          </TouchableOpacity>
          <TouchableOpacity style={st.iconBtn} onPress={() => go("Notifications")}>
            <Ionicons name="notifications-outline" size={18} color={dark ? DARK.text : C.text} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 110 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.primary} />}
        showsVerticalScrollIndicator={false}
      >
        <FadeIn delay={0}>
        <LinearGradient colors={[C.primary, C.primaryDark]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={st.balanceCard}>
          <Float style={[st.blob, { width: 180, height: 180, top: -50, right: -40 }]} range={10} />
          <Float style={[st.blob, { width: 110, height: 110, bottom: -40, right: 30, backgroundColor: C.gold + "40" }]} range={12} duration={5000} delay={400} />
          <Sparkle style={{ top: 18, right: 120 }} size={13} />
          <View style={st.balanceTop}>
            <TouchableOpacity style={st.row} onPress={() => setShowBalance(!showBalance)}>
              <Text style={st.balanceLabel}>Wallet balance</Text>
              <Ionicons name={showBalance ? "eye-outline" : "eye-off-outline"} size={14} color={C.onPrimaryMuted} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => go("Rewards")}>
              <Text style={st.bonus}>🎁 Bonus {fmtShort(referralBalance)}</Text>
            </TouchableOpacity>
          </View>
          <Text style={st.balanceAmount}>{fmt(balance, !showBalance)}</Text>
          <View style={st.actionRow}>
            <TouchableOpacity style={st.actionBtn} activeOpacity={0.85} onPress={() => navigation.navigate("AddMoney", { balance, accountName: acctName, accounts: wallet?.accounts?.length ? wallet.accounts : acctNo ? [{ bankName, accountNumber: acctNo }] : [] })}>
              <Text style={st.actionBtnText}>+ Add Funds</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[st.actionBtn, st.actionGhost]} activeOpacity={0.85} onPress={() => go("Rewards")}>
              <Text style={[st.actionBtnText, { color: C.white }]}>Withdraw</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>
        </FadeIn>

        <FadeIn delay={90}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} snapToInterval={312} decelerationRate="fast" contentContainerStyle={{ paddingHorizontal: S.xl, gap: S.md }} style={{ marginTop: S.lg }}>
          <LinearGradient colors={[C.primaryMid, C.primaryDark]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={st.acctCard}>
            <View style={[st.blob, { width: 140, height: 140, top: -40, right: -30 }]} />
            <View style={st.rowBetween}>
              <Text style={st.acctNo} selectable>{acctNo || "—"}</Text>
              <TouchableOpacity style={st.copyBtn} onPress={copyAccount} disabled={!acctNo}>
                <Ionicons name="copy-outline" size={16} color={C.white} />
              </TouchableOpacity>
            </View>
            <Text style={st.acctLabel}>ACCOUNT NAME</Text>
            <Text style={st.acctName} numberOfLines={1}>{acctName}</Text>
            <View style={[st.row, { marginTop: S.sm }]}>
              <View style={st.bankPill}><Text style={st.bankPillText} numberOfLines={1}>{bankName}</Text></View>
              <Text style={st.fee}>Instant funding</Text>
            </View>
          </LinearGradient>
          <TouchableOpacity onPress={() => go("Data")} activeOpacity={0.9}>
            <LinearGradient colors={[C.gold, "#FF6B2C"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[st.acctCard, { width: 220, flex: 1 }]}>
              <Text style={st.promoTitle}>🎁 Hot data deals</Text>
              <Text style={st.promoSub}>Cheap bundles on all networks. Tap to buy.</Text>
            </LinearGradient>
          </TouchableOpacity>
        </ScrollView>
        </FadeIn>

        <FadeIn delay={180}>
        <View style={st.servicesCard}>
          <Text style={st.sectionTitle}>Services</Text>
          <View style={st.servicesGrid}>
            {SERVICES.map((s) => (
              <PressScale key={s.id} style={st.serviceItem} onPress={() => go(s.screen)}>
                <View style={[st.serviceIcon, { backgroundColor: s.tint }]}>
                  <Ionicons name={s.icon} size={22} color={s.color} />
                </View>
                <Text style={st.serviceLabel} numberOfLines={2}>{s.label}</Text>
              </PressScale>
            ))}
          </View>
        </View>
        </FadeIn>

        <FadeIn delay={270}>
        <TouchableOpacity activeOpacity={0.9} onPress={() => go("Rewards")} style={{ marginHorizontal: S.xl, marginTop: S.lg }}>
          <LinearGradient colors={[C.gold, "#FF6B2C"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={st.referBanner}>
            <View style={[st.blob, { width: 120, height: 120, top: -30, right: -20 }]} />
            <View style={{ flex: 1 }}>
              <Text style={st.referTitle}>Refer & earn</Text>
              <Text style={st.referSub}>Earn a bonus for every friend who joins</Text>
            </View>
            <Text style={{ fontSize: 34 }}>🎉</Text>
          </LinearGradient>
        </TouchableOpacity>
        </FadeIn>

        <View style={st.sectionHeader}>
          <Text style={st.sectionTitle}>Recent transactions</Text>
          <TouchableOpacity onPress={() => go("TransactionsTab")}><Text style={st.viewAllText}>See all</Text></TouchableOpacity>
        </View>
        {recentTx.length === 0 ? (
          <View style={st.empty}>
            <Text style={{ fontSize: 30 }}>🧾</Text>
            <Text style={st.emptyTitle}>No transactions yet</Text>
            <Text style={st.emptySub}>Your payments will show up here.</Text>
          </View>
        ) : recentTx.map((tx) => {
          const isCredit = tx.type === "credit";
          const sc = tx.status === "success" ? C.credit : tx.status === "failed" ? C.debit : tx.status === "pending" ? C.gold : C.primary;
          let desc = tx.description || "";
          if (tx.category && desc && !desc.toLowerCase().startsWith(tx.category.toLowerCase())) desc = tx.category + " - " + desc.replace(/^[\s-]+/, "");
          else if (tx.category && !desc) desc = tx.category;
          return (
            <TouchableOpacity key={tx.id || tx.reference} style={st.txItem} activeOpacity={0.7} onPress={() => openReceipt(tx)}>
              <View style={[st.txIconWrap, { backgroundColor: sc + "1F" }]}>
                <Ionicons name={TX_ICONS[tx.category] || "receipt-outline"} size={18} color={sc} />
              </View>
              <View style={st.txInfo}>
                <Text style={st.txLabel} numberOfLines={1}>{desc || tx.service || "Transaction"}</Text>
                <Text style={st.txDesc}>{tx.date} · {tx.time || formatTime(tx.date || tx.createdAt)}</Text>
              </View>
              <View style={st.txRight}>
                <Text style={[st.txAmount, { color: isCredit ? C.credit : dark ? DARK.text : C.text }]}>{isCredit ? "+" : "-"}{fmtShort(tx.amount)}</Text>
                <View style={[st.txStatus, { backgroundColor: sc + "1F" }]}>
                  <Text style={[st.txStatusText, { color: sc }]}>{tx.status || (isCredit ? "Credit" : "Debit")}</Text>
                </View>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <AddMoneySheet visible={showAdd} onClose={() => setShowAdd(false)} bankName={bankName} accountNumber={acctNo} onSelect={onAddSelect} onToast={showToast} />

      {isFocused && showNotificationModal && (
        <View style={st.nOverlay}>
          <View style={[st.blob, { width: 280, height: 280, bottom: 80, left: -80, backgroundColor: C.primary + "55" }]} />
          <View style={[st.rowBetween, { paddingTop: insets.top + S.lg }]}>
            <View style={st.row}>
              <View style={st.nLogo}><Text style={{ fontSize: 22, fontWeight: "900", color: C.primary }}>S</Text></View>
              <View>
                <Text style={st.nBrand}>SUBBRIDGE</Text>
                <Text style={st.nSub}>Announcement</Text>
              </View>
            </View>
            <TouchableOpacity style={st.nClose} onPress={() => setShowNotificationModal(false)}>
              <Ionicons name="close" size={20} color={C.white} />
            </TouchableOpacity>
          </View>
          <Text style={[st.nSub, { marginTop: 40 }]}>Hi {first},</Text>
          <Text style={st.nTitle}>Check out what's new 🔥</Text>
          <View style={st.nGlass}>
            <Text style={st.nMsg}>{notificationMessage}</Text>
            <Text style={st.nTime}>Today · {new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</Text>
          </View>
          <View style={[st.row, { marginTop: S.xl, gap: S.md }]}>
            <TouchableOpacity style={st.nGhost} onPress={() => Linking.openURL("https://wa.me/+2348012345678")}>
              <Ionicons name="chatbubble-ellipses-outline" size={16} color={C.white} />
              <Text style={st.nGhostText}>Join channel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={st.nBtn} onPress={() => setShowNotificationModal(false)}>
              <Text style={st.nBtnText}>Dismiss</Text>
            </TouchableOpacity>
          </View>
          <View style={st.nFooter}>
            <Ionicons name="shield-checkmark-outline" size={13} color={C.onPrimaryMuted} />
            <Text style={st.nFooterText}>NCC licensed · CL/S&I/0194/2025</Text>
          </View>
        </View>
      )}
      <Toast message={toastMsg} type={toastType} onHide={() => setToastMsg("")} />
    </View>
  );
}

const shadow = { shadowColor: "#1A2680", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.08, shadowRadius: 18, elevation: 3 };
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  row: { flexDirection: "row", alignItems: "center", gap: 6 },
  rowBetween: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  blob: { position: "absolute", borderRadius: 999, backgroundColor: "rgba(255,255,255,0.08)" },

  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: S.xl, paddingBottom: S.md },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: S.md },
  avatar: { width: 46, height: 46, borderRadius: 23, backgroundColor: C.primaryLight, justifyContent: "center", alignItems: "center" },
  avatarText: { fontSize: F.base, fontWeight: "800", color: C.primary },
  greeting: { fontSize: F.sm, color: C.textMuted, fontWeight: "500" },
  username: { fontSize: F.xxl, fontWeight: "800", color: C.text },
  headerRight: { flexDirection: "row", gap: S.sm },
  iconBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: C.white, justifyContent: "center", alignItems: "center", ...shadow },

  balanceCard: { marginHorizontal: S.xl, marginTop: S.sm, borderRadius: 26, padding: S.xl, overflow: "hidden", ...shadow },
  balanceTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  balanceLabel: { fontSize: F.sm, color: C.onPrimaryMuted, fontWeight: "500" },
  bonus: { fontSize: F.sm, fontWeight: "800", color: C.gold },
  balanceAmount: { fontSize: 32, fontWeight: "900", color: C.white, letterSpacing: -1, marginTop: S.sm },
  actionRow: { flexDirection: "row", gap: S.md, marginTop: S.lg },
  actionBtn: { flex: 1, alignItems: "center", backgroundColor: C.white, borderRadius: 14, paddingVertical: 12 },
  actionGhost: { backgroundColor: "rgba(255,255,255,0.16)" },
  actionBtnText: { fontSize: F.md, fontWeight: "800", color: C.primary },

  acctCard: { width: 300, borderRadius: 22, padding: S.lg, overflow: "hidden" },
  acctNo: { fontSize: 24, fontWeight: "900", color: C.white, letterSpacing: 1 },
  copyBtn: { width: 34, height: 34, borderRadius: 10, backgroundColor: "rgba(255,255,255,0.18)", alignItems: "center", justifyContent: "center" },
  acctLabel: { fontSize: 10, fontWeight: "800", letterSpacing: 1, color: C.onPrimaryMuted, marginTop: S.sm },
  acctName: { fontSize: F.md, fontWeight: "700", color: C.white, marginTop: 2 },
  bankPill: { backgroundColor: "rgba(255,255,255,0.18)", borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4, maxWidth: 150 },
  bankPillText: { fontSize: 11, fontWeight: "800", color: C.white },
  fee: { fontSize: 11, fontWeight: "800", color: C.gold },
  promoTitle: { fontSize: F.lg, fontWeight: "900", color: C.white },
  promoSub: { fontSize: F.sm, color: C.white, marginTop: 6, fontWeight: "600" },

  servicesCard: { marginHorizontal: S.xl, marginTop: S.lg, backgroundColor: C.white, borderRadius: 24, padding: S.lg, ...shadow },
  servicesGrid: { flexDirection: "row", flexWrap: "wrap", marginTop: S.md, rowGap: S.lg },
  serviceItem: { width: "33.33%", alignItems: "center" },
  serviceIcon: { width: 54, height: 54, borderRadius: 27, justifyContent: "center", alignItems: "center", marginBottom: 6 },
  serviceLabel: { fontSize: F.sm, fontWeight: "600", color: C.text, textAlign: "center" },

  referBanner: { borderRadius: 22, padding: S.lg, flexDirection: "row", alignItems: "center", overflow: "hidden" },
  referTitle: { fontSize: F.xxl, fontWeight: "900", color: C.white },
  referSub: { fontSize: F.sm, color: C.white, marginTop: 4, fontWeight: "600" },

  sectionHeader: { paddingHorizontal: S.xl, marginTop: S.xl, marginBottom: S.sm, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  sectionTitle: { fontSize: F.lg, fontWeight: "800", color: C.text },
  viewAllText: { fontSize: F.sm, fontWeight: "800", color: C.primary },
  empty: { alignItems: "center", padding: S.xl, marginHorizontal: S.xl, backgroundColor: C.white, borderRadius: 20 },
  emptyTitle: { fontSize: F.base, fontWeight: "800", color: C.text, marginTop: S.sm },
  emptySub: { fontSize: F.sm, color: C.textMuted, marginTop: 2 },

  txItem: { flexDirection: "row", alignItems: "center", marginHorizontal: S.xl, marginBottom: S.sm, padding: S.md, backgroundColor: C.white, borderRadius: 18 },
  txIconWrap: { width: 42, height: 42, borderRadius: 13, justifyContent: "center", alignItems: "center" },
  txInfo: { flex: 1, marginLeft: S.md },
  txLabel: { fontSize: F.md, fontWeight: "700", color: C.text },
  txDesc: { fontSize: F.xs, color: C.textMuted, marginTop: 2 },
  txRight: { alignItems: "flex-end" },
  txAmount: { fontSize: F.md, fontWeight: "800" },
  txStatus: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, marginTop: 4 },
  txStatusText: { fontSize: 10, fontWeight: "800", textTransform: "capitalize" },

  nOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(10,16,48,0.6)", paddingHorizontal: S.xl, zIndex: 100, overflow: "hidden" },
  nLogo: { width: 46, height: 46, borderRadius: 23, backgroundColor: C.white, alignItems: "center", justifyContent: "center" },
  nBrand: { fontSize: F.base, fontWeight: "900", color: C.white, letterSpacing: 0.5 },
  nSub: { fontSize: F.sm, color: C.onPrimaryMuted, fontWeight: "500" },
  nClose: { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.15)", alignItems: "center", justifyContent: "center" },
  nTitle: { fontSize: 26, fontWeight: "900", color: C.white, marginTop: 4 },
  nGlass: { marginTop: S.lg, padding: S.lg, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.12)", borderWidth: 1, borderColor: "rgba(255,255,255,0.25)" },
  nMsg: { fontSize: F.md, color: C.white, lineHeight: 22, fontWeight: "500" },
  nTime: { fontSize: 12, color: C.onPrimaryMuted, marginTop: 14, fontWeight: "500" },
  nFooter: { position: "absolute", bottom: 40, left: 0, right: 0, flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 6 },
  nFooterText: { fontSize: 12, color: C.onPrimaryMuted, fontWeight: "500" },
  nGhost: { flex: 1, flexDirection: "row", gap: 6, alignItems: "center", justifyContent: "center", paddingVertical: 16, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.12)", borderWidth: 1, borderColor: "rgba(255,255,255,0.3)" },
  nGhostText: { fontSize: F.base, fontWeight: "800", color: C.white },
  nBtn: { flex: 1, alignItems: "center", paddingVertical: 16, borderRadius: 18, backgroundColor: C.white },
  nBtnText: { fontSize: F.base, fontWeight: "800", color: C.primary },
});

const darkStyles = darkVariant(styles, {
  container: { backgroundColor: DARK.bg },
  username: { color: DARK.text },
  greeting: { color: DARK.muted },
  iconBtn: { backgroundColor: DARK.card },
  avatar: { backgroundColor: DARK.cardAlt },
  servicesCard: { backgroundColor: DARK.card },
  serviceLabel: { color: DARK.text },
  sectionTitle: { color: DARK.text },
  txItem: { backgroundColor: DARK.card },
  txLabel: { color: DARK.text },
  txDesc: { color: DARK.muted },
  empty: { backgroundColor: DARK.card },
  emptyTitle: { color: DARK.text },
  emptySub: { color: DARK.muted },
});
