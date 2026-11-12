import { DEMO_MODE } from "../services/demoMode";
import AuthBackground from "./AuthBackground";
import React, { useState, useEffect, useRef } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Animated, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { C, F, R, S } from "../utils/theme";
import { SecurePin, AuthToken, NavState } from "../utils/storage";
import { Biometrics } from "../utils/biometrics";
import { resetBiometricState } from "../services/biometric";
import PinDots from "./PinDots";
import PinPad from "./PinPad";
import api from "../services/api";

export default function AuthLock({ onUnlock, onLogout, onForgotPin }) {
  const insets = useSafeAreaInsets();
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [userName, setUserName] = useState("");
  const [bioReady, setBioReady] = useState(false);
  const shake = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    SecurePin.getName().then((name) => { if (name) setUserName(name); });
    Promise.all([Biometrics.isAvailable(), Biometrics.isEnabled()]).then(([a, e]) => {
      setBioReady(a && e);
    });
  }, []);

  const handleKey = async (k) => {
    if (loading) return;
    if (k === "del") { setPin((p) => p.slice(0, -1)); setError(""); return; }
    if (pin.length >= 4) return;
    const next = pin + k;
    setPin(next);
    if (next.length === 4) submitPin(next);
  };

  const loginWithBiometric = async () => {
    if (loading) return;
    setLoading(true);
    setError("");
    const { pin: savedPin, error: bioError } = await Biometrics.getPinWithBiometric("Unlock SubBridge");
    if (bioError || !savedPin) {
      setError(bioError || "Biometric unlock failed.");
      setLoading(false);
      return;
    }
    setPin(savedPin);
    await submitPin(savedPin);
  };

  const submitPin = async (value) => {
    setLoading(true);
    setError("");
    try {
      let currentPhone = (await SecurePin.getPhone()) || (DEMO_MODE ? "08114516826" : null);
      if (!currentPhone) {
        const userRes = await api.getUserProfile();
        currentPhone = userRes.data?.phone || userRes.data?.user?.phone || "";
      }
      if (!currentPhone) {
        setError("No phone found. Please login again.");
        setPin("");
        setLoading(false);
        return;
      }

      const result = await api.signInWithPin(currentPhone, value);
      if (result.success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        await SecurePin.save(value, currentPhone);
        const user = result.data?.user;
        const fullName = user ? `${user.firstName || user.firstname || ""} ${user.lastName || user.lastname || ""}`.trim() : "";
        if (fullName) await SecurePin.setName(fullName);
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
      setPin("");
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    // Wipe biometric setup first — server deregister needs the live token
    await resetBiometricState();
    await api.logout();
    await SecurePin.clear();
    await AuthToken.clear();
    await NavState.clear();
    if (onLogout) onLogout();
    else onUnlock();
  };

  // Design "Enter PIN": blue top with greeting, white rounded sheet with dots + keypad.
  return (
    <View style={lk.container}>
      <View style={[lk.top, { paddingTop: insets.top + 32 }]}>
        <AuthBackground />
        <View style={lk.row}>
          <View style={lk.avatar}>
            {userName ? <Text style={lk.initial}>{userName.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()}</Text> : <Ionicons name="person" size={30} color={C.primary} />}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={lk.welcome}>Welcome back,</Text>
            <Text style={lk.name}>{userName ? userName.split(" ")[0].toUpperCase() : "THERE"}</Text>
          </View>
        </View>
        <Text style={lk.hint}>Enter your passcode to continue.</Text>
      </View>

      <View style={lk.sheet}>
        <Animated.View style={{ transform: [{ translateX: shake }] }}>
          <PinDots length={4} filled={pin.length} />
        </Animated.View>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {loading ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 12 }}>
            <ActivityIndicator size="small" color={C.primary} />
            <Text style={{ fontSize: F.sm, color: C.textMuted, fontWeight: "600" }}>Verifying...</Text>
          </View>
        ) : null}
        <View style={{ marginTop: 24 }}>
          <PinPad onPress={handleKey} onBiometric={bioReady ? loginWithBiometric : undefined} />
        </View>
        {onForgotPin ? (
          <TouchableOpacity style={{ paddingVertical: 10 }} onPress={onForgotPin}>
            <Text style={lk.forgot}>Forgot PIN?</Text>
          </TouchableOpacity>
        ) : null}
        <TouchableOpacity style={{ paddingVertical: 6 }} onPress={handleLogout}>
          <Text style={lk.logout}>Sign out</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }} />
        <View style={[lk.secured, { marginBottom: insets.bottom + 20 }]}>
          <Ionicons name="shield-checkmark-outline" size={14} color={C.textMuted} />
          <Text style={lk.securedText}>Secured by SubBridge</Text>
        </View>
      </View>
    </View>
  );
}

const lk = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.white },
  top: { paddingHorizontal: 24, paddingBottom: 64, overflow: "hidden" },
  row: { flexDirection: "row", alignItems: "center", gap: 16 },
  avatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: C.white, alignItems: "center", justifyContent: "center", borderWidth: 4, borderColor: "rgba(255,255,255,0.35)" },
  initial: { fontSize: 22, fontWeight: "900", color: C.primary },
  welcome: { fontSize: 15, color: C.onPrimaryMuted },
  name: { fontSize: 26, fontWeight: "900", color: C.white },
  hint: { fontSize: 15, color: C.onPrimaryMuted, marginTop: 16 },
  sheet: { flex: 1, backgroundColor: C.white, borderTopLeftRadius: 32, borderTopRightRadius: 32, marginTop: -32, alignItems: "center", paddingTop: 32 },
  forgot: { fontSize: 15, fontWeight: "800", color: C.primary },
  logout: { fontSize: 15, fontWeight: "800", color: C.debit },
  secured: { flexDirection: "row", alignItems: "center", gap: 6 },
  securedText: { fontSize: 12, fontWeight: "600", color: C.textMuted },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.white, paddingTop: 60 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  profileAvatar: {
    width: 80, height: 80, borderRadius: 40, backgroundColor: C.primaryLight,
    justifyContent: "center", alignItems: "center", borderWidth: 3, borderColor: C.primary,
  },
  profileInitial: { fontSize: 36, fontWeight: "800", color: C.primary },
  title: { fontSize: F.h3, fontWeight: "800", color: C.text, marginTop: S.base, marginBottom: S.sm },
  subtitle: { fontSize: F.md, color: C.textMuted, marginBottom: S.xl },
  error: { fontSize: F.sm, color: C.debit, marginTop: S.md },
  forgotPin: { alignItems: "center", paddingVertical: S.sm },
  forgotPinText: { fontSize: F.md, color: C.primary, fontWeight: "700" },
  logoutBtn: { alignItems: "center", paddingVertical: S.base },
  logoutText: { fontSize: F.md, color: C.debit, fontWeight: "600" },
});
