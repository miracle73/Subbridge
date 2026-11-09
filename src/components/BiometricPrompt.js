import React, { useState, useEffect } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Modal, ActivityIndicator, Keyboard, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { C, F, R, S } from "../utils/theme";
import { normalizePhone } from "../utils/format";
import { Biometrics } from "../utils/biometrics";
import { SecurePin } from "../utils/storage";
import api from "../services/api";
import { BiometricCrypto } from "../services/biometric";
import { CrashLog } from "../services/crashLog";

/**
 * First-transaction opt-in: "Enable fingerprint for easy transactions?"
 * Call shouldPrompt() after a successful purchase; render the modal and
 * let it handle enable / dismiss. Shown at most once (asked flag).
 */
export async function shouldPromptBiometric() {
  try {
    const [available, enabled, asked] = await Promise.all([
      Biometrics.isAvailable(),
      Biometrics.isEnabled(),
      Biometrics.wasAsked(),
    ]);
    return available && !enabled && !asked;
  } catch {
    return false;
  }
}

export default function BiometricPrompt({ visible, onClose }) {
  const [label, setLabel] = useState("Fingerprint");
  const [step, setStep] = useState("pin"); // "pin" -> "bio" -> "keys"
  const [pinCode, setPinCode] = useState("");
  const [verifyingPin, setVerifyingPin] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (visible) {
      setError("");
      setPinCode("");
      setStep("pin");
      setVerifyingPin(false);
      Biometrics.label().then(setLabel);
    }
  }, [visible]);

  const onPinChange = (t) => {
    const clean = t.replace(/\D/g, "").slice(0, 4);
    setPinCode(clean);
    setError("");
    if (clean.length === 4) {
      Keyboard.dismiss();
    }
  };

  const verifyPinCode = async (override) => {
    const code = override || pinCode;
    if (code.length !== 4) {
      setError("Enter your 4-digit transaction PIN.");
      return;
    }
    setVerifyingPin(true);
    setError("");
    try {
      let phone = await SecurePin.getPhone();
      if (!phone) {
        const userRes = await api.getUserProfile();
        phone = userRes.data?.phone || userRes.data?.user?.phone || "";
      }
      const normalizedPhone = normalizePhone(phone || "");
      console.log("[BiometricPrompt] Verifying PIN for phone:", normalizedPhone);
      const res = await api.verifyPin(normalizedPhone, code);
      console.log("[BiometricPrompt] PIN crosscheck:", res.success);
      if (res.success) {
        // Cache the verified PIN so biometric logins/purchases use a good value
        await SecurePin.save(code, normalizedPhone || undefined);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setStep("bio");
      } else {
        setPinCode("");
        setError(res.message || "Incorrect PIN. Try again.");
      }
    } catch (e) {
      setError("Network error. Try again.");
    } finally {
      setVerifyingPin(false);
    }
  };

  const withTimeout = (promise, ms) =>
    Promise.race([
      promise,
      new Promise((_, reject) => setTimeout(() => reject(new Error(`Timed out after ${ms}ms`)), ms)),
    ]);

  const runEnable = async (skipKeys) => {
    setBusy(true);
    setError("");
    try {
      const ok = await Biometrics.authenticate(`Enable ${label} for easy transactions`);
      if (ok) {
        await Biometrics.setEnabled(true);
        await Biometrics.markAsked();
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        if (skipKeys) {
          console.log("[BiometricPrompt] Enabled without payment key setup (chosen after prior crash)");
          onClose && onClose(true);
          return;
        }
        setStep("keys");
        try {
          // Reuse an existing key pair — never regenerate when one exists.
          // Otherwise generate (raced against a timeout so the sheet can
          // never hang open) and register the public key with the server.
          let publicKeyPem = await BiometricCrypto.getPublicKeyPem();
          if (!publicKeyPem) {
            publicKeyPem = await withTimeout(BiometricCrypto.generateKeyPair(), 8000);
          }
          const keyResult = await withTimeout(api.registerBiometricKey(publicKeyPem), 8000);
          if (!keyResult.success) {
            console.log("[BiometricPrompt] Key registration failed:", keyResult.message);
          }
        } catch (keyErr) {
          console.log("[BiometricPrompt] Key generation/registration error:", keyErr);
        }
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        onClose && onClose(true);
      } else {
        setError("Authentication failed. Try again.");
      }
    } catch (e) {
      setError("Could not enable. Try again.");
    } finally {
      setBusy(false);
    }
  };

  const enable = async () => {
    try {
      const hasKeys = await BiometricCrypto.hasKeys();
      if (!hasKeys && (await CrashLog.hasKeygenCrash())) {
        Alert.alert(
          "Key setup crashed the app before",
          "Fingerprint payment key setup previously caused the app to close. What would you like to do?",
          [
            { text: "Cancel", style: "cancel" },
            { text: "Enable without payments", onPress: () => runEnable(true) },
            { text: "Retry key setup", onPress: () => runEnable(false) },
          ]
        );
        return;
      }
    } catch (e) {
      console.log("[BiometricPrompt] Gate check error:", e);
    }
    await runEnable(false);
  };

  const dismiss = async () => {
    await Biometrics.markAsked();
    onClose && onClose(false);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={dismiss}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.iconWrap}>
            <Ionicons name="finger-print" size={40} color={C.white} />
          </View>
          {step === "pin" ? (
            <>
              <Text style={styles.title}>Verify it's you</Text>
              <Text style={styles.desc}>
                Enter your 4-digit transaction PIN to enable {label} for easy transactions.
              </Text>
              <TextInput
                style={styles.pinInput}
                value={pinCode}
                onChangeText={onPinChange}
                placeholder="••••"
                placeholderTextColor={C.textLight}
                keyboardType="number-pad"
                maxLength={4}
                secureTextEntry
                autoFocus
                textAlign="center"
              />
              {error ? <Text style={styles.error}>{error}</Text> : null}
              <TouchableOpacity
                style={[styles.enableBtn, verifyingPin && { opacity: 0.7 }]}
                onPress={() => verifyPinCode()}
                disabled={verifyingPin}
              >
                {verifyingPin ? (
                  <ActivityIndicator size="small" color={C.white} />
                ) : (
                  <Text style={styles.enableText}>Verify PIN</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity style={styles.laterBtn} onPress={dismiss} disabled={verifyingPin}>
                <Text style={styles.laterText}>Not Now</Text>
              </TouchableOpacity>
            </>
          ) : step === "bio" ? (
            <>
              <Text style={styles.title}>Enable {label}?</Text>
              <Text style={styles.desc}>
                PIN verified. Use {label.toLowerCase()} for easy transactions — no need to type your PIN every time. Your PIN stays securely saved on this device.
              </Text>
              {error ? <Text style={styles.error}>{error}</Text> : null}
              <TouchableOpacity style={[styles.enableBtn, busy && { opacity: 0.7 }]} onPress={enable} disabled={busy}>
                {busy ? (
                  <ActivityIndicator size="small" color={C.white} />
                ) : (
                  <Text style={styles.enableText}>Enable {label}</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity style={styles.laterBtn} onPress={dismiss} disabled={busy}>
                <Text style={styles.laterText}>Not Now</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={styles.title}>Setting up...</Text>
              <Text style={styles.desc}>Generating secure keys for biometric payments.</Text>
              <ActivityIndicator size="large" color={C.primary} style={{ marginTop: S.xl }} />
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: C.overlay, justifyContent: "center", padding: S.xl },
  sheet: { backgroundColor: C.white, borderRadius: R.lg, padding: S.xl, alignItems: "center" },
  iconWrap: {
    width: 72, height: 72, borderRadius: 36, backgroundColor: C.primary,
    alignItems: "center", justifyContent: "center", marginBottom: S.base,
  },
  title: { fontSize: F.h3, fontWeight: "800", color: C.text },
  desc: { fontSize: F.md, color: C.textMuted, textAlign: "center", lineHeight: 21, marginTop: S.sm },
  pinInput: {
    width: 160, marginTop: S.lg,
    backgroundColor: C.inputBg, borderWidth: 1.5, borderColor: C.border,
    borderRadius: R.sm, paddingVertical: S.md,
    fontSize: F.h2, fontWeight: "800", color: C.text, letterSpacing: 10,
  },
  error: { fontSize: F.sm, color: C.debit, marginTop: S.sm },
  enableBtn: {
    width: "100%", backgroundColor: C.primary, borderRadius: R.sm,
    paddingVertical: S.md + 2, alignItems: "center", marginTop: S.xl,
  },
  enableText: { color: C.white, fontSize: F.lg, fontWeight: "700" },
  laterBtn: { paddingVertical: S.md, marginTop: S.xs },
  laterText: { fontSize: F.md, color: C.textMuted, fontWeight: "600" },
});
