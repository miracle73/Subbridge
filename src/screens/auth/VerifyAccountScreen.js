import AuthBackground, { withAuthStyles } from "";
import React, { useState, useEffect, useRef } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { C, F, R, S } from "../../utils/theme";
import { SecurePin, PendingSignup } from "../../utils/storage";
import api from "../../services/api";

export default function VerifyAccountScreen({ navigation, route }) {
  const [pendingData, setPendingData] = useState(null);
  // Route params win when present; otherwise restore a signup that was
  // saved before a process death (e.g. app switched away to copy the OTP).
  const {
    userId,
    phone = "",
    phoneLocal = "",
    password = "",
    pin = "",
    firstName = "",
    lastName = "",
  } = route.params || pendingData || {};

  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const timerRef = useRef(null);

  const goAuth = async () => {
    await PendingSignup.clear();
    navigation.replace("Auth");
  };

  const startCooldown = (secs = 60) => {
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

  const sendCode = async (isAuto) => {
    if (!phone && !phoneLocal) {
      setError("Missing phone number. Please sign up again.");
      return;
    }
    setResending(true);
    setError("");
    if (!isAuto) setNotice("");
    const result = await api.resendVerificationCode(phoneLocal || phone);
    setResending(false);
    if (result.success) {
      startCooldown(60);
      setNotice(`A new code has been sent to ${phoneLocal || phone} on WhatsApp.`);
    } else {
      setError(
        result.message ||
          "We could not send the verification code. Please try again."
      );
    }
  };

  // Restore a pending signup (process death during OTP copy)
  // Only restore if no navigation params were passed (crashed mid-signup flow).
  // A login-redirect for an inactive account fills params with { phone, password }
  // which should take precedence over any stale PendingSignup.
  useEffect(() => {
    (async () => {
      if (!route.params) {
        const saved = await PendingSignup.get();
        if (saved) setPendingData(saved);
      }
    })();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [route.params]);

  // Auto-send a code as soon as the phone is known (immediately for
  // normal navigation, after restore for a recovered pending signup).
  useEffect(() => {
    if (phone || phoneLocal) sendCode(true);
  }, [phone, phoneLocal]);

  const finish = async () => {
    const loginId = phone || phoneLocal;
    if (!password) {
      // Verification started from a blocked sign-in — no saved password.
      // Let the user sign in manually now that the account is active.
      await PendingSignup.clear();
      navigation.replace("Auth");
      return;
    }
    const login = await api.signIn(loginId, password);
    if (!login.success) {
      // Account is active but login failed — let the user sign in manually
      goAuth();
      return;
    }
    await PendingSignup.clear();
    await SecurePin.save(pin, phoneLocal ? phoneLocal : undefined);
    if (firstName || lastName) await SecurePin.setName(`${firstName} ${lastName}`.trim());
    navigation.replace("Home");
  };

  const handleVerify = async () => {
    if (otp.length !== 4) return setError("Enter the 4-digit code sent to your WhatsApp");
    setError("");
    setNotice("");
    setLoading(true);
    try {
      const loginId = phone || phoneLocal;
      let result = loginId ? await api.verifySignUp(loginId, otp) : null;
      // Fallback to the legacy form endpoint (needs userId) if JSON API failed
      if ((!result || !result.success) && userId) {
        const legacy = await api.verifyAccount(userId, otp);
        if (legacy.success) result = legacy;
      }
      if (result?.success) {
        await finish();
        return;
      }
      const msg = result?.message || "";
      // If the account is somehow already active, confirm with a sign-in instead
      if (/already|activ|verif/i.test(msg) && password) {
        const check = await api.signIn(phone || phoneLocal, password);
        if (check.success) {
          await finish();
          return;
        }
      }
      setError(msg || "Invalid verification code. Please try again.");
    } catch (err) {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <AuthBackground />
      <TouchableOpacity style={styles.back} onPress={goAuth}>
        <Ionicons name="arrow-back" size={22} color={C.white} />
      </TouchableOpacity>

      <ScrollView contentContainerStyle={styles.inner} keyboardShouldPersistTaps="handled">
        <View style={styles.avatarWrap}>
          <Ionicons name="chatbubble-ellipses" size={40} color={C.white} />
        </View>
        <Text style={styles.title}>Verify Your Phone</Text>
        <Text style={styles.subtitle}>
          Enter the 4-digit code we sent to{"\n"}{phoneLocal || phone} on WhatsApp
        </Text>

        <View style={styles.form}>
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
              onChangeText={(t) => { setOtp(t.replace(/\D/g, "").slice(0, 4)); setError(""); }}
              placeholder="4-digit code"
              placeholderTextColor="rgba(255,255,255,0.4)"
              keyboardType="number-pad"
              maxLength={4}
            />
          </View>
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}
        {notice ? <Text style={styles.notice}>{notice}</Text> : null}

        <TouchableOpacity
          style={[styles.btn, (loading || resending) && { opacity: 0.6 }]}
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); handleVerify(); }}
          disabled={loading || resending}
        >
          <Text style={styles.btnText}>{loading ? "Verifying..." : "Verify & Continue"}</Text>
        </TouchableOpacity>

        <View style={styles.resendRow}>
          <Text style={styles.resendHint}>Didn't get the code?</Text>
          <TouchableOpacity
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); if (cooldown === 0 && !resending) sendCode(false); }}
            disabled={cooldown > 0 || resending}
          >
            <Text style={[styles.resendLink, (cooldown > 0 || resending) && styles.resendDisabled]}>
              {cooldown > 0 ? `Resend in ${cooldown}s` : resending ? "Sending..." : "Resend code"}
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.signupLink} onPress={goAuth}>
          <Text style={styles.signupText}>Wrong number? <Text style={styles.signupBold}>Back to Sign In</Text></Text>
        </TouchableOpacity>
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
  subtitle: {
    fontSize: F.md, color: "rgba(255,255,255,0.7)", marginTop: S.xs,
    textAlign: "center", lineHeight: 22,
  },
  form: { width: "100%", gap: S.md, marginTop: S.xl, alignItems: "center" },
  input: {
    backgroundColor: "rgba(255,255,255,0.15)", borderRadius: R.sm,
    paddingHorizontal: S.base, paddingVertical: S.md + 2,
    fontSize: F.lg, fontWeight: "700", color: C.white, width: "100%",
    textAlign: "center", letterSpacing: 6,
  },
  error: { fontSize: F.sm, color: "#FFD4D4", textAlign: "center", marginTop: S.base },
  notice: { fontSize: F.sm, color: "#C8FFE4", textAlign: "center", marginTop: S.base },
  btn: {
    backgroundColor: C.white, borderRadius: R.sm, paddingVertical: S.md + 2,
    width: "100%", alignItems: "center", marginTop: S.xl,
  },
  btnText: { color: C.primary, fontSize: F.lg, fontWeight: "700" },
  resendRow: { flexDirection: "row", gap: 6, marginTop: S.lg, alignItems: "center" },
  resendHint: { fontSize: F.sm, color: "rgba(255,255,255,0.6)" },
  resendLink: { fontSize: F.sm, fontWeight: "700", color: C.white },
  resendDisabled: { color: "rgba(255,255,255,0.4)" },
  signupLink: { marginTop: S.xl },
  signupText: { fontSize: F.md, color: "rgba(255,255,255,0.6)" },
  signupBold: { color: C.white, fontWeight: "700" },
  otpRow: { flexDirection: "row", justifyContent: "center", gap: 14, marginVertical: S.lg, alignSelf: "stretch" },
  otpBox: { width: 64, height: 72, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.12)", alignItems: "center", justifyContent: "center" },
  otpBoxFilled: { backgroundColor: "rgba(255,255,255,0.95)" },
  otpBoxActive: { borderWidth: 2, borderColor: C.gold },
  otpDigit: { fontSize: 28, fontWeight: "900", color: C.primary },
  otpHidden: { ...StyleSheet.absoluteFillObject, opacity: 0.02, color: "transparent" },
}));
