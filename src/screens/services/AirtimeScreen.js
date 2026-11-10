import { withPayStyles } from "../../components/payStyles";
import PaymentSummary from "../../components/PaymentSummary";
import { ServiceHeader, ServiceHero, Label, NetworkChips, PayBar, ui } from "../../components/ServiceUI";
import React, { useState, useEffect } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Modal, Image, StatusBar, Platform, Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { C, F, R, S } from "../../utils/theme";
import { fmt, fmtShort, detectNetworkFromPhone, normalizePhone } from "../../utils/format";
import api from "../../services/api";
import { enrichProviders, getNetworkLogo } from "../../utils/logos";
import Preloader from "../../components/Preloader";
import PaymentAuthSheet from "../../components/PaymentAuthSheet";
import ProcessingOverlay from "../../components/ProcessingOverlay";
import ServiceBanner from "../../components/ServiceBanner";
import ContactPicker from "../../components/ContactPicker";
import BiometricPrompt, { shouldPromptBiometric } from "../../components/BiometricPrompt";
import PinErrorModal from "../../components/PinErrorModal";
import { Biometrics } from "../../utils/biometrics";
import { BiometricCrypto } from "../../services/biometric";
import { SecurePin } from "../../utils/storage";
import Toast from "../../components/Toast";

const QUICK_AMOUNTS = [100, 200, 500, 1000, 2000, 5000];

async function signTransaction(txnId, txnData) {
  const auth = await BiometricCrypto.authenticate();
  if (!auth.success) return { signature: null };
  const challengeRes = await api.requestChallenge(txnId, txnData);
  if (!challengeRes.success) { Alert.alert("Error", challengeRes.message || "Failed to get challenge"); return { signature: null }; }
  const signature = await BiometricCrypto.signChallenge(challengeRes.data.challenge);
  return { signature, transactionId: txnId, transactionData: txnData };
}

