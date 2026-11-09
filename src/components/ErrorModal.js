import React from "react";
import { Modal, View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { C, F, R, S } from "../utils/theme";

export default function ErrorModal({ visible, message, onClose, title = "Error" }) {
  if (!visible || !message) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.iconWrap}>
            <Ionicons name="alert-circle-outline" size={36} color={C.debit} />
          </View>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>
          <TouchableOpacity style={styles.btn} onPress={onClose}>
            <Text style={styles.btnText}>OK</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: S.xl,
  },
  card: {
    backgroundColor: C.white,
    borderRadius: R.md,
    padding: S.xl,
    width: "100%",
    maxWidth: 420,
    maxHeight: '80%',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 10,
  },
  iconWrap: {
    alignItems: "center",
    marginBottom: S.md,
  },
  title: {
    fontSize: F.lg,
    fontWeight: "800",
    color: C.text,
    textAlign: "center",
    marginBottom: S.sm,
  },
  message: {
    fontSize: F.md,
    color: C.textMuted,
    textAlign: "center",
    marginBottom: S.xl,
    lineHeight: 22,
    flexShrink: 1,
  },
  btn: {
    backgroundColor: C.primary,
    borderRadius: R.sm,
    paddingVertical: S.md,
    alignItems: "center",
  },
  btnText: {
    fontSize: F.base,
    fontWeight: "700",
    color: C.white,
  },
});
