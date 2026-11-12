import AuthBackground, { withAuthStyles } from "../../components/AuthBackground";
import React, { useEffect, useRef, useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { C, F, R, S } from "../../utils/theme";
import api from "../../services/api";

// Seconds the user must wait before asking for another code.
const RESEND_COOLDOWN_SECONDS = 30;

export default function VerifyOtpScreen({ navigation, route }) {
  const phone = route.params?.phone || route.params?.identifier || "";
  const inputType = route.params?.inputType === "email" ? "email" : "phone";
  const mode = route.params?.mode === "pin" ? "pin" : "password";
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  // A resend request is only allowed once this countdown reaches zero, so
  // repeated taps cannot spam the SMS/email provider.
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN_SECONDS);
  const timerRef = useRef(null);

  const cleanNumber = (value) => String(value || "").replace(/\s/g, "");

  const startCooldown = (secs = RESEND_COOLDOWN_SECONDS) => {
    setCooldown(secs);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setCooldown((s) => {
        if (s <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
  };

  useEffect(() => {
    startCooldown(RESEND_COOLDOWN_SECONDS);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const goBack = () => {
    if (navigation.canGoBack()) navigation.goBack();
    else navigation.replace("Auth");
  };

  const handleVerify = async () => {
    if (otp.length !== 4) return setError("Enter the 4-digit code");
    setError("");
    setLoading(true);
    try {
      const identifier = phone;
      const result = mode === "pin"
        ? await api.verifyPinOtp(identifier, otp)
        : await api.verifyOtp(identifier, otp);
      if (result.success && result.data?.resetToken) {
        navigation.replace("ResetPassword", { identifier, phone: identifier, inputType, resetToken: result.data.resetToken, mode });
      } else {
        setError(result.message || "Invalid code. Please try again.");
      }
    } catch (err) {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!phone || resending || cooldown > 0) return;
    setNotice("");
    setResending(true);
    try {
      const identifier = phone;
      const result = mode === "pin"
        ? await api.resendPinCode(identifier)
        : await api.resendPasswordCode(identifier);
      if (result.success) {
        setNotice("A new code has been sent.");
        startCooldown(RESEND_COOLDOWN_SECONDS);
      } else {
        setNotice(result.message || "Could not resend. Try again.");
      }
    } catch (err) {
      setNotice("Network error. Please try again.");
    } finally {
      setResending(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <AuthBackground />
      <View style={styles.inner}>
        <TouchableOpacity style={styles.back} onPress={goBack}>
          <Ionicons name="arrow-back" size={22} color={C.white} />
        </TouchableOpacity>

        <View style={styles.avatarWrap}>
          <Text style={{ fontSize: 36 }}>✉️</Text>
        </View>
        <Text style={styles.title}>{inputType === "email" ? "Check your inbox" : "Verify it's you"}</Text>
        <Text style={styles.subtitle}>Enter the 4-digit code sent to{"\n"}{phone}</Text>



        <View style={styles.otpRow}>

          {[0, 1, 2, 3].map((i) => (

            <View key={i} style={[styles.otpBox, otp.length > i && styles.otpBoxFilled, otp.length === i && styles.otpBoxActive]}>

              <Text style={styles.otpDigit}>{otp[i] || ""}</Text>

            </View>

          ))}
  
          <TextInput
            style={styles.otpHidden}
  
            caretHidden
  
            autoFocus
            value={otp}
            onChangeText={(t) => setOtp(t.replace(/\D/g, "").slice(0, 4))}
            placeholder="0000"
            placeholderTextColor="rgba(255,255,255,0.4)"
            keyboardType="number-pad"
            maxLength={4}
            textAlign="center"
          />

        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}
        {notice ? <Text style={styles.notice}>{notice}</Text> : null}

        <TouchableOpacity style={[styles.btn, loading && { opacity: 0.6 }]} onPress={handleVerify} disabled={loading}>
          <Text style={styles.btnText}>{loading ? "Verifying..." : "Verify"}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.resend, (resending || cooldown > 0) && styles.resendDisabled]}
          onPress={handleResend}
          disabled={resending || cooldown > 0}
        >
          <Text style={styles.resendText}>
            {resending
              ? "Sending..."
              : cooldown > 0
              ? `Resend code in 00:${String(cooldown).padStart(2, "0")}`
              : "Resend code"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={goBack} style={{ marginTop: 18 }}>
          <Text style={{ fontSize: 14, fontWeight: "700", color: C.gold }}>Wrong {inputType === "email" ? "email" : "number"}? Change</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = withAuthStyles(StyleSheet.create({
  container: { flex: 1, backgroundColor: C.primary },
  inner: { flex: 1, justifyContent: "center", alignItems: "center", padding: S.xl },
  back: { position: "absolute", top: 60, left: S.xl, zIndex: 10 },
  avatarWrap: {
    width: 80, height: 80, borderRadius: 40, backgroundColor: "#FFB020",
    justifyContent: "center", alignItems: "center", marginBottom: S.base,
  },
  title: { fontSize: F.h2, fontWeight: "800", color: C.white },
  subtitle: { fontSize: F.md, color: "rgba(255,255,255,0.7)", marginTop: S.xs, marginBottom: S.md, textAlign: "center", lineHeight: 22 },
  destination: {
    flexDirection: "row",
    alignItems: "center",
    gap: S.sm,
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: R.full,
    paddingHorizontal: S.base,
    paddingVertical: S.sm,
    marginBottom: S.lg,
    alignSelf: "center",
    maxWidth: "100%",
  },
  destinationText: { fontSize: F.sm, fontWeight: "700", color: C.white, flexShrink: 1 },
  otpInput: {
    backgroundColor: "rgba(255,255,255,0.15)", borderRadius: R.sm,
    paddingHorizontal: S.base, paddingVertical: S.md + 2,
    fontSize: F.h2, fontWeight: "700", color: C.white, letterSpacing: 8, width: "60%",
  },
  error: { fontSize: F.sm, color: "#FFD4D4", textAlign: "center", marginTop: S.base },
  notice: { fontSize: F.sm, color: "rgba(255,255,255,0.85)", textAlign: "center", marginTop: S.xs },
  btn: {
    backgroundColor: C.white, borderRadius: R.sm, paddingVertical: S.md + 2,
    width: "100%", alignItems: "center", marginTop: S.xl,
  },
  btnText: { color: C.primary, fontSize: F.lg, fontWeight: "700" },
  resend: { alignItems: "center", marginTop: S.base },
  resendDisabled: { opacity: 0.55 },
  resendText: { fontSize: F.md, color: "rgba(255,255,255,0.7)", fontWeight: "600" },
  otpRow: { flexDirection: "row", justifyContent: "center", gap: 14, marginVertical: S.lg, alignSelf: "stretch" },
  otpBox: { width: 64, height: 72, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.12)", alignItems: "center", justifyContent: "center" },
  otpBoxFilled: { backgroundColor: "rgba(255,255,255,0.95)" },
  otpBoxActive: { borderWidth: 2, borderColor: C.gold },
  otpDigit: { fontSize: 28, fontWeight: "900", color: C.primary },
  otpHidden: { ...StyleSheet.absoluteFillObject, opacity: 0.02, color: "transparent" },
}));
