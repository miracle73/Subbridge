import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Image } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { C } from "../utils/theme";
import { getNetworkLogo } from "../utils/logos";
import { FadeIn, Float, PressScale, Gloss } from "./Motion";

// Shared building blocks for the Figma service screens (Airtime, Data, Cable, Electricity, Airtime to Cash).
const shadow = { shadowColor: "#1A2680", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.07, shadowRadius: 14, elevation: 2 };

export function ServiceHeader({ title, onBack }) {
  return (
    <View style={ui.header}>
      <TouchableOpacity style={ui.back} onPress={onBack}>
        <Ionicons name="arrow-back" size={20} color={C.text} />
      </TouchableOpacity>
      <Text style={ui.headerTitle}>{title}</Text>
      <View style={{ width: 40 }} />
    </View>
  );
}

export function ServiceHero({ title, subtitle, emoji }) {
  return (
    <FadeIn>
      <LinearGradient colors={[C.primary, C.primaryDark]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={ui.hero}>
<Gloss />
        <Float style={ui.heroBlob} range={8} />
        <View style={{ flex: 1 }}>
          <Text style={ui.heroTitle}>{title}</Text>
          <Text style={ui.heroSub}>{subtitle}</Text>
        </View>
        {emoji ? <Text style={ui.heroEmoji}>{emoji}</Text> : null}
      </LinearGradient>
    </FadeIn>
  );
}

export const Label = ({ children, style }) => <Text style={[ui.label, style]}>{children}</Text>;

/** Network / provider cards with the real brand logos. */
export function NetworkChips({ items = [], selectedId, onSelect }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={ui.chipsRow}>
      {items.map((n) => {
        const on = n.id === selectedId;
        const logo = n.logo || getNetworkLogo(n.id) || getNetworkLogo(n.name);
        return (
          <PressScale key={n.id} style={[ui.chip, on && ui.chipOn]} onPress={() => onSelect(n)}>
            {logo ? <Image source={logo} style={ui.chipLogo} /> : <View style={[ui.chipLogo, { backgroundColor: C.primaryLight }]} />}
            <Text style={ui.chipText} numberOfLines={1}>{n.name}</Text>
          </PressScale>
        );
      })}
    </ScrollView>
  );
}

/** Pill tabs (Daily/Weekly/Monthly, Prepaid/Postpaid, DStv/GOtv/StarTimes). */
export function SegTabs({ items, value, onChange }) {
  return (
    <View style={ui.seg}>
      {items.map((t) => {
        const on = t === value;
        return (
          <TouchableOpacity key={t} style={[ui.segItem, on && ui.segOn]} onPress={() => onChange(t)} activeOpacity={0.8}>
            <Text style={[ui.segText, on && { color: C.white }]}>{t}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export function PayBar({ label, onPress, disabled }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[ui.bar, { paddingBottom: 20 + Math.max(insets.bottom, 16) }]}>
      <PressScale style={[ui.payBtn, disabled && ui.payOff]} onPress={onPress} disabled={disabled} scale={0.97}>
        <Text style={[ui.payText, disabled && { color: C.textMuted }]}>{label}</Text>
      </PressScale>
    </View>
  );
}

export const ui = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 24, paddingVertical: 12 },
  back: { width: 40, height: 40, borderRadius: 20, backgroundColor: C.white, alignItems: "center", justifyContent: "center", ...shadow },
  headerTitle: { fontSize: 18, fontWeight: "800", color: C.text },
  hero: { flexDirection: "row", alignItems: "center", borderRadius: 24, paddingHorizontal: 20, height: 110, marginHorizontal: 24, marginTop: 8, overflow: "hidden" },
  heroBlob: { position: "absolute", width: 140, height: 140, borderRadius: 70, top: -30, right: -30, backgroundColor: "rgba(255,176,32,0.25)" },
  heroTitle: { fontSize: 20, fontWeight: "900", color: C.white },
  heroSub: { fontSize: 13, fontWeight: "500", color: C.onPrimaryMuted, marginTop: 6 },
  heroEmoji: { fontSize: 34, marginRight: 4 },
  label: { fontSize: 14, fontWeight: "800", color: C.text, marginTop: 22, marginBottom: 10 },
  chipsRow: { gap: 9, paddingRight: 24 },
  chip: { width: 78, height: 64, borderRadius: 18, backgroundColor: C.white, alignItems: "center", justifyContent: "center", gap: 6 },
  chipOn: { backgroundColor: C.primary + "1A", borderWidth: 1.5, borderColor: C.primary + "55" },
  chipLogo: { width: 26, height: 26, borderRadius: 13 },
  chipText: { fontSize: 12, fontWeight: "600", color: C.text },
  field: { flexDirection: "row", alignItems: "center", backgroundColor: C.white, borderRadius: 16, height: 54, paddingHorizontal: 18, ...shadow },
  input: { flex: 1, fontSize: 15, fontWeight: "500", color: C.text },
  seg: { flexDirection: "row", backgroundColor: C.white, borderRadius: 16, padding: 4, ...shadow },
  segItem: { flex: 1, height: 40, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  segOn: { backgroundColor: C.primary },
  segText: { fontSize: 14, fontWeight: "800", color: C.textMuted },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  amount: { width: "31%", height: 50, borderRadius: 16, backgroundColor: C.white, alignItems: "center", justifyContent: "center" },
  amountOn: { backgroundColor: C.primary },
  amountText: { fontSize: 15, fontWeight: "800", color: C.text },
  note: { fontSize: 13, fontWeight: "500", color: C.textMuted, textAlign: "center", marginTop: 20 },
  bar: { position: "absolute", left: 0, right: 0, bottom: 0, paddingHorizontal: 24, paddingTop: 12, backgroundColor: C.bg },
  payBtn: { backgroundColor: C.primary, borderRadius: 18, height: 56, alignItems: "center", justifyContent: "center", shadowColor: C.primary, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.25, shadowRadius: 16, elevation: 4 },
  payOff: { backgroundColor: "#E6E9F5", shadowOpacity: 0, elevation: 0 },
  payText: { fontSize: 16, fontWeight: "800", color: C.white },
});
