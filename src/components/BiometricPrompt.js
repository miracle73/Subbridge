import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Modal, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { C, F, R, S } from "../utils/theme";
import { Biometrics } from "../utils/biometrics";

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
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (visible) {
      setError("");
      Biometrics.label().then(setLabel);
    }
  }, [visible]);

  const enable = async () => {
    setBusy(true);
    setError("");
    try {
      const ok = await Biometrics.authenticate(`Enable ${label} for easy transactions`);
      if (ok) {
        await Biometrics.setEnabled(true);
        await Biometrics.markAsked();
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
          <Text style={styles.title}>Enable {label}?</Text>
          <Text style={styles.desc}>
            Use {label.toLowerCase()} for easy transactions — no need to type your PIN every time. Your PIN stays securely saved on this device.
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
  error: { fontSize: F.sm, color: C.debit, marginTop: S.sm },
  enableBtn: {
    width: "100%", backgroundColor: C.primary, borderRadius: R.sm,
    paddingVertical: S.md + 2, alignItems: "center", marginTop: S.xl,
  },
  enableText: { color: C.white, fontSize: F.lg, fontWeight: "700" },
  laterBtn: { paddingVertical: S.md, marginTop: S.xs },
  laterText: { fontSize: F.md, color: C.textMuted, fontWeight: "600" },
});
