import React, { useEffect, useState } from "react";
import { View, Text, Animated, StyleSheet } from "react-native";
import { C, S } from "../utils/theme";

const makeAnims = (n) => Array.from({ length: n }, () => new Animated.Value(1));

export default function PinDots({ length = 4, filled = 0 }) {
  const [anims, setAnims] = useState(() => makeAnims(length));

  useEffect(() => {
    setAnims((prev) => (prev.length === length ? prev : makeAnims(length)));
  }, [length]);

  useEffect(() => {
    if (filled > 0 && filled <= anims.length) {
      const idx = filled - 1;
      Animated.sequence([
        Animated.timing(anims[idx], { toValue: 1.25, duration: 100, useNativeDriver: true }),
        Animated.timing(anims[idx], { toValue: 1, duration: 100, useNativeDriver: true }),
      ]).start();
    }
  }, [filled, anims]);

  return (
    <View style={styles.row}>
      {anims.map((a, i) => (
        <Animated.View
          key={i}
          style={[
            styles.dot,
            i < filled && styles.dotFilled,
            { transform: [{ scale: a }] },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", justifyContent: "center", gap: S.base, marginVertical: S.lg },
  dot: {
    width: 14, height: 14, borderRadius: 7,
    borderWidth: 2, borderColor: C.border, backgroundColor: "transparent",
  },
  dotFilled: {
    backgroundColor: C.primary, borderColor: C.primary,
    shadowColor: C.primary, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3, shadowRadius: 4, elevation: 4,
  },
});
