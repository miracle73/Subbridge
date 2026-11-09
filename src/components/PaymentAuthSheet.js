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

export default function PaymentAuthSheet({ visible, onClose, onPinAuth, onBiometricAuth, onForgotPin }) {
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
          <View style={styles.handle} />
          <Text style={styles.title}>Confirm Payment</Text>

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
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: C.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: 12,
    alignItems: "center",
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: C.border,
    alignSelf: "center",
    marginBottom: 20,
  },
  title: {
    fontSize: F.lg,
    fontWeight: "700",
    color: C.text,
    textAlign: "center",
    marginBottom: 24,
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
  forgotPinText: { fontSize: F.sm, color: C.primary, fontWeight: "700" },
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
