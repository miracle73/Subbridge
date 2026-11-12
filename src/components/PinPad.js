import { Biometrics } from "../utils/biometrics";
import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { C, S } from "../utils/theme";

const CELL = 72;
const GAP = 14;

const KEYS = [
  ["1", "2", "3"],
  ["4", "5", "6"],
  ["7", "8", "9"],
  ["bio", "0", "del"],
];

export default function PinPad({ onPress, onBiometric }) {
  // Show the face icon on Face ID / face-unlock phones, fingerprint otherwise.
  const [face, setFace] = React.useState(false);
  React.useEffect(() => { Biometrics.label().then((l) => setFace(l === "Face ID")).catch(() => {}); }, []);
  const handle = (k) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (k === "bio") { onBiometric && onBiometric(); return; }
    if (k === "del") { onPress && onPress("del"); return; }
    onPress && onPress(k);
  };

  return (
    <View style={styles.grid}>
      {KEYS.map((row, ri) => (
        <View key={ri} style={styles.row}>
          {row.map((k) => {
            if (k === "bio") {
              return onBiometric ? (
                <TouchableOpacity key={k} style={[styles.cell, styles.bioCell]} onPress={() => handle(k)}>
                  <Ionicons name={face ? "scan-outline" : "finger-print-outline"} size={26} color={C.primary} />
                </TouchableOpacity>
              ) : <View key={k} style={styles.cellEmpty} />;
            }
            if (k === "del") {
              return (
                <TouchableOpacity key={k} style={[styles.cell, styles.delCell]} onPress={() => handle(k)}>
                  <Ionicons name="backspace-outline" size={26} color={C.text} />
                </TouchableOpacity>
              );
            }
            return (
              <TouchableOpacity key={k} style={styles.cell} onPress={() => handle(k)} activeOpacity={0.6}>
                <Text style={styles.key}>{k}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { alignItems: "center" },
  row: { flexDirection: "row", gap: GAP, marginBottom: GAP },
  // Design keypad: wide rounded keys, light-blue fingerprint key, plain delete key.
  cell: {
    width: 100, height: 54, borderRadius: 18,
    backgroundColor: "#F1F3FA", justifyContent: "center", alignItems: "center",
  },
  bioCell: { backgroundColor: "#E8EDFF" },
  delCell: { backgroundColor: "transparent" },
  // Invisible placeholder that keeps the 3-column grid aligned
  cellEmpty: {
    width: 100, height: 54, backgroundColor: "transparent",
  },
  key: { fontSize: 24, fontWeight: "800", color: C.text },
});
