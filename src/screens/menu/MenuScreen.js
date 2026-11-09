import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, StatusBar } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { C, F, R, S } from "../../utils/theme";

const MENU_ITEMS = [
  { id: "airtime", icon: "phone-portrait-outline", label: "Airtime", screen: "Airtime", color: C.primary },
  { id: "data", icon: "wifi-outline", label: "Data", screen: "Data", color: C.accent },
  { id: "cable", icon: "tv-outline", label: "Cable TV", screen: "CableTv", color: C.warning },
  { id: "electricity", icon: "flash-outline", label: "Electricity", screen: "Electricity", color: "#FF6B35" },
  { id: "referral", icon: "people-outline", label: "Referral", screen: "Rewards", color: "#8B5CF6" },
  { id: "airtimeToCash", icon: "cash-outline", label: "Airtime to Cash", screen: "AirtimeToCash", color: C.credit },
];

export default function MenuScreen({ navigation }) {
  const insets = useSafeAreaInsets();

  const go = (screen) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.navigate(screen);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      <LinearGradient colors={[C.primary, C.primaryDark]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.header, { paddingTop: insets.top + S.base }, { overflow: "hidden", borderBottomLeftRadius: 28, borderBottomRightRadius: 28 }]}><View pointerEvents="none" style={{ position: "absolute", width: 220, height: 220, borderRadius: 110, top: -90, right: -60, backgroundColor: "rgba(255,255,255,0.08)" }} /><View pointerEvents="none" style={{ position: "absolute", width: 140, height: 140, borderRadius: 70, bottom: -70, left: -30, backgroundColor: "rgba(255,176,32,0.18)" }} /><Text pointerEvents="none" style={{ position: "absolute", top: 14, right: 70, color: "#FFD36B", fontSize: 14 }}>✦</Text>
        <Text style={styles.headerTitle}>Menu</Text>
        <Text style={styles.headerSubtitle}>All services in one place</Text>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.grid} showsVerticalScrollIndicator={false}>
        {MENU_ITEMS.map((item) => (
          <TouchableOpacity key={item.id} style={styles.card} activeOpacity={0.7} onPress={() => go(item.screen)}>
            <View style={[styles.iconWrap, { backgroundColor: item.color + "15" }]}>
              <Ionicons name={item.icon} size={26} color={item.color} />
            </View>
            <Text style={styles.label}>{item.label}</Text>
            <Ionicons name="chevron-forward" size={16} color={C.textLight} style={styles.chevron} />
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  header: { paddingHorizontal: S.xl, paddingBottom: S.lg },
  headerTitle: { fontSize: F.h2, fontWeight: "900", color: C.white },
  headerSubtitle: { fontSize: F.sm, color: "rgba(255,255,255,0.75)", marginTop: 2 },
  grid: {
    flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between",
    padding: S.lg,
  },
  card: {
    width: "48%", backgroundColor: C.white, borderRadius: R.md, padding: S.base,
    marginBottom: S.md, borderWidth: 1, borderColor: C.border,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  iconWrap: {
    width: 52, height: 52, borderRadius: R.sm, alignItems: "center",
    justifyContent: "center", marginBottom: S.md,
  },
  label: { fontSize: F.md, fontWeight: "800", color: C.text },
  chevron: { position: "absolute", right: S.md, bottom: S.md },
});
