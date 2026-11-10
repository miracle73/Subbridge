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

  // Figma "Reset Password": light page, two fields, match indicator, button at the bottom.
  const unit = isPin ? "PIN" : "password";
  const matches = confirm.length >= minLen && confirm === password;
  const Field = ({ label, value, onChange }) => (
    <View style={{ marginTop: 20 }}>
      <Text style={fig.label}>{label}</Text>
      <View style={fig.field}>
        <TextInput
          style={fig.input}
          value={value}
          onChangeText={onChange}
          placeholder="• • • • •"
          placeholderTextColor={C.textLight}
          keyboardType="number-pad"
          secureTextEntry={!showValue}
          maxLength={maxLen}
        />
        <TouchableOpacity onPress={() => setShowValue((v) => !v)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name={showValue ? "eye-off-outline" : "eye-outline"} size={20} color={C.textMuted} />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <KeyboardAvoidingView style={fig.container} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={fig.header}>
        <TouchableOpacity style={fig.back} onPress={goBack}>
          <Ionicons name="arrow-back" size={20} color={C.text} />
        </TouchableOpacity>
        <Text style={fig.headerTitle}>{isPin ? "Reset PIN" : "Reset Password"}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        <Text style={fig.title}>Create a new {unit}</Text>
        <Text style={fig.sub}>{isPin ? "4 digits, numbers only" : "5 digits, numbers only"}</Text>

        {Field({ label: `New ${unit}`, value: password, onChange: (t) => { setPassword(t.replace(/\D/g, "").slice(0, maxLen)); setError(""); } })}
        {Field({ label: `Confirm ${unit}`, value: confirm, onChange: (t) => { setConfirm(t.replace(/\D/g, "").slice(0, maxLen)); setError(""); } })}

        {matches ? (
          <View style={fig.match}><Text style={fig.matchText}>✓ {isPin ? "PINs" : "Passwords"} match</Text></View>
        ) : null}
        {error ? <Text style={fig.error}>{error}</Text> : null}
      </ScrollView>

      <View style={fig.bar}>
        <TouchableOpacity style={[fig.btn, loading && { opacity: 0.6 }]} onPress={() => submit(password, confirm)} disabled={loading} activeOpacity={0.85}>
          <Text style={fig.btnText}>{loading ? "Saving..." : isPin ? "Reset PIN" : "Reset Password"}</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const fig = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 24, paddingTop: 52, paddingBottom: 16 },
  back: { width: 40, height: 40, borderRadius: 20, backgroundColor: C.white, alignItems: "center", justifyContent: "center", shadowColor: "#1A2680", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.08, shadowRadius: 14, elevation: 2 },
  headerTitle: { fontSize: 18, fontWeight: "800", color: C.text },
  title: { fontSize: 24, fontWeight: "900", color: C.text, marginTop: 16 },
  sub: { fontSize: 14, color: C.textMuted, marginTop: 6 },
  label: { fontSize: 13, fontWeight: "600", color: C.textMuted, marginBottom: 8 },
  field: { flexDirection: "row", alignItems: "center", backgroundColor: C.white, borderRadius: 16, paddingHorizontal: 20, height: 56, shadowColor: "#1A2680", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.07, shadowRadius: 14, elevation: 2 },
  input: { flex: 1, fontSize: 16, fontWeight: "600", color: C.text, letterSpacing: 4 },
  match: { marginTop: 24, height: 44, borderRadius: 14, backgroundColor: C.credit + "1A", justifyContent: "center", paddingHorizontal: 16 },
  matchText: { fontSize: 13, fontWeight: "800", color: C.credit },
  error: { fontSize: 13, color: C.debit, marginTop: 16, fontWeight: "600" },
  bar: { paddingHorizontal: 24, paddingBottom: 56, paddingTop: 12 },
  btn: { backgroundColor: C.primary, borderRadius: 18, height: 56, alignItems: "center", justifyContent: "center", shadowColor: C.primary, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.25, shadowRadius: 16, elevation: 4 },
  btnText: { fontSize: 16, fontWeight: "800", color: C.white },
});

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
