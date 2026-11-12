import React from "react";
import { Modal, View, Text, TouchableOpacity, StyleSheet, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { C, F, S } from "../utils/theme";

/** Bottom-sheet error (Figma "Login Failed"): red alert badge, title, message, Try again. */
export default function ErrorModal({ visible, message, onClose, title = "Something went wrong", onForgot }) {
  if (!visible || !message) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <View style={styles.halo}>
            <View style={styles.badge}>
              <Ionicons name="alert" size={28} color={C.white} />
            </View>
          </View>
          <Text style={styles.title}>{title === "Error" ? "Something went wrong" : title}</Text>
          <ScrollView style={{ maxHeight: 160 }} contentContainerStyle={{ alignItems: "center" }}>
            <Text style={styles.message}>{message}</Text>
          </ScrollView>
          <TouchableOpacity style={styles.btn} onPress={onClose} activeOpacity={0.85}>
            <Text style={styles.btnText}>Try again</Text>
          </TouchableOpacity>
          {onForgot ? (
            <TouchableOpacity onPress={() => { onClose && onClose(); onForgot(); }} style={{ marginTop: 16 }}>
              <Text style={{ fontSize: 14, fontWeight: "800", color: C.primary }}>Forgot password?</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(5,10,36,0.55)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: C.white, borderTopLeftRadius: 32, borderTopRightRadius: 32,
    paddingHorizontal: S.xl, paddingTop: S.md, paddingBottom: S.xxl + S.base, alignItems: "center",
  },
  handle: { width: 48, height: 5, borderRadius: 3, backgroundColor: "#E1E5F2", marginBottom: S.xl },
  halo: { width: 80, height: 80, borderRadius: 40, backgroundColor: C.debit + "1F", alignItems: "center", justifyContent: "center", marginBottom: S.base },
  badge: { width: 50, height: 50, borderRadius: 25, backgroundColor: C.debit, alignItems: "center", justifyContent: "center" },
  title: { fontSize: F.h3, fontWeight: "900", color: C.text, textAlign: "center" },
  message: { fontSize: F.md, color: C.textMuted, textAlign: "center", lineHeight: 21, marginTop: S.sm, marginBottom: S.xl, paddingHorizontal: S.base },
  btn: {
    alignSelf: "stretch", backgroundColor: C.primary, borderRadius: 18, paddingVertical: 17, alignItems: "center",
    shadowColor: C.primary, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.25, shadowRadius: 16, elevation: 4,
  },
  btnText: { fontSize: F.lg, fontWeight: "800", color: C.white },
});
