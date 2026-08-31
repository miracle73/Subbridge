import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { C, F, R, S } from "../../utils/theme";

const MORE_SERVICES = [
  { id: "airtime", icon: "phone-portrait-outline", label: "Airtime", screen: "Airtime" },
  { id: "data", icon: "wifi-outline", label: "Data", screen: "Data" },
  { id: "cable", icon: "tv-outline", label: "Cable TV", screen: "CableTv" },
  { id: "electricity", icon: "flash-outline", label: "Electricity", screen: "Electricity" },
  { id: "support", icon: "help-circle-outline", label: "Support", screen: "Support" },
  { id: "profile", icon: "person-outline", label: "Profile", screen: "Profile" },
];

export default function MoreScreen({ navigation }) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={C.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>All Services</Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView contentContainerStyle={styles.grid}>
        {MORE_SERVICES.map((s) => (
          <TouchableOpacity
            key={s.id}
            style={styles.card}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); navigation.navigate(s.screen); }}
            activeOpacity={0.6}
          >
            <View style={styles.iconWrap}>
              <Ionicons name={s.icon} size={28} color={C.primary} />
            </View>
            <Text style={styles.label}>{s.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: S.xl, paddingVertical: S.base, backgroundColor: C.white },
  headerTitle: { fontSize: F.lg, fontWeight: "800", color: C.text },
  grid: { flexDirection: "row", flexWrap: "wrap", padding: S.base },
  card: {
    width: "50%", alignItems: "center", paddingVertical: S.xl,
    backgroundColor: C.white, borderRadius: R.md, margin: S.xs - 2,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  iconWrap: {
    width: 64, height: 64, borderRadius: R.md, backgroundColor: C.primaryLight,
    justifyContent: "center", alignItems: "center", marginBottom: S.md,
  },
  label: { fontSize: F.md, fontWeight: "700", color: C.text },
});
