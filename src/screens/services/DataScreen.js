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
import { enrichProviders, getNetworkLogo } from "../../utils/logos";
import PinDots from "../../components/PinDots";
import PinPad from "../../components/PinPad";
import ProcessingOverlay from "../../components/ProcessingOverlay";
import Preloader from "../../components/Preloader";
import ServiceBanner from "../../components/ServiceBanner";

function getValidityGroup(validity) {
  if (!validity) return "Other";
  const v = validity.toLowerCase().replace(/\s+/g, "");
  if (v.includes("1d") || v.includes("daily") || v === "1day") return "Daily";
  if (v.includes("7d") || v.includes("weekly") || v === "7days" || v === "7day") return "Weekly";
  if (v.includes("30d") || v.includes("monthly") || v.includes("30days") || v.includes("30day")) return "Monthly";
  if (v.includes("90d") || v.includes("quarterly") || v.includes("90days")) return "Quarterly";
  if (v.includes("365") || v.includes("yearly") || v.includes("annual")) return "Yearly";
  return validity;
}

export default function DataScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [networks, setNetworks] = useState([]);
  const [network, setNetwork] = useState(null);
  const [allPlans, setAllPlans] = useState([]);
  const [types, setTypes] = useState([]);
  const [activeType, setActiveType] = useState(null);
  const [activeValidity, setActiveValidity] = useState(null);
  const [phone, setPhone] = useState("");
  const [plan, setPlan] = useState(null);
  const [showNetwork, setShowNetwork] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showPin, setShowPin] = useState(false);
  const [pin, setPin] = useState("");
  const [processing, setProcessing] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saveBeneficiary, setSaveBeneficiary] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [balance, setBalance] = useState(0);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      console.log("[Data] Loading...");
      const [providersRes, walletRes] = await Promise.all([
        api.getDataProviders(),
        api.getWalletBalance(),
      ]);

      if (providersRes.success && providersRes.data) {
        const enriched = enrichProviders(providersRes.data, getNetworkLogo);
        setNetworks(enriched);
        if (enriched.length > 0) {
          setNetwork(enriched[0]);
          await loadAllPlans(enriched[0].id);
        }
      }

      if (walletRes.success && walletRes.data) {
        setBalance(walletRes.data.balance || 0);
      }
    } catch (err) {
      console.error("[Data] Load error:", err);
    } finally {
      setLoading(false);
    }
  };

  const loadAllPlans = async (providerId) => {
    try {
      console.log("[Data] Loading all plans for:", providerId);
      const result = await api.getDataPlans(providerId);
      console.log("[Data] All plans:", result.data?.plans?.length, "types:", result.data?.types);
      if (result.success && result.data) {
        const plans = result.data.plans || [];
        const planTypes = result.data.types || [];
        setAllPlans(plans);
        setTypes(planTypes);
        setActiveType(planTypes.length > 0 ? planTypes[0] : null);
        setActiveValidity(null);
        setPlan(null);
      }
    } catch (err) {
      console.error("[Data] Load plans error:", err);
    }
  };

  // Type and validity operate independently: picking one clears the other.
  const displayPlans = activeType
    ? allPlans.filter((p) => p.type === activeType)
    : activeValidity
      ? allPlans.filter((p) => getValidityGroup(p.validity) === activeValidity)
      : allPlans;

  const allValidityGroups = ["Daily", "Weekly", "Monthly", "Quarterly", "Yearly"];

  const displayGroups = {};
  displayPlans.forEach((p) => {
    const group = getValidityGroup(p.validity);
    if (!displayGroups[group]) displayGroups[group] = [];
    displayGroups[group].push(p);
  });

  const sortedDisplayGroups = allValidityGroups
    .filter((g) => displayGroups[g] && displayGroups[g].length > 0)
    .map((g) => [g, displayGroups[g]]);

  // Muted hint for selector chips with no plans in current context
  const validityCounts = {};
  const typeScope = activeType ? allPlans.filter((p) => p.type === activeType) : allPlans;
  typeScope.forEach((p) => {
    const g = getValidityGroup(p.validity);
    validityCounts[g] = (validityCounts[g] || 0) + 1;
  });
  const typeCounts = {};
  allPlans.forEach((p) => {
    typeCounts[p.type] = (typeCounts[p.type] || 0) + 1;
  });

  const handleNetwork = (n) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setNetwork(n);
    setPlan(null);
    setActiveType(null);
    setActiveValidity("Daily");
    setShowNetwork(false);
    loadAllPlans(n.id);
  };

  const handleTypeFilter = (type) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (activeType === type) {
      setActiveType(null);
    } else {
      setActiveType(type);
    }
    setActiveValidity(null);
    setPlan(null);
  };

  const handleValidityFilter = (validity) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setActiveValidity(validity === activeValidity ? null : validity);
    setActiveType(null);
    setPlan(null);
  };

  const selectBeneficiary = (b) => {
    setPhone(b.phone);
    if (b.network) {
      const n = networks.find((x) => x.id === b.network);
      if (n) setNetwork(n);
    }
    setShowDropdown(false);
  };

  const handleBuy = () => {
    if (!network) return setError("Select a network");
    if (!phone || phone.length < 10) return setError("Enter a valid phone number");
    if (!plan) return setError("Select a data plan");
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
      const cleanPhone = "234" + phone.replace(/\s/g, "").replace(/^0/, "").replace(/^234/, "");
      console.log("[Data] Verifying PIN...");

      const userRes = await api.getUserProfile();
      const u = userRes.data?.user || userRes.data || {};
      const userPhone = u.phone || "";

      const verifyRes = await api.verifyPin(userPhone, pinValue);
      console.log("[Data] PIN verify:", verifyRes.success);

      if (!verifyRes.success) {
        setError("Incorrect PIN. Please try again.");
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        setProcessing(false);
        return;
      }

      console.log("[Data] Purchasing:", cleanPhone, network?.id, plan?.id);
      const result = await api.purchaseData({
        phone: cleanPhone,
        provider: network?.id || "mtn",
        planId: plan?.id,
        amount: plan?.amount,
        pin: pinValue,
      });

      if (result.success) {
        setSuccess(true);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        setError(result.message || "Transaction failed.");
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
          <Text style={styles.headerTitle}>Data</Text>
          <View style={{ width: 22 }} />
        </LinearGradient>
        <View style={styles.successWrap}>
          <View style={styles.successIconWrap}>
            <Ionicons name="checkmark" size={40} color={C.white} />
          </View>
          <Text style={styles.successTitle}>Purchase Successful!</Text>
          <Text style={styles.successAmount}>{fmt(plan?.amount)}</Text>
          <Text style={styles.successDesc}>{network?.name} {plan?.name} to {phone}</Text>
          <View style={styles.successDetails}>
            <View style={styles.successDetailRow}>
              <Text style={styles.successDetailLabel}>Network</Text>
              <Text style={styles.successDetailValue}>{network?.name}</Text>
            </View>
            <View style={styles.successDetailRow}>
              <Text style={styles.successDetailLabel}>Plan</Text>
              <Text style={styles.successDetailValue}>{plan?.name}</Text>
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

  const hasPlans = displayPlans.length > 0;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <LinearGradient colors={[C.primary, C.primaryDark]} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={C.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Buy Data</Text>
        <View style={{ width: 22 }} />
      </LinearGradient>

      <ServiceBanner
        icon="wifi-outline"
        title="Affordable Data Plans"
        subtitle="Best bundles for all networks \u00B7 Fast activation"
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
          <TouchableOpacity style={styles.contactIconBtn} onPress={() => setShowDropdown(!showDropdown)}>
            <Ionicons name="person-circle-outline" size={24} color={C.primary} />
          </TouchableOpacity>
        </View>

        {showDropdown && (
          <View style={styles.dropdown}>
            <View style={styles.dropdownItem}>
              <Text style={{ fontSize: 13, color: C.textMuted, textAlign: "center", padding: S.md }}>No recent beneficiaries</Text>
            </View>
          </View>
        )}

        {/* Validity Tabs */}
        <Text style={[styles.label, { marginTop: S.lg }]}>Validity</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.typeTabs}>
          {allValidityGroups.map((group) => (
            <TouchableOpacity
              key={group}
              style={[styles.typeTab, activeValidity === group && styles.typeTabActive]}
              onPress={() => handleValidityFilter(group)}
            >
              <Text style={[
                styles.typeTabText,
                activeValidity === group && { color: C.white },
                activeValidity !== group && !validityCounts[group] && { color: C.textLight },
              ]}>
                {group}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Plan Type Tabs */}
        {types.length > 0 && (
          <>
            <Text style={[styles.label, { marginTop: S.md }]}>Plan Type</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.typeTabs}>
              {types.map((t) => (
                <TouchableOpacity
                  key={t}
                  style={[styles.typeTab, activeType === t && styles.typeTabActive]}
                  onPress={() => handleTypeFilter(t)}
                >
                  <Text style={[
                    styles.typeTabText,
                    activeType === t && { color: C.white },
                    activeType !== t && !typeCounts[t] && { color: C.textLight },
                  ]}>
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </>
        )}

        {/* Plans grouped by validity */}
        {sortedDisplayGroups.map(([validity, planList]) => (
          <View key={validity} style={{ marginTop: S.md }}>
            <Text style={[styles.groupLabel]}>{validity} ({planList.length})</Text>
            <View style={styles.planGrid}>
              {planList.map((p) => (
                <TouchableOpacity
                  key={p.id}
                  style={[styles.planCard, plan?.id === p.id && styles.planCardActive]}
                  onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setPlan(p); }}
                >
                  <Text style={[styles.planDataValue, plan?.id === p.id && { color: C.white }]}>{p.dataValue || p.name}</Text>
                  <Text style={[styles.planAmount, plan?.id === p.id && { color: C.white }]}>{fmtShort(p.amount)}</Text>
                  <Text style={[styles.planValidity, plan?.id === p.id && { color: "rgba(255,255,255,0.7)" }]}>{p.validity}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}

        {/* Empty states */}
        {activeType && !hasPlans && (
          <Text style={styles.emptyText}>No plans available in the selected category</Text>
        )}

        {activeValidity && !hasPlans && (
          <Text style={styles.emptyText}>No plans available under {activeValidity}</Text>
        )}

        {!activeType && !activeValidity && !hasPlans && !loading && (
          <Text style={styles.emptyText}>No plans available</Text>
        )}

        <Text style={styles.balance}>Wallet Balance: {fmt(balance)}</Text>
        {error ? <Text style={styles.error}>{error}</Text> : null}

        {/* Buy button - always visible, active only when plan selected */}
        <TouchableOpacity
          style={[styles.btn, !plan && styles.btnInactive]}
          onPress={handleBuy}
          disabled={!plan}
          activeOpacity={plan ? 0.6 : 1}
        >
          <Text style={[styles.btnText, !plan && styles.btnTextInactive]}>
            {plan ? `Buy Data - ${fmt(plan.amount)}` : "Select a plan to continue"}
          </Text>
        </TouchableOpacity>
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

      {/* Confirmation Modal - with save beneficiary */}
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
                <Text style={styles.confirmLabel}>Plan</Text>
                <Text style={styles.confirmValue}>{plan?.name}</Text>
              </View>
              <View style={styles.confirmRow}>
                <Text style={styles.confirmLabel}>Phone</Text>
                <Text style={styles.confirmValue}>{phone}</Text>
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

            <TouchableOpacity style={styles.beneficiaryRow} onPress={() => setSaveBeneficiary(!saveBeneficiary)}>
              <Ionicons name={saveBeneficiary ? "checkbox" : "square-outline"} size={20} color={saveBeneficiary ? C.primary : C.textMuted} />
              <Text style={styles.beneficiaryText}>Save as beneficiary</Text>
            </TouchableOpacity>

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
            <Text style={styles.pinAmount}>{fmt(plan?.amount)}</Text>
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
  scroll: { padding: S.xl, paddingBottom: 40 },

  label: { fontSize: F.sm, fontWeight: "600", color: C.text, marginBottom: 6, marginTop: S.md },
  groupLabel: { fontSize: 13, fontWeight: "700", color: C.primary, marginBottom: 6 },
  emptyText: { fontSize: F.sm, color: C.textMuted, textAlign: "center", marginTop: S.xl },

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
  },
  dropdownItem: {
    flexDirection: "row", alignItems: "center", gap: S.sm,
    paddingHorizontal: S.base, paddingVertical: S.sm,
  },

  typeTabs: { gap: S.sm, paddingVertical: S.xs },
  typeTab: {
    paddingHorizontal: S.base, paddingVertical: S.sm,
    backgroundColor: C.inputBg, borderWidth: 1.5, borderColor: C.border,
    borderRadius: R.sm,
  },
  typeTabActive: { backgroundColor: C.primary, borderColor: C.primary },
  typeTabText: { fontSize: 12, fontWeight: "700", color: C.text },

  planGrid: { flexDirection: "row", flexWrap: "wrap", gap: S.sm, marginTop: S.xs },
  planCard: {
    width: "31%", backgroundColor: C.inputBg, borderWidth: 1, borderColor: C.border,
    borderRadius: R.sm, padding: S.sm, alignItems: "center",
  },
  planCardActive: { backgroundColor: C.primary, borderColor: C.primary },
  planDataValue: { fontSize: 12, fontWeight: "800", color: C.text, textAlign: "center" },
  planAmount: { fontSize: 11, fontWeight: "700", color: C.primary, marginTop: 4 },
  planValidity: { fontSize: 10, color: C.textMuted, marginTop: 2 },

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

  beneficiaryRow: { flexDirection: "row", alignItems: "center", gap: S.sm, marginTop: S.lg },
  beneficiaryText: { fontSize: F.sm, color: C.textMuted },

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
