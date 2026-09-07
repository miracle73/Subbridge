import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { C, F, R, S } from "../../utils/theme";
import api from "../../services/api";

export default function ResetPasswordScreen({ navigation, route }) {
  const { phone, resetToken } = route.params || {};
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleReset = async () => {
    if (password.length < 5) return setError("Password must be at least 5 characters");
    if (password !== confirm) return setError("Passwords do not match");
    setError("");
    setLoading(true);
    try {
      const cleanPhone = "234" + (phone || "").replace(/\s/g, "").replace(/^0/, "").replace(/^234/, "");
      const result = await api.resetPassword(cleanPhone, resetToken, password);
      if (result.success) {
        setDone(true);
      } else {
        setError(result.message || "Failed to reset password. Please try again.");
      }
    } catch (err) {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={styles.inner}>
          <View style={styles.avatarWrap}>
            <Ionicons name="checkmark-circle" size={80} color={C.white} />
          </View>
          <Text style={styles.title}>Password Reset!</Text>
          <Text style={styles.subtitle}>You can now sign in with your new password.</Text>
          <TouchableOpacity style={styles.btn} onPress={() => navigation.replace("Auth")}>
            <Text style={styles.btnText}>Sign In</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={styles.inner}>
        <TouchableOpacity style={styles.back} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={C.white} />
        </TouchableOpacity>

        <View style={styles.avatarWrap}>
          <Ionicons name="lock-closed" size={48} color={C.white} />
        </View>
        <Text style={styles.title}>Reset Password</Text>
        <Text style={styles.subtitle}>Enter your new password.</Text>

        <View style={styles.form}>
          <TextInput style={styles.input} value={password} onChangeText={setPassword} placeholder="New password (min 5 characters)" placeholderTextColor="rgba(255,255,255,0.4)" secureTextEntry />
          <TextInput style={styles.input} value={confirm} onChangeText={setConfirm} placeholder="Confirm password" placeholderTextColor="rgba(255,255,255,0.4)" secureTextEntry />
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <TouchableOpacity style={[styles.btn, loading && { opacity: 0.6 }]} onPress={handleReset} disabled={loading}>
          <Text style={styles.btnText}>{loading ? "Resetting..." : "Reset Password"}</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.primary },
  inner: { flex: 1, justifyContent: "center", alignItems: "center", padding: S.xl },
  back: { position: "absolute", top: 60, left: S.xl, zIndex: 10 },
  avatarWrap: {
    width: 80, height: 80, borderRadius: 40, backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center", alignItems: "center", marginBottom: S.base,
  },
  title: { fontSize: F.h2, fontWeight: "800", color: C.white },
  subtitle: { fontSize: F.md, color: "rgba(255,255,255,0.7)", marginTop: S.xs, marginBottom: S.xl, textAlign: "center" },
  form: { width: "100%", gap: S.md },
  input: {
    backgroundColor: "rgba(255,255,255,0.15)", borderRadius: R.sm,
    paddingHorizontal: S.base, paddingVertical: S.md + 2,
    fontSize: F.base, color: C.white,
  },
  error: { fontSize: F.sm, color: "#FFD4D4", textAlign: "center", marginTop: S.base },
  btn: {
    backgroundColor: C.white, borderRadius: R.sm, paddingVertical: S.md + 2,
    width: "100%", alignItems: "center", marginTop: S.xl,
  },
  btnText: { color: C.primary, fontSize: F.lg, fontWeight: "700" },
});
