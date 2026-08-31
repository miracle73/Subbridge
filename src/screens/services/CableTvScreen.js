import React, { useState, useEffect } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Modal, Image, StatusBar,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { C, F, R, S } from "../../utils/theme";
import { fmt, fmtShort } from "../../utils/format";
import api from "../../services/api";
import { enrichProviders, getCableLogo } from "../../utils/logos";
import PinDots from "../../components/PinDots";
import PinPad from "../../components/PinPad";
import ProcessingOverlay from "../../components/ProcessingOverlay";
import Preloader from "../../components/Preloader";
import ServiceBanner from "../../components/ServiceBanner";
import BeneficiaryBox from "../../components/BeneficiaryBox";

export default function CableTvScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [providers, setProviders] = useState([]);
  const [provider, setProvider] = useState(null);
  const [smartcard, setSmartcard] = useState("");
  const [plans, setPlans] = useState([]);
  const [plan, setPlan] = useState(null);
  const [verified, setVerified] = useState(null);
  const [showProvider, setShowProvider] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showPin, setShowPin] = useState(false);
  const [pin, setPin] = useState("");
  const [processing, setProcessing] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [balance, setBalance] = useState(0);

  useEffect(() => {
    loadData();
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
    if (!provider) return setError("Select a provider");
    if (!smartcard || smartcard.length < 8) return setError("Enter a valid smartcard number");
    setError("");
    console.log("[Cable] Verifying smartcard:", provider.id, smartcard);
    try {
      const result = await api.verifySmartcard(provider.id, smartcard);
      console.log("[Cable] Verify result:", result.success, result.data);
      if (result.success && result.data) {
        setVerified(result.data);
      } else {
        setError(result.message || "Verification failed. Please check the smartcard number.");
      }
    } catch (err) {
      setError("Network error. Please try again.");
    }
  };

  const handleBuy = () => {
    if (!verified) return setError("Verify smartcard first");
    if (!plan) return setError("Select a plan");
    if (balance < plan.amount) return setError("Insufficient wallet balance");
    setError("");
    setShowConfirm(true);
  };

  const handleConfirmBuy = () => {
    setShowConfirm(false);
    setShowPin(true);
    setPin("");
  };

  const handlePinKey = (k) => {
    if (k === "del") { setPin((p) => p.slice(0, -1)); return; }
    if (pin.length >= 4) return;
    const next = pin + k;
    setPin(next);
    if (next.length === 4) verifyAndPurchase(next);
  };

  const verifyAndPurchase = async (pinValue) => {
    setShowPin(false);
    setProcessing(true);

    try {
      console.log("[Cable] Verifying PIN...");
      const userRes = await api.getUserProfile();
      const userPhone = userRes.data?.phone || userRes.data?.user?.phone || "";
      const verifyRes = await api.verifyPin(userPhone, pinValue);
      console.log("[Cable] PIN verify:", verifyRes.success, verifyRes.message);

      if (!verifyRes.success) {
        setError("Incorrect PIN. Please try again.");
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        setProcessing(false);
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
        setSuccess(true);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        setError(result.message || "Transaction failed. Please try again.");
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    } catch (err) {
      setError("Network error. Please try again.");
    } finally {
      setProcessing(false);
    }
  };

  if (loading) return <Preloader />;

  if (success) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
        <LinearGradient colors={[C.primary, C.primaryDark]} style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={22} color={C.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Cable TV</Text>
          <View style={{ width: 22 }} />
        </LinearGradient>
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
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <LinearGradient colors={[C.primary, C.primaryDark]} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={C.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Cable TV</Text>
        <View style={{ width: 22 }} />
      </LinearGradient>

      <ServiceBanner
        icon="tv-outline"
        title="Cable TV Subscriptions"
        subtitle="DStv, GOtv & StarTimes \u00B7 Instant activation"
      />

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={styles.label}>Provider & Smartcard</Text>
        <View style={styles.comboRow}>
          <TouchableOpacity style={styles.providerLogoBtn} onPress={() => setShowProvider(true)}>
            {provider ? (
              <Image source={provider.logo} style={styles.providerLogo} />
            ) : (
              <View style={styles.providerLogoPlaceholder}>
                <Ionicons name="tv-outline" size={22} color={C.textMuted} />
              </View>
            )}
          </TouchableOpacity>
          <View style={styles.smartcardInputWrap}>
            <TextInput
              style={styles.smartcardInput}
              value={smartcard}
              onChangeText={setSmartcard}
              placeholder="Smartcard / IUC number"
              keyboardType="number-pad"
              maxLength={12}
            />
          </View>
        </View>

        <TouchableOpacity style={styles.verifyBtn} onPress={handleVerify}>
          <Ionicons name="checkmark-circle-outline" size={18} color={C.primary} />
          <Text style={styles.verifyBtnText}>Verify Smartcard</Text>
        </TouchableOpacity>

        {verified && (
          <View style={styles.verifiedCard}>
            <Ionicons name="checkmark-circle" size={20} color={C.accent} />
            <View style={{ marginLeft: S.sm }}>
              <Text style={styles.verifiedName}>{verified.customerName || verified.name}</Text>
              <Text style={styles.verifiedPlan}>Current: {verified.currentPlan || verified.plan || "N/A"}</Text>
            </View>
          </View>
        )}

        <BeneficiaryBox type="cable" onSelect={(b) => {
          setSmartcard(b.smartcard);
          if (b.provider) {
            const p = providers.find((x) => x.id === b.provider);
            if (p) handleProvider(p);
          }
        }} />

        {plans.length > 0 && (
          <>
            <Text style={styles.label}>Select Plan</Text>
            <View style={styles.planGrid}>
              {plans.map((p) => (
                <TouchableOpacity
                  key={p.id}
                  style={[styles.planCard, plan?.id === p.id && styles.planCardActive]}
                  onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setPlan(p); }}
                >
                  <Text style={[styles.planName, plan?.id === p.id && { color: C.white }]}>{p.name}</Text>
                  <Text style={[styles.planAmount, plan?.id === p.id && { color: C.white }]}>{fmtShort(p.amount)}</Text>
                  <Text style={[styles.planValidity, plan?.id === p.id && { color: "rgba(255,255,255,0.7)" }]}>{p.validity}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        <Text style={styles.balance}>Wallet Balance: {fmt(balance)}</Text>
        {error ? <Text style={styles.error}>{error}</Text> : null}

        {plan && verified && (
          <TouchableOpacity style={styles.btn} onPress={handleBuy}>
            <Text style={styles.btnText}>Subscribe</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      <Modal visible={showProvider} transparent animationType="slide">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowProvider(false)}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Select Provider</Text>
            {providers.map((p) => (
              <TouchableOpacity key={p.id} style={styles.modalItem} onPress={() => handleProvider(p)}>
                <View style={styles.modalItemRow}>
                  <Image source={p.logo} style={styles.modalLogo} />
                  <Text style={styles.modalItemText}>{p.name}</Text>
                </View>
                {provider?.id === p.id && <Ionicons name="checkmark" size={20} color={C.primary} />}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Confirmation Modal */}
      <Modal visible={showConfirm} transparent animationType="fade">
        <View style={styles.confirmOverlay}>
          <View style={styles.confirmSheet}>
            <Text style={styles.confirmTitle}>Confirm Subscription</Text>
            <View style={styles.confirmDetails}>
              <View style={styles.confirmRow}>
                <Text style={styles.confirmLabel}>Provider</Text>
                <Text style={styles.confirmValue}>{provider?.name}</Text>
              </View>
              <View style={styles.confirmRow}>
                <Text style={styles.confirmLabel}>Plan</Text>
                <Text style={styles.confirmValue}>{plan?.name}</Text>
              </View>
              <View style={styles.confirmRow}>
                <Text style={styles.confirmLabel}>IUC Number</Text>
                <Text style={styles.confirmValue}>{smartcard}</Text>
              </View>
              <View style={styles.confirmRow}>
                <Text style={styles.confirmLabel}>Amount</Text>
                <Text style={[styles.confirmValue, { color: C.primary, fontWeight: "900" }]}>{fmt(plan?.amount)}</Text>
              </View>
              <View style={[styles.confirmRow, { borderBottomWidth: 0 }]}>
                <Text style={styles.confirmLabel}>Balance</Text>
                <Text style={styles.confirmValue}>{fmt(balance)}</Text>
              </View>
            </View>
            <View style={styles.confirmActions}>
              <TouchableOpacity style={styles.confirmCancel} onPress={() => setShowConfirm(false)}>
                <Text style={styles.confirmCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirmBuy}>
                <Text style={styles.confirmBtnText}>Proceed</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={showPin} transparent animationType="slide">
        <View style={styles.pinOverlay}>
          <View style={styles.pinSheet}>
            <Text style={styles.pinTitle}>Enter PIN to confirm</Text>
            <Text style={styles.pinAmount}>{fmt(plan?.amount || 0)}</Text>
            <PinDots length={4} filled={pin.length} />
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <PinPad onPress={handlePinKey} />
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowPin(false)}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <ProcessingOverlay visible={processing} message="Processing..." />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.white },
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

  verifyBtn: {
    flexDirection: "row", alignItems: "center", gap: 6, marginTop: S.md, paddingVertical: S.sm,
  },
  verifyBtnText: { fontSize: F.md, color: C.primary, fontWeight: "700" },
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
  btn: { backgroundColor: C.primary, borderRadius: R.sm, paddingVertical: S.md + 2, alignItems: "center", marginTop: S.xl },
  btnText: { color: C.white, fontSize: F.lg, fontWeight: "700" },

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

  pinOverlay: { flex: 1, backgroundColor: C.overlay, justifyContent: "flex-end" },
  pinSheet: { backgroundColor: C.white, borderTopLeftRadius: R.xl, borderTopRightRadius: R.xl, padding: S.xl, alignItems: "center" },
  pinTitle: { fontSize: F.lg, fontWeight: "700", color: C.text },
  pinAmount: { fontSize: F.h2, fontWeight: "900", color: C.primary, marginVertical: S.base },
  cancelBtn: { paddingVertical: S.md },
  cancelText: { fontSize: F.md, color: C.textMuted, fontWeight: "600" },

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
});
