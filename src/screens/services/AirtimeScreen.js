import React, { useState, useEffect } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Modal, Image, StatusBar, Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { C, F, R, S } from "../../utils/theme";
import { fmt, fmtShort } from "../../utils/format";
import api from "../../services/api";
import { enrichProviders, getNetworkLogo } from "../../utils/logos";
import Preloader from "../../components/Preloader";
import PinDots from "../../components/PinDots";
import PinPad from "../../components/PinPad";
import ProcessingOverlay from "../../components/ProcessingOverlay";
import ServiceBanner from "../../components/ServiceBanner";
import ContactPicker from "../../components/ContactPicker";

const QUICK_AMOUNTS = [100, 200, 500, 1000, 2000, 5000];

export default function AirtimeScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [networks, setNetworks] = useState([]);
  const [network, setNetwork] = useState(null);
  const [phone, setPhone] = useState("");
  const [amount, setAmount] = useState("");
  const [customAmount, setCustomAmount] = useState("");
  const [showNetwork, setShowNetwork] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showPin, setShowPin] = useState(false);
  const [pin, setPin] = useState("");
  const [processing, setProcessing] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saveBeneficiary, setSaveBeneficiary] = useState(false);
  const [showContacts, setShowContacts] = useState(false);
  const [balance, setBalance] = useState(0);

  useEffect(() => {
    loadData();
  }, []);

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
    if (balance < finalAmount) return setError("Insufficient wallet balance");
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
      const cleanPhone = "234" + phone.replace(/\s/g, "").replace(/^0/, "").replace(/^234/, "");
      console.log("[Airtime] Verifying PIN...");

      const userRes = await api.getUserProfile();
      const u = userRes.data?.user || userRes.data || {};
      const userPhone = u.phone || "";

      const verifyRes = await api.verifyPin(userPhone, pinValue);
      console.log("[Airtime] PIN verify:", verifyRes.success, verifyRes.message);

      if (!verifyRes.success) {
        setError("Incorrect PIN. Please try again.");
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        setProcessing(false);
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
          <Text style={styles.headerTitle}>Airtime</Text>
          <View style={{ width: 22 }} />
        </LinearGradient>
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
        <Text style={styles.headerTitle}>Buy Airtime</Text>
        <View style={{ width: 22 }} />
      </LinearGradient>

      <ServiceBanner
        icon="call-outline"
        title="Buy Airtime"
        subtitle="Instant airtime for all networks"
      />

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={styles.label}>Network & Phone Number</Text>
        <View style={styles.comboRow}>
          <TouchableOpacity style={styles.networkLogoBtn} onPress={() => setShowNetwork(true)}>
            {network ? (
              <Image source={network.logo} style={styles.networkLogo} />
            ) : (
              <View style={styles.networkLogoPlaceholder}>
                <Ionicons name="cellular-outline" size={22} color={C.textMuted} />
              </View>
            )}
          </TouchableOpacity>
          <View style={styles.phoneInputWrap}>
            <TextInput
              style={styles.phoneInput}
              value={phone}
              onChangeText={setPhone}
              placeholder="0812 345 6789"
              keyboardType="phone-pad"
              maxLength={11}
            />
          </View>
          <TouchableOpacity style={styles.contactIconBtn} onPress={() => setShowContacts(true)}>
            <Ionicons name="person-circle-outline" size={24} color={C.primary} />
          </TouchableOpacity>
        </View>

        <ContactPicker
          visible={showContacts}
          onClose={() => setShowContacts(false)}
          onSelect={(num) => setPhone(num)}
        />

        <Text style={[styles.label, { marginTop: S.lg }]}>Amount</Text>
        <View style={styles.amountGrid}>
          {QUICK_AMOUNTS.map((a) => (
            <TouchableOpacity
              key={a}
              style={[styles.amountChip, amount === a && styles.amountChipActive]}
              onPress={() => handleAmount(a)}
            >
              <Text style={[styles.amountChipText, amount === a && { color: C.white }]}>{fmtShort(a)}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <TextInput
          style={styles.customAmountInput}
          value={customAmount}
          onChangeText={(t) => { setCustomAmount(t); setAmount(""); }}
          placeholder="Custom amount"
          keyboardType="number-pad"
        />

        <TouchableOpacity style={styles.beneficiaryRow} onPress={() => setSaveBeneficiary(!saveBeneficiary)}>
          <Ionicons name={saveBeneficiary ? "checkbox" : "square-outline"} size={20} color={saveBeneficiary ? C.primary : C.textMuted} />
          <Text style={styles.beneficiaryText}>Save as beneficiary</Text>
        </TouchableOpacity>

        <Text style={styles.balance}>Wallet Balance: {fmt(balance)}</Text>
        {error ? <Text style={styles.error}>{error}</Text> : null}

        {(() => {
          const ready = network && phone.length >= 10 && finalAmount > 0;
          return (
            <TouchableOpacity
              style={[styles.btn, !ready && styles.btnInactive]}
              onPress={handleBuy}
              disabled={!ready}
              activeOpacity={ready ? 0.6 : 1}
            >
              <Text style={[styles.btnText, !ready && styles.btnTextInactive]}>
                {ready ? `Buy Airtime - ${fmt(finalAmount)}` : "Enter details to continue"}
              </Text>
            </TouchableOpacity>
          );
        })()}
      </ScrollView>

      {/* Network Picker Modal */}
      <Modal visible={showNetwork} transparent animationType="slide">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowNetwork(false)}>
          <View style={styles.modalSheet}>
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
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Confirmation Modal */}
      <Modal visible={showConfirm} transparent animationType="fade">
        <View style={styles.confirmOverlay}>
          <View style={styles.confirmSheet}>
            <Text style={styles.confirmTitle}>Confirm Purchase</Text>
            <View style={styles.confirmDetails}>
              <View style={styles.confirmRow}>
                <Text style={styles.confirmLabel}>Network</Text>
                <Text style={styles.confirmValue}>{network?.name}</Text>
              </View>
              <View style={styles.confirmRow}>
                <Text style={styles.confirmLabel}>Phone</Text>
                <Text style={styles.confirmValue}>{phone}</Text>
              </View>
              <View style={styles.confirmRow}>
                <Text style={styles.confirmLabel}>Amount</Text>
                <Text style={[styles.confirmValue, { color: C.primary, fontWeight: "900" }]}>{fmt(finalAmount)}</Text>
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

      {/* PIN Modal */}
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
    alignItems: "center", marginTop: S.xl,
  },
  btnInactive: {
    backgroundColor: C.inputBg, borderWidth: 1.5, borderColor: C.border,
  },
  btnText: { color: C.white, fontSize: F.lg, fontWeight: "700" },
  btnTextInactive: { color: C.textMuted, fontSize: F.lg, fontWeight: "600" },

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
});
