import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { C, F, R, S } from "../../utils/theme";
import { AuthToken, SecurePin } from "../../utils/storage";
import api from "../../services/api";

export default function SignUpScreen({ navigation }) {
  const [step, setStep] = useState(1);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const validateStep1 = () => {
    if (!firstName.trim() || !lastName.trim()) return setError("Please enter your full name");
    if (!phone || phone.length < 10) return setError("Please enter a valid phone number");
    setError("");
    setStep(2);
  };

  const validateStep2 = () => {
    if (password.length < 5) return setError("Password must be at least 5 characters");
    if (password !== confirmPass) return setError("Passwords do not match");
    setError("");
    setStep(3);
  };

  const handleSignUp = async () => {
    if (pin.length !== 4) return setError("PIN must be 4 digits");
    if (pin !== confirmPin) return setError("PINs do not match");
    setError("");
    setLoading(true);

    try {
      const cleanPhone = "234" + phone.replace(/\s/g, "").replace(/^0/, "").replace(/^234/, "");
      console.log("[SignUp] Submitting:", cleanPhone, firstName, lastName, email);
      const result = await api.signUp({
        firstName,
        lastName,
        phone: cleanPhone,
        email,
        password,
        pin,
      });

      console.log("[SignUp] Result:", result.success, result.message);
      if (result.success) {
        await SecurePin.save(pin, cleanPhone);
        await SecurePin.setName(`${firstName} ${lastName}`.trim());
        navigation.replace("Home");
      } else {
        setError(result.message || "Sign up failed. Please try again.");
      }
    } catch (err) {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const progress = ((step - 1) / 2) * 100;

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={styles.inner}>
        <TouchableOpacity style={styles.back} onPress={() => (step > 1 ? setStep(step - 1) : navigation.goBack())}>
          <Ionicons name="arrow-back" size={22} color={C.white} />
        </TouchableOpacity>

        <View style={styles.avatarWrap}>
          <Ionicons name="person-add" size={40} color={C.white} />
        </View>
        <Text style={styles.title}>Create Account</Text>
        <Text style={styles.subtitle}>Step {step} of 3</Text>

        <View style={styles.progressWrap}>
          <View style={[styles.progressFill, { width: `${progress}%` }]} />
        </View>

        {step === 1 && (
          <View style={styles.form}>
            <TextInput style={styles.input} value={firstName} onChangeText={setFirstName} placeholder="First Name" placeholderTextColor="rgba(255,255,255,0.4)" />
            <TextInput style={styles.input} value={lastName} onChangeText={setLastName} placeholder="Last Name" placeholderTextColor="rgba(255,255,255,0.4)" />
            <View style={styles.phoneRow}>
              <View style={styles.prefix}><Text style={styles.prefixText}>+234</Text></View>
              <TextInput style={[styles.input, { flex: 1 }]} value={phone} onChangeText={setPhone} placeholder="812 345 6789" placeholderTextColor="rgba(255,255,255,0.4)" keyboardType="phone-pad" maxLength={11} />
            </View>
            <TextInput style={styles.input} value={email} onChangeText={setEmail} placeholder="Email (optional)" placeholderTextColor="rgba(255,255,255,0.4)" keyboardType="email-address" />
          </View>
        )}

        {step === 2 && (
          <View style={styles.form}>
            <TextInput style={styles.input} value={password} onChangeText={setPassword} placeholder="Password (min 5 characters)" placeholderTextColor="rgba(255,255,255,0.4)" secureTextEntry />
            <TextInput style={styles.input} value={confirmPass} onChangeText={setConfirmPass} placeholder="Confirm Password" placeholderTextColor="rgba(255,255,255,0.4)" secureTextEntry />
          </View>
        )}

        {step === 3 && (
          <View style={styles.form}>
            <TextInput style={styles.input} value={pin} onChangeText={(t) => setPin(t.replace(/\D/g, "").slice(0, 4))} placeholder="Create 4-digit PIN" placeholderTextColor="rgba(255,255,255,0.4)" keyboardType="number-pad" maxLength={4} secureTextEntry />
            <TextInput style={styles.input} value={confirmPin} onChangeText={(t) => setConfirmPin(t.replace(/\D/g, "").slice(0, 4))} placeholder="Confirm PIN" placeholderTextColor="rgba(255,255,255,0.4)" keyboardType="number-pad" maxLength={4} secureTextEntry />
          </View>
        )}

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <TouchableOpacity
          style={[styles.btn, loading && { opacity: 0.6 }]}
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); step === 1 ? validateStep1() : step === 2 ? validateStep2() : handleSignUp(); }}
          disabled={loading}
        >
          <Text style={styles.btnText}>{loading ? "Creating Account..." : step < 3 ? "Continue" : "Sign Up"}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.signupLink} onPress={() => navigation.goBack()}>
          <Text style={styles.signupText}>Already have an account? <Text style={styles.signupBold}>Sign In</Text></Text>
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
  subtitle: { fontSize: F.md, color: "rgba(255,255,255,0.7)", marginTop: S.xs },
  progressWrap: { width: 160, height: 4, backgroundColor: "rgba(255,255,255,0.2)", borderRadius: 2, marginTop: S.base, overflow: "hidden" },
  progressFill: { height: "100%", backgroundColor: C.white, borderRadius: 2 },
  form: { width: "100%", gap: S.md, marginTop: S.xl },
  input: {
    backgroundColor: "rgba(255,255,255,0.15)", borderRadius: R.sm,
    paddingHorizontal: S.base, paddingVertical: S.md + 2,
    fontSize: F.base, color: C.white,
  },
  phoneRow: { flexDirection: "row", gap: S.sm },
  prefix: {
    backgroundColor: "rgba(255,255,255,0.15)", borderRadius: R.sm,
    paddingHorizontal: S.md, justifyContent: "center",
  },
  prefixText: { fontSize: F.base, fontWeight: "600", color: C.white },
  error: { fontSize: F.sm, color: "#FFD4D4", textAlign: "center", marginTop: S.base },
  btn: {
    backgroundColor: C.white, borderRadius: R.sm, paddingVertical: S.md + 2,
    width: "100%", alignItems: "center", marginTop: S.xl,
  },
  btnText: { color: C.primary, fontSize: F.lg, fontWeight: "700" },
  signupLink: { marginTop: S.xl },
  signupText: { fontSize: F.md, color: "rgba(255,255,255,0.6)" },
  signupBold: { color: C.white, fontWeight: "700" },
});
