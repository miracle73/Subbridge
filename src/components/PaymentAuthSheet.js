import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import AuthBackground from "./AuthBackground";
import { SecurePin } from "../utils/storage";
import { useDarkMode } from "../utils/darkMode";
import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ActivityIndicator,
  Animated,
} from "react-native";
import { C, F, R, S } from "../utils/theme";
import { Biometrics } from "../utils/biometrics";
import { BiometricCrypto } from "../services/biometric";
import api from "../services/api";
import PinDots from "./PinDots";
import PinPad from "./PinPad";

export default function PaymentAuthSheet({ visible, onClose, onPinAuth, onBiometricAuth, onForgotPin, title = "Confirm payment", subtitle, detail, onHelp }) {
  const [initials, setInitials] = useState("");
  const [dark, toggleDark] = useDarkMode();
  useEffect(() => { SecurePin.getName().then((n) => n && setInitials(n.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase())).catch(() => {}); }, []);
  const [pin, setPin] = useState("");
  const [bioAvailable, setBioAvailable] = useState(false);
  const [bioRegistered, setBioRegistered] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState("");
  const shake = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setPin("");
      setError("");
      setChecking(true);
      setBioAvailable(false);
      setBioRegistered(false);
      checkBiometricStatus();
    }
  }, [visible]);

  const checkBiometricStatus = async () => {
    try {
      const hasKeys = await BiometricCrypto.hasKeys();
      const status = await api.getBiometricStatus();
      const registered = status?.registered && status?.active;
      setBioRegistered(registered);
      const bioAvail = await Biometrics.isAvailable();
      setBioAvailable(bioAvail && hasKeys && registered);
    } catch {
      setBioAvailable(false);
      setBioRegistered(false);
    }
    setChecking(false);
  };

  const handleKey = (k) => {
    if (loading) return;
    if (k === "del") {
      setPin((p) => p.slice(0, -1));
      setError("");
      return;
    }
    if (pin.length >= 4) return;
    const next = pin + k;
    setPin(next);
    if (next.length === 4) {
      setTimeout(() => { onPinAuth(next); onClose(); }, 220);
    }
  };

  const handleBiometric = async () => {
    setLoading(true);
    setError("");
    try {
      // Result contract: true/undefined -> success, close the sheet;
      // false -> handled, keep sheet open; { error } -> keep open + show.
      const result = await onBiometricAuth();
      if (result && result.error) {
        setError(result.error);
        return;
      }
      if (result === false) return;
      onClose();
    } catch (e) {
      setError(e?.message ? `Biometric failed: ${e.message}` : "Biometric failed.");
    } finally {
      setLoading(false);
    }
  };

  if (!visible) return null;

  // Figma "Enter PIN": blue top with what is being paid, white sheet with dots + keypad.
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={() => onClose()}>
      <View style={fig.container}>
        <AuthBackground />
        <View style={fig.top}>
          <View style={fig.topBar}>
            <TouchableOpacity style={fig.cancel} onPress={() => onClose()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="chevron-back" size={16} color={C.white} />
              <Text style={fig.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={fig.close} onPress={toggleDark}>
              <Ionicons name={dark ? "sunny-outline" : "moon-outline"} size={18} color={C.white} />
            </TouchableOpacity>
          </View>
          <View style={fig.topRow}>
            <View style={fig.avatar}>{initials ? <Text style={fig.initials}>{initials}</Text> : <Ionicons name="person" size={26} color={C.primary} />}</View>
            <View style={{ flex: 1 }}>
              <Text style={fig.topSub}>Confirm payment</Text>
              <Text style={fig.topTitle} numberOfLines={2}>{subtitle || title}</Text>
              {detail ? <Text style={fig.detail} numberOfLines={1}>{detail}</Text> : null}
            </View>
          </View>
        </View>

        <View style={fig.sheet}>
          <Text style={fig.prompt}>Enter your 4‑digit PIN</Text>
          {checking ? (
            <ActivityIndicator color={C.primary} style={{ marginVertical: 30 }} />
          ) : (
            <>
              <Animated.View style={{ transform: [{ translateX: shake }], alignItems: "center" }}>
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
                <PinPad onPress={handleKey} onBiometric={bioAvailable ? handleBiometric : undefined} />
              </View>
            </>
          )}
          {onForgotPin ? (
            <TouchableOpacity style={{ paddingVertical: 12 }} onPress={onForgotPin}>
              <Text style={fig.forgot}>Forgot PIN?</Text>
            </TouchableOpacity>
          ) : null}
          {onHelp ? (
            <TouchableOpacity style={fig.help} onPress={() => { onClose(); onHelp(); }}>
              <Text style={fig.helpText}>🎧 Get help</Text>
            </TouchableOpacity>
          ) : null}
          <View style={{ flex: 1 }} />
          <View style={fig.secured}>
            <Ionicons name="shield-checkmark-outline" size={14} color={C.textMuted} />
            <Text style={fig.securedText}>Secured by SubBridge</Text>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const fig = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.primary },
  top: { paddingTop: 52, paddingHorizontal: 24, paddingBottom: 64 },
  topBar: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  cancel: { flexDirection: "row", alignItems: "center", gap: 4, height: 36, paddingLeft: 10, paddingRight: 14, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.15)", borderWidth: 1, borderColor: "rgba(255,255,255,0.25)" },
  cancelText: { fontSize: 14, fontWeight: "700", color: C.white },
  close: { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.15)", alignItems: "center", justifyContent: "center" },
  topRow: { flexDirection: "row", alignItems: "center", gap: 16, marginTop: 12 },
  avatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: C.white, alignItems: "center", justifyContent: "center" },
  topSub: { fontSize: 14, color: C.onPrimaryMuted, fontWeight: "500" },
  topTitle: { fontSize: 22, color: C.white, fontWeight: "900", marginTop: 2 },
  sheet: { flex: 1, backgroundColor: C.white, borderTopLeftRadius: 32, borderTopRightRadius: 32, marginTop: -32, alignItems: "center", paddingTop: 28, paddingBottom: 56 },
  prompt: { fontSize: 15, fontWeight: "600", color: C.textMuted, marginBottom: 24 },
  forgot: { fontSize: 15, fontWeight: "800", color: C.primary },
  initials: { fontSize: 22, fontWeight: "900", color: C.primary },
  detail: { fontSize: 14, color: C.onPrimaryMuted, marginTop: 4, fontWeight: "500" },
  help: { backgroundColor: C.primaryLight, borderRadius: 20, paddingHorizontal: 18, height: 40, justifyContent: "center", marginTop: 8 },
  helpText: { fontSize: 14, fontWeight: "800", color: C.primary },
  secured: { flexDirection: "row", alignItems: "center", gap: 6 },
  securedText: { fontSize: 12, fontWeight: "600", color: C.textMuted },
});

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(5,10,36,0.55)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: C.white,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingBottom: 12,
    alignItems: "center",
    overflow: "hidden",
  },
  top: { alignSelf: "stretch", flexDirection: "row", alignItems: "center", gap: 14, padding: 24, paddingBottom: 28, overflow: "hidden" },
  blob: { position: "absolute", width: 180, height: 180, borderRadius: 90, top: -70, right: -50, backgroundColor: "rgba(255,255,255,0.08)" },
  spark: { position: "absolute", top: 16, right: 40, color: "#FFD36B", fontSize: 16, fontWeight: "800" },
  topIcon: { width: 56, height: 56, borderRadius: 28, backgroundColor: C.white, alignItems: "center", justifyContent: "center" },
  topSub: { fontSize: F.sm, color: C.onPrimaryMuted, fontWeight: "600" },
  topTitle: { fontSize: F.xxl, color: C.white, fontWeight: "900", marginTop: 2 },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: C.border,
    alignSelf: "center",
    marginBottom: 20,
  },
  title: {
    fontSize: F.base,
    fontWeight: "700",
    color: C.textMuted,
    textAlign: "center",
    marginTop: 24,
    marginBottom: 20,
  },
  error: {
    fontSize: F.sm,
    color: C.debit,
    marginTop: 12,
  },
  padWrap: {
    backgroundColor: C.white,
    paddingBottom: 40,
    paddingTop: 8,
    alignItems: "center",
  },
  forgotPin: { alignItems: "center", paddingVertical: 8 },
  forgotPinText: { fontSize: F.base, color: C.primary, fontWeight: "800" },
  cancelBtn: {
    alignItems: "center",
    paddingVertical: 14,
    marginTop: 8,
  },
  cancelText: {
    fontSize: F.md,
    color: C.textLight,
    fontWeight: "600",
  },
});
