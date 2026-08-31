import React, { useEffect, useRef } from "react";
import { View, Text, Animated, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { C, F, S } from "../utils/theme";

export default function Preloader({ message = "Loading..." }) {
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 0.4, duration: 600, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 600, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.iconWrap, { opacity: pulse }]}>
        <Ionicons name="shield-checkmark" size={48} color={C.primary} />
      </Animated.View>
      <Text style={styles.name}>SubBridge</Text>
      <Text style={styles.msg}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: C.bg },
  iconWrap: { marginBottom: S.base },
  name: { fontSize: F.xl, fontWeight: "800", color: C.primary, marginBottom: S.xs },
  msg: { fontSize: F.sm, color: C.textMuted },
});
