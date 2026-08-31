import React, { useEffect, useRef } from "react";
import { View, Text, ActivityIndicator, StyleSheet } from "react-native";
import { C, F, R, S } from "../utils/theme";

export default function ProcessingOverlay({ visible, message = "Processing..." }) {
  if (!visible) return null;
  return (
    <View style={styles.overlay}>
      <View style={styles.box}>
        <ActivityIndicator size="large" color={C.white} />
        <Text style={styles.text}>{message}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: C.overlay,
    justifyContent: "center", alignItems: "center",
    zIndex: 999,
  },
  box: {
    backgroundColor: C.primaryDark, paddingHorizontal: S.xl, paddingVertical: S.xl,
    borderRadius: R.lg, alignItems: "center", gap: S.base,
    minWidth: 180,
  },
  text: { color: C.white, fontSize: F.md, fontWeight: "600" },
});
