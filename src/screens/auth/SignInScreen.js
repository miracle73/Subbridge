import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { C, F, R, S } from "../../utils/theme";
import { AuthToken, SecurePin } from "../../utils/storage";
import api from "../../services/api";

export default function SignInScreen({ navigation }) {
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSignIn = async () => {
    if (!phone || phone.length < 10) return setError("Please enter a valid phone number");
    if (!password) return setError("Please enter your password");
    setError("");
    setLoading(true);

    try {
      const cleanPhone = "234" + phone.replace(/\s/g, "").replace(/^0/, "").replace(/^234/, "");
      console.log("[SignIn] Attempting:", cleanPhone);
      const result = await api.signIn(cleanPhone, password);
      console.log("[SignIn] Result:", result.success, result.message);

      if (result.success) {
        // Save phone only — never store the password as the PIN
        await SecurePin.save(null, cleanPhone);
        const user = result.data?.user;
        const name = user?.firstName || user?.firstname || user?.lastName || user?.lastname
          ? `${user.firstName || user.firstname || ""} ${user.lastName || user.lastname || ""}`.trim()
          : null;
        if (name) await SecurePin.setName(name);
        if (user?.has_pin === false) {
          navigation.replace("SetupPin", { phone: cleanPhone });
        } else {
          navigation.replace("Home");
        }
      } else {
        setError(result.message || "Invalid credentials. Please try again.");
      }
    } catch (err) {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={styles.scroll}>
        <TouchableOpacity style={styles.back} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={C.text} />
        </TouchableOpacity>

        <Text style={styles.title}>Welcome Back</Text>
        <Text style={styles.subtitle}>Sign in to your account</Text>

        <View style={styles.form}>
          <Text style={styles.label}>Phone Number</Text>
          <View style={styles.phoneRow}>
            <View style={styles.prefix}><Text style={styles.prefixText}>+234</Text></View>
            <TextInput style={[styles.input, { flex: 1 }]} value={phone} onChangeText={setPhone} placeholder="812 345 6789" keyboardType="phone-pad" maxLength={11} />
          </View>
          <Text style={styles.label}>Password</Text>
          <TextInput style={styles.input} value={password} onChangeText={setPassword} placeholder="Enter password" secureTextEntry />
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <TouchableOpacity style={styles.forgot} onPress={() => navigation.navigate("ForgotPassword")}>
          <Text style={styles.forgotText}>Forgot Password?</Text>
        </TouchableOpacity>

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
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.white },
  scroll: { flex: 1, padding: S.xl, paddingTop: 60 },
  back: { marginBottom: S.base },
  title: { fontSize: F.h1, fontWeight: "800", color: C.text },
  subtitle: { fontSize: F.md, color: C.textMuted, marginTop: S.xs, marginBottom: S.xl },
  form: { gap: S.md },
  label: { fontSize: F.sm, fontWeight: "600", color: C.text, marginBottom: 4 },
  input: {
    backgroundColor: C.inputBg, borderWidth: 1, borderColor: C.border,
    borderRadius: R.sm, paddingHorizontal: S.base, paddingVertical: S.md + 2,
    fontSize: F.base, color: C.text,
  },
  phoneRow: { flexDirection: "row", gap: S.sm },
  prefix: {
    backgroundColor: C.inputBg, borderWidth: 1, borderColor: C.border,
    borderRadius: R.sm, paddingHorizontal: S.md, justifyContent: "center",
  },
  prefixText: { fontSize: F.base, fontWeight: "600", color: C.text },
  forgot: { alignSelf: "flex-end", marginTop: S.sm },
  forgotText: { fontSize: F.sm, color: C.primary, fontWeight: "600" },
  error: { fontSize: F.sm, color: C.debit, textAlign: "center", marginTop: S.base },
  btn: {
    backgroundColor: C.primary, borderRadius: R.sm, paddingVertical: S.md + 2,
    alignItems: "center", marginTop: S.xl,
  },
  btnText: { color: C.white, fontSize: F.lg, fontWeight: "700" },
  link: { fontSize: F.md, color: C.textMuted, textAlign: "center", marginTop: S.base },
  linkBold: { color: C.primary, fontWeight: "700" },
});
