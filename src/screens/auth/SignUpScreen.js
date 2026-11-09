import AuthBackground, { withAuthStyles } from "";
import React, { useRef, useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { C, F, R, S } from "../../utils/theme";
import { AuthToken, PendingSignup } from "../../utils/storage";
import { normalizePhone, isEmail, formatPhoneInput } from "../../utils/format";
import api from "../../services/api";
import OneSignalService from "../../services/OneSignalService";
import ErrorModal from "../../components/ErrorModal";

export default function SignUpScreen({ navigation }) {
  const [step, setStep] = useState(1);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [referral, setReferral] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [passStage, setPassStage] = useState("new"); // "new" -> "confirm"
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorModalMessage, setErrorModalMessage] = useState("");

  // Synchronous locks. React state updates are async, so a state flag alone
  // can be overtaken by rapid taps and fire several requests at once.
  const checkingRef = useRef(false);
  const submittingRef = useRef(false);

  // Email/phone uniqueness check state
  const [checkError, setCheckError] = useState("");
  const [checkLoading, setCheckLoading] = useState(false);
  const [evEmailTaken, setEvEmailTaken] = useState(false);
  const [evPhoneTaken, setEvPhoneTaken] = useState(false);

  const resetCheck = () => {
    setCheckError("");
    setCheckLoading(false);
    setEvEmailTaken(false);
    setEvPhoneTaken(false);
  };

  const goBack = () => {
    resetCheck();
    setError("");
    if (step === 2 && passStage === "confirm") {
      setPassStage("new");
      setConfirmPass("");
      return;
    }
    if (step > 1) {
      if (step === 2) {
        setPassStage("new");
        setPassword("");
        setConfirmPass("");
      }
      setStep(step - 1);
      return;
    }
    navigation.goBack();
  };

  const phoneDigits = () => normalizePhone(phone).replace(/\D/g, "");

  // Accepts 08123456789 (11 digits) or 8123456789 (10 digits). Anything else —
  // such as a number with a digit deleted — is rejected, so the number that
  // gets checked is always the exact number that gets submitted.
  const isValidPhone = () => {
    const d = phoneDigits();
    if (!d) return false;
    return d.startsWith("0") ? d.length === 11 : d.length === 10;
  };

  // The exact phone representation the sign-up request sends.
  const canonicalPhone = () => "234" + phoneDigits().replace(/^0/, "").replace(/^234/, "");

  const validateStep1 = () => {
    if (!firstName.trim() || !lastName.trim()) { setErrorModalMessage("Please enter your full name"); setShowErrorModal(true); return false; }
    if (!isValidPhone()) { setErrorModalMessage("Please enter a valid phone number"); setShowErrorModal(true); return false; }
    const emailVal = email.trim();
    if (!emailVal) { setErrorModalMessage("Please enter your email address"); setShowErrorModal(true); return false; }
    if (!isEmail(emailVal)) { setErrorModalMessage("Enter a valid email address"); setShowErrorModal(true); return false; }
    return true;
  };

  const validateStep2 = () => {
    if (passStage === "new") {
      if (password.length < 5 || password.length > 7) { setErrorModalMessage("Password must be 5 to 7 digits"); setShowErrorModal(true); return; }
      setPassStage("confirm");
      setError("");
      resetCheck();
      return;
    }
    if (password !== confirmPass) { setErrorModalMessage("Passwords do not match"); setShowErrorModal(true); return; }
    setError("");
    setStep(3);
    resetCheck();
  };

  const goToStep2 = () => {
    setError("");
    resetCheck();
    setPassStage("new");
    setPassword("");
    setConfirmPass("");
    setStep(2);
  };

  // Turns a check response into the red field + message. Returns true when
  // the email or phone is already registered.
  const markTaken = (result) => {
    const d = result?.data || {};
    // The backend reports an existing account with any of these keys.
    const emailTaken = !!(d.email || d.emailer || d.emailTaken);
    const phoneTaken = !!(d.phone || d.phoneNumber || d.phoneLocal || d.phoneTaken);
    if (!emailTaken && !phoneTaken) return false;
    setEvEmailTaken(emailTaken);
    setEvPhoneTaken(phoneTaken);
    setCheckError(
      emailTaken && phoneTaken
        ? "That email and phone are already registered."
        : emailTaken
        ? "That email is already registered."
        : "That phone is already registered."
    );
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    return true;
  };

  // One uniqueness request at a time. Duplicate taps are ignored instead of
  // queued, so a failed/timed-out sibling request can never wave the user
  // through while another response says the identifier is taken.
  const runUniquenessCheck = async () => {
    if (checkingRef.current) return { blocked: true, taken: false };
    checkingRef.current = true;
    setCheckLoading(true);
    try {
      const result = await api.checkEmailPhone(undefined, email.trim(), canonicalPhone());
      if (result.success && markTaken(result)) return { blocked: false, taken: true };
      return { blocked: false, taken: false, result };
    } catch (err) {
      console.log("[SignUp] Uniqueness check error:", err?.message);
      return { blocked: false, taken: false, error: err };
    } finally {
      checkingRef.current = false;
      setCheckLoading(false);
    }
  };

  // Asks the API whether the typed email/phone already belong to an account.
  // On a taken identifier the offending input turns red and we stay on step 1.
  const handleStep1Continue = async () => {
    if (checkingRef.current) return;
    resetCheck();
    if (!validateStep1()) return;

    const outcome = await runUniquenessCheck();
    if (outcome.blocked || outcome.taken) return;
    if (outcome.error) {
      console.log("[SignUp] Uniqueness check failed, continuing");
    }
    goToStep2();
  };

  const handleSignUp = async () => {
    if (submittingRef.current) return;
    if (pin.length !== 4) {
      setErrorModalMessage("PIN must be 4 digits");
      setShowErrorModal(true);
      return;
    }
    if (pin !== confirmPin) {
      setErrorModalMessage("PINs do not match");
      setShowErrorModal(true);
      return;
    }
    resetCheck();
    submittingRef.current = true;
    setError("");
    setLoading(true);

    try {
      // Re-check right before creating the account. The identifiers must still
      // be free and must be exactly the ones submitted below — this closes the
      // window where the fields could change between step 1 and submit.
      const recheck = await runUniquenessCheck();
      if (recheck.taken) {
        setStep(1);
        setPassStage("new");
        setPassword("");
        setConfirmPass("");
        setPin("");
        setConfirmPin("");
        return;
      }
      if (recheck.blocked) return;

      const cleanPhone = canonicalPhone();
      const payload = { firstName, lastName, phone: cleanPhone, email: email.trim(), password, pin };
      const ref = referral.trim();
      if (ref) payload.referer = ref;
      console.log("[SignUp] Submitting:", cleanPhone, firstName, lastName, email.trim());
      const result = await api.signUp(payload);

      console.log("[SignUp] Result:", result.success, result.message);
      if (result.success) {
        // Account is created but must be verified before use:
        // drop the just-issued session and hand off to phone verification.
        api.token = null;
        api.userId = null;
        await AuthToken.clear();
        OneSignalService.logout();
        const pendingData = {
          userId: result.data?.id,
          phone: cleanPhone,
          phoneLocal: normalizePhone(phone),
          password,
          pin,
          firstName,
          lastName,
        };
        // Persist so a process death while the user copies the OTP
        // (app switch / Android kill) can resume verification on next boot.
        await PendingSignup.save(pendingData);
        navigation.replace("VerifyAccount", pendingData);
      } else {
        const msg = result.message || "Sign up failed. Please try again.";
        // Account already used error - redirect to SignIn
        if (/already.*used|exists/i.test(msg)) {
          setErrorModalMessage("This account is already registered. Please sign in instead.");
          setShowErrorModal(true);
          return;
        }
        setError(msg);
      }
    } catch (err) {
      setErrorModalMessage("Network error. Please try again.");
      setShowErrorModal(true);
    } finally {
      submittingRef.current = false;
      setLoading(false);
    }
  };

  const progress = ((step - 1) / 2) * 100;
  const activePass = passStage === "new" ? password : confirmPass;
  const emailTouched = email.trim().length > 0;
  const phoneTouched = normalizePhone(phone).length > 0;
  const emailError = emailTouched && evEmailTaken ? "#FF6B6B" : "";
  const phoneError = phoneTouched && evPhoneTaken ? "#FF6B6B" : "";

  return (
    <>
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <AuthBackground />
      <TouchableOpacity style={styles.back} onPress={goBack}>
        <Ionicons name="arrow-back" size={22} color={C.white} />
      </TouchableOpacity>

      <ScrollView contentContainerStyle={styles.inner} keyboardShouldPersistTaps="handled">
        <View style={{ alignSelf: "stretch" }}>
          <Text style={styles.stepLabel}>Step {step === 1 ? 1 : 2} of 2</Text>
          <Text style={[styles.title, { textAlign: "left" }]}>{step === 1 ? "Create your account" : "Set your transaction PIN"}</Text>
          <View style={styles.segRow}>
            <View style={[styles.seg, styles.segOn]} />
            <View style={[styles.seg, step > 1 && styles.segOn]} />
          </View>
        </View>

        {step === 1 && (
          <View style={styles.form}>
            <TextInput style={styles.input} value={firstName} onChangeText={setFirstName} placeholder="First name" placeholderTextColor="#C9D2FF" />
            <TextInput style={styles.input} value={lastName} onChangeText={setLastName} placeholder="Last name" placeholderTextColor="#C9D2FF" />
            <View style={styles.phoneRow}>
              <View style={styles.prefix}><Text style={styles.prefixText}>+234</Text></View>
              <TextInput
                style={[styles.input, { flex: 1 }, phoneError && styles.inputError]}
                value={phone}
                onChangeText={(t) => { setPhone(formatPhoneInput(t, phone)); setError(""); }}
                placeholder="812 345 6789"
                placeholderTextColor="#C9D2FF"
                keyboardType="phone-pad"
                maxLength={11}
              />
            </View>
            <TextInput
              style={[styles.input, emailError && styles.inputError]}
              value={email}
              onChangeText={(t) => { setEmail(t); setError(""); }}
              placeholder="Email address"
              placeholderTextColor="#C9D2FF"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TextInput style={styles.input} value={referral} onChangeText={(t) => { setReferral(t); setError(""); }} placeholder="Referral code (optional)" placeholderTextColor="#C9D2FF" autoCapitalize="none" autoCorrect={false} />
          </View>
        )}

        {step === 2 && (
          <View style={styles.form}>
            <Text style={styles.stageHint}>
              {passStage === "new"
                ? "Create your password — 5 to 7 digits"
                : "Re-enter your password to confirm"}
            </Text>
            <View style={styles.passWrap}>
              <TextInput
                style={[styles.input, { paddingRight: 48 }]}
                value={activePass}
                onChangeText={(t) => {
                  const v = t.replace(/\D/g, "").slice(0, 7);
                  if (passStage === "new") setPassword(v); else setConfirmPass(v);
                  setError("");
                }}
                placeholder={passStage === "new" ? "Password (numbers only)" : "Confirm password (numbers only)"}
                placeholderTextColor="#C9D2FF"
                keyboardType="number-pad"
                secureTextEntry={!showPass}
                maxLength={7}
              />
              <TouchableOpacity style={styles.eye} onPress={() => setShowPass((v) => !v)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons name={showPass ? "eye-off" : "eye"} size={20} color="rgba(255,255,255,0.7)" />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {step === 3 && (
          <View style={styles.form}>
            <View style={styles.passWrap}>
              <TextInput style={[styles.input, { paddingRight: 48 }]} value={pin} onChangeText={(t) => { setPin(t.replace(/\D/g, "").slice(0, 4)); setError(""); }} placeholder="Create 4-digit PIN" placeholderTextColor="#C9D2FF" keyboardType="number-pad" maxLength={4} secureTextEntry={!showPin} />
              <TouchableOpacity style={styles.eye} onPress={() => setShowPin((v) => !v)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons name={showPin ? "eye-off" : "eye"} size={20} color="rgba(255,255,255,0.7)" />
              </TouchableOpacity>
            </View>
            <View style={styles.passWrap}>
              <TextInput style={[styles.input, { paddingRight: 48 }]} value={confirmPin} onChangeText={(t) => { setConfirmPin(t.replace(/\D/g, "").slice(0, 4)); setError(""); }} placeholder="Confirm PIN" placeholderTextColor="#C9D2FF" keyboardType="number-pad" maxLength={4} secureTextEntry={!showPin} />
              <TouchableOpacity style={styles.eye} onPress={() => setShowPin((v) => !v)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons name={showPin ? "eye-off" : "eye"} size={20} color="rgba(255,255,255,0.7)" />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {checkError && (
          <Text style={[styles.error, { marginTop: S.sm }]}>{checkError}</Text>
        )}

        <TouchableOpacity
          style={[styles.btn, (loading || checkLoading) && { opacity: 0.6 }]}
          onPress={() => {
            if (loading || checkLoading) return;
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            step === 1 ? handleStep1Continue() : step === 2 ? validateStep2() : handleSignUp();
          }}
          disabled={loading || checkLoading}
        >
          <Text style={styles.btnText}>
            {checkLoading ? "Checking..." : loading ? "Continuing..." : step < 3 ? "Continue" : "Sign Up"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.signupLink} onPress={goBack}>
          <Text style={styles.signupText}>Already have an account? <Text style={styles.signupBold}>Sign In</Text></Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
    
    <ErrorModal
      visible={showErrorModal}
      message={errorModalMessage}
      onClose={() => setShowErrorModal(false)}
      title="Sign Up Error"
    />
    </>
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
  subtitle: { fontSize: F.md, color: "rgba(255,255,255,0.7)", marginTop: S.xs },
  progressWrap: { width: "100%", height: 6, backgroundColor: "rgba(255,255,255,0.2)", borderRadius: 3, marginTop: S.base, overflow: "hidden" },
  progressFill: { height: "100%", backgroundColor: C.gold, borderRadius: 3 },
  form: { width: "100%", gap: S.md, marginTop: S.xl, alignItems: "center" },
  stageHint: { fontSize: F.sm, color: "rgba(255,255,255,0.8)", fontWeight: "600", textAlign: "center" },
  input: {
    backgroundColor: "rgba(255,255,255,0.15)", borderRadius: R.sm,
    paddingHorizontal: S.base, paddingVertical: S.md + 2,
    fontSize: F.base, color: C.white, width: "100%",
  },
  inputError: {
    backgroundColor: "rgba(255,255,255,0.25)",
    borderWidth: 1.5,
    borderColor: "#FF6B6B",
  },
  passWrap: { width: "100%" },
  eye: { position: "absolute", right: S.md, top: 0, bottom: 0, justifyContent: "center" },
  phoneRow: { flexDirection: "row", gap: S.sm, width: "100%" },
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
  stepLabel: { fontSize: 13, fontWeight: "800", color: C.gold, marginBottom: 6 },
  segRow: { flexDirection: "row", gap: 8, marginTop: S.base, marginBottom: S.lg },
  seg: { flex: 1, height: 6, borderRadius: 3, backgroundColor: "rgba(255,255,255,0.2)" },
  segOn: { backgroundColor: C.gold },
}));
