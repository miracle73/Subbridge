import React, { useState, useEffect } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { C, F, R, S } from "../utils/theme";
import { AuthToken, SecurePin } from "../utils/storage";
import api from "../services/api";
import PinDots from "../components/PinDots";
import PinPad from "../components/PinPad";

export default function AuthScreen({ navigation }) {
  const [mode, setMode] = useState("pin");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [hasSavedPin, setHasSavedPin] = useState(false);

  useEffect(() => {
    SecurePin.getPhone().then((p) => { if (p) setPhone(p); });
    SecurePin.hasSavedPin().then(setHasSavedPin);
  }, []);

  const handlePinKey = (k) => {
    if (loading) return;
    if (k === "del") { setPin((p) => p.slice(0, -1)); setError(""); return; }
    if (pin.length >= 4) return;
    const next = pin + k;
    setPin(next);
    if (next.length === 4) loginWithPin(next);
  };

  const loginWithPin = async (value) => {
    setLoading(true);
    setError("");
    // Phone is pre-loaded on mount; fall back to storage so the request fires immediately
    const currentPhone = phone || (await SecurePin.getPhone());
    console.log("[Auth] PIN login attempt, phone:", currentPhone);

    try {
      if (!currentPhone) {
        setError("No phone found. Please sign in with password.");
        setPin("");
        setLoading(false);
        return;
      }

      const result = await api.signInWithPin(currentPhone, value);
      console.log("[Auth] PIN login result:", result.success, result.message);
      if (result.success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        const user = result.data?.user;
        if (user?.has_pin === false) {
          navigation.replace("SetupPin", { phone: currentPhone });
        } else {
          navigation.replace("Home");
        }
      } else {
        setError(result.message || "Incorrect PIN");
        setPin("");
        setLoading(false);
      }
    } catch (err) {
      console.error("[Auth] PIN login error:", err);
      setError("Network error. Please try again.");
      setLoading(false);
    }
  };

  const loginWithPassword = async () => {
    if (!phone || phone.length < 10) return setError("Enter a valid phone number");
    if (!password) return setError("Enter your password");
    setError("");
    setLoading(true);

    try {
      const cleanPhone = "234" + phone.replace(/\s/g, "").replace(/^0/, "").replace(/^234/, "");
      console.log("[Auth] Password login attempt, phone:", cleanPhone);
      const result = await api.signIn(cleanPhone, password);
      console.log("[Auth] Password login result:", result.success, result.message);
      if (result.success) {
        await SecurePin.save(password, cleanPhone);
        const user = result.data?.user;
        if (user?.has_pin === false) {
          navigation.replace("SetupPin", { phone: cleanPhone });
        } else {
          navigation.replace("Home");
        }
      } else {
        setError(result.message || "Invalid credentials.");
      }
    } catch (err) {
      console.error("[Auth] Password login error:", err);
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={styles.inner}>
        <View style={styles.avatarWrap}>
          <Ionicons name="shield-checkmark" size={48} color={C.white} />
        </View>
        <Text style={styles.welcome}>Welcome to SubBridge</Text>

        {mode === "pin" && hasSavedPin ? (
          <>
            <Text style={styles.subtitle}>Enter your PIN to sign in</Text>
            <PinDots length={4} filled={pin.length} />
            {error ? <Text style={styles.error}>{error}</Text> : null}
            {loading ? (
              <View style={styles.verifyingRow}>
                <ActivityIndicator size="small" color={C.white} />
                <Text style={styles.verifyingText}>Verifying...</Text>
              </View>
            ) : null}
            <PinPad onPress={handlePinKey} />
            <TouchableOpacity style={styles.switchBtn} onPress={() => { setMode("password"); setPin(""); setError(""); }}>
              <Text style={styles.switchText}>Sign in with Password</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Text style={styles.subtitle}>Sign in with your password</Text>
            <View style={styles.form}>
              <TextInput style={styles.input} value={phone} onChangeText={setPhone} placeholder="Phone number" keyboardType="phone-pad" maxLength={11} />
              <TextInput style={styles.input} value={password} onChangeText={setPassword} placeholder="Password" secureTextEntry />
            </View>
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <TouchableOpacity style={styles.forgot} onPress={() => navigation.navigate("ForgotPassword")}>
              <Text style={styles.forgotText}>Forgot Password?</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.btn, loading && { opacity: 0.6 }]} onPress={loginWithPassword} disabled={loading}>
              <Text style={styles.btnText}>{loading ? "Signing In..." : "Sign In"}</Text>
            </TouchableOpacity>
            {hasSavedPin && (
              <TouchableOpacity style={styles.switchBtn} onPress={() => { setMode("pin"); setPassword(""); setError(""); }}>
                <Text style={styles.switchText}>Sign in with PIN</Text>
              </TouchableOpacity>
            )}
          </>
        )}

        <TouchableOpacity style={styles.signupLink} onPress={() => navigation.navigate("SignUp")}>
          <Text style={styles.signupText}>Don't have an account? <Text style={styles.signupBold}>Sign Up</Text></Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.primary },
  inner: { flex: 1, justifyContent: "center", alignItems: "center", padding: S.xl },
  avatarWrap: {
    width: 80, height: 80, borderRadius: 40, backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center", alignItems: "center", marginBottom: S.base,
  },
  welcome: { fontSize: F.h2, fontWeight: "800", color: C.white },
  subtitle: { fontSize: F.md, color: "rgba(255,255,255,0.7)", marginTop: S.xs, marginBottom: S.xl },
  form: { width: "100%", gap: S.md },
  input: {
    backgroundColor: "rgba(255,255,255,0.15)", borderRadius: R.sm,
    paddingHorizontal: S.base, paddingVertical: S.md + 2,
    fontSize: F.base, color: C.white,
  },
  error: { fontSize: F.sm, color: "#FFD4D4", textAlign: "center", marginTop: S.base },
  verifyingRow: { flexDirection: "row", alignItems: "center", gap: S.sm, marginTop: S.md },
  verifyingText: { fontSize: F.md, color: C.white, fontWeight: "600" },
  forgot: { alignSelf: "flex-end", marginTop: S.sm },
  forgotText: { fontSize: F.sm, color: "rgba(255,255,255,0.7)", fontWeight: "600" },
  btn: {
    backgroundColor: C.white, borderRadius: R.sm, paddingVertical: S.md + 2,
    width: "100%", alignItems: "center", marginTop: S.xl,
  },
  btnText: { color: C.primary, fontSize: F.lg, fontWeight: "700" },
  switchBtn: { paddingVertical: S.md, marginTop: S.base },
  switchText: { fontSize: F.md, color: "rgba(255,255,255,0.8)", fontWeight: "600" },
  signupLink: { marginTop: S.xl },
  signupText: { fontSize: F.md, color: "rgba(255,255,255,0.6)" },
  signupBold: { color: C.white, fontWeight: "700" },
});
