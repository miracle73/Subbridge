import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { C, F, R, S } from "../../utils/theme";

export default function VerifyOtpScreen({ navigation, route }) {
  const { phone } = route.params || {};
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");

  const handleVerify = () => {
    if (otp.length !== 6) return setError("Enter the 6-digit code");
    setError("");
    navigation.replace("ResetPassword", { phone, resetToken: "mock_reset_token" });
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={styles.inner}>
        <TouchableOpacity style={styles.back} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={C.white} />
        </TouchableOpacity>

        <View style={styles.avatarWrap}>
          <Ionicons name="shield-checkmark" size={48} color={C.white} />
        </View>
        <Text style={styles.title}>Verify Code</Text>
        <Text style={styles.subtitle}>Enter the 6-digit code sent to your phone.</Text>

        <TextInput
          style={styles.otpInput}
          value={otp}
          onChangeText={(t) => setOtp(t.replace(/\D/g, "").slice(0, 6))}
          placeholder="000000"
          placeholderTextColor="rgba(255,255,255,0.4)"
          keyboardType="number-pad"
          maxLength={6}
          textAlign="center"
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <TouchableOpacity style={styles.btn} onPress={handleVerify}>
          <Text style={styles.btnText}>Verify</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.resend}>
          <Text style={styles.resendText}>Resend Code</Text>
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
  subtitle: { fontSize: F.md, color: "rgba(255,255,255,0.7)", marginTop: S.xs, marginBottom: S.xl },
  otpInput: {
    backgroundColor: "rgba(255,255,255,0.15)", borderRadius: R.sm,
    paddingHorizontal: S.base, paddingVertical: S.md + 2,
    fontSize: F.h2, fontWeight: "700", color: C.white, letterSpacing: 8, width: "60%",
  },
  error: { fontSize: F.sm, color: "#FFD4D4", textAlign: "center", marginTop: S.base },
  btn: {
    backgroundColor: C.white, borderRadius: R.sm, paddingVertical: S.md + 2,
    width: "100%", alignItems: "center", marginTop: S.xl,
  },
  btnText: { color: C.primary, fontSize: F.lg, fontWeight: "700" },
  resend: { alignItems: "center", marginTop: S.base },
  resendText: { fontSize: F.md, color: "rgba(255,255,255,0.7)", fontWeight: "600" },
});
