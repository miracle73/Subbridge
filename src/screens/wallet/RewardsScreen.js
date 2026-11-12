import { withPayStyles } from "../../components/payStyles";
import { FadeIn, PressScale, Float, Sparkle } from "../../components/Motion";
import { Gloss } from "../../components/Motion";
import React, { useState, useEffect, useCallback } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Share, Modal, StatusBar, Image,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import { C, F, R, S } from "../../utils/theme";
import { fmt, formatDateTime } from "../../utils/format";
import { MOCK_REWARDS } from "../../utils/mockData";
import api from "../../services/api";
import Preloader from "../../components/Preloader";
import Toast from "../../components/Toast";
import PaymentAuthSheet from "../../components/PaymentAuthSheet";
import PinErrorModal from "../../components/PinErrorModal";
import ProcessingOverlay from "../../components/ProcessingOverlay";
import BiometricPrompt, { shouldPromptBiometric } from "../../components/BiometricPrompt";
import { BiometricCrypto } from "../../services/biometric";
import { SecurePin } from "../../utils/storage";

async function signTransaction(txnId, txnData) {
  const auth = await BiometricCrypto.authenticate();
  if (!auth.success) return { signature: null };
  const challengeRes = await api.requestChallenge(txnId, txnData);
  if (!challengeRes.success) return { signature: null };
  const signature = await BiometricCrypto.signChallenge(challengeRes.data.challenge);
  return { signature, transactionId: txnId, transactionData: txnData };
}

function productIcon(product) {
  const p = String(product || "").toLowerCase();
  if (p.includes("air")) return "phone-portrait-outline";
  if (p.includes("data")) return "wifi-outline";
  if (p.includes("cable") || p.includes("tv")) return "tv-outline";
  if (p.includes("elec")) return "flash-outline";
  return "pricetag-outline";
}

const RATE_ORDER = [
  { id: "airtime", label: "Airtime", icon: "phone-portrait-outline", color: C.primary },
  { id: "data", label: "Data", icon: "wifi-outline", color: C.accent },
  { id: "cable", label: "Cable TV", icon: "tv-outline", color: C.warning },
  { id: "electricity", label: "Electricity", icon: "flash-outline", color: C.debit },
];

const MIN_WITHDRAWAL = 1000;

const FALLBACK_BANKS = [
  { name: "GTBank", code: "058" },
  { name: "Access Bank", code: "044" },
  { name: "Zenith Bank", code: "057" },
  { name: "UBA", code: "033" },
  { name: "First Bank of Nigeria", code: "011" },
  { name: "Opay", code: "100004" },
  { name: "Kuda Bank", code: "50211" },
  { name: "Palmpay", code: "100033" },
];

function StatCard({ label, value, icon, color }) {
  return (
    <View style={s.card}>
      <View style={[s.cardIcon, { backgroundColor: color + "15" }]}>
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <Text style={s.cardValue}>{value}</Text>
      <Text style={s.cardLabel}>{label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    width: "48%", backgroundColor: C.white, borderRadius: R.md, padding: S.base,
    marginBottom: S.sm, borderWidth: 1, borderColor: C.border,
  },
  cardIcon: {
    width: 34, height: 34, borderRadius: R.xs, alignItems: "center",
    justifyContent: "center", marginBottom: S.sm,
  },
  cardValue: { fontSize: F.lg, fontWeight: "900", color: C.text },
  cardLabel: { fontSize: F.xs, color: C.textMuted, marginTop: 2 },
});

