import { withPayStyles } from "../../components/payStyles";
import PaymentSummary from "../../components/PaymentSummary";
import { ServiceHeader, Label, SegTabs, PayBar, ui } from "../../components/ServiceUI";
import React, { useState, useEffect } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Modal, Image, StatusBar, ActivityIndicator, Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { C, F, R, S } from "../../utils/theme";
import { fmt, fmtShort } from "../../utils/format";
import api from "../../services/api";
import { enrichProviders, getCableLogo } from "../../utils/logos";
import PaymentAuthSheet from "../../components/PaymentAuthSheet";
import ProcessingOverlay from "../../components/ProcessingOverlay";
import Preloader from "../../components/Preloader";
import ServiceBanner from "../../components/ServiceBanner";
import BeneficiaryBox from "../../components/BeneficiaryBox";
import BiometricPrompt, { shouldPromptBiometric } from "../../components/BiometricPrompt";
import PinErrorModal from "../../components/PinErrorModal";
import { Biometrics } from "../../utils/biometrics";
import { BiometricCrypto } from "../../services/biometric";
import { SecurePin } from "../../utils/storage";
import Toast from "../../components/Toast";

async function signTransaction(txnId, txnData) {
  const auth = await BiometricCrypto.authenticate();
  if (!auth.success) return { signature: null };
  const challengeRes = await api.requestChallenge(txnId, txnData);
  if (!challengeRes.success) { Alert.alert("Error", challengeRes.message || "Failed to get challenge"); return { signature: null }; }
  const signature = await BiometricCrypto.signChallenge(challengeRes.data.challenge);
  return { signature, transactionId: txnId, transactionData: txnData };
}

