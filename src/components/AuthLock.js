import React, { useState, useEffect, useRef } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Animated } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { C, F, R, S } from "../utils/theme";
import { SecurePin, AuthToken } from "../utils/storage";
import PinDots from "./PinDots";
import PinPad from "./PinPad";
import api from "../services/api";

export default function AuthLock({ onUnlock }) {
  const insets = useSafeAreaInsets();
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [userName, setUserName] = useState("");
  const shake = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    SecurePin.getName().then((name) => { if (name) setUserName(name); });
  }, []);

  const handleKey = async (k) => {
    if (k === "del") { setPin((p) => p.slice(0, -1)); setError(""); return; }
    if (pin.length >= 4) return;
    const next = pin + k;
    setPin(next);
    if (next.length === 4) {
      setLoading(true);
      console.log("[AuthLock] PIN entered, verifying...");
      try {
        const phone = await SecurePin.getPhone();
        console.log("[AuthLock] Phone:", phone);
        if (!phone) {
          setError("No phone found. Please login again.");
          setLoading(false);
          return;
        }

        const result = await api.signInWithPin(phone, next);
        console.log("[AuthLock] Result:", result.success, result.message);
        if (result.success) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          onUnlock();
        } else {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          setError(result.message || "Incorrect PIN");
          setPin("");
          setLoading(false);
          Animated.sequence([
            Animated.timing(shake, { toValue: 8, duration: 55, useNativeDriver: true }),
            Animated.timing(shake, { toValue: -8, duration: 55, useNativeDriver: true }),
            Animated.timing(shake, { toValue: 0, duration: 55, useNativeDriver: true }),
          ]).start();
        }
      } catch (err) {
        setError("Network error. Please try again.");
        setLoading(false);
      }
    }
  };

  const handleLogout = async () => {
    await api.logout();
    await SecurePin.clear();
    await AuthToken.clear();
    onUnlock();
  };

  return (
    <View style={styles.container}>
      <View style={styles.center}>
        <Ionicons name="finger-print" size={48} color={C.primary} />
        <Text style={styles.title}>Welcome Back</Text>
        <Text style={styles.subtitle}>{userName ? `${userName}, ` : ""}Enter your PIN to continue</Text>

        <Animated.View style={{ transform: [{ translateX: shake }] }}>
          <PinDots length={4} filled={pin.length} />
        </Animated.View>

        {error ? <Text style={styles.error}>{error}</Text> : null}
      </View>

      <View style={{ paddingBottom: insets.bottom }}>
        <PinPad onPress={handleKey} />
      </View>

      <TouchableOpacity style={[styles.logoutBtn, { marginBottom: insets.bottom + S.sm }]} onPress={handleLogout}>
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.white, paddingTop: 60 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  title: { fontSize: F.h3, fontWeight: "800", color: C.text, marginTop: S.base, marginBottom: S.sm },
  subtitle: { fontSize: F.md, color: C.textMuted, marginBottom: S.xl },
  error: { fontSize: F.sm, color: C.debit, marginTop: S.md },
  logoutBtn: { alignItems: "center", paddingVertical: S.base },
  logoutText: { fontSize: F.md, color: C.debit, fontWeight: "600" },
});
