import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Platform,
  StatusBar,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { C, F, R, S } from "../utils/theme";
import api from "../services/api";
import { BiometricCrypto } from "../services/biometric";

export default function BiometricSetupScreen({ navigation }) {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    checkStatus();
  }, []);

  const checkStatus = async () => {
    setLoading(true);
    try {
      const serverStatus = await api.getBiometricStatus();
      setStatus(serverStatus);
    } catch (e) {
      setStatus({ registered: false, active: false });
    }
    setLoading(false);
  };

  const handleRegister = async () => {
    if (generating) return;
    Alert.alert(
      "Enable Biometric Payments",
      "Generate an RSA key pair on your device. The private key stays on your phone. This may take a moment.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Generate", onPress: doRegister },
      ]
    );
  };

  const doRegister = async () => {
    setGenerating(true);
    try {
      const publicKeyPem = await BiometricCrypto.generateKeyPair();
      const result = await api.registerBiometricKey(publicKeyPem);
      if (result.success) {
        Alert.alert("Success", "Biometric payments enabled. You can now pay with your fingerprint.");
        checkStatus();
      } else {
        await BiometricCrypto.deleteKeys();
        Alert.alert("Error", result.message || "Failed to register key.");
      }
    } catch (e) {
      console.error("[BiometricSetup] register error:", e);
      Alert.alert("Error", "Failed to generate or register key.");
    }
    setGenerating(false);
  };

  const handleDeregister = async () => {
    Alert.alert(
      "Disable Biometric Payments",
      "This will remove your registered key. You can re-enable anytime.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Disable",
          style: "destructive",
          onPress: async () => {
            setLoading(true);
            try {
              await api.deregisterBiometric();
              await BiometricCrypto.deleteKeys();
              Alert.alert("Done", "Biometric payments disabled.");
              checkStatus();
            } catch (e) {
              Alert.alert("Error", "Failed to deregister.");
            }
            setLoading(false);
          },
        },
      ]
    );
  };

  const isRegistered = status?.registered && status?.active;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={C.primary} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={C.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Biometric Payments</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.body}>
        {loading ? (
          <ActivityIndicator size="large" color={C.primary} style={{ marginTop: 60 }} />
        ) : (
          <>
            <View style={styles.statusCard}>
              <View style={[styles.statusDot, { backgroundColor: isRegistered ? "#27ae60" : C.textLight }]} />
              <View style={{ flex: 1 }}>
                <Text style={styles.statusLabel}>
                  {isRegistered ? "Biometric Payments Active" : "Not Configured"}
                </Text>
                {status?.createdAt && (
                  <Text style={styles.statusDate}>Registered: {new Date(status.createdAt).toLocaleDateString()}</Text>
                )}
              </View>
            </View>

            <View style={styles.infoBox}>
              <Ionicons name="information-circle" size={20} color={C.primary} />
              <Text style={styles.infoText}>
                When enabled, you can authorize purchases with your fingerprint instead of entering a PIN. Your private key never leaves this device.
              </Text>
            </View>

            {!isRegistered ? (
              <TouchableOpacity
                style={[styles.actionBtn, generating && styles.actionBtnDisabled]}
                onPress={handleRegister}
                disabled={generating}
                activeOpacity={0.8}
              >
                {generating ? (
                  <ActivityIndicator color={C.white} size="small" />
                ) : (
                  <>
                    <Ionicons name="finger-print" size={22} color={C.white} />
                    <Text style={styles.actionBtnText}>Enable Biometric Payments</Text>
                  </>
                )}
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.actionBtn, styles.dangerBtn]}
                onPress={handleDeregister}
                activeOpacity={0.8}
              >
                <Ionicons name="close-circle" size={22} color={C.white} />
                <Text style={styles.actionBtnText}>Disable Biometric Payments</Text>
              </TouchableOpacity>
            )}
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: Platform.OS === "ios" ? 56 : 40,
    paddingBottom: 16,
    paddingHorizontal: 16,
    backgroundColor: C.primary,
  },
  backBtn: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: F.lg, fontWeight: "700", color: C.white },
  body: { flex: 1, padding: 16 },
  statusCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.white,
    borderRadius: R.md,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  statusDot: { width: 12, height: 12, borderRadius: 6, marginRight: 12 },
  statusLabel: { fontSize: F.base, fontWeight: "600", color: C.text },
  statusDate: { fontSize: F.sm, color: C.textLight, marginTop: 2 },
  infoBox: {
    flexDirection: "row",
    backgroundColor: C.primaryLight,
    borderRadius: R.sm,
    padding: 14,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: C.border,
  },
  infoText: { flex: 1, fontSize: F.sm, color: C.textMuted, marginLeft: 10, lineHeight: 20 },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: C.primary,
    borderRadius: R.sm,
    height: 52,
    gap: 10,
  },
  actionBtnDisabled: { opacity: 0.6 },
  dangerBtn: { backgroundColor: "#e74c3c" },
  actionBtnText: { color: C.white, fontSize: F.base, fontWeight: "700" },
});
