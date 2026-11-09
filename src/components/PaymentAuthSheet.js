import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
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

export default function PaymentAuthSheet({ visible, onClose, onPinAuth, onBiometricAuth, onForgotPin, title = "Confirm payment", subtitle }) {
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
      onPinAuth(next);
      onClose();
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

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={() => onClose()}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => onClose()}>
        <TouchableOpacity activeOpacity={1} style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <LinearGradient colors={[C.primary, C.primaryDark]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.top}>
            <View style={styles.blob} />
            <Text style={styles.spark}>✦</Text>
            <View style={styles.topIcon}><Ionicons name="shield-checkmark" size={26} color={C.primary} /></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.topSub}>Confirm payment</Text>
              <Text style={styles.topTitle} numberOfLines={2}>{subtitle || title}</Text>
            </View>
          </LinearGradient>
          <Text style={styles.title}>Enter your 4‑digit PIN</Text>

          {checking ? (
            <ActivityIndicator color={C.primary} style={{ marginVertical: 30 }} />
          ) : (
            <>
              <Animated.View style={{ transform: [{ translateX: shake }], alignItems: "center" }}>
                <PinDots length={4} filled={pin.length} />
              </Animated.View>

              {error ? <Text style={styles.error}>{error}</Text> : null}

              {loading ? (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 16 }}>
                  <ActivityIndicator size="small" color={C.primary} />
                  <Text style={{ fontSize: F.sm, color: C.textMuted, fontWeight: "600" }}>Verifying...</Text>
                </View>
              ) : null}
            </>
          )}

          {onForgotPin ? (
            <TouchableOpacity style={styles.forgotPin} onPress={onForgotPin}>
              <Text style={styles.forgotPinText}>Forgot PIN?</Text>
            </TouchableOpacity>
          ) : null}

                    <TouchableOpacity style={styles.cancelBtn} onPress={() => onClose()}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      </TouchableOpacity>

      {!checking && (
        <View style={styles.padWrap}>
          <PinPad
            onPress={handleKey}
            onBiometric={bioAvailable ? handleBiometric : undefined}
          />
        </View>
      )}
    </Modal>
  );
}

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
