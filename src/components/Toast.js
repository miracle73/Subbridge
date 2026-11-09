import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, TouchableOpacity, Easing } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { C, F, R, S } from "../utils/theme";

const AUTO_HIDE_MS = 3800;

export default function Toast({ message, type = "error", onHide }) {
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(-120)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const timer = useRef(null);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);

    if (!message) {
      Animated.parallel([
        Animated.timing(translateY, { toValue: -120, duration: 180, easing: Easing.in(Easing.ease), useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0, duration: 180, useNativeDriver: true }),
      ]).start();
      return;
    }

    translateY.setValue(-120);
    opacity.setValue(0);
    Animated.parallel([
      Animated.spring(translateY, { toValue: 0, friction: 7, tension: 70, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }),
    ]).start();

    timer.current = setTimeout(() => {
      Animated.parallel([
        Animated.timing(translateY, { toValue: -120, duration: 220, easing: Easing.in(Easing.ease), useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0, duration: 220, useNativeDriver: true }),
      ]).start(() => onHide && onHide());
    }, AUTO_HIDE_MS);

    return () => clearTimeout(timer.current);
  }, [message]);

  if (!message) return null;

  const isError = type !== "success";
  const color = isError ? C.debit : C.credit;
  const icon = isError ? "alert-circle" : "checkmark-circle";

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[styles.wrap, { top: insets.top + 8, transform: [{ translateY }], opacity }]}
    >
      <TouchableOpacity
        activeOpacity={0.9}
        style={[styles.toast, { borderColor: color, backgroundColor: isError ? "#FFF1F2" : "#EAFFFA" }]}
        onPress={() => { if (timer.current) clearTimeout(timer.current); onHide && onHide(); }}
      >
        <Ionicons name={icon} size={20} color={color} />
        <Text style={[styles.text, { color: isError ? "#C62833" : C.accentDark }]} numberOfLines={3}>
          {message}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: "absolute", left: 0, right: 0, zIndex: 9999, paddingHorizontal: S.lg },
  toast: {
    flexDirection: "row", alignItems: "center", gap: S.sm,
    borderWidth: 1.5, borderRadius: R.md,
    paddingHorizontal: S.md + 2, paddingVertical: S.md,
    backgroundColor: C.white,
    shadowColor: "#000", shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12, shadowRadius: 10, elevation: 6,
  },
  text: { flex: 1, fontSize: F.md, fontWeight: "700", lineHeight: 19 },
});
