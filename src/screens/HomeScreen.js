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

          <Text style={[styles.balanceAmount, { marginTop: S.xs }]}>{fmt(balance, !showBalance)}</Text>

          <View style={styles.statsRow}>
            <TouchableOpacity style={styles.statItem} activeOpacity={0.7} onPress={() => go("Rewards")}>
              <Text style={styles.statLabel}>Referral</Text>
              <Text style={styles.statValue}>{fmt(referralBalance)}</Text>
              <Ionicons name="chevron-forward" size={12} color="rgba(255,255,255,0.7)" />
            </TouchableOpacity>
          </View>

          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.actionBtn} activeOpacity={0.8} onPress={() => go("Rewards")}>
              <Ionicons name="gift-outline" size={15} color={C.primary} />
              <Text style={styles.actionBtnText}>Withdraw Bonus</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBtn} activeOpacity={0.8} onPress={() => setShowAdd(true)}>
              <Ionicons name="add-circle-outline" size={15} color={C.primary} />
              <Text style={styles.actionBtnText}>Add Money</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>

        {/* Virtual Account — bank + account number live here, not on the balance card */}
        <View style={styles.accountCard}>
          <View style={styles.accountCardTop}>
            <View style={styles.accountLabelWrap}>
              <View style={styles.accountLabelDot} />
              <Text style={styles.accountLabel}>YOUR ACCOUNT</Text>
            </View>
            <View style={styles.accountBankPill}>
              <Ionicons name="business-outline" size={11} color={C.primary} />
              <Text style={styles.accountBankPillText} numberOfLines={1}>{bankName}</Text>
            </View>
          </View>

          <Text style={styles.accountNumberText} selectable numberOfLines={1}>
            {acctNo ? `${acctNo.slice(0, 3)} ${acctNo.slice(3, 6)} ${acctNo.slice(6)}` : "—"}
          </Text>

          <View style={styles.accountBottomRow}>
            <Text style={styles.accountHolder} numberOfLines={1}>
              {user?.virtualAccount?.accountName || [user?.firstName, user?.lastName].filter(Boolean).join(" ") || "Your account"}
            </Text>
            <TouchableOpacity style={styles.accountCopyBtn} onPress={copyAccount} disabled={!acctNo} activeOpacity={0.85}>
              <Ionicons name="copy-outline" size={13} color={C.primary} />
              <Text style={styles.accountCopyText}>Copy</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.accountFooter}>
            <Ionicons name="flash" size={12} color={C.credit} />
            <Text style={styles.accountFooterText}>Transfers to this account fund your wallet instantly.</Text>
          </View>
        </View>

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
          <TouchableOpacity style={styles.viewAllBtn} onPress={() => go("TransactionsTab")}>
            <Text style={styles.viewAllText}>View All</Text>
            <Ionicons name="chevron-forward" size={14} color={C.primary} />
          </TouchableOpacity>
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

      <AddMoneySheet
        visible={showAdd}
        onClose={() => setShowAdd(false)}
        bankName={bankName}
        accountNumber={acctNo}
        onSelect={onAddSelect}
        onToast={showToast}
      />
      {/* Notification overlay — rendered inline (not a native Modal) so it can
          never outlive this screen or float above the auth screens. */}
      {isFocused && showNotificationModal && (
        <View style={styles.notificationOverlay}>
          <View style={styles.notificationCard}>
            <View style={styles.notificationHeader}>
              <Image source={require("../assets/logo.jpg")} style={styles.notificationLogo} resizeMode="contain" />
              <Text style={styles.notificationHeaderTitle}>SubBridge</Text>
              <TouchableOpacity style={styles.notificationClose} onPress={() => setShowNotificationModal(false)}>
                <Ionicons name="close" size={22} color={C.textMuted} />
              </TouchableOpacity>
            </View>
            <View style={styles.notificationIconWrap}>
              <View style={styles.notificationIconBadge}>
                <Ionicons name="shield-checkmark" size={28} color={C.white} />
              </View>
            </View>
            <Text style={styles.notificationTitle}>Important Notice</Text>
            <Text style={styles.notificationMessage}>{notificationMessage}</Text>
            <View style={styles.notificationActionsRow}>
              <TouchableOpacity style={styles.notificationBtnPrimary} onPress={() => Linking.openURL('https://wa.me/+2348012345678')}>
                <Ionicons name="logo-whatsapp" size={18} color={C.white} />
                <Text style={styles.notificationBtnTextPrimary}>WhatsApp Group</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.notificationBtnSecondary} onPress={() => Linking.openURL('https://wa.me/+2348012345678')}>
                <Ionicons name="headset-outline" size={18} color={C.primary} />
                <Text style={styles.notificationBtnTextSecondary}>Customer Support</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
      <Toast message={toastMsg} type={toastType} onHide={() => setToastMsg("")} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },

  notificationOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: S.xl,
    zIndex: 100,
  },
  notificationCard: {
    backgroundColor: C.white,
    borderRadius: R.md,
    padding: S.xl,
    width: '100%',
    maxWidth: 420,
    elevation: 0,
    shadowOpacity: 0,
    shadowRadius: 0,
    borderWidth: 0,
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: S.lg,
  },
  notificationLogo: {
    width: 28,
    height: 28,
    marginRight: S.sm,
  },
  notificationHeaderTitle: {
    flex: 1,
    fontSize: F.md,
    fontWeight: '800',
    color: C.primary,
  },
  notificationClose: {
    padding: S.sm,
  },
  notificationIconWrap: {
    alignItems: 'center',
    marginBottom: S.md,
  },
  notificationIconBadge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: C.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: S.md,
  },
  notificationTitle: {
    fontSize: F.h3,
    fontWeight: '800',
    color: C.text,
    textAlign: 'center',
    marginBottom: S.sm,
  },
  notificationMessage: {
    fontSize: F.md,
    color: C.textMuted,
    textAlign: 'center',
    marginBottom: S.xl,
    lineHeight: 22,
  },
  notificationActionsRow: {
    flexDirection: 'row',
    gap: S.sm,
    marginTop: S.md,
  },
  notificationBtnPrimary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: S.sm,
    backgroundColor: C.primary,
    borderRadius: R.sm,
    paddingVertical: S.md,
    paddingHorizontal: S.base,
  },
  notificationBtnSecondary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: S.sm,
    backgroundColor: C.inputBg,
    borderRadius: R.sm,
    paddingVertical: S.md,
    paddingHorizontal: S.base,
    borderWidth: 1,
    borderColor: C.border,
  },
  notificationBtnTextPrimary: {
    fontSize: F.base,
    fontWeight: '800',
    color: C.white,
  },
  notificationBtnTextSecondary: {
    fontSize: F.base,
    fontWeight: '700',
    color: C.primary,
  },

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
    shadowOpacity: 0, shadowRadius: 0, elevation: 0,
  },
  balanceTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  balanceLabel: { fontSize: 11, color: "rgba(255,255,255,0.7)" },
  balanceAmount: { fontSize: 32, fontWeight: "900", color: C.white, letterSpacing: -1.2 },

  accountCard: {
    marginHorizontal: S.xl, marginTop: S.md, backgroundColor: C.white,
    borderRadius: R.md, padding: S.base, borderWidth: 1, borderColor: C.border,
    shadowColor: "#0B1B4B", shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08, shadowRadius: 12, elevation: 3,
  },
  accountCardTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  accountLabelWrap: { flexDirection: "row", alignItems: "center", gap: 5 },
  accountLabelDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: C.credit },
  accountLabel: { fontSize: 10, fontWeight: "800", letterSpacing: 1.2, color: C.textMuted },
  accountBankPill: {
    flexDirection: "row", alignItems: "center", gap: 4, maxWidth: "62%",
    backgroundColor: C.primary + "12", paddingHorizontal: S.sm,
    paddingVertical: 4, borderRadius: R.full,
  },
  accountBankPillText: { fontSize: 10, fontWeight: "800", color: C.primary },
  accountNumberText: { fontSize: 26, fontWeight: "900", color: C.text, letterSpacing: 3, marginTop: S.sm },
  accountBottomRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    marginTop: S.xs, gap: S.sm,
  },
  accountHolder: { flex: 1, fontSize: F.sm, fontWeight: "600", color: C.textMuted },
  accountCopyBtn: {
    flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: C.primary + "12",
    paddingHorizontal: S.sm + 2, paddingVertical: 6, borderRadius: R.full,
  },
  accountCopyText: { fontSize: F.xs, fontWeight: "800", color: C.primary },
  accountFooter: {
    flexDirection: "row", alignItems: "center", gap: 5,
    marginTop: S.sm, paddingTop: S.sm, borderTopWidth: 1, borderTopColor: C.border,
  },
  accountFooterText: { flex: 1, fontSize: 10.5, color: C.textMuted },
  statsRow: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.12)", borderRadius: R.sm,
    paddingHorizontal: S.base, paddingVertical: S.sm + 2, marginTop: S.sm,
  },
  statItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  statLabel: { fontSize: F.xs, color: "rgba(255,255,255,0.85)", fontWeight: "600" },
  statValue: { fontSize: F.xs, fontWeight: "800", color: C.white },
  actionRow: { flexDirection: "row", gap: S.sm, marginTop: S.sm },
  actionBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5,
    backgroundColor: C.white, borderRadius: R.sm, paddingVertical: S.sm + 3,
  },
  actionBtnText: { fontSize: F.sm, fontWeight: "800", color: C.primary },

  sectionHeader: {
    paddingHorizontal: S.xl,
    marginTop: S.md,
    marginBottom: S.sm,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionTitle: { fontSize: F.md, fontWeight: "800", color: C.text },
  viewAllBtn: { flexDirection: "row", alignItems: "center", gap: 2 },
  viewAllText: { fontSize: F.sm, fontWeight: "700", color: C.primary },

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