export default function RewardsScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [demo, setDemo] = useState(false);
  const [dashboard, setDashboard] = useState({
    referralBalance: 0,
    totalEarnings: 0,
    totalUsers: 0,
    monthEarnings: 0,
    referralLink: "",
    referralCode: "",
    commissionRates: {},
    commission: { perReferral: 0, note: "" },
    howItWorks: MOCK_REWARDS.howItWorks,
    referredPeople: [],
  });
  const [earnings, setEarnings] = useState([]);
  const [banks, setBanks] = useState(FALLBACK_BANKS);

  const [showWithdraw, setShowWithdraw] = useState(false);
  const [withdrawStage, setWithdrawStage] = useState("menu");
  const [withdrawMethod, setWithdrawMethod] = useState("wallet");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [bank, setBank] = useState(null);
  const [accountNumber, setAccountNumber] = useState("");
  const [resolvedName, setResolvedName] = useState("");
  const [resolving, setResolving] = useState(false);
  const [showBanks, setShowBanks] = useState(false);

  const [showAuthSheet, setShowAuthSheet] = useState(false);
  const [authSheetKey, setAuthSheetKey] = useState(0);
  const [processing, setProcessing] = useState(false);
  const [showPinError, setShowPinError] = useState(false);
  const [showBioPrompt, setShowBioPrompt] = useState(false);
  const [toastMsg, setToastMsg] = useState("");
  const [toastType, setToastType] = useState("error");

  const showToast = (msg, type = "error") => { setToastType(type); setToastMsg(msg); };
  const fail = (msg) => { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error); showToast(msg); };

  const load = useCallback(async (silent) => {
    try {
      if (!silent) setLoading(true);
      await api.init();
      const [refRes, earnRes, banksRes] = await Promise.all([
        api.getReferralDashboard(),
        api.getReferralEarnings(1),
        api.getBanks(),
      ]);

      if (refRes.success && refRes.data) {
        const d = refRes.data;
        setDemo(false);
        // Normalize commission rates keys to lowercase for matching
        const normalizedRates = {};
        if (d.commissionRates) {
          Object.entries(d.commissionRates).forEach(([key, value]) => {
            const normalizedKey = key.toLowerCase().replace(/\s+/g, '');
            normalizedRates[normalizedKey] = parseFloat(value) || 0;
          });
        }
        setDashboard({
          referralBalance: d.referralBalance || 0,
          totalEarnings: d.totalEarnings || 0,
          totalUsers: d.totalUsers || 0,
          monthEarnings: d.monthEarnings || 0,
          referralLink: d.referralLink || "",
          referralCode: d.referralCode || "",
          commissionRates: normalizedRates,
          commission: d.commission || { perReferral: 0, note: "" },
          howItWorks: Array.isArray(d.howItWorks) && d.howItWorks.length ? d.howItWorks : [],
          referredPeople: [],
        });
      } else {
        setDemo(true);
        setDashboard({
          referralBalance: 0,
          totalEarnings: 0,
          totalUsers: 0,
          monthEarnings: 0,
          referralLink: "",
          referralCode: "",
          commissionRates: {},
          commission: { perReferral: 0, note: "" },
          howItWorks: [],
          referredPeople: [],
        });
      }

      let rows = [];
      if (earnRes.success && Array.isArray(earnRes.data?.results)) {
        rows = earnRes.data.results;
      } else if (refRes.success && Array.isArray(refRes.data?.recentEarnings)) {
        rows = refRes.data.recentEarnings;
      } else if (!refRes.success) {
        rows = MOCK_REWARDS.recentEarnings;
      }
      setEarnings(rows);

      // Referred people (referrals[]): id, username, name, email, phone,
      // dateJoined, bonus, bonusEarned, referralCode, create_date
      if (refRes.success && Array.isArray(refRes.data?.referrals)) {
        setDashboard((prev) => ({
          ...prev,
          referredPeople: refRes.data.referrals.map((r) => ({
            id: r.id ?? r.userId ?? r.referralId ?? "",
            referralCode: r.referralCode ?? r.code ?? "",
            name: r.name ?? r.username ?? r.employer ?? "",
            email: r.email ?? "",
            phone: r.phone ?? "",
            dateJoined: r.dateJoined ?? r.joinDate ?? "",
            bonus: r.bonus ?? r.referralBonus ?? 0,
            bonusEarned: r.bonusEarned ?? r.earned ?? 0,
            referralCode: r.referralCode ?? "",
            create_date: r.create_date ?? "",
          })),
        }));
      } else if (refRes.success && Array.isArray(refRes.data?.results)) {
        setDashboard((prev) => ({
          ...prev,
          referredPeople: refRes.data.results.map((r) => ({
            id: r.id ?? "",
            referralCode: r.referralCode ?? "",
            name: r.name ?? "",
            email: r.email ?? "",
            phone: r.phone ?? "",
            dateJoined: r.dateJoined ?? "",
            bonus: r.bonus ?? 0,
            bonusEarned: r.bonusEarned ?? 0,
            referralCode: r.referralCode ?? "",
            create_date: r.create_date ?? "",
          })),
        }));
      }

      if (banksRes.success && Array.isArray(banksRes.data)) {
        const list = banksRes.data
          .map((b) => ({ name: b.bankName || b.name || "", code: String(b.bankCode || b.code || ""), logo: b.bankLogoUrl || null }))
          .filter((b) => b.name && b.code);
        if (list.length > 0) setBanks(list);
      }
    } catch (err) {
      console.error("[Rewards] Load error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (accountNumber.length !== 10 || !bank?.code) {
      setResolvedName("");
      return;
    }
    let cancelled = false;
    setResolving(true);
    api.paystackResolve(bank.code, accountNumber)
      .then((res) => {
        if (cancelled) return;
        const d = res.data || res.raw || {};
        const name = d.accountName || d.account_name || d.name || d?.data?.accountName || "";
        setResolvedName(name);
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setResolving(false); });
    return () => { cancelled = true; };
  }, [accountNumber, bank]);

  const copy = async (value, label) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await Clipboard.setStringAsync(value);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    showToast(`${label} copied`, "success");
  };

  const share = async () => {
    try {
      await Share.share({
        message:
          `Join me on SubBridge \u2014 pay airtime, data, cable & electricity bills.\n` +
          `Use my referral code ${dashboard.referralCode} or sign up here: ${dashboard.referralLink}`,
      });
    } catch (err) {
      showToast("Could not open share sheet");
    }
  };

  const openWithdraw = (method) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setWithdrawMethod(method);
    setWithdrawAmount("");
    setResolvedName("");
    setWithdrawStage("form");
  };

  const closeWithdraw = () => {
    setShowWithdraw(false);
    setWithdrawStage("menu");
  };

  const startAuth = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const amt = Number(String(withdrawAmount).replace(/[^\d]/g, ""));
    if (!amt || amt <= 0) return showToast("Enter a valid amount");
    if (amt < MIN_WITHDRAWAL) return showToast(`Minimum withdrawal is ${fmt(MIN_WITHDRAWAL)}`);
    if (amt > dashboard.referralBalance) return showToast("Amount exceeds your bonus balance");
    if (dashboard.referralBalance < MIN_WITHDRAWAL) return showToast(`You need at least ${fmt(MIN_WITHDRAWAL)} in bonus balance to withdraw`);
    if (withdrawMethod === "bank") {
      if (!bank?.code) return showToast("Select a bank");
      if (accountNumber.length !== 10) return showToast("Enter a valid 10-digit account number");
    }
    setShowWithdraw(false);
    setShowAuthSheet(true);
  };

  const resetWithdraw = () => {
    setWithdrawAmount("");
    setAccountNumber("");
    setBank(null);
    setResolvedName("");
    setWithdrawStage("menu");
  };

  const processWithdraw = async (auth) => {
    setProcessing(true);
    try {
      const amt = Number(String(withdrawAmount).replace(/[^\d]/g, ""));
      if (!amt || amt <= 0) return showToast("Enter a valid amount");
      if (amt < MIN_WITHDRAWAL) return showToast(`Minimum withdrawal is ${fmt(MIN_WITHDRAWAL)}`);
      let result;
      if (withdrawMethod === "wallet") {
        const payload = auth.pin
          ? { amount: String(amt), pin: auth.pin }
          : { amount: String(amt), signature: auth.signature, transactionId: auth.transactionId, transactionData: auth.transactionData };
        result = await api.bonusTransferToWallet(payload);
      } else {
        const payload = auth.pin
          ? { amount: String(amt), bankCode: bank.code, accountNumber, pin: auth.pin }
          : { amount: String(amt), bankCode: bank.code, accountNumber, signature: auth.signature, transactionId: auth.transactionId, transactionData: auth.transactionData };
        result = await api.paystackBankTransfer(payload);
      }

      if (result.success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        showToast(result.message || (withdrawMethod === "wallet" ? "Transfer to wallet processing" : "Transfer to bank processing"), "success");
        if (await shouldPromptBiometric()) setShowBioPrompt(true);
        resetWithdraw();
        load(true);
      } else {
        fail(result.message || "Withdrawal failed. Please try again.");
      }
    } catch (err) {
      fail("Network error. Please try again.");
    } finally {
      setProcessing(false);
    }
  };

  const goForgotPin = async () => {
    setShowPinError(false);
    setShowAuthSheet(false);
    let p = "";
    try { p = (await SecurePin.getPhone()) || ""; } catch (e) {}
    navigation.navigate("ForgotPassword", { mode: "pin", phone: p || "" });
  };

  if (loading) return <Preloader />;

  const rateVals = Object.values(dashboard.commissionRates || {}).map(Number).filter((n) => n > 0);
  const commissionPct = rateVals.length ? Math.max(...rateVals) : 2;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />
      <Toast message={toastMsg} type={toastType} onHide={() => setToastMsg("")} />

      <View style={rf.header}>
        <TouchableOpacity style={rf.back} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color={C.text} />
        </TouchableOpacity>
        <Text style={rf.headerTitle}>Invite Friends</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 60 + insets.bottom }} showsVerticalScrollIndicator={false}>
        <FadeIn>
          <LinearGradient colors={[C.primary, C.primaryDark]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={rf.hero}>
<Gloss />
            <Float style={rf.heroBlob} range={10} />
            <Sparkle style={{ top: 22, left: 178 }} size={14} />
            <Sparkle style={{ bottom: 16, right: 20 }} size={10} delay={500} />
            <View style={{ flex: 1 }}>
              <Text style={rf.heroTitle}>Invite friends &{"\n"}earn rewards</Text>
              <Text style={rf.heroSub}>Earn {commissionPct}% commission on every{"\n"}friend's first 10 transactions.</Text>
            </View>
            <View style={rf.trophy}><Text style={{ fontSize: 38 }}>🏆</Text></View>
          </LinearGradient>
        </FadeIn>

        <FadeIn delay={80}>
          <View style={rf.card}>
            <Text style={rf.muted}>Your referral code</Text>
            <View style={rf.codeRow}>
              <Text style={rf.code} selectable>{dashboard.referralCode || "—"}</Text>
              <TouchableOpacity style={rf.copyBtn} onPress={() => dashboard.referralCode && copy(dashboard.referralCode, "Referral code")}>
                <Ionicons name="copy-outline" size={18} color={C.primary} />
              </TouchableOpacity>
            </View>
            <PressScale style={rf.shareBtn} onPress={share}>
              <Text style={rf.shareText}>Share invite link</Text>
            </PressScale>
          </View>
        </FadeIn>

        <Text style={rf.section}>Your referral stats</Text>
        <View style={rf.grid}>
          {[
            ["👥", "Friends invited", String(dashboard.totalUsers || 0), C.text],
            ["💰", "Total earned", fmt(dashboard.totalEarnings), C.credit],
            ["⏳", "Pending", fmt(dashboard.pending ?? dashboard.monthEarnings ?? 0), C.text],
            ["📈", "Commission", `${commissionPct}%`, C.text],
          ].map(([icon, label, value, color], i) => (
            <FadeIn key={label} delay={120 + i * 60} style={rf.statWrap}>
              <View style={rf.stat}>
                <View style={rf.statTop}>
                  <View style={rf.statIcon}><Text style={{ fontSize: 15 }}>{icon}</Text></View>
                  <Text style={rf.statLabel}>{label}</Text>
                </View>
                <Text style={[rf.statValue, { color }]}>{value}</Text>
              </View>
            </FadeIn>
          ))}
        </View>

        <View style={rf.available}>
          <Text style={rf.availableText}>{fmt(dashboard.referralBalance)} available</Text>
          <TouchableOpacity
            style={rf.withdraw}
            onPress={() => {
              if (dashboard.referralBalance < MIN_WITHDRAWAL) { showToast(`Minimum withdrawal is ${fmt(MIN_WITHDRAWAL)}`); return; }
              setShowWithdraw(true);
            }}
          >
            <Text style={rf.withdrawText}>Withdraw</Text>
          </TouchableOpacity>
        </View>

        <Text style={rf.section}>Commission history</Text>
        {earnings.length === 0 ? (
          <Text style={rf.muted}>No commission yet — share your code to start earning.</Text>
        ) : earnings.slice(0, 10).map((e, i) => (
          <View key={e.id || i} style={rf.historyRow}>
            <View style={rf.initial}><Text style={rf.initialText}>{String(e.name || "?").charAt(0).toUpperCase()}</Text></View>
            <Text style={rf.historyText} numberOfLines={1}>{e.name}{e.product ? ` · ${e.product}` : ""}</Text>
            <Text style={rf.historyAmount}>+{fmt(e.amount)}</Text>
          </View>
        ))}

        <Text style={rf.section}>How it works</Text>
        {[
          ["Share your code", "Send your code or link to friends"],
          ["Friend signs up", "They register with your code"],
          ["You earn", "Get commission on their purchases"],
        ].map(([title, sub], i) => (
          <View key={title} style={rf.step}>
            <View style={rf.stepNum}><Text style={rf.stepNumText}>{i + 1}</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={rf.stepTitle}>{title}</Text>
              <Text style={rf.stepSub}>{sub}</Text>
            </View>
          </View>
        ))}

        {Object.keys(dashboard.commissionRates || {}).length > 0 ? (
          <>
            <Text style={rf.section}>Referral commission rates</Text>
            <View style={rf.card}>
              {Object.entries(dashboard.commissionRates).map(([k, v], i) => (
                <View key={k} style={[rf.rateRow, i > 0 && rf.rateDivider]}>
                  <Text style={rf.rateLabel}>{({ airtime: "Airtime", data: "Data", cable: "Cable TV", electricity: "Electricity" })[k] || k}</Text>
                  <Text style={rf.rateValue}>{v}%</Text>
                </View>
              ))}
            </View>
          </>
        ) : null}
      </ScrollView>


      <Modal visible={showWithdraw} transparent animationType="slide" onRequestClose={closeWithdraw}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={closeWithdraw} />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + S.base }]}>
          <View style={styles.handle} />

          {withdrawStage === "menu" && (
            <>
              <Text style={styles.sheetTitle}>Withdraw Bonus</Text>
              <Text style={styles.sheetSubtitle}>Choose where to send {fmt(dashboard.referralBalance)}</Text>

              <TouchableOpacity style={styles.sheetOption} activeOpacity={0.7} onPress={() => openWithdraw("wallet")}>
                <View style={styles.sheetOptionIcon}>
                  <Ionicons name="wallet-outline" size={20} color={C.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.sheetOptionTitle}>Transfer to Wallet</Text>
                  <Text style={styles.sheetOptionDesc}>Move bonus into your SubBridge wallet</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={C.textLight} />
              </TouchableOpacity>

              <TouchableOpacity style={styles.sheetOption} activeOpacity={0.7} onPress={() => openWithdraw("bank")}>
                <View style={styles.sheetOptionIcon}>
                  <Ionicons name="business-outline" size={20} color={C.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.sheetOptionTitle}>Transfer to Bank</Text>
                  <Text style={styles.sheetOptionDesc}>Send bonus to your bank account</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={C.textLight} />
              </TouchableOpacity>
            </>
          )}

          {withdrawStage === "form" && (
            <>
              <View style={styles.formHeader}>
                <TouchableOpacity onPress={() => setWithdrawStage("menu")} style={styles.formBack}>
                  <Ionicons name="arrow-back" size={20} color={C.text} />
                </TouchableOpacity>
                <Text style={styles.sheetTitle}>
                  {withdrawMethod === "wallet" ? "Transfer to Wallet" : "Transfer to Bank"}
                </Text>
              </View>
              <Text style={styles.sheetSubtitle}>Bonus balance: {fmt(dashboard.referralBalance)}</Text>

              <Text style={styles.fieldLabel}>Amount</Text>
              <View style={styles.amountWrap}>
                <Text style={styles.amountPrefix}>{"\u20A6"}</Text>
                <TextInput
                  style={styles.amountInput}
                  value={withdrawAmount}
                  onChangeText={(t) => setWithdrawAmount(t.replace(/[^\d]/g, ""))}
                  placeholder="0"
                  keyboardType="number-pad"
                />
              </View>
              <Text style={styles.minWithdrawNote}>Minimum withdrawal: {fmt(MIN_WITHDRAWAL)}</Text>

              {withdrawMethod === "bank" && (
                <>
                  <Text style={styles.fieldLabel}>Bank</Text>
                  <TouchableOpacity style={styles.pickerInput} activeOpacity={0.7} onPress={() => setShowBanks(true)}>
                    {bank?.logo ? (
                      <Image source={{ uri: bank.logo }} style={styles.bankLogo} />
                    ) : (
                      <Ionicons name="business-outline" size={18} color={bank ? C.text : C.textMuted} />
                    )}
                    <Text style={[styles.pickerText, !bank && styles.pickerPlaceholder]} numberOfLines={1}>
                      {bank?.name || "Select your bank"}
                    </Text>
                    <Ionicons name="chevron-down" size={16} color={C.textLight} />
                  </TouchableOpacity>

                  <Text style={styles.fieldLabel}>Account Number</Text>
                  <TextInput
                    style={styles.input}
                    value={accountNumber}
                    onChangeText={(t) => setAccountNumber(t.replace(/[^\d]/g, "").slice(0, 10))}
                    placeholder="0123456789"
                    keyboardType="number-pad"
                    maxLength={10}
                  />
                  {resolving && <Text style={styles.resolvingText}>Resolving account name...</Text>}
                  {!resolving && !!resolvedName && (
                    <View style={styles.resolvedRow}>
                      <Ionicons name="checkmark-circle" size={16} color={C.credit} />
                      <Text style={styles.resolvedName}>{resolvedName}</Text>
                    </View>
                  )}
                </>
              )}

              <TouchableOpacity style={styles.continueBtn} activeOpacity={0.85} onPress={startAuth}>
                <Text style={styles.continueBtnText}>Continue</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </Modal>

      <Modal visible={showBanks} transparent animationType="slide" onRequestClose={() => setShowBanks(false)}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={() => setShowBanks(false)} />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + S.base }]}>
          <View style={styles.handle} />
          <Text style={styles.sheetTitle}>Select Bank</Text>
          <ScrollView style={{ maxHeight: 360 }} showsVerticalScrollIndicator={false}>
            {banks.map((b) => (
              <TouchableOpacity
                key={b.code + b.name}
                style={styles.bankRow}
                activeOpacity={0.7}
                onPress={() => { setBank(b); setShowBanks(false); }}
              >
                {b.logo ? <Image source={{ uri: b.logo }} style={styles.bankLogo} /> : null}
                <Text style={[styles.bankRowText, bank?.code === b.code && { color: C.primary, fontWeight: "800" }]}>{b.name}</Text>
                {bank?.code === b.code && <Ionicons name="checkmark" size={20} color={C.primary} />}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </Modal>

      <PaymentAuthSheet
        key={authSheetKey}
        visible={showAuthSheet}
        onClose={() => setShowAuthSheet(false)}
        onForgotPin={goForgotPin}
        onPinAuth={async (pin) => {
          setShowAuthSheet(false);
          setProcessing(true);
          try {
            const userRes = await api.getUserProfile();
            const u = userRes.data?.user || userRes.data || {};
            const verifyRes = await api.verifyPin(u.phone || "", pin);
            if (!verifyRes.success) {
              setProcessing(false);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
              setShowPinError(true);
              return;
            }
            setProcessing(false);
            await processWithdraw({ pin });
          } catch (err) {
            setProcessing(false);
            fail("Network error. Please try again.");
          }
        }}
        onBiometricAuth={async () => {
          const txnId = "RWD-" + Date.now() + "-" + Math.random().toString(36).substring(2, 8);
          const txnData = JSON.stringify({
            method: withdrawMethod,
            amount: withdrawAmount,
            bankCode: withdrawMethod === "bank" ? bank?.code : undefined,
            accountNumber: withdrawMethod === "bank" ? accountNumber : undefined,
          });
          const { signature, transactionId, transactionData } = await signTransaction(txnId, txnData);
          if (!signature) return false;
          await processWithdraw({ signature, transactionId, transactionData });
          return true;
        }}
      />

      <PinErrorModal
        visible={showPinError}
        onTryAgain={() => { setShowPinError(false); setAuthSheetKey((k) => k + 1); setShowAuthSheet(true); }}
        onForgotPin={goForgotPin}
      />

      <BiometricPrompt visible={showBioPrompt} onClose={() => setShowBioPrompt(false)} />
      <ProcessingOverlay visible={processing} message="Processing..." />
    </View>
  );
}

const styles = withPayStyles(StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  header: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingHorizontal: S.xl, paddingVertical: S.base,
  },
  headerTitle: { fontSize: F.lg, fontWeight: "800", color: C.white },
  scroll: { padding: S.lg },

  grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" },

  card: {
    backgroundColor: C.white, borderRadius: R.md, padding: S.base,
    marginTop: S.sm, borderWidth: 1, borderColor: C.border,
  },
  cardTitle: { fontSize: F.md, fontWeight: "800", color: C.text, marginBottom: S.sm },

  linkRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    gap: S.sm,
  },
  linkText: { flex: 1, fontSize: F.xs, color: C.textMuted },
  copyBtn: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: C.primaryLight, borderRadius: R.xs,
    paddingHorizontal: S.md, paddingVertical: S.sm,
  },
  copyBtnText: { fontSize: F.xs, fontWeight: "700", color: C.primary },
  codeChip: {
    backgroundColor: C.primaryLight, borderRadius: R.xs,
    paddingHorizontal: S.md, paddingVertical: S.sm, borderWidth: 1, borderColor: C.primary + "33",
  },
  codeText: { fontSize: F.md, fontWeight: "900", color: C.primary, letterSpacing: 1.5 },

  shareBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: S.sm,
    backgroundColor: C.primary, borderRadius: R.md, paddingVertical: S.base + 2,
    marginTop: S.sm,
  },
  shareBtnText: { fontSize: F.md, fontWeight: "800", color: C.white },

  stepRow: { flexDirection: "row", alignItems: "flex-start", gap: S.sm, marginTop: S.sm },
  stepNum: {
    width: 22, height: 22, borderRadius: 11, backgroundColor: C.primaryLight,
    alignItems: "center", justifyContent: "center", marginTop: 1,
  },
  stepNumText: { fontSize: F.xs, fontWeight: "800", color: C.primary },
  stepText: { flex: 1, fontSize: F.sm, color: C.textMuted, lineHeight: 18 },

  commissionRow: { flexDirection: "row", alignItems: "flex-start", gap: S.sm },
  commissionIcon: {
    width: 40, height: 40, borderRadius: R.sm, backgroundColor: C.primaryLight,
    alignItems: "center", justifyContent: "center",
  },
  commissionValue: { fontSize: F.md, fontWeight: "800", color: C.text },
  commissionNote: { fontSize: F.xs, color: C.textMuted, marginTop: 2, lineHeight: 16 },

  rateRow: { flexDirection: "row", alignItems: "center", gap: S.sm, paddingVertical: S.sm + 2 },
  rateRowDivider: { borderBottomWidth: 1, borderBottomColor: C.border },
  rateIcon: {
    width: 32, height: 32, borderRadius: R.xs, alignItems: "center", justifyContent: "center",
  },
  rateLabel: { flex: 1, fontSize: F.sm, fontWeight: "700", color: C.text },
  rateBadge: {
    backgroundColor: C.primaryLight, borderRadius: R.xs,
    paddingHorizontal: S.md, paddingVertical: 4,
  },
  rateBadgeText: { fontSize: F.sm, fontWeight: "900", color: C.primary },

  emptyText: { fontSize: F.sm, color: C.textMuted, textAlign: "center", paddingVertical: S.md },
  earnRow: {
    flexDirection: "row", alignItems: "center", gap: S.sm,
    paddingVertical: S.sm, borderBottomWidth: 1, borderBottomColor: C.border,
  },
  earnAvatar: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: C.primaryLight,
    alignItems: "center", justifyContent: "center",
  },
  earnAvatarText: { fontSize: F.sm, fontWeight: "800", color: C.primary },
  earnName: { fontSize: F.sm, fontWeight: "700", color: C.text },
  productRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 1 },
  earnProduct: { fontSize: 11, color: C.textMuted, fontWeight: "600" },
  earnDate: { fontSize: 10, color: C.textLight, marginTop: 1 },
  earnAmount: { fontSize: F.sm, fontWeight: "800", color: C.credit },
  paidChip: {
    backgroundColor: C.credit + "15", borderRadius: R.xs,
    paddingHorizontal: 6, paddingVertical: 2, marginTop: 3,
  },
  paidText: { fontSize: 9, fontWeight: "700", color: C.credit },

  footer: {
    position: "absolute", left: 0, right: 0, bottom: 0,
    backgroundColor: C.white, borderTopWidth: 1, borderTopColor: C.border,
    paddingHorizontal: S.lg, paddingTop: S.md,
  },
  withdrawBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: S.sm,
    backgroundColor: C.primary, borderRadius: R.md, paddingVertical: S.base + 2,
  },
  withdrawBtnText: { fontSize: F.lg, fontWeight: "800", color: C.white },
  minWithdrawNote: {
    fontSize: F.xs, color: C.textMuted, textAlign: "center", marginTop: S.xs, fontWeight: "600",
  },

  backdrop: { flex: 1, backgroundColor: C.overlay },
  sheet: {
    backgroundColor: C.white, borderTopLeftRadius: R.xl, borderTopRightRadius: R.xl,
    paddingHorizontal: S.xl, paddingTop: S.sm,
  },
  handle: {
    width: 40, height: 4, borderRadius: 2, backgroundColor: C.border,
    alignSelf: "center", marginBottom: S.base,
  },
  sheetTitle: { fontSize: F.xxl, fontWeight: "900", color: C.text },
  sheetSubtitle: { fontSize: F.sm, color: C.textMuted, marginTop: 2, marginBottom: S.xs },
  sheetOption: {
    flexDirection: "row", alignItems: "center", gap: S.md,
    backgroundColor: C.white, borderRadius: R.md, padding: S.base,
    marginTop: S.sm, borderWidth: 1, borderColor: C.border,
  },
  sheetOptionIcon: {
    width: 40, height: 40, borderRadius: R.sm, backgroundColor: C.primaryLight,
    alignItems: "center", justifyContent: "center",
  },
  sheetOptionTitle: { fontSize: F.md, fontWeight: "800", color: C.text },
  sheetOptionDesc: { fontSize: F.xs, color: C.textMuted, marginTop: 2 },

  formHeader: { flexDirection: "row", alignItems: "center", gap: S.sm },
  formBack: { padding: 2 },
  fieldLabel: { fontSize: F.xs, fontWeight: "700", color: C.textMuted, marginTop: S.sm, marginBottom: 6 },
  amountWrap: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: C.inputBg, borderRadius: R.sm, borderWidth: 1, borderColor: C.border,
    paddingHorizontal: S.md,
  },
  amountPrefix: { fontSize: F.xl, fontWeight: "800", color: C.text },
  amountInput: { flex: 1, fontSize: F.xl, fontWeight: "800", color: C.text, paddingVertical: S.md, marginLeft: S.sm },
  pickerInput: {
    flexDirection: "row", alignItems: "center", gap: S.sm,
    backgroundColor: C.inputBg, borderRadius: R.sm, borderWidth: 1, borderColor: C.border,
    paddingHorizontal: S.md, paddingVertical: S.md,
  },
  pickerText: { flex: 1, fontSize: F.md, fontWeight: "600", color: C.text },
  pickerPlaceholder: { color: C.textMuted, fontWeight: "400" },
  input: {
    backgroundColor: C.inputBg, borderRadius: R.sm, borderWidth: 1, borderColor: C.border,
    paddingHorizontal: S.md, paddingVertical: S.md, fontSize: F.md, color: C.text,
  },
  bankLogo: { width: 22, height: 22, borderRadius: 11 },
  resolvingText: { fontSize: F.xs, color: C.textMuted, marginTop: 6 },
  resolvedRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 6 },
  resolvedName: { fontSize: F.sm, fontWeight: "700", color: C.credit },

  continueBtn: {
    backgroundColor: C.primary, borderRadius: R.md, paddingVertical: S.base + 2,
    alignItems: "center", marginTop: S.lg,
  },
  continueBtnText: { fontSize: F.lg, fontWeight: "800", color: C.white },

  bankRow: {
    flexDirection: "row", alignItems: "center", gap: S.sm,
    paddingVertical: S.md, borderBottomWidth: 1, borderBottomColor: C.border,
  },
  bankRowText: { flex: 1, fontSize: F.md, fontWeight: "600", color: C.text },
}));

