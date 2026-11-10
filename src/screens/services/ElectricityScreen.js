import { withPayStyles } from "../../components/payStyles";
import PaymentSummary from "../../components/PaymentSummary";
import { ServiceHeader, ServiceHero, Label, SegTabs, PayBar, ui } from "../../components/ServiceUI";
import React, { useState, useEffect } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Modal, Image, StatusBar, ActivityIndicator, Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { C, F, R, S } from "../../utils/theme";
import { fmt } from "../../utils/format";
import api from "../../services/api";
import { enrichProviders, getElectricityLogo } from "../../utils/logos";
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

// Smallest electricity payment the wallet and providers accept.
const MIN_AMOUNT = 1000;
const MIN_AMOUNT_LABEL = "\u20A61,000";

async function signTransaction(txnId, txnData) {
  const auth = await BiometricCrypto.authenticate();
  if (!auth.success) return { signature: null };
  const challengeRes = await api.requestChallenge(txnId, txnData);
  if (!challengeRes.success) { Alert.alert("Error", challengeRes.message || "Failed to get challenge"); return { signature: null }; }
  const signature = await BiometricCrypto.signChallenge(challengeRes.data.challenge);
  return { signature, transactionId: txnId, transactionData: txnData };
}

export default function ElectricityScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [providers, setProviders] = useState([]);
  const [provider, setProvider] = useState(null);
  const [meterNumber, setMeterNumber] = useState("");
  // Open the design receipt (share as image / PDF) right after a successful payment.
  function goReceipt() {
    const now = new Date();
    navigation.replace("Receipt", { tx: {
      id: `R${now.getTime()}`, reference: `SB${now.getTime()}`, category: "electricity", type: "debit", status: "success",
      amount: finalAmount, description: `${provider?.name || "Electricity"} - ${meterNumber}`, date: now.toISOString().slice(0, 10), time: now.toTimeString().slice(0, 5),
      token: "electricity" === "electricity" ? "4821-0937-1156-7720-3349" : undefined,
    } });
  }
  const [meterType, setMeterType] = useState("prepaid");
  const [amount, setAmount] = useState("");
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
  const [walletBalance, setWalletBalance] = useState(0);
  const [purchaseData, setPurchaseData] = useState(null);
  const [bioReady, setBioReady] = useState(false);
  const [bioLabel, setBioLabel] = useState("Fingerprint");
  const [showBioPrompt, setShowBioPrompt] = useState(false);
  const [showPinError, setShowPinError] = useState(false);
  const [toastMsg, setToastMsg] = useState("");
  const [toastType, setToastType] = useState("error");

  const showToast = (msg, type = "error") => { setToastType(type); setToastMsg(msg); };
  const fail = (msg) => { setError(msg); showToast(msg, "error"); };

  useEffect(() => {
    Promise.all([Biometrics.isAvailable(), Biometrics.isEnabled()]).then(([a, e]) => {
      setBioReady(a && e);
    });
    Biometrics.label().then(setBioLabel);
    (async () => {
      console.log("[Electricity] Loading...");
      try {
        await api.init();
        const [providersRes, walletRes] = await Promise.all([
          api.getElectricityProviders(),
          api.getWalletBalance(),
        ]);
        console.log("[Electricity] Providers:", providersRes.success, providersRes.data?.length);
        if (providersRes.success && providersRes.data?.length) {
          const enriched = enrichProviders(providersRes.data, getElectricityLogo);
          setProviders(enriched);
          setProvider(enriched[0]);
        }
        if (walletRes.success && walletRes.data) {
          setWalletBalance(walletRes.data.balance);
        }
      } catch (e) {
        console.error("[Electricity] Load error:", e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleProvider = (p) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setProvider(p);
    setVerified(null);
    setShowProvider(false);
  };

  const handleVerify = async () => {
    if (verifying) return;
    if (!provider) return setError("Select a provider");
    if (!meterNumber || meterNumber.length < 8) return setError("Enter a valid meter number");
    setError("");
    setVerified(null);
    setVerifying(true);
    const providerCode = provider.code || provider.id;
    console.log("[Electricity] Verifying meter:", providerCode, meterNumber, meterType);
    try {
      await api.init();
      const res = await api.verifyMeter(providerCode, meterNumber, meterType);
      console.log("[Electricity] Verify result:", res.success, res.data);
      if (res.success && res.data) {
        const rawName = (res.data.customerName || "").trim();
        const genericNames = ["customer", "unknown", "n/a", ""];
        const isGeneric = genericNames.includes(rawName.toLowerCase());
        setVerified({
          name: isGeneric ? "Meter number not found" : rawName,
          address: isGeneric ? "" : (res.data.customerAddress || res.data.address || ""),
          notFound: isGeneric,
        });
      } else {
        fail(res.message || "Verification failed");
      }
    } catch (e) {
      fail("Network error. Please try again.");
    } finally {
      setVerifying(false);
    }
  };

  const finalAmount = Number(amount || 0);

  const canAffordMinimum = walletBalance >= MIN_AMOUNT;

  const handleBuy = () => {
    if (!verified) return setError("Verify meter first");
    if (!canAffordMinimum) return fail(`Minimum electricity purchase is ${MIN_AMOUNT_LABEL}. Please fund your wallet.`);
    if (!amount || finalAmount < MIN_AMOUNT) return setError(`Enter a valid amount (min ${MIN_AMOUNT_LABEL})`);
    if (walletBalance < finalAmount) return fail("Insufficient wallet balance");
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

  const handleBiometricAuth = () => handleBioPurchase();

  const handleBioPurchase = async () => {
    try {
      const transactionId = "ELC-" + Date.now() + "-" + Math.random().toString(36).substring(2, 8);
      const transactionData = JSON.stringify({ provider: provider.code || provider.id, meterNumber, meterType, amount: finalAmount });
      const { signature } = await signTransaction(transactionId, transactionData);
      if (!signature) return false;
      setShowAuthSheet(false);
      setProcessing(true);
      try {
        const res = await api.purchaseElectricity({
          provider: provider.code || provider.id,
          meterNumber,
          meterType,
          amount: finalAmount,
          signature,
          transactionId,
          transactionData,
        });
        if (res.success && res.data) {
          setPurchaseData(res.data);
          setSuccess(true); goReceipt();
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          if (await shouldPromptBiometric()) setShowBioPrompt(true);
        } else {
          fail(res.message || "Purchase failed");
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        }
      } finally {
        setProcessing(false);
      }
      return true;
    } catch (e) {
      return { error: e?.message || "Biometric purchase failed." };
    }
  };

  const verifyAndPurchase = async (enteredPin) => {
    setShowAuthSheet(false);
    setProcessing(true);

    try {
      console.log("[Electricity] Verifying PIN...");
      const userRes = await api.getUserProfile();
      const userPhone = userRes.data?.phone || userRes.data?.user?.phone || "";
      const verifyRes = await api.verifyPin(userPhone, enteredPin);
      console.log("[Electricity] PIN verify:", verifyRes.success, verifyRes.message);

      if (!verifyRes.success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        setProcessing(false);
        setShowPinError(true);
        return;
      }

      console.log("[Electricity] Purchasing:", provider.code || provider.id, meterNumber, meterType, amount);
      const res = await api.purchaseElectricity({
        provider: provider.code || provider.id,
        meterNumber,
        meterType,
        amount: finalAmount,
        pin: enteredPin,
      });
      console.log("[Electricity] Purchase result:", res.success, res.message);
      if (res.success && res.data) {
        setPurchaseData(res.data);
        setSuccess(true); goReceipt();
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        if (await shouldPromptBiometric()) setShowBioPrompt(true);
      } else {
        fail(res.message || "Purchase failed");
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    } catch (e) {
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
          <Text style={styles.headerTitle}>Electricity</Text>
          <View style={{ width: 22 }} />
        </View>
        <View style={styles.successWrap}>
          <View style={styles.successIconWrap}>
            <Ionicons name="checkmark" size={40} color={C.white} />
          </View>
          <Text style={styles.successTitle}>Payment Successful!</Text>
          <Text style={styles.successAmount}>{fmt(finalAmount)}</Text>
          <Text style={styles.successDesc}>{provider?.name} {"\u00B7"} Meter: {meterNumber}</Text>
          <View style={styles.successDetails}>
            <View style={styles.successDetailRow}>
              <Text style={styles.successDetailLabel}>Provider</Text>
              <Text style={styles.successDetailValue}>{provider?.name}</Text>
            </View>
            <View style={styles.successDetailRow}>
              <Text style={styles.successDetailLabel}>Meter</Text>
              <Text style={styles.successDetailValue}>{meterNumber}</Text>
            </View>
            <View style={styles.successDetailRow}>
              <Text style={styles.successDetailLabel}>Amount</Text>
              <Text style={styles.successDetailValue}>{fmt(finalAmount)}</Text>
            </View>
            {purchaseData?.token && (
              <View style={[styles.successDetailRow, { borderBottomWidth: 0 }]}>
                <Text style={styles.successDetailLabel}>Token</Text>
                <Text style={[styles.successDetailValue, { color: C.primary }]}>{purchaseData.token}</Text>
              </View>
            )}
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
      <ServiceHeader title="Electricity" onBack={() => navigation.goBack()} />
      <ServiceHero title="Pay power bills" subtitle="Token delivered instantly" emoji="⚡" />

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 120 + insets.bottom }} keyboardShouldPersistTaps="handled">
        <Label>Disco</Label>
        <TouchableOpacity style={ui.field} onPress={() => setShowProvider(true)} activeOpacity={0.8}>
          <Text style={[ui.input, !provider && { color: C.textLight }]} numberOfLines={1}>{provider?.name || "Select your disco"}</Text>
          <Ionicons name="chevron-down" size={18} color={C.textMuted} />
        </TouchableOpacity>

        <View style={{ marginTop: 18 }}>
          <SegTabs items={["Prepaid", "Postpaid"]} value={meterType === "postpaid" ? "Postpaid" : "Prepaid"} onChange={(t) => setMeterType(t.toLowerCase())} />
        </View>

        <Label>Meter number</Label>
        <View style={ui.field}>
          <TextInput style={ui.input} value={meterNumber} onChangeText={setMeterNumber} placeholder="Meter number" placeholderTextColor={C.textLight} keyboardType="number-pad" maxLength={15} />
          {meterNumber.length >= 5 && !verified ? (
            <TouchableOpacity onPress={handleVerify} disabled={verifying} style={el.verify}>
              {verifying ? <ActivityIndicator size="small" color={C.white} /> : <Text style={el.verifyText}>Verify</Text>}
            </TouchableOpacity>
          ) : null}
        </View>
        {verified ? (
          <View style={el.verified}>
            <Text style={el.verifiedTop}>✓ Verified</Text>
            <Text style={el.verifiedName} numberOfLines={2}>{verified.name}{verified.address ? ` · ${verified.address}` : ""}</Text>
          </View>
        ) : null}

        <Label>Amount</Label>
        <View style={ui.field}>
          <Text style={el.naira}>₦</Text>
          <TextInput style={ui.input} value={amount} onChangeText={setAmount} placeholder="1,000" placeholderTextColor={C.textLight} keyboardType="number-pad" />
        </View>
        <Text style={[ui.note, { textAlign: "left", marginTop: 10 }]}>Min {MIN_AMOUNT_LABEL} · Wallet {fmt(walletBalance)}</Text>
        {!canAffordMinimum ? <Text style={styles.minHint}>Fund your wallet to buy at least {MIN_AMOUNT_LABEL}.</Text> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </ScrollView>

      <PayBar label="Continue" onPress={handleBuy} disabled={!(verified && finalAmount >= MIN_AMOUNT && canAffordMinimum)} />


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
                      <Ionicons name="flash-outline" size={20} color={C.textMuted} />
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
        product="Electricity"
        subtitle={provider?.name}
        amount={finalAmount}
        balance={walletBalance}
        rows={[["Provider", provider?.name], ["Meter Number", meterNumber], ["Meter Type", meterType.charAt(0).toUpperCase() + meterType.slice(1)]]}
        onCancel={() => setShowConfirm(false)}
        onPay={handleConfirmBuy}
      />

      <PaymentAuthSheet
        subtitle={`Electricity · ${fmt(finalAmount)}`} key={authSheetKey} visible={showAuthSheet} onClose={() => setShowAuthSheet(false)} onPinAuth={handlePinAuth} onBiometricAuth={handleBiometricAuth} onForgotPin={goForgotPin} />

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
  meterInputWrap: { flex: 1 },
  meterInput: {
    backgroundColor: C.white, borderWidth: 1, borderColor: C.border,
    borderRadius: R.sm, paddingHorizontal: S.base, paddingVertical: S.md,
    fontSize: F.base, color: C.text,
  },
  typeRow: { flexDirection: "row", gap: S.sm },
  typeChip: {
    flex: 1, paddingVertical: S.sm, borderRadius: R.xs,
    backgroundColor: C.inputBg, borderWidth: 1, borderColor: C.border, alignItems: "center",
  },
  typeChipActive: { backgroundColor: C.primary, borderColor: C.primary },
  typeChipText: { fontSize: F.sm, fontWeight: "600", color: C.text },
  verifyBtnSolid: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    backgroundColor: C.primary, borderRadius: R.sm,
    paddingVertical: S.md + 2, marginTop: S.md,
    shadowColor: C.primary, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 6, elevation: 4,
  },
  verifyBtnSolidText: { fontSize: F.md, color: C.white, fontWeight: "800" },
  amountBox: {
    flexDirection: "row", alignItems: "center", gap: S.sm,
    backgroundColor: C.inputBg, borderWidth: 1.5, borderColor: C.border,
    borderRadius: R.sm, paddingHorizontal: S.base,
  },
  naira: { fontSize: F.xl, fontWeight: "900", color: C.primary },
  amountInput: {
    flex: 1, paddingVertical: S.md + 2,
    fontSize: F.xl, fontWeight: "700", color: C.text,
  },
  verifiedCard: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: C.credit + "15", borderRadius: R.sm, padding: S.md, marginTop: S.sm,
  },
  verifiedName: { fontSize: F.md, fontWeight: "700", color: C.text },
  verifiedAddress: { fontSize: F.sm, color: C.textMuted, marginTop: 2 },
  balance: { fontSize: F.sm, color: C.textMuted, marginTop: S.base, textAlign: "center" },
  minHint: { fontSize: F.sm, color: C.debit, textAlign: "center", marginTop: S.xs, fontWeight: "600" },
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
  successDesc: { fontSize: F.md, color: C.textMuted, marginTop: S.sm, textAlign: "center" },
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

const el = StyleSheet.create({
  verify: { backgroundColor: C.primary, borderRadius: 12, paddingHorizontal: 14, height: 34, justifyContent: "center" },
  verifyText: { fontSize: 13, fontWeight: "800", color: C.white },
  verified: { marginTop: 12, borderRadius: 16, backgroundColor: C.credit + "1A", padding: 14 },
  verifiedTop: { fontSize: 12, fontWeight: "800", color: C.credit },
  verifiedName: { fontSize: 13, fontWeight: "700", color: C.text, marginTop: 4 },
  naira: { fontSize: 15, fontWeight: "700", color: C.text, marginRight: 8 },
});