export default function CableTvScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [providers, setProviders] = useState([]);
  const [provider, setProvider] = useState(null);
  const [smartcard, setSmartcard] = useState("");
  const [plans, setPlans] = useState([]);
  const [plan, setPlan] = useState(null);
  // Open the design receipt (share as image / PDF) right after a successful payment.
  function goReceipt() {
    const now = new Date();
    navigation.replace("Receipt", { tx: {
      id: `R${now.getTime()}`, reference: `SB${now.getTime()}`, category: "cable", type: "debit", status: "success",
      amount: plan?.amount, description: `${provider?.name || ""} ${plan?.name || ""} - ${smartcard}`, date: now.toISOString().slice(0, 10), time: now.toTimeString().slice(0, 5),
      token: "cable" === "electricity" ? "4821-0937-1156-7720-3349" : undefined,
    } });
  }
  const [verified, setVerified] = useState(null);
  const [showProvider, setShowProvider] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showAuthSheet, setShowAuthSheet] = useState(false);
  const [authSheetKey, setAuthSheetKey] = useState(0);
  const [processing, setProcessing] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [balance, setBalance] = useState(0);
  const [bioReady, setBioReady] = useState(false);
  const [bioLabel, setBioLabel] = useState("Fingerprint");
  const [showBioPrompt, setShowBioPrompt] = useState(false);
  const [showPinError, setShowPinError] = useState(false);
  const [toastMsg, setToastMsg] = useState("");
  const [toastType, setToastType] = useState("error");

  const showToast = (msg, type = "error") => { setToastType(type); setToastMsg(msg); };
  const fail = (msg) => { setError(msg); showToast(msg, "error"); };

  useEffect(() => {
    loadData();
    Promise.all([Biometrics.isAvailable(), Biometrics.isEnabled()]).then(([a, e]) => {
      setBioReady(a && e);
    });
    Biometrics.label().then(setBioLabel);
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      console.log("[Cable] Loading...");
      const [providersRes, walletRes] = await Promise.all([
        api.getCableProviders(),
        api.getWalletBalance(),
      ]);

      console.log("[Cable] Providers:", providersRes.success, providersRes.data?.length);

      if (providersRes.success && providersRes.data) {
        const enriched = enrichProviders(providersRes.data, getCableLogo);
        setProviders(enriched);
        if (enriched.length > 0) {
          setProvider(enriched[0]);
          loadPlans(enriched[0].id);
        }
      }

      if (walletRes.success && walletRes.data) {
        setBalance(walletRes.data.balance || 0);
      }
    } catch (err) {
      console.error("[Cable] Load error:", err);
    } finally {
      setLoading(false);
    }
  };

  const loadPlans = async (providerId) => {
    try {
      console.log("[Cable] Loading plans for:", providerId);
      const result = await api.getCablePlans(providerId);
      console.log("[Cable] Plans:", result.success, result.data?.length);
      if (result.success && result.data) {
        setPlans(result.data);
      } else {
        setPlans([]);
      }
    } catch (err) {
      console.error("[Cable] Plans error:", err);
      setPlans([]);
    }
  };

  const handleProvider = (p) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setProvider(p);
    setPlan(null);
    setVerified(null);
    setShowProvider(false);
    loadPlans(p.id);
  };

  const handleVerify = async () => {
    if (verifying) return;
    if (!provider) return setError("Select a provider");
    if (!smartcard || smartcard.length < 8) return setError("Enter a valid smartcard number");
    setError("");
    setVerified(null);
    setVerifying(true);
    console.log("[Cable] Verifying smartcard:", provider.id, smartcard);
    try {
      await api.init();
      const result = await api.verifySmartcard(provider.id, smartcard);
      console.log("[Cable] Verify result:", result.success, result.data);
      if (result.success && result.data) {
        const rawName = (result.data.customerName || "").trim();
        const genericNames = ["customer", "unknown", "n/a", ""];
        const isGeneric = genericNames.includes(rawName.toLowerCase());
        setVerified({
          ...result.data,
          customerName: isGeneric ? "Smartcard not found" : rawName,
          notFound: isGeneric,
        });
      } else {
        fail(result.message || "Verification failed. Please check the smartcard number.");
      }
    } catch (err) {
      fail("Network error. Please try again.");
    } finally {
      setVerifying(false);
    }
  };

  const handleBuy = () => {
    if (!verified) return setError("Verify smartcard first");
    if (!plan) return setError("Select a plan");
    if (balance < plan.amount) return fail("Insufficient wallet balance");
    setError("");
    setShowConfirm(true);
  };

  const handleConfirmBuy = () => {
    setShowConfirm(false);
    setShowAuthSheet(true);
  };

  const handlePinAuth = (pinValue) => {
    verifyAndPurchase(pinValue);
  };

  const handleBiometricAuth = async () => {
    const txnId = "CBL-" + Date.now() + "-" + Math.random().toString(36).substring(2, 8);
    const txnData = JSON.stringify({ provider: provider?.id, smartcardNumber: smartcard, planId: plan?.id, amount: plan?.amount });
    const { signature, transactionId, transactionData } = await signTransaction(txnId, txnData);
    if (!signature) return false;
    setShowAuthSheet(false);
    setProcessing(true);
    try {
      const result = await api.purchaseCable({
        provider: provider?.id,
        smartcardNumber: smartcard,
        planId: plan?.id,
        amount: plan?.amount,
        signature,
        transactionId,
        transactionData,
      });
      console.log("[Cable] Purchase result:", result.success, result.message);
      if (result.success) {
        setSuccess(true); goReceipt();
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        if (await shouldPromptBiometric()) setShowBioPrompt(true);
      } else {
        fail(result.message || "Transaction failed. Please try again.");
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    } catch (err) {
      fail("Network error. Please try again.");
    } finally {
      setProcessing(false);
    }
    return true;
  };

  const verifyAndPurchase = async (pinValue) => {
    setShowAuthSheet(false);
    setProcessing(true);

    try {
      console.log("[Cable] Verifying PIN...");
      const userRes = await api.getUserProfile();
      const userPhone = userRes.data?.phone || userRes.data?.user?.phone || "";
      const verifyRes = await api.verifyPin(userPhone, pinValue);
      console.log("[Cable] PIN verify:", verifyRes.success, verifyRes.message);

      if (!verifyRes.success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        setProcessing(false);
        setShowPinError(true);
        return;
      }

      console.log("[Cable] Purchasing:", provider?.id, smartcard, plan?.id, plan?.amount);
      const result = await api.purchaseCable({
        provider: provider?.id,
        smartcardNumber: smartcard,
        planId: plan?.id,
        amount: plan?.amount,
        pin: pinValue,
      });

      console.log("[Cable] Purchase result:", result.success, result.message);
      if (result.success) {
        setSuccess(true); goReceipt();
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        if (await shouldPromptBiometric()) setShowBioPrompt(true);
      } else {
        fail(result.message || "Transaction failed. Please try again.");
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
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
    navigation.navigate("ForgotPassword", { mode: "pin", phone: p });
  };

  if (loading) return <Preloader />;

  if (success) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />
        <View style={[styles.header]}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={22} color={C.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Cable TV</Text>
          <View style={{ width: 22 }} />
        </View>
        <View style={styles.successWrap}>
          <View style={styles.successIconWrap}>
            <Ionicons name="checkmark" size={40} color={C.white} />
          </View>
          <Text style={styles.successTitle}>Subscription Successful!</Text>
          <Text style={styles.successAmount}>{fmt(plan?.amount)}</Text>
          <Text style={styles.successDesc}>{provider?.name} \u00B7 {plan?.name}</Text>
          <View style={styles.successDetails}>
            <View style={styles.successDetailRow}>
              <Text style={styles.successDetailLabel}>Provider</Text>
              <Text style={styles.successDetailValue}>{provider?.name}</Text>
            </View>
            <View style={styles.successDetailRow}>
              <Text style={styles.successDetailLabel}>Plan</Text>
              <Text style={styles.successDetailValue}>{plan?.name}</Text>
            </View>
            <View style={[styles.successDetailRow, { borderBottomWidth: 0 }]}>
              <Text style={styles.successDetailLabel}>IUC Number</Text>
              <Text style={styles.successDetailValue}>{smartcard}</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.doneBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.doneBtnText}>Done</Text>
          </TouchableOpacity>
        </View>
        <BiometricPrompt visible={showBioPrompt} onClose={() => setShowBioPrompt(false)} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />
      <Toast message={toastMsg} type={toastType} onHide={() => setToastMsg("")} />
      <ServiceHeader title="Cable TV" onBack={() => navigation.goBack()} />

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 120 + insets.bottom }} keyboardShouldPersistTaps="handled">
        <View style={{ marginTop: 8 }}>
          <SegTabs items={providers.map((p) => p.name)} value={provider?.name} onChange={(name) => { const p = providers.find((x) => x.name === name); if (p) handleProvider(p); }} />
        </View>

        <View style={[ui.field, { marginTop: 18 }]}>
          <TextInput style={ui.input} value={smartcard} onChangeText={setSmartcard} placeholder="Smartcard / IUC number" placeholderTextColor={C.textLight} keyboardType="number-pad" maxLength={15} />
          {smartcard.length >= 5 && !verified ? (
            <TouchableOpacity onPress={handleVerify} disabled={verifying} style={cb.verify}>
              {verifying ? <ActivityIndicator size="small" color={C.white} /> : <Text style={cb.verifyText}>Verify</Text>}
            </TouchableOpacity>
          ) : null}
        </View>
        {verified ? (
          <View style={cb.verified}>
            <Text style={cb.verifiedTop}>✓ Verified</Text>
            <Text style={cb.verifiedName}>{verified.customerName || verified.name}{verified.currentPlan ? ` · ${verified.currentPlan}` : ""}</Text>
          </View>
        ) : null}

        <Text style={ui.label}>Choose a plan</Text>
        <View style={ui.grid}>
          {plans.map((p) => {
            const on = plan?.id === p.id;
            const Card = on ? LinearGradient : View;
            return (
              <TouchableOpacity key={p.id} style={{ width: "48.5%" }} activeOpacity={0.85} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setPlan(p); }}>
                <Card {...(on ? { colors: [C.primary, C.primaryDark], start: { x: 0, y: 0 }, end: { x: 1, y: 1 } } : {})} style={cb.card}>
                  <Text style={[cb.name, on && { color: C.white }]} numberOfLines={1}>{String(p.name).replace(/^(DStv|GOtv|Dstv|Gotv)\s+/i, "")}</Text>
                  <Text style={[cb.price, on && { color: C.gold }]}>{fmtShort(p.amount)}</Text>
                  <Text style={[cb.days, on && { color: C.onPrimaryMuted }]}>{p.validity || "30 days"}</Text>
                </Card>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={ui.note}>Wallet balance: {fmt(balance)}</Text>
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </ScrollView>

      <PayBar
        label={plan ? `${verified ? "Pay" : "Verify & Pay"} ${fmtShort(plan.amount)}` : "Select a plan to continue"}
        onPress={verified ? handleBuy : handleVerify}
        disabled={!plan || smartcard.length < 5 || verifying}
      />


      <Modal visible={showProvider} transparent animationType="slide">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowProvider(false)}>
          <View style={styles.modalSheet}>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
            <Text style={styles.modalTitle}>Select Provider</Text>
            {providers.map((p) => (
              <TouchableOpacity key={p.id} style={styles.modalItem} onPress={() => handleProvider(p)}>
                <View style={styles.modalItemRow}>
                  {p.logo ? (
                    <Image source={p.logo} style={styles.modalLogo} />
                  ) : (
                    <View style={[styles.modalLogo, { backgroundColor: C.inputBg, alignItems: "center", justifyContent: "center" }]}>
                      <Ionicons name="tv-outline" size={20} color={C.textMuted} />
                    </View>
                  )}
                  <Text style={styles.modalItemText}>{p.name}</Text>
                </View>
                {provider?.id === p.id && <Ionicons name="checkmark" size={20} color={C.primary} />}
              </TouchableOpacity>
            ))}
          </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Confirmation Modal */}
      <PaymentSummary
        visible={showConfirm}
        product="Cable TV"
        subtitle={provider?.name}
        amount={plan?.amount}
        balance={balance}
        rows={[["Provider", provider?.name], ["Plan", plan?.name], ["IUC Number", smartcard]]}
        onCancel={() => setShowConfirm(false)}
        onPay={handleConfirmBuy}
      />

      <PaymentAuthSheet
        subtitle={`Cable TV · ${fmt(plan?.amount)}`}
        key={authSheetKey}
        visible={showAuthSheet}
        onClose={() => setShowAuthSheet(false)}
        onPinAuth={handlePinAuth}
        onBiometricAuth={handleBiometricAuth}
        onForgotPin={goForgotPin}
      />

      <PinErrorModal
        visible={showPinError}
        onTryAgain={() => { setShowPinError(false); setAuthSheetKey((k) => k + 1); setShowAuthSheet(true); }}
        onForgotPin={goForgotPin}
      />

      <ProcessingOverlay visible={processing} message="Processing..." />
    </View>
  );
}

