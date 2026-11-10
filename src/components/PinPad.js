import { Biometrics } from "../utils/biometrics";
import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { C, S } from "../utils/theme";

const CELL = 66;
const GAP = 16;

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
                <TouchableOpacity key={k} style={styles.cell} onPress={() => handle(k)}>
                  <Ionicons name={face ? "scan-outline" : "finger-print-outline"} size={26} color={C.primary} />
                </TouchableOpacity>
              ) : <View key={k} style={styles.cellEmpty} />;
            }
            if (k === "del") {
              return (
                <TouchableOpacity key={k} style={styles.cell} onPress={() => handle(k)}>
                  <Ionicons name="backspace-outline" size={24} color={C.textMuted} />
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
  cell: {
    width: CELL, height: CELL, borderRadius: CELL / 2,
    backgroundColor: C.inputBg, justifyContent: "center", alignItems: "center",
  },
  // Invisible placeholder that keeps the 3-column grid aligned
  cellEmpty: {
    width: CELL, height: CELL, backgroundColor: "transparent",
  },
  key: { fontSize: 22, fontWeight: "600", color: C.text },
});
