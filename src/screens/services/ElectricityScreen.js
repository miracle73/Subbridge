import React, { useState, useEffect } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Modal, Image, StatusBar, ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { C, F, R, S } from "../../utils/theme";
import { fmt } from "../../utils/format";
import api from "../../services/api";
import { enrichProviders, getElectricityLogo } from "../../utils/logos";
import PinDots from "../../components/PinDots";
import PinPad from "../../components/PinPad";
import ProcessingOverlay from "../../components/ProcessingOverlay";
import Preloader from "../../components/Preloader";
import ServiceBanner from "../../components/ServiceBanner";
import BeneficiaryBox from "../../components/BeneficiaryBox";

export default function ElectricityScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [providers, setProviders] = useState([]);
  const [provider, setProvider] = useState(null);
  const [meterNumber, setMeterNumber] = useState("");
  const [meterType, setMeterType] = useState("prepaid");
  const [amount, setAmount] = useState("");
  const [verified, setVerified] = useState(null);
  const [showProvider, setShowProvider] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showPin, setShowPin] = useState(false);
  const [pin, setPin] = useState("");
  const [processing, setProcessing] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [walletBalance, setWalletBalance] = useState(0);
  const [purchaseData, setPurchaseData] = useState(null);

  useEffect(() => {
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
        setVerified({ name: res.data.customerName, address: res.data.customerAddress || res.data.address });
      } else {
        setError(res.message || "Verification failed");
      }
    } catch (e) {
      setError("Network error. Please try again.");
    } finally {
      setVerifying(false);
    }
  };

  const finalAmount = Number(amount || 0);

  const handleBuy = () => {
    if (!verified) return setError("Verify meter first");
    if (!amount || finalAmount < 100) return setError(`Enter a valid amount (min \u20A6100)`);
    if (walletBalance < finalAmount) return setError("Insufficient wallet balance");
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

  const verifyAndPurchase = async (enteredPin) => {
    setShowPin(false);
    setProcessing(true);

    try {
      console.log("[Electricity] Verifying PIN...");
      const userRes = await api.getUserProfile();
      const userPhone = userRes.data?.phone || userRes.data?.user?.phone || "";
      const verifyRes = await api.verifyPin(userPhone, enteredPin);
      console.log("[Electricity] PIN verify:", verifyRes.success, verifyRes.message);

      if (!verifyRes.success) {
        setError("Incorrect PIN. Please try again.");
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        setProcessing(false);
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
        setSuccess(true);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        setError(res.message || "Purchase failed");
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    } catch (e) {
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
          <Text style={styles.headerTitle}>Electricity</Text>
          <View style={{ width: 22 }} />
        </LinearGradient>
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
        <Text style={styles.headerTitle}>Electricity</Text>
        <View style={{ width: 22 }} />
      </LinearGradient>

      <ServiceBanner
        icon="flash-outline"
        title="Pay Electricity Bills"
        subtitle={`Prepaid & Postpaid \u00B7 Instant token delivery`}
      />

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={styles.label}>Provider & Meter Number</Text>
        <View style={styles.comboRow}>
          <TouchableOpacity style={styles.providerLogoBtn} onPress={() => setShowProvider(true)}>
            {provider?.logo ? (
              <Image source={provider.logo} style={styles.providerLogo} />
            ) : (
              <View style={styles.providerLogoPlaceholder}>
                <Ionicons name="flash-outline" size={22} color={C.textMuted} />
              </View>
            )}
          </TouchableOpacity>
          <View style={styles.meterInputWrap}>
            <TextInput
              style={styles.meterInput}
              value={meterNumber}
              onChangeText={setMeterNumber}
              placeholder="Meter number"
              keyboardType="number-pad"
              maxLength={15}
            />
          </View>
        </View>

        <Text style={styles.label}>Meter Type</Text>
        <View style={styles.typeRow}>
          {["prepaid", "postpaid"].map((t) => (
            <TouchableOpacity
              key={t}
              style={[styles.typeChip, meterType === t && styles.typeChipActive]}
              onPress={() => setMeterType(t)}
            >
              <Text style={[styles.typeChipText, meterType === t && { color: C.white }]}>{t.charAt(0).toUpperCase() + t.slice(1)}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={[styles.verifyBtnSolid, verifying && { opacity: 0.7 }]}
          onPress={handleVerify}
          disabled={verifying}
          activeOpacity={0.8}
        >
          {verifying ? (
            <ActivityIndicator size="small" color={C.white} />
          ) : (
            <Ionicons name="checkmark-circle-outline" size={18} color={C.white} />
          )}
          <Text style={styles.verifyBtnSolidText}>{verifying ? "Verifying..." : "Click to Verify Meter"}</Text>
        </TouchableOpacity>

        {verified && (
          <View style={styles.verifiedCard}>
            <Ionicons name="checkmark-circle" size={20} color={C.accent} />
            <View style={{ marginLeft: S.sm }}>
              <Text style={styles.verifiedName}>{verified.name}</Text>
              <Text style={styles.verifiedAddress}>{verified.address}</Text>
            </View>
          </View>
        )}

        <BeneficiaryBox type="electricity" onSelect={(b) => {
          setMeterNumber(b.meter);
          if (b.provider) {
            const p = providers.find((x) => x.id === b.provider);
            if (p) handleProvider(p);
          }
        }} />

        <Text style={styles.label}>Amount</Text>
        <View style={styles.amountBox}>
          <Text style={styles.naira}>₦</Text>
          <TextInput
            style={styles.amountInput}
            value={amount}
            onChangeText={setAmount}
            placeholder="Enter amount (min ₦100)"
            keyboardType="number-pad"
          />
        </View>

        <Text style={styles.balance}>Wallet Balance: {fmt(walletBalance)}</Text>
        {error ? <Text style={styles.error}>{error}</Text> : null}

        {(() => {
          const ready = verified && finalAmount >= 100;
          return (
            <TouchableOpacity
              style={[styles.btn, !ready && styles.btnInactive]}
              onPress={handleBuy}
              disabled={!ready}
              activeOpacity={ready ? 0.6 : 1}
            >
              <Text style={[styles.btnText, !ready && styles.btnTextInactive]}>
                {ready ? `Pay Electricity - ${fmt(finalAmount)}` : "Verify meter & enter amount"}
              </Text>
            </TouchableOpacity>
          );
        })()}
      </ScrollView>

      <Modal visible={showProvider} transparent animationType="slide">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowProvider(false)}>
          <View style={styles.modalSheet}>
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
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Confirmation Modal */}
      <Modal visible={showConfirm} transparent animationType="fade">
        <View style={styles.confirmOverlay}>
          <View style={styles.confirmSheet}>
            <Text style={styles.confirmTitle}>Confirm Payment</Text>
            <View style={styles.confirmDetails}>
              <View style={styles.confirmRow}>
                <Text style={styles.confirmLabel}>Provider</Text>
                <Text style={styles.confirmValue}>{provider?.name}</Text>
              </View>
              <View style={styles.confirmRow}>
                <Text style={styles.confirmLabel}>Meter Number</Text>
                <Text style={styles.confirmValue}>{meterNumber}</Text>
              </View>
              <View style={styles.confirmRow}>
                <Text style={styles.confirmLabel}>Meter Type</Text>
                <Text style={styles.confirmValue}>{meterType.charAt(0).toUpperCase() + meterType.slice(1)}</Text>
              </View>
              <View style={styles.confirmRow}>
                <Text style={styles.confirmLabel}>Amount</Text>
                <Text style={[styles.confirmValue, { color: C.primary, fontWeight: "900" }]}>{fmt(finalAmount)}</Text>
              </View>
              <View style={[styles.confirmRow, { borderBottomWidth: 0 }]}>
                <Text style={styles.confirmLabel}>Balance</Text>
                <Text style={styles.confirmValue}>{fmt(walletBalance)}</Text>
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
            <Text style={styles.pinAmount}>{fmt(finalAmount)}</Text>
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
  error: { fontSize: F.sm, color: C.debit, textAlign: "center", marginTop: S.sm },
  btn: { backgroundColor: C.primary, borderRadius: R.sm, paddingVertical: S.md + 2, alignItems: "center", marginTop: S.xl },
  btnInactive: { backgroundColor: C.inputBg, borderWidth: 1.5, borderColor: C.border },
  btnText: { color: C.white, fontSize: F.lg, fontWeight: "700" },
  btnTextInactive: { color: C.textMuted, fontSize: F.lg, fontWeight: "600" },

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
});
