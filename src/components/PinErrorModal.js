import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, Modal } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { C, F, R, S } from "../utils/theme";

/** Shown when a purchase is attempted with the wrong transaction PIN.
 *  Try Again reopens the payment sheet; Forgot PIN starts PIN recovery. */
export default function PinErrorModal({ visible, onTryAgain, onForgotPin }) {
  return (
    <Modal visible={!!visible} transparent animationType="fade" onRequestClose={onTryAgain}>
      <View style={styles.overlay}>
        <View style={styles.box}>
          <View style={styles.iconWrap}>
            <Ionicons name="lock-closed" size={32} color={C.white} />
          </View>
          <Text style={styles.title}>PIN Incorrect</Text>
          <Text style={styles.msg}>The PIN you entered is incorrect.</Text>

          <TouchableOpacity style={styles.primaryBtn} onPress={onTryAgain}>
            <Text style={styles.primaryText}>Try Again</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.secondaryBtn} onPress={onForgotPin}>
            <Text style={styles.secondaryText}>Forgot PIN?</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: C.overlay || "rgba(0,0,0,0.55)",
    justifyContent: "center", alignItems: "center", padding: S.xl,
  },
  box: {
    backgroundColor: C.white, borderRadius: R.lg, padding: S.xl,
    width: "100%", maxWidth: 360, alignItems: "center",
  },
  iconWrap: {
    width: 64, height: 64, borderRadius: 32, backgroundColor: C.debit,
    alignItems: "center", justifyContent: "center", marginBottom: S.base,
  },
  title: { fontSize: F.h3, fontWeight: "800", color: C.text },
  msg: {
    fontSize: F.md, color: C.textMuted, textAlign: "center",
    marginTop: S.sm, marginBottom: S.lg, lineHeight: 21,
  },
  primaryBtn: {
    width: "100%", backgroundColor: C.primary, borderRadius: R.sm,
    paddingVertical: S.md + 2, alignItems: "center",
  },
  primaryText: { color: C.white, fontSize: F.lg, fontWeight: "700" },
  secondaryBtn: { paddingVertical: S.md, marginTop: S.xs },
  secondaryText: { color: C.debit, fontSize: F.md, fontWeight: "700" },
});