export default function AirtimeScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [networks, setNetworks] = useState([]);
  const [network, setNetwork] = useState(null);
  const [phone, setPhone] = useState("");
  // Open the design receipt (share as image / PDF) right after a successful payment.
  function goReceipt() {
    const now = new Date();
    navigation.replace("Receipt", { tx: {
      id: `R${now.getTime()}`, reference: `SB${now.getTime()}`, category: "airtime", type: "debit", status: "success",
      amount: finalAmount, description: `${network?.name || ""} Airtime - ${phone}`, date: now.toISOString().slice(0, 10), time: now.toTimeString().slice(0, 5),
      token: "airtime" === "electricity" ? "4821-0937-1156-7720-3349" : undefined,
    } });
  }
  const [amount, setAmount] = useState("");
  const [customAmount, setCustomAmount] = useState("");
  const [showNetwork, setShowNetwork] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showAuthSheet, setShowAuthSheet] = useState(false);
  const [authSheetKey, setAuthSheetKey] = useState(0);
  const [processing, setProcessing] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saveBeneficiary, setSaveBeneficiary] = useState(false);
  const [showContacts, setShowContacts] = useState(false);
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
    SecurePin.getPhone().then((p) => {
      if (p) {
        const localNum = p.startsWith("234") ? "0" + p.slice(3) : p;
        setPhone(localNum);
      }
    });
  }, []);

  useEffect(() => {
    if (phone.length < 4 || networks.length === 0) return;
    const detected = detectNetworkFromPhone(phone);
    if (!detected) return;
    const match = networks.find((n) => n.id === detected);
    if (match && network?.id !== match.id) {
      setNetwork(match);
    }
  }, [phone, networks]);

  const loadData = async () => {
    try {
      setLoading(true);
      console.log("[Airtime] Loading data...");
      const [providersRes, walletRes] = await Promise.all([
        api.getDataProviders(),
        api.getWalletBalance(),
      ]);

      console.log("[Airtime] Providers:", providersRes.success, providersRes.data?.length);

      if (providersRes.success && providersRes.data) {
        const enriched = enrichProviders(providersRes.data, getNetworkLogo);
        setNetworks(enriched);
        if (enriched.length > 0) setNetwork(enriched[0]);
      }

      if (walletRes.success && walletRes.data) {
        setBalance(walletRes.data.balance || 0);
      }
    } catch (err) {
      console.error("[Airtime] Load error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleNetwork = (n) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setNetwork(n);
    setShowNetwork(false);
  };

  const handlePhoneChange = (text) => {
    const normalized = normalizePhone(text);
    setPhone(normalized);
    if (normalized.length >= 4) {
      const detected = detectNetworkFromPhone(normalized);
      if (detected && networks.length > 0) {
        const match = networks.find((n) => n.id === detected);
        if (match) {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          setNetwork(match);
        }
      }
    }
  };

  const handleAmount = (a) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setAmount(a);
    setCustomAmount("");
  };

  const finalAmount = Number(amount || customAmount || 0);

  const handleBuy = () => {
    if (!network) return setError("Select a network");
    if (!phone || phone.length < 10) return setError("Enter a valid phone number");
    if (!finalAmount || finalAmount < 50) return setError("Enter a valid amount");
    if (balance < finalAmount) return fail("Insufficient wallet balance");
    setError("");
    setShowConfirm(true);
  };

  const handleConfirmBuy = () => {
    setShowConfirm(false);
    setShowAuthSheet(true);
  };

  const verifyAndPurchase = async (pinValue) => {
    setProcessing(true);

    try {
      const cleanPhone = "234" + phone.replace(/\s/g, "").replace(/^0/, "").replace(/^234/, "");
      console.log("[Airtime] Verifying PIN...");

      const userRes = await api.getUserProfile();
      const u = userRes.data?.user || userRes.data || {};
      const userPhone = u.phone || "";

      const verifyRes = await api.verifyPin(userPhone, pinValue);
      console.log("[Airtime] PIN verify:", verifyRes.success, verifyRes.message);

      if (!verifyRes.success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        setProcessing(false);
        setShowPinError(true);
        return;
      }

      console.log("[Airtime] Purchasing:", cleanPhone, network?.id, finalAmount);
      const result = await api.post("/api/airtime/purchase/", {
        phone: cleanPhone,
        network: network?.id || "mtn",
        amount: finalAmount,
        pin: pinValue,
      });

      console.log("[Airtime] Purchase result:", result.success, result.message);
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
    navigation.navigate("ForgotPassword", { mode: "pin", phone: p || phone || "" });
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
          <Text style={styles.headerTitle}>Airtime</Text>
          <View style={{ width: 22 }} />
        </View>
        <View style={styles.successWrap}>
          <View style={styles.successIconWrap}>
            <Ionicons name="checkmark" size={40} color={C.white} />
          </View>
          <Text style={styles.successTitle}>Purchase Successful!</Text>
          <Text style={styles.successAmount}>{fmt(finalAmount)}</Text>
          <Text style={styles.successDesc}>{network?.name} airtime to {phone}</Text>
          <View style={styles.successDetails}>
            <View style={styles.successDetailRow}>
              <Text style={styles.successDetailLabel}>Network</Text>
              <Text style={styles.successDetailValue}>{network?.name}</Text>
            </View>
            <View style={styles.successDetailRow}>
              <Text style={styles.successDetailLabel}>Amount</Text>
              <Text style={styles.successDetailValue}>{fmt(finalAmount)}</Text>
            </View>
            <View style={[styles.successDetailRow, { borderBottomWidth: 0 }]}>
              <Text style={styles.successDetailLabel}>Phone</Text>
              <Text style={styles.successDetailValue}>{phone}</Text>
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
      <ServiceHeader title="Buy Airtime" onBack={() => navigation.goBack()} />
      <ServiceHero title="Instant top-up" subtitle="All networks · 2% cashback" emoji="📱" />

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 120 + insets.bottom }} keyboardShouldPersistTaps="handled">
        <Label>Network</Label>
        <NetworkChips items={networks} selectedId={network?.id} onSelect={handleNetwork} />

        <Label>Phone number</Label>
        <View style={ui.field}>
          <TextInput style={ui.input} value={phone} onChangeText={handlePhoneChange} placeholder="0811 451 6826" placeholderTextColor={C.textLight} keyboardType="phone-pad" maxLength={11} />
          <TouchableOpacity onPress={() => setShowContacts(true)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="person-circle-outline" size={24} color={C.primary} />
          </TouchableOpacity>
        </View>
        <ContactPicker visible={showContacts} onClose={() => setShowContacts(false)} onSelect={(num) => handlePhoneChange(num)} />

        <Label>Amount</Label>
        <View style={ui.grid}>
          {QUICK_AMOUNTS.map((a) => (
            <TouchableOpacity key={a} style={[ui.amount, amount === a && ui.amountOn]} onPress={() => handleAmount(a)} activeOpacity={0.8}>
              <Text style={[ui.amountText, amount === a && { color: C.white }]}>{fmtShort(a)}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={[ui.field, { marginTop: 12 }]}>
          <TextInput style={ui.input} value={customAmount} onChangeText={(t) => { setCustomAmount(t); setAmount(""); }} placeholder="Custom amount" placeholderTextColor={C.textLight} keyboardType="number-pad" />
        </View>

        <Text style={ui.note}>Wallet balance: {fmt(balance)}</Text>
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </ScrollView>

      <PayBar
        label={network && phone.length >= 10 && finalAmount > 0 ? `Pay ${fmtShort(finalAmount)}` : "Enter details to continue"}
        onPress={handleBuy}
        disabled={!(network && phone.length >= 10 && finalAmount > 0)}
      />

      {/* Network Picker Modal */}
      <Modal visible={showNetwork} transparent animationType="slide">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowNetwork(false)}>
          <View style={styles.modalSheet}>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
            <Text style={styles.modalTitle}>Select Network</Text>
            {networks.map((n) => (
              <TouchableOpacity key={n.id} style={styles.modalItem} onPress={() => handleNetwork(n)}>
                <View style={styles.modalItemRow}>
                  {n.logo ? (
                    <Image source={n.logo} style={styles.modalLogo} />
                  ) : (
                    <View style={styles.modalLogoPlaceholder}>
                      <Ionicons name="cellular-outline" size={22} color={C.textMuted} />
                    </View>
                  )}
                  <Text style={styles.modalItemText}>{n.name}</Text>
                </View>
                {network?.id === n.id && <Ionicons name="checkmark" size={20} color={C.primary} />}
              </TouchableOpacity>
            ))}
          </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Confirmation Modal */}
      <PaymentSummary
        visible={showConfirm}
        product="Airtime"
        subtitle={network?.name}
        amount={finalAmount}
        balance={balance}
        rows={[["Network", network?.name], ["Phone", phone]]}
        onCancel={() => setShowConfirm(false)}
        onPay={handleConfirmBuy}
      />

      <PaymentAuthSheet
        subtitle={`Airtime · ${fmt(finalAmount)}`}
        key={authSheetKey}
        visible={showAuthSheet}
        onClose={() => setShowAuthSheet(false)}
        onForgotPin={goForgotPin}
        onPinAuth={async (pin) => {
          setShowAuthSheet(false);
          await verifyAndPurchase(pin);
        }}
        onBiometricAuth={async () => {
          const cleanPhone = "234" + phone.replace(/\s/g, "").replace(/^0/, "").replace(/^234/, "");
          const txnId = "AIR-" + Date.now() + "-" + Math.random().toString(36).substring(2, 8);
          const txnData = JSON.stringify({ phone: cleanPhone, network: network?.id || "mtn", amount: finalAmount });
          const { signature, transactionId, transactionData } = await signTransaction(txnId, txnData);
          if (!signature) return false;
          setProcessing(true);
          try {
            const result = await api.post("/api/airtime/purchase/", {
              phone: cleanPhone,
              network: network?.id || "mtn",
              amount: finalAmount,
              signature,
              transactionId,
              transactionData,
            });
            if (result.success) {
              setSuccess(true); goReceipt();
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } else {
              fail(result.message || "Transaction failed.");
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            }
          } catch (err) {
            fail("Network error.");
          } finally {
            setProcessing(false);
          }
          return true;
        }}
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
  networkLogoBtn: {
    width: 44, height: 44, borderRadius: R.sm, backgroundColor: C.white,
    alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: C.border,
  },
  networkLogo: { width: 32, height: 32, borderRadius: 16 },
  networkLogoPlaceholder: { alignItems: "center", justifyContent: "center" },
  phoneInputWrap: { flex: 1 },
  phoneInput: {
    backgroundColor: C.white, borderWidth: 1, borderColor: C.border,
    borderRadius: R.sm, paddingHorizontal: S.base, paddingVertical: S.md,
    fontSize: F.base, color: C.text,
  },
  contactIconBtn: {
    width: 44, height: 44, borderRadius: R.sm, backgroundColor: C.white,
    alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: C.border,
  },

  dropdown: {
    backgroundColor: C.white, borderWidth: 1, borderColor: C.border,
    borderRadius: R.sm, maxHeight: 200, overflow: "hidden", marginTop: S.xs,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 4,
  },
  dropdownItem: {
    flexDirection: "row", alignItems: "center", gap: S.sm,
    paddingHorizontal: S.base, paddingVertical: S.sm,
    borderBottomWidth: 1, borderBottomColor: C.border,
  },
  dropdownAvatar: {
    width: 32, height: 32, borderRadius: 16, backgroundColor: C.primaryLight,
    alignItems: "center", justifyContent: "center",
  },
  dropdownAvatarText: { fontSize: 12, fontWeight: "700", color: C.primary },
  dropdownName: { fontSize: 13, fontWeight: "600", color: C.text },
  dropdownPhone: { fontSize: 11, color: C.textMuted },

  amountGrid: { flexDirection: "row", flexWrap: "wrap", gap: S.sm, marginTop: S.xs },
  amountChip: {
    paddingHorizontal: S.base, paddingVertical: S.sm,
    backgroundColor: C.inputBg, borderWidth: 1.5, borderColor: C.border,
    borderRadius: R.sm, minWidth: 80, alignItems: "center",
  },
  amountChipActive: { backgroundColor: C.primary, borderColor: C.primary },
  amountChipText: { fontSize: F.sm, fontWeight: "700", color: C.text },

  customAmountInput: {
    backgroundColor: C.white, borderWidth: 1, borderColor: C.border,
    borderRadius: R.sm, paddingHorizontal: S.base, paddingVertical: S.md,
    fontSize: F.base, color: C.text, marginTop: S.sm,
  },

  beneficiaryRow: { flexDirection: "row", alignItems: "center", gap: S.sm, marginTop: S.md },
  beneficiaryText: { fontSize: F.sm, color: C.textMuted },

  balance: { fontSize: F.sm, color: C.textMuted, marginTop: S.base, textAlign: "center" },
  error: { fontSize: F.sm, color: C.debit, textAlign: "center", marginTop: S.sm },
  btn: {
    backgroundColor: C.primary, borderRadius: R.sm, paddingVertical: S.md + 2,
    alignItems: "center", marginTop: 0,
  },
  btnInactive: {
    backgroundColor: C.inputBg, borderWidth: 1.5, borderColor: C.border,
  },
  btnText: { color: C.white, fontSize: F.lg, fontWeight: "700" },
  btnTextInactive: { color: C.textMuted, fontSize: F.lg, fontWeight: "600" },
  buyBar: {
    position: "absolute", left: 0, right: 0, bottom: 0,
    paddingHorizontal: S.lg, paddingTop: S.sm,
    paddingBottom: S.md, backgroundColor: C.white,
    borderTopWidth: 1, borderTopColor: C.border,
  },

  modalOverlay: { flex: 1, backgroundColor: C.overlay, justifyContent: "flex-end" },
  modalSheet: { backgroundColor: C.white, borderTopLeftRadius: R.xl, borderTopRightRadius: R.xl, padding: S.xl, paddingTop: S.lg },
  modalTitle: { fontSize: F.lg, fontWeight: "800", color: C.text, marginBottom: S.base },
  modalItem: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: S.md, borderBottomWidth: 1, borderBottomColor: C.border },
  modalItemRow: { flexDirection: "row", alignItems: "center", gap: S.md },
  modalLogo: { width: 36, height: 36, borderRadius: 18 },
  modalLogoPlaceholder: { width: 36, height: 36, borderRadius: 18, backgroundColor: C.inputBg, alignItems: "center", justifyContent: "center" },
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

  pinOverlay: { flex: 1, backgroundColor: C.overlay, justifyContent: "flex-end" },
  pinSheet: { backgroundColor: C.white, borderTopLeftRadius: R.xl, borderTopRightRadius: R.xl, padding: S.xl, paddingTop: S.lg, alignItems: "center" },
  pinTitle: { fontSize: F.lg, fontWeight: "700", color: C.text },
  pinAmount: { fontSize: F.h2, fontWeight: "900", color: C.primary, marginVertical: S.base },
  cancelBtn: { paddingVertical: S.md, marginTop: S.sm },
  cancelText: { fontSize: F.md, color: C.textMuted, fontWeight: "600" },
  bioBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: S.sm,
    borderWidth: 1.5, borderColor: C.primary, borderRadius: R.sm,
    paddingVertical: S.md, paddingHorizontal: S.xl, marginTop: S.md, width: "100%",
  },
  bioText: { fontSize: F.md, color: C.primary, fontWeight: "700" },

  successWrap: { flex: 1, alignItems: "center", padding: S.xl, paddingTop: S.xxl },
  successIconWrap: {
    width: 80, height: 80, borderRadius: 40, backgroundColor: C.accent,
    alignItems: "center", justifyContent: "center", marginBottom: S.base,
  },
  successTitle: { fontSize: F.h3, fontWeight: "800", color: C.text, marginBottom: S.sm },
  successAmount: { fontSize: 36, fontWeight: "900", color: C.primary, letterSpacing: -1 },
  successDesc: { fontSize: F.md, color: C.textMuted, marginTop: S.xs, textAlign: "center" },
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