const figma = StyleSheet.create({
  hero: { flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 26, padding: 22, marginBottom: 16, overflow: "hidden" },
  blob: { position: "absolute", width: 190, height: 190, borderRadius: 95, top: -40, right: -50, backgroundColor: "rgba(255,255,255,0.08)" },
  spark: { position: "absolute", color: "#FFD36B", fontSize: 14, fontWeight: "800" },
  heroTitle: { fontSize: 24, fontWeight: "900", color: "#FFFFFF" },
  heroSub: { fontSize: 13, color: C.onPrimaryMuted, marginTop: 8, lineHeight: 19, fontWeight: "600" },
  trophy: { width: 84, height: 84, borderRadius: 42, backgroundColor: C.gold, alignItems: "center", justifyContent: "center" },
});
const _shadow = { shadowColor: "#1A2680", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.07, shadowRadius: 18, elevation: 2, borderWidth: 0 };
[["card", { borderRadius: 24, ..._shadow }], ["shareBtn", { borderRadius: 16, paddingVertical: 15 }], ["withdrawBtn", { borderRadius: 18, paddingVertical: 16 }],
 ["codeText", { fontSize: 26, fontWeight: "900" }], ["cardValue", { fontSize: 22, fontWeight: "900" }], ["stepNum", { backgroundColor: C.primaryLight }], ["sheet", { borderTopLeftRadius: 32, borderTopRightRadius: 32 }],
 ["continueBtn", { borderRadius: 18, paddingVertical: 16 }]].forEach(([k, v]) => { if (styles[k]) styles[k] = [styles[k], v]; });

