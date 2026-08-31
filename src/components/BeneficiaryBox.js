import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { C, F, R, S } from "../utils/theme";

export default function BeneficiaryBox({ type, onSelect, items = [] }) {
  if (items.length === 0) return null;

  const getSubtitle = (b) => {
    if (type === "cable") return b.smartcard || "";
    if (type === "electricity") return b.meter || "";
    return b.phone || "";
  };

  const getIcon = () => {
    if (type === "cable") return "tv-outline";
    if (type === "electricity") return "flash-outline";
    return "call-outline";
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <Ionicons name={getIcon()} size={16} color={C.textMuted} />
        <Text style={styles.headerText}>Recent {type === "cable" ? "Subscriptions" : type === "electricity" ? "Meters" : "Beneficiaries"}</Text>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.list}>
        {items.map((b) => (
          <TouchableOpacity
            key={b.id}
            style={styles.card}
            activeOpacity={0.6}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onSelect(b);
            }}
          >
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{b.name.charAt(0)}</Text>
            </View>
            <Text style={styles.name} numberOfLines={1}>{b.name}</Text>
            <Text style={styles.phone} numberOfLines={1}>{getSubtitle(b)}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: S.md },
  header: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: S.sm },
  headerText: { fontSize: 12, fontWeight: "600", color: C.textMuted },
  list: { gap: S.sm },
  card: {
    width: 90, alignItems: "center", backgroundColor: C.white,
    borderWidth: 1, borderColor: C.border, borderRadius: R.sm, padding: S.sm,
  },
  avatar: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: C.primaryLight,
    alignItems: "center", justifyContent: "center", marginBottom: 4,
  },
  avatarText: { fontSize: F.sm, fontWeight: "800", color: C.primary },
  name: { fontSize: 11, fontWeight: "700", color: C.text, textAlign: "center" },
  phone: { fontSize: 9, color: C.textMuted, textAlign: "center", marginTop: 1 },
});
