import React, { useState, useEffect } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator, ScrollView, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { C, F, R, S } from "../utils/theme";
import { AuthToken, SecurePin } from "../utils/storage";
import { Biometrics } from "../utils/biometrics";
import { normalizePhone, isEmail, formatPhoneInput } from "../utils/format";
import api from "../services/api";
import PinDots from "../components/PinDots";
import PinPad from "../components/PinPad";
import ErrorModal from "../components/ErrorModal";

const LOGO = require("../assets/logo.jpg");

export default function AuthScreen({ navigation }) {
  const [mode, setMode] = useState("pin");
  const [phone, setPhone] = useState("");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [pin, setPin] = useState("");
  const [errorModalVisible, setErrorModalVisible] = useState(false);
  const [errorModalMessage, setErrorModalMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [hasSavedPin, setHasSavedPin] = useState(false);
  const [userName, setUserName] = useState("");
  const [bioReady, setBioReady] = useState(false);

  useEffect(() => {
    SecurePin.getPhone().then((p) => { if (p) { setPhone(p); setIdentifier(p); } });
    SecurePin.hasSavedPin().then(setHasSavedPin);
    SecurePin.getName().then((n) => { if (n) setUserName(n); });
    Promise.all([Biometrics.isAvailable(), Biometrics.isEnabled()]).then(([a, e]) => {
      console.log("[Auth] biometric available:", a, "enabled:", e);
      setBioReady(a && e);
    });
  }, []);

  const handlePinKey = (k) => {
    if (loading) return;
    if (k === "del") { setPin((p) => p.slice(0, -1)); return; }
    if (pin.length >= 4) return;
    const next = pin + k;
    setPin(next);
    if (next.length === 4) loginWithPin(next);
  };

  const loginWithPin = async (value) => {
    setLoading(true);
    // Phone is pre-loaded on mount; fall back to storage so the request fires immediately
    const currentPhone = phone || (await SecurePin.getPhone());
    console.log("[Auth] PIN login attempt, phone:", currentPhone);

    try {
      if (!currentPhone) {
        setErrorModalMessage("No phone found. Please sign in with password.");
        setErrorModalVisible(true);
        setPin("");
        setLoading(false);
        return;
      }

      const result = await api.signInWithPin(currentPhone, value);
      console.log("[Auth] PIN login result:", result.success, result.message);
      if (result.success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        await SecurePin.save(value, currentPhone);
        const user = result.data?.user;
        const fullName = user ? `${user.firstName || user.firstname || ""} ${user.lastName || user.lastname || ""}`.trim() : "";
        if (fullName) await SecurePin.setName(fullName);
        if (user?.has_pin === false) {
          navigation.replace("SetupPin", { phone: currentPhone });
        } else {
          navigation.replace("Home");
        }
      } else {
        setErrorModalMessage(result.message || "Incorrect PIN");
        setErrorModalVisible(true);
        setPin("");
        setLoading(false);
      }
    } catch (err) {
      console.error("[Auth] PIN login error:", err);
      setErrorModalMessage("Network error. Please try again.");
      setErrorModalVisible(true);
      setLoading(false);
    }
  };

  const loginWithBiometric = async () => {
    if (loading) return;
    setLoading(true);
    const { pin: savedPin, error: bioError } = await Biometrics.getPinWithBiometric("Sign in to SubBridge");
    if (bioError || !savedPin) {
      setErrorModalMessage(bioError || "Biometric sign-in failed.");
      setErrorModalVisible(true);
      setLoading(false);
      return;
    }
    setPin(savedPin);
    await loginWithPin(savedPin);
  };

  const loginWithPassword = async () => {
    const value = identifier.trim();
    if (!value) { setErrorModalMessage("Enter your phone number or email"); setErrorModalVisible(true); return; }
    const byEmail = isEmail(value);
    if (!byEmail && normalizePhone(value).length < 10) { setErrorModalMessage("Enter a valid phone number or email"); setErrorModalVisible(true); return; }
    if (!password) { setErrorModalMessage("Enter your password"); setErrorModalVisible(true); return; }
    setLoading(true);

    try {
      const loginId = byEmail ? value : "234" + normalizePhone(value).replace(/^0/, "").replace(/^234/, "");
      console.log("[Auth] Password login attempt:", loginId);
      const result = await api.signIn(loginId, password);
      console.log("[Auth] Password login result:", result.success, result.message);
      if (result.success) {
        const savedPhone = result.data?.user?.phone || (!byEmail ? loginId : null);
        await SecurePin.save(null, savedPhone || undefined);
        const user = result.data?.user;
        const fullName = user ? `${user.firstName || user.firstname || ""} ${user.lastName || user.lastname || ""}`.trim() : "";
        if (fullName) await SecurePin.setName(fullName);
        if (user?.has_pin === false) {
          navigation.replace("SetupPin", { phone: savedPhone || undefined });
        } else {
          navigation.replace("Home");
        }
      } else {
        const msg = result.message || "Invalid credentials.";
        if (/inactive|verif/i.test(msg) && !byEmail) {
          navigation.replace("VerifyAccount", { phone: loginId, password });
          return;
        }
        setErrorModalMessage(msg);
        setErrorModalVisible(true);
      }
    } catch (err) {
      console.error("[Auth] Password login error:", err);
      setErrorModalMessage("Network error. Please try again.");
      setErrorModalVisible(true);
    } finally {
      setLoading(false);
    }
  };

  const signupLink = (
    <TouchableOpacity style={styles.signupLink} onPress={() => navigation.navigate("SignUp")}>
      <Text style={styles.signupText}>Don't have an account? <Text style={styles.signupBold}>Sign Up</Text></Text>
    </TouchableOpacity>
  );

  if (mode === "pin" && hasSavedPin) {
    return (
      <>
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={styles.inner}>
          <View style={styles.profileAvatar}>
            {userName ? (
              <Text style={styles.profileInitial}>{userName.charAt(0).toUpperCase()}</Text>
            ) : (
              <Ionicons name="person" size={40} color={C.primary} />
            )}
          </View>
          <Text style={styles.welcome}>
            {userName ? `Welcome Back, ${userName.split(" ")[0]}` : "Welcome Back"}
          </Text>
          <Text style={styles.subtitle}>Enter your PIN to sign in</Text>
          <PinDots length={4} filled={pin.length} />
          {loading ? (
            <View style={styles.verifyingRow}>
              <ActivityIndicator size="small" color={C.white} />
              <Text style={styles.verifyingText}>Verifying...</Text>
            </View>
          ) : null}
          <PinPad onPress={handlePinKey} onBiometric={bioReady ? loginWithBiometric : undefined} />
          <TouchableOpacity
            style={styles.forgotPin}
            onPress={() => navigation.navigate("ForgotPassword", { mode: "pin", phone: phone || "" })}
          >
            <Text style={styles.forgotPinText}>Forgot PIN?</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.switchBtn} onPress={() => { setMode("password"); setPin(""); }}>
            <Text style={styles.switchText}>Sign in with Password</Text>
          </TouchableOpacity>
          {signupLink}
        </View>
      </KeyboardAvoidingView>
      <ErrorModal visible={errorModalVisible} message={errorModalMessage} onClose={() => setErrorModalVisible(false)} />
      </>
    );
  }

  return (
    <>
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView
        contentContainerStyle={styles.innerScroll}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.avatarWrap}>
          <Image source={LOGO} style={styles.logo} resizeMode="contain" />
        </View>
        <Text style={styles.welcome}>Welcome to SubBridge</Text>
        <Text style={styles.subtitle}>Sign in with your email or phone number</Text>

        <View style={styles.form}>
          <TextInput
            style={styles.input}
            value={identifier}
            onChangeText={(t) => { setIdentifier(/^\+?\d*$/.test(t) ? formatPhoneInput(t, identifier) : t); }}
            placeholder="Email or phone number"
            placeholderTextColor="rgba(255,255,255,0.4)"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            maxLength={80}
          />
          <View style={styles.passWrap}>
            <TextInput
              style={[styles.input, { paddingRight: 48 }]}
              value={password}
              onChangeText={(t) => { setPassword(t.replace(/\D/g, "").slice(0, 12)); }}
              placeholder="Password (numbers only)"
              placeholderTextColor="rgba(255,255,255,0.4)"
              keyboardType="number-pad"
              secureTextEntry={!showPass}
              maxLength={12}
            />
            <TouchableOpacity style={styles.eye} onPress={() => setShowPass((v) => !v)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name={showPass ? "eye-off" : "eye"} size={20} color="rgba(255,255,255,0.7)" />
            </TouchableOpacity>
          </View>
        </View>

        {loading ? (
          <View style={styles.verifyingRow}>
            <ActivityIndicator size="small" color={C.white} />
            <Text style={styles.verifyingText}>Verifying...</Text>
          </View>
        ) : null}

        <TouchableOpacity style={[styles.btn, loading && { opacity: 0.6 }]} onPress={loginWithPassword} disabled={loading}>
          <Text style={styles.btnText}>{loading ? "Signing In..." : "Sign In"}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.forgot} onPress={() => navigation.navigate("ForgotPassword")}>
          <Text style={styles.forgotText}>Forgot Password?</Text>
        </TouchableOpacity>

        {hasSavedPin && (
          <TouchableOpacity style={styles.switchBtn} onPress={() => { setMode("pin"); setPassword(""); }}>
            <Text style={styles.switchText}>Sign in with PIN</Text>
          </TouchableOpacity>
        )}

        {signupLink}
      </ScrollView>
    </KeyboardAvoidingView>
    <ErrorModal visible={errorModalVisible} message={errorModalMessage} onClose={() => setErrorModalVisible(false)} />
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.primary },
  inner: { flex: 1, justifyContent: "center", alignItems: "center", padding: S.xl },
  innerScroll: { flexGrow: 1, justifyContent: "center", alignItems: "center", padding: S.xl },
  avatarWrap: {
    width: 80, height: 80, borderRadius: 40, backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center", alignItems: "center", marginBottom: S.base,
  },
  logo: { width: 64, height: 64, borderRadius: 16 },
  profileAvatar: {
    width: 80, height: 80, borderRadius: 40, backgroundColor: C.white,
    justifyContent: "center", alignItems: "center", marginBottom: S.base,
    borderWidth: 3, borderColor: "rgba(255,255,255,0.4)",
  },
  profileInitial: { fontSize: 36, fontWeight: "800", color: C.primary },
  welcome: { fontSize: F.h2, fontWeight: "800", color: C.white },
  subtitle: { fontSize: F.md, color: "rgba(255,255,255,0.7)", marginTop: S.xs, marginBottom: S.xl, textAlign: "center" },
  form: { width: "100%", gap: S.md },
  input: {
    backgroundColor: "rgba(255,255,255,0.15)", borderRadius: R.sm,
    paddingHorizontal: S.base, paddingVertical: S.md + 2,
    fontSize: F.base, color: C.white,
  },
  passWrap: { width: "100%" },
  eye: { position: "absolute", right: S.md, top: 0, bottom: 0, justifyContent: "center" },
  error: { fontSize: F.sm, color: "#FFD4D4", textAlign: "center", marginTop: S.base },
  verifyingRow: { flexDirection: "row", alignItems: "center", gap: S.sm, marginTop: S.md },
  verifyingText: { fontSize: F.md, color: C.white, fontWeight: "600" },
  forgotPin: { alignItems: "center", marginTop: S.sm },
  forgotPinText: { fontSize: F.sm, color: "rgba(255,255,255,0.85)", fontWeight: "700" },
  forgot: { alignSelf: "flex-end", marginTop: S.sm },
  forgotText: { fontSize: F.sm, color: "rgba(255,255,255,0.7)", fontWeight: "600" },
  btn: {
    backgroundColor: C.white, borderRadius: R.sm, paddingVertical: S.md + 2,
    width: "100%", alignItems: "center", marginTop: S.xl, marginBottom: S.lg,
  },
  btnText: { color: C.primary, fontSize: F.lg, fontWeight: "700" },
  switchBtn: { paddingVertical: S.md, marginTop: S.base },
  switchText: { fontSize: F.md, color: "rgba(255,255,255,0.8)", fontWeight: "600" },
  signupLink: { marginTop: S.xl },
  signupText: { fontSize: F.md, color: "rgba(255,255,255,0.6)" },
  signupBold: { color: C.white, fontWeight: "700" },
});
