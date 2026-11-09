import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { C, F, R, S } from "../../utils/theme";
import { AuthToken, SecurePin } from "../../utils/storage";
import { normalizePhone, isEmail, formatPhoneInput } from "../../utils/format";
import api from "../../services/api";
import PinDots from "../../components/PinDots";
import PinPad from "../../components/PinPad";
import ErrorModal from "../../components/ErrorModal";

export default function SignInScreen({ navigation }) {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [inputType, setInputType] = useState("phone"); // "phone" or "email"
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorModalMessage, setErrorModalMessage] = useState("");

  const handlePassKey = (k) => {
    if (loading) return;
    if (k === "del") { setPassword((p) => p.slice(0, -1)); setError(""); return; }
    setError("");
    setPassword((p) => (p.length >= 12 ? p : p + k));
  };

  const handleSignIn = async () => {
    const value = identifier.trim();
    if (!value) {
      setErrorModalMessage("Please enter your phone number or email");
      setShowErrorModal(true);
      return;
    }
    const byEmail = inputType === "email" || isEmail(value);
    if (!byEmail && normalizePhone(value).length < 10) {
      setErrorModalMessage("Please enter a valid phone number or email");
      setShowErrorModal(true);
      return;
    }
    if (!password) {
      setErrorModalMessage("Please enter your password");
      setShowErrorModal(true);
      return;
    }
    setError("");
    setLoading(true);

    try {
      const loginId = byEmail ? value : "234" + normalizePhone(value).replace(/^0/, "").replace(/^234/, "");
      console.log("[SignIn] Attempting:", loginId);
      const result = await api.signIn(loginId, password);
      console.log("[SignIn] Result:", result.success, result.message);

      if (result.success) {
        // Save phone only — never store the password as the PIN
        const savedPhone = result.data?.user?.phone || (!byEmail ? loginId : null);
        await SecurePin.save(null, savedPhone || undefined);
        const user = result.data?.user;
        const name = user?.firstName || user?.firstname || user?.lastName || user?.lastname
          ? `${user.firstName || user.firstname || ""} ${user.lastName || user.lastname || ""}`.trim()
          : null;
        if (name) await SecurePin.setName(name);
        if (user?.has_pin === false) {
          navigation.replace("SetupPin", { phone: savedPhone || undefined });
        } else {
          navigation.replace("Home");
        }
      } else {
        const msg = result.message || "Invalid credentials. Please try again.";
        // Unverified account — send the user to the verification screen
        if (/inactive|verif/i.test(msg) && !byEmail) {
          navigation.replace("VerifyAccount", { phone: loginId, password });
          return;
        }
        // Account already used error - show modal
        if (/already.*used|exists/i.test(msg)) {
          setErrorModalMessage("This account is already registered. Please sign in instead.");
          setShowErrorModal(true);
          return;
        }
        setErrorModalMessage(msg);
        setShowErrorModal(true);
      }
    } catch (err) {
      setErrorModalMessage("Network error. Please try again.");
      setShowErrorModal(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <TouchableOpacity style={styles.back} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={C.text} />
        </TouchableOpacity>

        <Text style={styles.title}>Welcome Back</Text>
        <Text style={styles.subtitle}>Sign in to your account</Text>

        <View style={styles.form}>
          <Text style={styles.label}>Email or Phone Number</Text>
          <View style={styles.inputToggle}>
            <TouchableOpacity
              style={[styles.toggleBtn, inputType === "phone" && styles.toggleBtnActive]}
              onPress={() => setInputType("phone")}
            >
              <Text style={[styles.toggleText, inputType === "phone" && styles.toggleTextActive]}>Phone</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toggleBtn, inputType === "email" && styles.toggleBtnActive]}
              onPress={() => setInputType("email")}
            >
              <Text style={[styles.toggleText, inputType === "email" && styles.toggleTextActive]}>Email</Text>
            </TouchableOpacity>
          </View>
          <TextInput
            style={styles.input}
            value={identifier}
            onChangeText={(t) => { setIdentifier(inputType === "phone" ? formatPhoneInput(t, identifier) : t); setError(""); }}
            placeholder={inputType === "email" ? "you@example.com" : "812 345 6789"}
            autoCapitalize={inputType === "email" ? "none" : "words"}
            autoCorrect={false}
            keyboardType={inputType === "email" ? "email-address" : "phone-pad"}
            maxLength={inputType === "email" ? 80 : 14}
          />
        </View>

        <PinDots length={Math.max(6, password.length)} filled={password.length} />

        <TouchableOpacity style={styles.forgot} onPress={() => navigation.navigate("ForgotPassword")}>
          <Text style={styles.forgotText}>Forgot Password?</Text>
        </TouchableOpacity>

        <PinPad onPress={handlePassKey} />

        <TouchableOpacity
          style={[styles.btn, loading && { opacity: 0.6 }]}
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); handleSignIn(); }}
          disabled={loading}
        >
          <Text style={styles.btnText}>{loading ? "Signing In..." : "Sign In"}</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate("SignUp")}>
          <Text style={styles.link}>Don't have an account? <Text style={styles.linkBold}>Sign Up</Text></Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
    
    <ErrorModal
      visible={showErrorModal}
      message={errorModalMessage}
      onClose={() => setShowErrorModal(false)}
    />
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.white },
  scroll: { flexGrow: 1, justifyContent: "center", padding: S.xl, paddingTop: 60 },
  back: { marginBottom: S.base },
  title: { fontSize: F.h1, fontWeight: "800", color: C.text },
  subtitle: { fontSize: F.md, color: C.textMuted, marginTop: S.xs, marginBottom: S.xl },
  form: { gap: S.md },
  label: { fontSize: F.sm, fontWeight: "600", color: C.text, marginBottom: 4 },
  inputToggle: {
    flexDirection: "row",
    backgroundColor: C.inputBg,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: R.sm,
    padding: 2,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: S.sm,
    alignItems: "center",
    borderRadius: R.sm,
  },
  toggleBtnActive: {
    backgroundColor: C.white,
  },
  toggleText: {
    fontSize: F.sm,
    fontWeight: "600",
    color: C.textMuted,
  },
  toggleTextActive: {
    color: C.primary,
  },
  input: {
    backgroundColor: C.inputBg, borderWidth: 1, borderColor: C.border,
    borderRadius: R.sm, paddingHorizontal: S.base, paddingVertical: S.md + 2,
    fontSize: F.base, color: C.text,
  },
  forgot: { alignSelf: "flex-end", marginTop: S.sm },
  forgotText: { fontSize: F.sm, color: C.primary, fontWeight: "600" },
  error: { fontSize: F.sm, color: C.debit, textAlign: "center", marginTop: S.base },
  btn: {
    backgroundColor: C.primary, borderRadius: R.sm, paddingVertical: S.md + 2,
    alignItems: "center", marginTop: S.base, marginBottom: S.lg,
  },
  btnText: { color: C.white, fontSize: F.lg, fontWeight: "700" },
  link: { fontSize: F.md, color: C.textMuted, textAlign: "center", marginTop: S.lg },
  linkBold: { color: C.primary, fontWeight: "700" },
});
