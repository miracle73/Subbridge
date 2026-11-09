import { withPayStyles } from "../../components/payStyles";
import React, { useState, useEffect } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Modal, Image, StatusBar, Linking,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { C, F, R, S } from "../../utils/theme";
import { fmt } from "../../utils/format";
import { MOCK_NETWORKS, MOCK_SUPPORT } from "../../utils/mockData";
import api from "../../services/api";
import ServiceBanner from "../../components/ServiceBanner";
import Toast from "../../components/Toast";

const FALLBACK_BANKS = ["GTBank", "Access Bank", "First Bank", "Zenith Bank", "UBA", "Opay", "Kuda Bank", "PalmPay"];

const QUICK_AMOUNTS = [1000, 2000, 5000, 10000];

export default function AirtimeToCashScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [network, setNetwork] = useState(null);
  const [amount, setAmount] = useState("");
  const [bank, setBank] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountName, setAccountName] = useState("");
  const [toastMsg, setToastMsg] = useState("");
  const [toastType, setToastType] = useState("error");
  const [whatsapp, setWhatsapp] = useState(MOCK_SUPPORT.whatsapp);
  const [userName, setUserName] = useState("");

  const showToast = (msg, type = "error") => { setToastType(type); setToastMsg(msg); };

  useEffect(() => {
    (async () => {
      try {
        await api.init();
        const [profileRes, supportRes] = await Promise.all([
          api.getUserProfile(),
          api.getSupportInfo(),
        ]);
        if (profileRes.success && profileRes.data) {
          const u = profileRes.data.user || profileRes.data;
          setUserName(`${u.firstName || u.firstname || ""} ${u.lastName || u.lastname || ""}`.trim());
        }
        if (supportRes.success && supportRes.data?.whatsapp) {
          setWhatsapp(String(supportRes.data.whatsapp));
        }
      } catch (err) {
        console.error("[AirtimeToCash] Load error:", err);
      }
    })();
  }, []);

  const makeRequest = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (!network) return showToast("Select a network");
    const amt = Number(String(amount).replace(/[^\d]/g, ""));
    if (!amt || amt <= 0) return showToast("Enter the airtime amount");
    if (!bank) return showToast("Select your bank");
    if (accountNumber.length !== 10) return showToast("Enter a valid 10-digit account number");
    if (!accountName.trim()) return showToast("Enter your account name");

    const fullName = userName || "SubBridge user";
    const message =
      `Good day SubBridge,\n\n` +
      `My name is ${fullName}, a SubBridge user, and I would like to make an Airtime to Cash request.\n\n` +
      `Request Details:\n` +
      `- Network: ${network.name}\n` +
      `- Airtime Amount: ${fmt(amt)}\n` +
      `- Bank Name: ${bank}\n` +
      `- Account Number: ${accountNumber}\n` +
      `- Account Name: ${accountName.trim()}\n\n` +
      `Please process this request to the account above. Thank you for your service.\n\n` +
      `Best regards,\n${fullName}`;

    const url = `https://wa.me/${whatsapp}?text=${encodeURIComponent(message)}`;
    try {
      const supported = await Linking.canOpenURL(url);
      if (!supported) throw new Error("WhatsApp not available");
      await Linking.openURL(url);
      showToast("Opening WhatsApp\u2026", "success");
    } catch (err) {
      console.error("[AirtimeToCash] WhatsApp error:", err);
      showToast("Could not open WhatsApp. Please try again.");
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />
      <Toast message={toastMsg} type={toastType} onHide={() => setToastMsg("")} />

      <View style={[styles.header]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={C.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Airtime to Cash</Text>
        <View style={{ width: 22 }} />
      </View>

      <ServiceBanner
        icon="cash-outline"
        title="Airtime to Cash"
        subtitle="Convert airtime to cash \u00B7 Paid to your bank"
      />

      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={styles.label}>Select Network</Text>
        <View style={styles.networkRow}>
          {MOCK_NETWORKS.map((n) => (
            <TouchableOpacity
              key={n.id}
              style={[styles.networkChip, network?.id === n.id && styles.networkChipActive]}
              activeOpacity={0.7}
              onPress={() => setNetwork(n)}
            >
              <Image source={n.logo} style={styles.networkLogo} />
              <Text style={[styles.networkName, network?.id === n.id && styles.networkNameActive, n.id === "9mobile" && styles.networkNameBold]}>{n.name}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Airtime Amount</Text>
        <View style={styles.amountWrap}>
          <Text style={styles.amountPrefix}>{"\u20A6"}</Text>
          <TextInput
            style={styles.amountInput}
            value={amount}
            onChangeText={(t) => setAmount(t.replace(/[^\d]/g, ""))}
            placeholder="0"
            keyboardType="number-pad"
          />
        </View>
        <View style={styles.quickRow}>
          {QUICK_AMOUNTS.map((q) => (
            <TouchableOpacity
              key={q}
              style={styles.quickChip}
              activeOpacity={0.7}
              onPress={() => setAmount(String(q))}
            >
              <Text style={styles.quickChipText}>{fmt(q)}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Bank Details</Text>
        <View style={styles.detailsCard}>
          <Text style={styles.fieldLabel}>Bank Name</Text>
          <TextInput
            style={styles.input}
            value={bank}
            onChangeText={(t) => setBank(t)}
            placeholder="Enter bank name"
            autoCapitalize="words"
          />

          <Text style={styles.fieldLabel}>Account Number</Text>
          <TextInput
            style={styles.input}
            value={accountNumber}
            onChangeText={(t) => setAccountNumber(t.replace(/[^\d]/g, "").slice(0, 10))}
            placeholder="0123456789"
            keyboardType="number-pad"
            maxLength={10}
          />

          <Text style={styles.fieldLabel}>Account Name</Text>
          <TextInput
            style={styles.input}
            value={accountName}
            onChangeText={setAccountName}
            placeholder="e.g. Chidi Okoro"
            autoCapitalize="words"
          />
        </View>

        <View style={styles.noteBox}>
          <Ionicons name="information-circle-outline" size={16} color={C.primary} />
          <Text style={styles.noteText}>
            Your request will be sent to SubBridge support on WhatsApp for processing.
          </Text>
        </View>

        <TouchableOpacity style={styles.submitBtn} activeOpacity={0.85} onPress={makeRequest}>
          <Ionicons name="logo-whatsapp" size={18} color={C.white} />
          <Text style={styles.submitText}>Make Request</Text>
        </TouchableOpacity>
      </ScrollView>
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
  scroll: { paddingBottom: 40 },

  label: { fontSize: F.sm, fontWeight: "800", color: C.text, marginTop: S.md, marginBottom: S.sm, paddingHorizontal: S.xl },

  networkRow: { flexDirection: "row", gap: S.sm, paddingHorizontal: S.xl, flexWrap: "nowrap" },
  networkChip: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: C.white, borderRadius: R.sm, paddingHorizontal: S.md, paddingVertical: S.sm,
    borderWidth: 1.5, borderColor: C.border,
  },
  networkChipActive: { borderColor: C.primary, backgroundColor: C.primaryLight },
  networkLogo: { width: 22, height: 22, borderRadius: 11 },
  networkName: { fontSize: F.xs, fontWeight: "700", color: C.textMuted },
  networkNameActive: { color: C.primary },
  networkNameBold: { fontWeight: "900" },

  amountWrap: {
    flexDirection: "row", alignItems: "center", marginHorizontal: S.xl,
    backgroundColor: C.white, borderRadius: R.sm, borderWidth: 1.5, borderColor: C.border,
    paddingHorizontal: S.base,
  },
  amountPrefix: { fontSize: F.xl, fontWeight: "800", color: C.text },
  amountInput: { flex: 1, fontSize: F.xl, fontWeight: "800", color: C.text, paddingVertical: S.md + 2, marginLeft: S.sm },
  quickRow: { flexDirection: "row", gap: S.sm, paddingHorizontal: S.xl, marginTop: S.sm },
  quickChip: {
    flex: 1, alignItems: "center", backgroundColor: C.white, borderRadius: R.xs,
    paddingVertical: S.sm, borderWidth: 1, borderColor: C.border,
  },
  quickChipText: { fontSize: F.xs, fontWeight: "700", color: C.primary },

  detailsCard: {
    marginHorizontal: S.xl, backgroundColor: C.white, borderRadius: R.md,
    padding: S.base, borderWidth: 1, borderColor: C.border,
  },
  fieldLabel: { fontSize: F.xs, fontWeight: "700", color: C.textMuted, marginBottom: 6, marginTop: S.sm },
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

  noteBox: {
    flexDirection: "row", alignItems: "flex-start", gap: S.sm,
    marginHorizontal: S.xl, marginTop: S.md,
  },
  noteText: { flex: 1, fontSize: F.xs, color: C.textMuted, lineHeight: 16 },

  submitBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: S.sm,
    marginHorizontal: S.xl, marginTop: S.lg, backgroundColor: C.accent,
    borderRadius: R.md, paddingVertical: S.base + 2,
  },
  submitText: { fontSize: F.lg, fontWeight: "800", color: C.white },

  backdrop: { flex: 1, backgroundColor: C.overlay },
  sheet: {
    backgroundColor: C.white, borderTopLeftRadius: R.xl, borderTopRightRadius: R.xl,
    paddingHorizontal: S.xl, paddingTop: S.sm,
  },
  handle: {
    width: 40, height: 4, borderRadius: 2, backgroundColor: C.border,
    alignSelf: "center", marginBottom: S.base,
  },
  sheetTitle: { fontSize: F.xxl, fontWeight: "900", color: C.text, marginBottom: S.sm },
  bankRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingVertical: S.md, borderBottomWidth: 1, borderBottomColor: C.border,
  },
  bankRowText: { fontSize: F.md, fontWeight: "600", color: C.text },
}));
