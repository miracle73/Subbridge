import React from "react";
import { Modal, View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import { C, F, R, S } from "../utils/theme";

const OPTIONS = [
  {
    id: "automated",
    icon: "flash-outline",
    title: "Automated Funding",
    desc: "Fund instantly from your dedicated bank account",
    badge: "Recommended",
  },
  {
    id: "oneTime",
    icon: "time-outline",
    title: "One-time Funding",
    desc: "Coming soon",
    comingSoon: true,
  },
];

export default function AddMoneySheet({ visible, onClose, bankName, accountNumber, onSelect, onToast }) {
  const insets = useSafeAreaInsets();

  const copyAccount = async () => {
    if (!accountNumber || accountNumber === "N/A") return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await Clipboard.setStringAsync(accountNumber);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onToast && onToast("Account number copied", "success");
  };

  const pick = (opt) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (opt.comingSoon) {
      onToast && onToast("One-time Funding coming soon");
      return;
    }
    onSelect && onSelect(opt);
  };

  return (
    <Modal visible={!!visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
      <View style={[styles.sheet, { paddingBottom: insets.bottom + S.base }]}>
        <View style={styles.handle} />
        <Text style={styles.title}>Add Money</Text>
        <Text style={styles.subtitle}>Fund instantly using the account below</Text>

        <View style={styles.accountCard}>
          <View style={styles.accountLeft}>
            <View style={styles.bankIcon}>
              <Ionicons name="business-outline" size={18} color={C.primary} />
            </View>
            <View>
              <Text style={styles.bankLabel}>{bankName || "Bank"}</Text>
              <Text style={styles.accountNum}>{accountNumber || "N/A"}</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.copyBtn} onPress={copyAccount} activeOpacity={0.7}>
            <Ionicons name="copy-outline" size={15} color={C.primary} />
            <Text style={styles.copyText}>Copy</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.accountNote}>
          Transfers to this account are auto-credited instantly.
        </Text>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: C.overlay },
  sheet: {
    backgroundColor: C.white,
    borderTopLeftRadius: R.xl,
    borderTopRightRadius: R.xl,
    paddingHorizontal: S.xl,
    paddingTop: S.sm,
  },
  handle: {
    width: 40, height: 4, borderRadius: 2, backgroundColor: C.border,
    alignSelf: "center", marginBottom: S.base,
  },
  title: { fontSize: F.xxl, fontWeight: "900", color: C.text },
  subtitle: { fontSize: F.sm, color: C.textMuted, marginTop: 2, marginBottom: S.base },
  optionRow: {
    flexDirection: "row", alignItems: "center", gap: S.md,
    backgroundColor: C.white, borderRadius: R.md, padding: S.base,
    borderWidth: 1, borderColor: C.border, marginBottom: S.sm,
  },
  optionIcon: {
    width: 40, height: 40, borderRadius: R.sm, backgroundColor: C.primaryLight,
    alignItems: "center", justifyContent: "center",
  },
  optionTitleRow: { flexDirection: "row", alignItems: "center", gap: S.sm },
  optionTitle: { fontSize: F.md, fontWeight: "800", color: C.text },
  badge: {
    backgroundColor: C.accent + "18", borderRadius: R.xs,
    paddingHorizontal: 6, paddingVertical: 2,
  },
  badgeText: { fontSize: 9, fontWeight: "800", color: C.accentDark },
  optionDesc: { fontSize: F.xs, color: C.textMuted, marginTop: 2 },
  accountCard: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    backgroundColor: C.primaryLight, borderRadius: R.md, padding: S.base,
    marginBottom: S.sm, borderWidth: 1, borderColor: C.primary + "22",
  },
  accountLeft: { flexDirection: "row", alignItems: "center", gap: S.sm },
  bankIcon: {
    width: 36, height: 36, borderRadius: R.xs, backgroundColor: C.white,
    alignItems: "center", justifyContent: "center",
  },
  bankLabel: { fontSize: F.xs, color: C.textMuted, fontWeight: "600" },
  accountNum: { fontSize: F.lg, fontWeight: "800", color: C.text, letterSpacing: 0.5 },
  copyBtn: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: C.white, borderRadius: R.xs,
    paddingHorizontal: S.md, paddingVertical: S.sm,
    borderWidth: 1, borderColor: C.border,
  },
  copyText: { fontSize: F.xs, fontWeight: "700", color: C.primary },
  accountNote: { fontSize: F.xs, color: C.textMuted, textAlign: "center", marginTop: S.sm, marginBottom: S.sm },
});
