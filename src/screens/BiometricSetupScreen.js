import AuthBackground from "../components/AuthBackground";
import { brandAlert } from "../components/BrandDialog";
import React, { useState, useEffect } from "react";
import {
  ScrollView,
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
import { CrashLog } from "../services/crashLog";
import { Biometrics } from "../utils/biometrics";

const withTimeout = (promise, ms) =>
  Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(`Timed out after ${ms}ms`)), ms)),
  ]);

export default function BiometricSetupScreen({ navigation }) {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [signInOn, setSignInOn] = useState(false);
  const [bioLabel, setBioLabel] = useState("Fingerprint");
  useEffect(() => { Biometrics.label().then(setBioLabel).catch(() => {}); }, []);
  const isFace = bioLabel === "Face ID";
  useEffect(() => { Biometrics.isEnabled().then(setSignInOn).catch(() => {}); }, []);
  const toggleSignIn = async () => {
    const next = !signInOn;
    setSignInOn(next);
    try { await Biometrics.setEnabled(next); } catch { setSignInOn(!next); }
  };

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
    try {
      const hasKeys = await BiometricCrypto.hasKeys();
      if (!hasKeys && (await CrashLog.hasKeygenCrash())) {
        brandAlert(
          "Key setup crashed the app before",
          "Fingerprint key setup previously caused the app to close. What would you like to do?",
          [
            { text: "Cancel", style: "cancel" },
            { text: "Retry", onPress: () => confirmRegister() },
          ]
        );
        return;
      }
    } catch (e) {
      console.log("[BiometricSetup] Gate check error:", e);
    }
    confirmRegister();
  };

  const confirmRegister = () => {
    brandAlert(
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
      // Reuse an existing key pair when present — only generate when missing.
      let publicKeyPem = await BiometricCrypto.getPublicKeyPem();
      if (!publicKeyPem) {
        publicKeyPem = await withTimeout(BiometricCrypto.generateKeyPair(), 8000);
      }
      const result = await withTimeout(api.registerBiometricKey(publicKeyPem), 8000);
      if (result.success) {
        brandAlert("Success", "Biometric payments enabled. You can now pay with your fingerprint.");
        checkStatus();
      } else {
        // Keep any locally generated keys so a retry can reuse them
        // instead of running RSA key generation again.
        brandAlert("Error", result.message || "Failed to register key.");
      }
    } catch (e) {
      console.error("[BiometricSetup] register error:", e);
      brandAlert("Error", "Failed to generate or register key.");
    }
    setGenerating(false);
  };

  const handleDeregister = async () => {
    brandAlert(
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
              brandAlert("Done", "Biometric payments disabled.");
              checkStatus();
            } catch (e) {
              brandAlert("Error", "Failed to deregister.");
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
      <AuthBackground />
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={C.white} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={C.white} style={{ marginTop: 120 }} />
      ) : (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={[styles.body, { flexGrow: 1, paddingBottom: 80 }]}>
          <View style={styles.ringOuter}>
            <View style={styles.ringInner}>
              <Ionicons name={isFace ? "scan" : "finger-print"} size={84} color={C.white} />
            </View>
          </View>

          <Text style={styles.title}>Pay faster with{"\n"}biometrics</Text>
          <Text style={styles.sub}>
            Use {isFace ? "Face ID" : "your fingerprint"} to sign in and approve payments — no PIN typing.
          </Text>

          <TouchableOpacity style={styles.optRow} onPress={toggleSignIn} activeOpacity={0.8}>
            <Text style={styles.optLabel}>Sign in</Text>
            <View style={[styles.toggle, signInOn && styles.toggleOn]}>
              <View style={[styles.knob, signInOn && { alignSelf: "flex-end" }]} />
            </View>
          </TouchableOpacity>
          <View style={[styles.optRow, { marginTop: S.md }]}>
            <Text style={styles.optLabel}>Approve payments</Text>
            <View style={[styles.toggle, isRegistered && styles.toggleOn]}>
              <View style={[styles.knob, isRegistered && { alignSelf: "flex-end" }]} />
            </View>
          </View>
          {status?.createdAt ? (
            <Text style={styles.since}>Active since {new Date(status.createdAt).toLocaleDateString()}</Text>
          ) : null}

          <View style={{ flex: 1 }} />

          {!isRegistered ? (
            <TouchableOpacity style={[styles.btn, generating && { opacity: 0.6 }]} onPress={handleRegister} disabled={generating} activeOpacity={0.85}>
              {generating ? <ActivityIndicator color={C.primary} size="small" /> : <Text style={styles.btnText}>Enable {isFace ? "Face ID" : "Fingerprint"}</Text>}
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.btnGhost} onPress={handleDeregister} activeOpacity={0.85}>
              <Text style={styles.btnGhostText}>Disable {isFace ? "Face ID" : "Fingerprint"}</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.primary },
  header: { paddingTop: 56, paddingHorizontal: S.xl },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.15)", alignItems: "center", justifyContent: "center" },
  body: { alignItems: "center", paddingHorizontal: S.xl },
  ringOuter: { width: 200, height: 200, borderRadius: 100, backgroundColor: "rgba(255,255,255,0.08)", alignItems: "center", justifyContent: "center", marginTop: S.xl },
  ringInner: { width: 150, height: 150, borderRadius: 75, backgroundColor: "rgba(255,255,255,0.12)", alignItems: "center", justifyContent: "center" },
  title: { fontSize: 28, fontWeight: "900", color: C.white, textAlign: "center", marginTop: S.xxl },
  sub: { fontSize: 15, color: C.onPrimaryMuted, textAlign: "center", lineHeight: 22, marginTop: S.md, paddingHorizontal: S.base },
  optRow: { alignSelf: "stretch", flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: "rgba(255,255,255,0.12)", borderRadius: 18, padding: S.lg, marginTop: S.xxl },
  optLabel: { fontSize: 15, fontWeight: "700", color: C.white },
  toggle: { width: 44, height: 24, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.25)", padding: 2 },
  toggleOn: { backgroundColor: C.gold },
  knob: { width: 20, height: 20, borderRadius: 10, backgroundColor: C.white },
  since: { fontSize: 12, color: C.onPrimaryMuted, marginTop: S.sm, alignSelf: "flex-start" },
  btn: { alignSelf: "stretch", backgroundColor: C.white, borderRadius: 18, paddingVertical: 17, alignItems: "center" },
  btnText: { fontSize: 16, fontWeight: "800", color: C.primary },
  btnGhost: { alignSelf: "stretch", backgroundColor: "rgba(255,255,255,0.12)", borderWidth: 1, borderColor: "rgba(255,255,255,0.3)", borderRadius: 18, paddingVertical: 17, alignItems: "center" },
  btnGhostText: { fontSize: 16, fontWeight: "800", color: C.white },
});
