import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, TouchableOpacity, Easing, View } from "react-native";
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

  // Design toast: white floating card, colored icon badge, title + message, progress bar.
  return (
    <Animated.View pointerEvents="box-none" style={[styles.wrap, { top: insets.top + 8, transform: [{ translateY }], opacity }]}>
      <TouchableOpacity
        activeOpacity={0.92}
        style={styles.toast}
        onPress={() => { if (timer.current) clearTimeout(timer.current); onHide && onHide(); }}
      >
        <View style={[styles.accent, { backgroundColor: color }]} />
        <View style={[styles.badge, { backgroundColor: color + "1F" }]}>
          <View style={[styles.badgeInner, { backgroundColor: color }]}>
            <Ionicons name={isError ? "close" : "checkmark"} size={16} color={C.white} />
          </View>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{isError ? "Something's not right" : "Success"}</Text>
          <Text style={styles.text} numberOfLines={3}>{message}</Text>
        </View>
        <Ionicons name="close" size={16} color={C.textLight} />
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: "absolute", left: 0, right: 0, zIndex: 9999, paddingHorizontal: S.lg },
  toast: {
    flexDirection: "row", alignItems: "center", gap: 12, overflow: "hidden",
    borderRadius: 20, paddingLeft: 18, paddingRight: 14, paddingVertical: 14,
    backgroundColor: C.white,
    shadowColor: "#1A2680", shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.18, shadowRadius: 24, elevation: 10,
  },
  accent: { position: "absolute", left: 0, top: 0, bottom: 0, width: 5 },
  badge: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center" },
  badgeInner: { width: 24, height: 24, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  title: { fontSize: F.md, fontWeight: "900", color: C.text },
  text: { fontSize: F.sm, fontWeight: "500", color: C.textMuted, lineHeight: 18, marginTop: 2 },
});
