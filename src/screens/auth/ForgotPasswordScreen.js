import React, { useEffect, useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { C, F, R, S } from "../../utils/theme";
import { normalizePhone, isEmail, formatPhoneInput } from "../../utils/format";
import { AuthToken, SecurePin } from "../../utils/storage";
import api from "../../services/api";

export default function ForgotPasswordScreen({ navigation, route }) {
  const mode = route.params?.mode === "pin" ? "pin" : "password";
  const [phone, setPhone] = useState(() => normalizePhone(route.params?.phone || ""));
  const [email, setEmail] = useState("");
  const [inputType, setInputType] = useState(mode === "pin" ? "phone" : "email");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  // Only lock the field when we actually have a signed-in account to read
  // the linked details from. A visitor who is not logged in must be able to
  // type their own email/phone.
  const [hasSession, setHasSession] = useState(false);

  // Pull the details already linked to the account so the user does not have
  // to type them again (and so the code always goes to the right place).
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      let linkedEmail = "";
      try {
        const stored = await AuthToken.getUser();
        const savedPhone = await SecurePin.getPhone();
        if (!mounted) return;
        if (savedPhone && !phone) setPhone(normalizePhone(savedPhone));
        if (stored?.phone && !phone) setPhone(normalizePhone(stored.phone));
        if (isEmail(stored?.email)) {
          linkedEmail = stored.email;
          setEmail(stored.email);
        }

        // Refresh from the API when there is a session, so the email/phone
        // shown is the one currently on the account.
        const token = await AuthToken.get();
        if (token) {
          if (mounted) setHasSession(true);
          const res = await api.getUserProfile();
          const u = res?.data?.user || res?.data || {};
          if (mounted && res?.success) {
            if (u.phone) setPhone(normalizePhone(u.phone));
            if (isEmail(u.email)) {
              linkedEmail = u.email;
              setEmail(u.email);
            }
          }
        }

        // Default the toggle to whichever detail is actually linked.
        if (mounted) {
          // Phone only
        }
      } catch (e) {}
    };
    load();
    return () => {
      mounted = false;
    };
  }, [mode]);

  const identifier = inputType === "email" ? email.trim() : phone;
  const linked = hasSession && (inputType === "email" ? !!email : !!phone);

  const goBack = () => {
    // Safe exit: if there is nothing behind us (recovery started as a
    // root after lock-screen Forgot PIN), land on Auth — never the app.
    if (navigation.canGoBack()) navigation.goBack();
    else navigation.replace("Auth");
  };

  const handleSend = async () => {
    if (!identifier) return setError("Enter a valid email or phone number");
    if (inputType === "phone" && normalizePhone(identifier).replace(/\D/g, "").length < 10)
      return setError("Enter a valid phone number");
    setError("");
    setLoading(true);
    try {
      const cleanIdentifier = inputType === "email"
        ? identifier.trim()
        : normalizePhone(identifier).replace(/\D/g, "");
      const result = mode === "pin"
        ? await api.forgotPin(cleanIdentifier)
        : await api.forgotPassword(cleanIdentifier);
      if (result.success) {
        navigation.replace("VerifyOtp", { identifier: cleanIdentifier, phone: cleanIdentifier, mode, inputType });
      } else {
        setError(result.message || "Failed to send code. Please try again.");
      }
    } catch (err) {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={styles.inner}>
        <TouchableOpacity style={styles.back} onPress={goBack}>
          <Ionicons name="arrow-back" size={22} color={C.white} />
        </TouchableOpacity>

        <View style={styles.avatarWrap}>
          <Ionicons name="key" size={48} color={C.white} />
        </View>
        <Text style={styles.title}>{mode === "pin" ? "Forgot PIN" : "Forgot Password"}</Text>
        <Text style={styles.subtitle}>
          {mode === "pin"
            ? "We'll send a 6-digit code to the number linked to your account."
            : "We'll send a 6-digit code to the email linked to your account."}
        </Text>

        <View style={styles.form}>
          <View style={styles.inputToggle}>
            <TouchableOpacity
              style={[styles.toggleBtn, inputType === "phone" && styles.toggleBtnActive]}
              onPress={() => { setInputType("phone"); setError(""); }}
            >
              <Text style={[styles.toggleText, inputType === "phone" && styles.toggleTextActive]}>Phone</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toggleBtn, inputType === "email" && styles.toggleBtnActive]}
              onPress={() => { setInputType("email"); setError(""); }}
            >
              <Text style={[styles.toggleText, inputType === "email" && styles.toggleTextActive]}>Email</Text>
            </TouchableOpacity>
          </View>

          {inputType === "phone" ? (
            <View style={styles.fieldWrap}>
              <TextInput
                style={[styles.input, linked && styles.inputLocked]}
                value={phone}
                onChangeText={(t) => { setPhone(formatPhoneInput(t, phone)); }}
                placeholder="Phone number linked to your account"
                placeholderTextColor="rgba(255,255,255,0.4)"
                keyboardType="phone-pad"
                maxLength={11}
                editable={!linked}
              />
              {linked ? (
                <View style={styles.lockTag}>
                  <Ionicons name="lock-closed" size={12} color={C.white} />
                  <Text style={styles.lockTagText}>Linked to your account</Text>
                </View>
              ) : null}
            </View>
          ) : (
            <View style={styles.fieldWrap}>
              <TextInput
                style={[styles.input, linked && styles.inputLocked]}
                value={email}
                onChangeText={(t) => setEmail(t)}
                placeholder="Email linked to your account"
                placeholderTextColor="rgba(255,255,255,0.4)"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                maxLength={80}
                editable={!linked}
              />
              {linked ? (
                <View style={styles.lockTag}>
                  <Ionicons name="lock-closed" size={12} color={C.white} />
                  <Text style={styles.lockTagText}>Linked to your account</Text>
                </View>
              ) : null}
            </View>
          )}
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <TouchableOpacity style={[styles.btn, loading && { opacity: 0.6 }]} onPress={handleSend} disabled={loading}>
          <Text style={styles.btnText}>{loading ? "Sending..." : "Send Code"}</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={goBack}>
          <Text style={styles.linkText}>Back to Sign In</Text>
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
  subtitle: { fontSize: F.md, color: "rgba(255,255,255,0.7)", marginTop: S.xs, marginBottom: S.xl, textAlign: "center", lineHeight: 22 },
  form: { width: "100%", gap: S.md },
  inputToggle: {
    flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.15)",
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
    backgroundColor: "rgba(255,255,255,0.25)",
  },
  toggleText: {
    fontSize: F.sm,
    fontWeight: "600",
    color: "rgba(255,255,255,0.6)",
  },
  toggleTextActive: {
    color: C.white,
  },
  fieldWrap: { gap: S.sm },
  input: {
    backgroundColor: "rgba(255,255,255,0.15)", borderRadius: R.sm,
    paddingHorizontal: S.base, paddingVertical: S.md + 2,
    fontSize: F.base, color: C.white,
  },
  inputLocked: {
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.35)",
    opacity: 0.95,
  },
  lockTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    alignSelf: "flex-start",
    backgroundColor: "rgba(255,255,255,0.18)",
    borderRadius: R.full,
    paddingHorizontal: S.md,
    paddingVertical: 5,
  },
  lockTagText: { fontSize: F.xs, fontWeight: "700", color: C.white },
  error: { fontSize: F.sm, color: "#FFD4D4", textAlign: "center", marginTop: S.base },
  btn: {
    backgroundColor: C.white, borderRadius: R.sm, paddingVertical: S.md + 2,
    width: "100%", alignItems: "center", marginTop: S.xl,
  },
  btnText: { color: C.primary, fontSize: F.lg, fontWeight: "700" },
  linkText: { fontSize: F.md, color: "rgba(255,255,255,0.6)", marginTop: S.xl, fontWeight: "600" },
});
