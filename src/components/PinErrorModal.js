import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, Modal } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { C, F, R, S } from "../utils/theme";

/** Shown when a purchase is attempted with the wrong transaction PIN.
 *  Try again reopens the payment sheet; Forgot PIN starts PIN recovery. */
export default function PinErrorModal({ visible, onTryAgain, onForgotPin }) {
  return (
    <Modal visible={!!visible} transparent animationType="fade" onRequestClose={onTryAgain}>
      <View style={styles.overlay}>
        <View style={styles.box}>
          <View style={styles.halo}>
            <View style={styles.iconWrap}>
              <Ionicons name="lock-closed" size={24} color={C.white} />
            </View>
          </View>
          <Text style={styles.title}>PIN Incorrect</Text>
          <Text style={styles.msg}>The PIN you entered is wrong.
Please check and try again.</Text>

          <TouchableOpacity style={styles.primaryBtn} onPress={onTryAgain}>
            <Text style={styles.primaryText}>Try again</Text>
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
    flex: 1, backgroundColor: "rgba(5,10,36,0.6)",
    justifyContent: "center", alignItems: "center", padding: S.xl,
  },
  box: {
    backgroundColor: C.white, borderRadius: 28, padding: S.xl,
    width: "100%", maxWidth: 360, alignItems: "center",
  },
  halo: { width: 80, height: 80, borderRadius: 40, backgroundColor: C.debit + "1F", alignItems: "center", justifyContent: "center", marginBottom: S.base },
  iconWrap: { width: 50, height: 50, borderRadius: 25, backgroundColor: C.debit, alignItems: "center", justifyContent: "center" },
  title: { fontSize: F.h3, fontWeight: "800", color: C.text },
  msg: {
    fontSize: F.md, color: C.textMuted, textAlign: "center",
    marginTop: S.sm, marginBottom: S.lg, lineHeight: 21,
  },
  primaryBtn: {
    width: "100%", backgroundColor: C.primary, borderRadius: 16,
    paddingVertical: 16, alignItems: "center",
  },
  primaryText: { color: C.white, fontSize: F.lg, fontWeight: "700" },
  secondaryBtn: { paddingVertical: S.md, marginTop: S.xs },
  secondaryText: { color: C.debit, fontSize: F.md, fontWeight: "700" },
});