const styles = withPayStyles(StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: S.xl, paddingVertical: S.base },
  headerTitle: { fontSize: F.lg, fontWeight: "800", color: C.white },
  scroll: { padding: S.xl },
  label: { fontSize: F.sm, fontWeight: "600", color: C.text, marginBottom: 6, marginTop: S.md },

  comboRow: {
    flexDirection: "row", alignItems: "center", gap: S.sm,
    backgroundColor: C.inputBg, borderWidth: 1, borderColor: C.border,
    borderRadius: R.sm, paddingHorizontal: S.sm, paddingVertical: S.xs,
  },
  providerLogoBtn: {
    width: 44, height: 44, borderRadius: R.sm, backgroundColor: C.white,
    alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: C.border,
  },
  providerLogo: { width: 32, height: 32, borderRadius: 16 },
  providerLogoPlaceholder: { alignItems: "center", justifyContent: "center" },
  smartcardInputWrap: { flex: 1 },
  smartcardInput: {
    backgroundColor: C.white, borderWidth: 1, borderColor: C.border,
    borderRadius: R.sm, paddingHorizontal: S.base, paddingVertical: S.md,
    fontSize: F.base, color: C.text,
  },

  verifyBtnSolid: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    backgroundColor: C.primary, borderRadius: R.sm,
    paddingVertical: S.md + 2, marginTop: S.md,
    shadowColor: C.primary, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 6, elevation: 4,
  },
  verifyBtnSolidText: { fontSize: F.md, color: C.white, fontWeight: "800" },
  verifiedCard: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: C.credit + "15", borderRadius: R.sm, padding: S.md, marginTop: S.sm,
  },
  verifiedName: { fontSize: F.md, fontWeight: "700", color: C.text },
  verifiedPlan: { fontSize: F.sm, color: C.textMuted, marginTop: 2 },

  planGrid: { flexDirection: "row", flexWrap: "wrap", gap: S.sm, marginTop: S.xs },
  planCard: {
    width: "31%", backgroundColor: C.inputBg, borderWidth: 1, borderColor: C.border,
    borderRadius: R.sm, padding: S.sm, alignItems: "center",
  },
  planCardActive: { backgroundColor: C.primary, borderColor: C.primary },
  planName: { fontSize: 12, fontWeight: "700", color: C.text, textAlign: "center" },
  planAmount: { fontSize: 12, fontWeight: "700", color: C.primary, marginTop: 4 },
  planValidity: { fontSize: 10, color: C.textMuted, marginTop: 2 },

  balance: { fontSize: F.sm, color: C.textMuted, marginTop: S.base, textAlign: "center" },
  error: { fontSize: F.sm, color: C.debit, textAlign: "center", marginTop: S.sm },
  btn: { backgroundColor: C.primary, borderRadius: R.sm, paddingVertical: S.md + 2, alignItems: "center", marginTop: 0 },
  btnInactive: { backgroundColor: C.inputBg, borderWidth: 1.5, borderColor: C.border },
  btnText: { color: C.white, fontSize: F.lg, fontWeight: "700" },
  btnTextInactive: { color: C.textMuted, fontSize: F.lg, fontWeight: "600" },
  buyBar: {
    position: "absolute", left: 0, right: 0, bottom: 0,
    paddingHorizontal: S.lg, paddingTop: S.sm,
    paddingBottom: S.md, backgroundColor: C.white,
    borderTopWidth: 1, borderTopColor: C.border,
  },

  modalOverlay: { flex: 1, backgroundColor: C.overlay, justifyContent: "flex-end" },
  modalSheet: { backgroundColor: C.white, borderTopLeftRadius: R.xl, borderTopRightRadius: R.xl, padding: S.xl },
  modalTitle: { fontSize: F.lg, fontWeight: "800", color: C.text, marginBottom: S.base },
  modalItem: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: S.md, borderBottomWidth: 1, borderBottomColor: C.border },
  modalItemRow: { flexDirection: "row", alignItems: "center", gap: S.md },
  modalLogo: { width: 36, height: 36, borderRadius: 18 },
  modalItemText: { fontSize: F.base, fontWeight: "600", color: C.text },

  confirmOverlay: { flex: 1, backgroundColor: C.overlay, justifyContent: "center", padding: S.xl },
  confirmSheet: { backgroundColor: C.white, borderRadius: R.lg, padding: S.xl },
  confirmTitle: { fontSize: F.lg, fontWeight: "800", color: C.text, textAlign: "center", marginBottom: S.base },
  confirmDetails: { borderWidth: 1, borderColor: C.border, borderRadius: R.sm, overflow: "hidden" },
  confirmRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 10, paddingHorizontal: S.base, borderBottomWidth: 1, borderBottomColor: C.border },
  confirmLabel: { fontSize: 13, color: C.textMuted },
  confirmValue: { fontSize: 13, fontWeight: "700", color: C.text },
  confirmActions: { flexDirection: "row", gap: S.sm, marginTop: S.lg },
  confirmCancel: { flex: 1, borderWidth: 1, borderColor: C.border, borderRadius: R.sm, paddingVertical: S.md, alignItems: "center" },
  confirmCancelText: { fontSize: F.md, fontWeight: "600", color: C.textMuted },
  confirmBtn: { flex: 1, backgroundColor: C.primary, borderRadius: R.sm, paddingVertical: S.md, alignItems: "center" },
  confirmBtnText: { fontSize: F.md, fontWeight: "700", color: C.white },

  successWrap: { flex: 1, alignItems: "center", padding: S.xl, paddingTop: S.xxl },
  successIconWrap: {
    width: 80, height: 80, borderRadius: 40, backgroundColor: C.accent,
    alignItems: "center", justifyContent: "center", marginBottom: S.base,
  },
  successTitle: { fontSize: F.h3, fontWeight: "800", color: C.text, marginTop: S.base, textAlign: "center" },
  successAmount: { fontSize: 36, fontWeight: "900", color: C.primary, letterSpacing: -1 },
  successDesc: { fontSize: F.md, color: C.textMuted, marginTop: S.sm, textAlign: "center", lineHeight: 20 },
  successDetails: {
    width: "100%", backgroundColor: C.white, borderRadius: R.md,
    borderWidth: 1, borderColor: C.border, padding: S.base, marginTop: S.xl,
  },
  successDetailRow: {
    flexDirection: "row", justifyContent: "space-between", paddingVertical: 8,
    borderBottomWidth: 1, borderBottomColor: C.border,
  },
  successDetailLabel: { fontSize: 13, color: C.textMuted },
  successDetailValue: { fontSize: 13, fontWeight: "700", color: C.text },
  doneBtn: {
    width: "100%", backgroundColor: C.primary, borderRadius: R.sm,
    paddingVertical: S.md + 2, alignItems: "center", marginTop: S.xl,
  },
  doneBtnText: { color: C.white, fontSize: F.lg, fontWeight: "700" },
}));

const cb = StyleSheet.create({
  verify: { backgroundColor: C.primary, borderRadius: 12, paddingHorizontal: 14, height: 34, justifyContent: "center" },
  verifyText: { fontSize: 13, fontWeight: "800", color: C.white },
  verified: { marginTop: 12, borderRadius: 16, backgroundColor: C.credit + "1A", padding: 14 },
  verifiedTop: { fontSize: 12, fontWeight: "800", color: C.credit },
  verifiedName: { fontSize: 13, fontWeight: "700", color: C.text, marginTop: 4 },
  card: { height: 100, borderRadius: 22, backgroundColor: C.white, padding: 16, justifyContent: "space-between", shadowColor: "#1A2680", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.07, shadowRadius: 14, elevation: 2 },
  name: { fontSize: 15, fontWeight: "800", color: C.text },
  price: { fontSize: 22, fontWeight: "900", color: C.primary },
  days: { fontSize: 12, fontWeight: "500", color: C.textMuted },
});
