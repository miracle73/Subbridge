import { Gloss } from "./Motion";
import React from "react";
import { Modal, View, Text, TouchableOpacity, StyleSheet, ScrollView, Image } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { C, F, S } from "../utils/theme";
import { fmt, fmtShort } from "../utils/format";

/** Figma "Confirm Payment" summary screen shown before the PIN sheet.
 *  rows: [[label, value], ...] */
export default function PaymentSummary({ visible, product, kind, logo, subtitle, amount, rows = [], balance, onCancel, onPay }) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={!!visible} animationType="slide" onRequestClose={onCancel}>
      <View style={[styles.container, { paddingTop: insets.top + S.sm }]}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.back} onPress={onCancel}>
            <Ionicons name="arrow-back" size={20} color={C.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Confirm Payment</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={{ padding: S.xl, paddingBottom: 220 }} showsVerticalScrollIndicator={false}>
          <LinearGradient colors={[C.primary, C.primaryDark]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
<Gloss />
            <View style={styles.blob} />
            <Text style={styles.spark}>✦</Text>
            <View style={styles.heroRow}>
              <View style={styles.heroIcon}>{logo ? <Image source={logo} style={{ width: 48, height: 48, borderRadius: 24 }} /> : <Ionicons name="receipt-outline" size={22} color={C.primary} />}</View>
              <View style={{ flex: 1 }}>
                <Text style={styles.heroTitle}>{product}</Text>
                {subtitle ? <Text style={styles.heroSub} numberOfLines={1}>{subtitle}</Text> : null}
              </View>
            </View>
            <Text style={styles.heroAmount}>{fmt(amount)}</Text>
          </LinearGradient>

          <View style={styles.card}>
            {[["Product", kind || product], ...rows, ["Amount", fmt(amount)]].map(([label, value], i) => (
              <View key={label} style={[styles.row, i > 0 && styles.rowDivider]}>
                <Text style={styles.rowLabel}>{label}</Text>
                <Text style={styles.rowValue} numberOfLines={2}>{value}</Text>
              </View>
            ))}
            <View style={[styles.row, styles.rowDivider]}>
              <Text style={styles.rowLabel}>Fee</Text>
              <Text style={styles.rowValue}>{fmt(0)}</Text>
            </View>
            <View style={[styles.row, styles.rowDivider]}>
              <Text style={styles.rowLabel}>Cashback</Text>
              <Text style={[styles.rowValue, { color: C.credit }]}>+{fmt(Math.round((Number(amount) || 0) * 0.02))}</Text>
            </View>
          </View>

          <View style={styles.wallet}>
            <View style={{ flex: 1 }}>
              <Text style={styles.walletLabel}>Pay from wallet</Text>
              <Text style={styles.walletValue}>{fmt(balance)} available</Text>
            </View>
            <Ionicons name="checkmark-circle" size={24} color={C.primary} />
          </View>
        </ScrollView>

        <View style={[styles.bar, { paddingBottom: insets.bottom + 36 }]}>
          <TouchableOpacity style={styles.payBtn} onPress={onPay} activeOpacity={0.85}>
            <Text style={styles.payText}>Pay {fmtShort(amount)}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const shadow = { shadowColor: "#1A2680", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.08, shadowRadius: 18, elevation: 3 };
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: S.xl },
  back: { width: 40, height: 40, borderRadius: 20, backgroundColor: C.white, alignItems: "center", justifyContent: "center", ...shadow },
  headerTitle: { fontSize: F.xl, fontWeight: "800", color: C.text },

  hero: { borderRadius: 26, padding: S.xl, overflow: "hidden", ...shadow },
  blob: { position: "absolute", width: 170, height: 170, borderRadius: 85, top: -50, right: -40, backgroundColor: "rgba(255,255,255,0.08)" },
  spark: { position: "absolute", top: 18, right: 46, color: "#FFD36B", fontSize: 14, fontWeight: "800" },
  heroRow: { flexDirection: "row", alignItems: "center", gap: S.md },
  heroIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: C.white, alignItems: "center", justifyContent: "center" },
  heroTitle: { fontSize: F.lg, fontWeight: "800", color: C.white },
  heroSub: { fontSize: F.sm, color: C.onPrimaryMuted, marginTop: 2 },
  heroAmount: { fontSize: 32, fontWeight: "900", color: C.white, marginTop: S.lg },

  card: { backgroundColor: C.white, borderRadius: 24, paddingHorizontal: S.lg, marginTop: S.lg, ...shadow },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 15, gap: S.md },
  rowDivider: { borderTopWidth: 1, borderTopColor: "#EEF0F7" },
  rowLabel: { fontSize: F.md, color: C.textMuted },
  rowValue: { fontSize: F.md, fontWeight: "800", color: C.text, flexShrink: 1, textAlign: "right" },

  wallet: { flexDirection: "row", alignItems: "center", backgroundColor: C.primary + "12", borderRadius: 18, padding: S.base, marginTop: S.base },
  walletLabel: { fontSize: F.sm, color: C.textMuted },
  walletValue: { fontSize: F.base, fontWeight: "800", color: C.primary, marginTop: 2 },

  bar: { position: "absolute", left: 0, right: 0, bottom: 0, paddingHorizontal: S.xl, paddingTop: S.base, backgroundColor: C.bg },
  payBtn: { backgroundColor: C.primary, borderRadius: 18, paddingVertical: 17, alignItems: "center", shadowColor: C.primary, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.25, shadowRadius: 16, elevation: 4 },
  payText: { fontSize: F.lg, fontWeight: "800", color: C.white },
});
