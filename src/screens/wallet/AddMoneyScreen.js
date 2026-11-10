import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, StatusBar, Share } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import { C, F, S } from "../../utils/theme";
import { fmt } from "../../utils/format";
import Toast from "../../components/Toast";

/** Figma "Add Money": balance card, transfer accounts with Copy, card/USSD option. */
export default function AddMoneyScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const { balance = 0, accounts = [], accountName = "" } = route.params || {};
  const [toast, setToast] = useState("");

  const copy = async (no) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await Clipboard.setStringAsync(no);
    setToast("Account number copied");
  };
  const share = () => {
    const a = accounts[0];
    if (a) Share.share({ message: `${a.bankName}\n${a.accountNumber}\n${accountName}` });
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + S.sm }]}>
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />
      <View style={styles.header}>
        <TouchableOpacity style={styles.back} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color={C.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add Money</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: S.xl, paddingBottom: 140 }} showsVerticalScrollIndicator={false}>
        <LinearGradient colors={[C.primary, C.primaryDark]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
          <View style={styles.blob} />
          <Text style={styles.heroLabel}>Wallet balance</Text>
          <Text style={styles.heroAmount}>{fmt(balance)}</Text>
          <Text style={styles.heroNote}>Transfers reflect instantly</Text>
        </LinearGradient>

        <Text style={styles.section}>Transfer to any of your accounts</Text>
        {accounts.map((a) => (
          <View key={a.accountNumber} style={styles.acct}>
            <View style={{ flex: 1 }}>
              <View style={styles.bankPill}><Text style={styles.bankText}>{a.bankName}</Text></View>
              <Text style={styles.acctNo}>{a.accountNumber}</Text>
              <Text style={styles.acctName} numberOfLines={1}>{accountName}{a.fee ? ` · ${a.fee}` : ""}</Text>
            </View>
            <TouchableOpacity style={styles.copy} onPress={() => copy(a.accountNumber)}>
              <Text style={styles.copyText}>Copy</Text>
            </TouchableOpacity>
          </View>
        ))}

        <Text style={styles.section}>Or pay with card</Text>
        <View style={styles.cardRow}>
          <Text style={styles.cardText}>💳  Debit card / USSD</Text>
          <Ionicons name="chevron-forward" size={20} color={C.textMuted} />
        </View>
      </ScrollView>

      <View style={[styles.bar, { paddingBottom: insets.bottom + 36 }]}>
        <TouchableOpacity style={styles.btn} onPress={share} activeOpacity={0.85}>
          <Text style={styles.btnText}>Share account details</Text>
        </TouchableOpacity>
      </View>
      <Toast message={toast} type="success" onHide={() => setToast("")} />
    </View>
  );
}

const shadow = { shadowColor: "#1A2680", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.08, shadowRadius: 18, elevation: 3 };
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: S.xl },
  back: { width: 40, height: 40, borderRadius: 20, backgroundColor: C.white, alignItems: "center", justifyContent: "center", ...shadow },
  headerTitle: { fontSize: F.xl, fontWeight: "800", color: C.text },
  hero: { borderRadius: 24, padding: S.xl, minHeight: 120, overflow: "hidden", ...shadow },
  blob: { position: "absolute", width: 170, height: 170, borderRadius: 85, top: -50, right: -40, backgroundColor: "rgba(255,255,255,0.08)" },
  heroLabel: { fontSize: F.sm, color: C.onPrimaryMuted, fontWeight: "600" },
  heroAmount: { fontSize: 30, fontWeight: "900", color: C.white, marginTop: 4 },
  heroNote: { fontSize: F.sm, color: C.gold, fontWeight: "700", marginTop: S.sm },
  section: { fontSize: F.base, fontWeight: "800", color: C.text, marginTop: S.xl, marginBottom: S.md },
  acct: { flexDirection: "row", alignItems: "center", backgroundColor: C.white, borderRadius: 22, padding: S.lg, marginBottom: S.md, ...shadow },
  bankPill: { alignSelf: "flex-start", backgroundColor: C.primaryLight, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  bankText: { fontSize: 11, fontWeight: "800", color: C.primary },
  acctNo: { fontSize: 22, fontWeight: "900", color: C.text, marginTop: S.sm },
  acctName: { fontSize: F.sm, color: C.textMuted, marginTop: 4 },
  copy: { backgroundColor: C.primary, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10 },
  copyText: { fontSize: F.sm, fontWeight: "800", color: C.white },
  cardRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: C.white, borderRadius: 18, padding: S.lg, ...shadow },
  cardText: { fontSize: F.base, fontWeight: "700", color: C.text },
  soon: { fontSize: F.xs, fontWeight: "800", color: C.gold },
  bar: { position: "absolute", left: 0, right: 0, bottom: 0, paddingHorizontal: S.xl, paddingTop: S.base, backgroundColor: C.bg },
  btn: { backgroundColor: C.primary, borderRadius: 18, paddingVertical: 17, alignItems: "center" },
  btnText: { fontSize: F.lg, fontWeight: "800", color: C.white },
});