const rfShadow = { shadowColor: "#1A2680", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.07, shadowRadius: 18, elevation: 2 };
const rf = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 24, paddingVertical: 12 },
  back: { width: 40, height: 40, borderRadius: 20, backgroundColor: C.white, alignItems: "center", justifyContent: "center", ...rfShadow },
  headerTitle: { fontSize: 18, fontWeight: "800", color: C.text },
  hero: { flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 26, padding: 22, marginTop: 8, overflow: "hidden" },
  heroBlob: { position: "absolute", width: 190, height: 190, borderRadius: 95, top: -40, right: -50, backgroundColor: "rgba(255,255,255,0.08)" },
  heroTitle: { fontSize: 24, fontWeight: "900", color: C.white },
  heroSub: { fontSize: 13, color: C.onPrimaryMuted, marginTop: 8, lineHeight: 19, fontWeight: "600" },
  trophy: { width: 84, height: 84, borderRadius: 42, backgroundColor: C.gold, alignItems: "center", justifyContent: "center" },
  card: { backgroundColor: C.white, borderRadius: 24, padding: 20, marginTop: 16, ...rfShadow },
  muted: { fontSize: 13, color: C.textMuted, fontWeight: "500" },
  codeRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 6 },
  code: { fontSize: 26, fontWeight: "900", color: C.text },
  copyBtn: { width: 44, height: 44, borderRadius: 14, backgroundColor: C.primaryLight, alignItems: "center", justifyContent: "center" },
  shareBtn: { backgroundColor: C.primary, borderRadius: 16, height: 50, alignItems: "center", justifyContent: "center", marginTop: 16 },
  shareText: { fontSize: 15, fontWeight: "800", color: C.white },
  section: { fontSize: 16, fontWeight: "800", color: C.text, marginTop: 24, marginBottom: 12 },
  grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", rowGap: 10 },
  statWrap: { width: "48.5%" },
  stat: { backgroundColor: C.white, borderRadius: 20, padding: 14, height: 86, justifyContent: "space-between", ...rfShadow },
  statTop: { flexDirection: "row", alignItems: "center", gap: 8 },
  statIcon: { width: 32, height: 32, borderRadius: 10, backgroundColor: C.primaryLight, alignItems: "center", justifyContent: "center" },
  statLabel: { fontSize: 12, color: C.textMuted, fontWeight: "500", flex: 1 },
  statValue: { fontSize: 20, fontWeight: "900" },
  available: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: C.gold + "24", borderRadius: 18, paddingHorizontal: 20, height: 56, marginTop: 16 },
  availableText: { fontSize: 15, fontWeight: "800", color: C.text },
  withdraw: { backgroundColor: C.primary, borderRadius: 12, paddingHorizontal: 18, height: 34, justifyContent: "center" },
  withdrawText: { fontSize: 13, fontWeight: "800", color: C.white },
  historyRow: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: C.white, borderRadius: 16, paddingHorizontal: 12, height: 52, marginBottom: 8 },
  initial: { width: 30, height: 30, borderRadius: 15, backgroundColor: C.primary + "1F", alignItems: "center", justifyContent: "center" },
  initialText: { fontSize: 13, fontWeight: "800", color: C.primary },
  historyText: { flex: 1, fontSize: 14, fontWeight: "600", color: C.text },
  historyAmount: { fontSize: 14, fontWeight: "800", color: C.credit },
  step: { flexDirection: "row", gap: 14, marginBottom: 18 },
  stepNum: { width: 32, height: 32, borderRadius: 16, backgroundColor: C.primary + "1F", alignItems: "center", justifyContent: "center" },
  stepNumText: { fontSize: 14, fontWeight: "800", color: C.primary },
  stepTitle: { fontSize: 14, fontWeight: "800", color: C.text },
  stepSub: { fontSize: 12, color: C.textMuted, marginTop: 2 },
  rateRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 12 },
  rateDivider: { borderTopWidth: 1, borderTopColor: "#EEF0F7" },
  rateLabel: { fontSize: 14, fontWeight: "600", color: C.text },
  rateValue: { fontSize: 14, fontWeight: "800", color: C.primary },
});

