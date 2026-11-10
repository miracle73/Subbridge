import { withPayStyles } from "../../components/payStyles";
import { ServiceHeader, ServiceHero, Label, NetworkChips, PayBar, ui } from "../../components/ServiceUI";
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
  const [senderPhone, setSenderPhone] = useState("");
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
    if (senderPhone.length < 10) return showToast("Enter the sender phone number");
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    showToast(`Request submitted — ${fmt(Math.floor(amt * 0.85))} will reach your wallet in ~5 mins`, "success");
    setTimeout(() => navigation.goBack(), 1800);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />
      <Toast message={toastMsg} type={toastType} onHide={() => setToastMsg("")} />

      <ServiceHeader title="Airtime to Cash" onBack={() => navigation.goBack()} />
      <ServiceHero title="Turn airtime to cash" subtitle="Get up to 85% back" emoji="💱" />

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 120 + insets.bottom }} keyboardShouldPersistTaps="handled">
        <Label>Network</Label>
        <NetworkChips items={MOCK_NETWORKS} selectedId={network?.id} onSelect={setNetwork} />

        <Label>Sender phone number</Label>
        <View style={ui.field}>
          <TextInput style={ui.input} value={senderPhone} onChangeText={(t) => setSenderPhone(t.replace(/[^\d]/g, "").slice(0, 11))} placeholder="0703 439 8627" placeholderTextColor={C.textLight} keyboardType="phone-pad" maxLength={11} />
        </View>

        <Label>Airtime amount</Label>
        <View style={ui.field}>
          <Text style={a2.naira}>₦</Text>
          <TextInput style={ui.input} value={amount} onChangeText={(t) => setAmount(t.replace(/[^\d]/g, ""))} placeholder="5,000" placeholderTextColor={C.textLight} keyboardType="number-pad" />
        </View>

        <View style={a2.rateCard}>
          <View style={a2.rateRow}>
            <Text style={a2.rateLabel}>Rate</Text>
            <Text style={a2.rateValue}>{Math.round(RATE * 100)}%</Text>
          </View>
          <View style={[a2.rateRow, { marginTop: 10 }]}>
            <Text style={a2.receiveLabel}>You receive</Text>
            <Text style={a2.receiveValue}>{fmt(Math.floor((Number(amount) || 0) * RATE))}</Text>
          </View>
        </View>

        <View style={a2.note}>
          <Text style={a2.noteText}>Transfer the airtime to {RECEIVER}, then tap Submit. Wallet credited in ~5 mins.</Text>
        </View>
      </ScrollView>

      <PayBar label="Submit" onPress={makeRequest} disabled={!(network && senderPhone.length >= 10 && Number(amount) > 0)} />
    </View>
  );
}

const RATE = 0.85;
const RECEIVER = "0803 000 0000";
const a2 = StyleSheet.create({
  naira: { fontSize: 15, fontWeight: "700", color: C.text, marginRight: 8 },
  rateCard: { backgroundColor: C.white, borderRadius: 20, padding: 18, marginTop: 20, shadowColor: "#1A2680", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.07, shadowRadius: 14, elevation: 2 },
  rateRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  rateLabel: { fontSize: 13, color: C.textMuted, fontWeight: "500" },
  rateValue: { fontSize: 13, color: C.text, fontWeight: "800" },
  receiveLabel: { fontSize: 15, color: C.text, fontWeight: "700" },
  receiveValue: { fontSize: 22, color: C.credit, fontWeight: "900" },
  note: { backgroundColor: C.gold + "24", borderRadius: 16, padding: 14, marginTop: 16 },
  noteText: { fontSize: 12, color: C.text, fontWeight: "500", lineHeight: 18 },
});

const styles = withPayStyles(StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  header: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingHorizontal: S.xl, paddingVertical: S.base,
  },
  headerTitle: { fontSize: F.lg, fontWeight: "800", color: C.white },
  scroll: { paddingBottom: 140 },

  label: { fontSize: F.sm, fontWeight: "800", color: C.text, marginTop: S.md, marginBottom: S.sm, paddingHorizontal: S.xl },

  networkRow: { flexDirection: "row", gap: S.sm, paddingHorizontal: S.xl, paddingVertical: 4 },
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
