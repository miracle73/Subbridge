import React, { useEffect, useState } from "react";
import { TouchableOpacity, Linking, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import api from "../services/api";

const FALLBACK_NUMBER = "2348012345678";

export default function WhatsAppFab() {
  const insets = useSafeAreaInsets();
  const [number, setNumber] = useState(FALLBACK_NUMBER);

  useEffect(() => {
    let alive = true;
    api.getSupportInfo()
      .then((res) => {
        if (!alive) return;
        const digits = String(res?.data?.whatsapp || "").replace(/\D/g, "");
        if (digits) setNumber(digits);
      })
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  const openChat = () => {
    Linking.openURL(`https://wa.me/${number}`).catch(() => {});
  };

  return (
    <TouchableOpacity
      style={[styles.fab, { bottom: insets.bottom + 80 }]}
      onPress={openChat}
      activeOpacity={0.85}
      accessibilityLabel="Chat with us on WhatsApp"
      accessibilityRole="button"
    >
      <Ionicons name="logo-whatsapp" size={30} color="#FFFFFF" />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: "absolute",
    right: 14,
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: "#25D366",
    alignItems: "center",
    justifyContent: "center",
    elevation: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    zIndex: 50,
  },
});