// Withdraw Bonus sheets (choose method, Transfer to Wallet, Transfer to Bank) in the new design language.
const _wd = { shadowColor: "#1A2680", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.07, shadowRadius: 14, elevation: 2 };
[
  ["backdrop", { backgroundColor: "rgba(5,10,36,0.6)" }],
  ["sheet", { borderTopLeftRadius: 32, borderTopRightRadius: 32, paddingHorizontal: 24, paddingTop: 12, paddingBottom: 44, backgroundColor: C.bg }],
  ["handle", { width: 48, height: 5, borderRadius: 3, backgroundColor: "#D5DAEB", marginBottom: 18 }],
  ["sheetTitle", { fontSize: 22, fontWeight: "900" }],
  ["sheetSubtitle", { fontSize: 14, marginTop: 4, marginBottom: 14 }],
  ["sheetOption", { backgroundColor: C.white, borderRadius: 20, padding: 16, borderWidth: 0, marginTop: 10, ..._wd }],
  ["sheetOptionIcon", { width: 48, height: 48, borderRadius: 16, backgroundColor: C.primary + "1A" }],
  ["sheetOptionTitle", { fontSize: 16 }],
  ["sheetOptionDesc", { fontSize: 12, marginTop: 3 }],
  ["formBack", { width: 40, height: 40, borderRadius: 20, backgroundColor: C.white, alignItems: "center", justifyContent: "center", ..._wd }],
  ["fieldLabel", { fontSize: 13, fontWeight: "700", marginTop: 16, marginBottom: 8 }],
  ["amountWrap", { backgroundColor: C.white, borderRadius: 18, borderWidth: 0, paddingHorizontal: 20, height: 64, ..._wd }],
  ["amountPrefix", { fontSize: 22, color: C.primary }],
  ["amountInput", { fontSize: 24, fontWeight: "900" }],
  ["pickerInput", { backgroundColor: C.white, borderRadius: 16, borderWidth: 0, height: 54, paddingHorizontal: 18, ..._wd }],
  ["input", { backgroundColor: C.white, borderRadius: 16, borderWidth: 0, height: 54, paddingHorizontal: 18, fontSize: 15, ..._wd }],
  ["resolvedRow", { alignSelf: "flex-start", backgroundColor: C.credit + "1A", borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, marginTop: 10 }],
  ["resolvedName", { fontSize: 13, fontWeight: "800" }],
  ["continueBtn", { borderRadius: 18, height: 56, paddingVertical: 0, justifyContent: "center", marginTop: 22, shadowColor: C.primary, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.25, shadowRadius: 16, elevation: 4 }],
  ["continueBtnText", { fontSize: 16 }],
  ["bankRow", { borderRadius: 14, paddingHorizontal: 12 }],
].forEach(([k, v]) => { if (styles[k]) styles[k] = [styles[k], v]; });
