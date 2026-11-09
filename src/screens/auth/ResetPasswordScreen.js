import AuthBackground, { withAuthStyles } from "../../components/AuthBackground";
import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { C, F, R, S } from "../../utils/theme";
import { SecurePin } from "../../utils/storage";
import { normalizePhone } from "../../utils/format";
import api from "../../services/api";

export default function ResetPasswordScreen({ navigation, route }) {
  const { phone, resetToken, inputType } = route.params || {};
  const identifier = route.params?.identifier || phone;
  const mode = route.params?.mode === "pin" ? "pin" : "password";
  const isPin = mode === "pin";
  const isEmail = inputType === "email" || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(identifier || ""));
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [stage, setStage] = useState("new"); // "new" -> "confirm"
  const [showValue, setShowValue] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const maxLen = isPin ? 4 : 7;
  const minLen = isPin ? 4 : 5;

  const onChangeNew = (t) => {
    const v = t.replace(/\D/g, "").slice(0, maxLen);
    setPassword(v);
    setError("");
    if (stage === "confirm" && v.length < maxLen) {
      setStage("new");
      setConfirm("");
    }
    // Auto-advance to confirm as soon as the full code is typed
    if (v.length === maxLen) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setStage("confirm");
    }
  };

  const onChangeConfirm = (t) => {
    const v = t.replace(/\D/g, "").slice(0, maxLen);
    setConfirm(v);
    setError("");
    // Auto-submit as soon as the last digit of the confirm field is typed
    if (v.length === maxLen) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      submit(password, v);
    }
  };

  const submit = async (newVal, confirmVal) => {
    if (loading) return;
    if (newVal.length < minLen) {
      return setError(isPin ? "PIN must be exactly 4 digits" : "Password must be 5 to 7 digits");
    }
    if (newVal !== confirmVal) return setError("They don't match. Try again.");
    setError("");
    setLoading(true);
    try {
      const result = isPin
        ? await api.resetPin(identifier, resetToken, newVal)
        : await api.resetPassword(identifier, resetToken, newVal);
      if (!result.success) {
        setError(result.message || "Failed to reset. Please try again.");
        setLoading(false);
        return;
      }
      // Auto sign-in with the new credentials — land in the app,
      // never bounce through the blue Auth screen.
      const cleanIdentifier = isEmail
        ? String(identifier).trim()
        : "234" + String(identifier || "").replace(/\s/g, "").replace(/^0/, "").replace(/^234/, "");
      const login = isPin
        ? await api.signInWithPin(cleanIdentifier, newVal)
        : await api.signIn(cleanIdentifier, newVal);
      if (login.success) {
        const savedPhone = isEmail ? null : normalizePhone(String(identifier || "")) || undefined;
        if (isPin) await SecurePin.save(newVal, savedPhone);
        else await SecurePin.save(null, savedPhone);
        const u = login.data?.user;
        const name = u ? `${u.firstName || ""} ${u.lastName || ""}`.trim() : "";
        if (name) await SecurePin.setName(name);
        navigation.replace("Home");
        return;
      }
      // Fallback: reset succeeded but auto-login failed — offer Sign In.
      setDone(true);
      setLoading(false);
    } catch (err) {
      setError("Network error. Please try again.");
      setLoading(false);
    }
  };

  const handleContinue = () => {
    if (loading) return;
    if (stage === "new") {
      if (password.length < minLen) {
        return setError(isPin ? "PIN must be exactly 4 digits" : "Password must be 5 to 7 digits");
      }
      setStage("confirm");
      setError("");
      return;
    }
    submit(password, confirm);
  };

  const goBack = () => {
    if (navigation.canGoBack()) navigation.goBack();
    else navigation.replace("Auth");
  };

  const stageTitle = isPin ? "Reset PIN" : "Reset Password";
  const stageLabel = stage === "new"
    ? (isPin ? "Create a new 4-digit PIN" : "Create a new password — 5 to 7 digits")
    : (isPin ? "Confirm your new PIN" : "Confirm your new password");

  if (done) {
    return (
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <AuthBackground />
        <View style={styles.inner}>
          <View style={styles.avatarWrap}>
            <Ionicons name="checkmark-circle" size={80} color={C.white} />
          </View>
          <Text style={styles.title}>{isPin ? "PIN Reset!" : "Password Reset!"}</Text>
          <Text style={styles.subtitle}>You can now sign in with your new {isPin ? "PIN" : "password"}.</Text>
          <TouchableOpacity style={styles.btn} onPress={() => navigation.replace("Auth")}>
            <Text style={styles.btnText}>Sign In</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <AuthBackground />
      <TouchableOpacity style={styles.back} onPress={goBack}>
        <Ionicons name="arrow-back" size={22} color={C.white} />
      </TouchableOpacity>
      <ScrollView
        contentContainerStyle={styles.inner}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.avatarWrap}>
          <Ionicons name="lock-closed" size={48} color={C.white} />
        </View>
        <Text style={styles.title}>{stageTitle}</Text>
        <Text style={styles.subtitle}>{stageLabel}</Text>

        <View style={styles.form}>
          <View style={styles.inputWrap}>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={onChangeNew}
              placeholder={isPin ? "New PIN" : "New password"}
              placeholderTextColor="rgba(255,255,255,0.4)"
              keyboardType="number-pad"
              secureTextEntry={!showValue}
              maxLength={maxLen}
            />
            <TouchableOpacity style={styles.eye} onPress={() => setShowValue((s) => !s)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name={showValue ? "eye" : "eye-off"} size={20} color="rgba(255,255,255,0.6)" />
            </TouchableOpacity>
          </View>

          <View style={styles.inputWrap}>
            <TextInput
              style={styles.input}
              value={confirm}
              onChangeText={onChangeConfirm}
              placeholder={isPin ? "Confirm PIN" : "Confirm password"}
              placeholderTextColor="rgba(255,255,255,0.4)"
              keyboardType="number-pad"
              secureTextEntry={!showValue}
              maxLength={maxLen}
            />
            <TouchableOpacity style={styles.eye} onPress={() => setShowValue((s) => !s)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name={showValue ? "eye" : "eye-off"} size={20} color="rgba(255,255,255,0.6)" />
            </TouchableOpacity>
          </View>
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <TouchableOpacity
          style={[styles.btn, loading && { opacity: 0.6 }]}
          onPress={handleContinue}
          disabled={loading}
        >
          <Text style={styles.btnText}>
            {loading ? "Resetting..." : stage === "new" ? "Continue" : isPin ? "Reset PIN" : "Reset Password"}
          </Text>
        </TouchableOpacity>

        {isPin ? (
          <Text style={styles.hint}>Your PIN saves automatically once all 4 digits are confirmed.</Text>
        ) : (
          <Text style={styles.hint}>Auto-saves at 7 digits — or tap the button for a 5-6 digit password.</Text>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = withAuthStyles(StyleSheet.create({
  container: { flex: 1, backgroundColor: C.primary },
  inner: { flexGrow: 1, justifyContent: "center", alignItems: "center", padding: S.xl },
  back: { position: "absolute", top: 60, left: S.xl, zIndex: 10 },
  avatarWrap: {
    width: 80, height: 80, borderRadius: 40, backgroundColor: "#FFB020",
    justifyContent: "center", alignItems: "center", marginBottom: S.base,
  },
  title: { fontSize: F.h2, fontWeight: "800", color: C.white },
  subtitle: { fontSize: F.md, color: "rgba(255,255,255,0.7)", marginTop: S.xs, marginBottom: S.base, textAlign: "center", lineHeight: 22 },
  form: { width: "100%", gap: S.md, marginTop: S.lg },
  inputWrap: { width: "100%", position: "relative" },
  input: {
    backgroundColor: "rgba(255,255,255,0.15)", borderRadius: R.sm,
    paddingHorizontal: S.base, paddingVertical: S.md + 2,
    fontSize: F.lg, fontWeight: "700", color: C.white, width: "100%",
    textAlign: "center", letterSpacing: 4, paddingRight: S.xl + S.md,
  },
  eye: { position: "absolute", right: S.md, top: 0, bottom: 0, justifyContent: "center" },
  error: { fontSize: F.sm, color: "#FFD4D4", textAlign: "center", marginTop: S.base },
  hint: { fontSize: F.sm, color: "rgba(255,255,255,0.5)", textAlign: "center", marginTop: S.md },
  btn: {
    backgroundColor: C.white, borderRadius: R.sm, paddingVertical: S.md + 2,
    width: "100%", alignItems: "center", marginTop: S.lg, marginBottom: S.lg,
  },
  btnText: { color: C.primary, fontSize: F.lg, fontWeight: "700" },
}));
