import React, { useState, useRef } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Animated, StatusBar, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { C, F, R, S } from "../../utils/theme";
import { SecurePin } from "../../utils/storage";
import PinDots from "../../components/PinDots";
import PinPad from "../../components/PinPad";
import Preloader from "../../components/Preloader";
import api from "../../services/api";

export default function ChangePinScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState(1);
  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const shake = useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    const t = setTimeout(() => setLoading(false), 600);
    return () => clearTimeout(t);
  }, []);

  const handleKey = (k) => {
    if (k === "del") {
      if (step === 1) setCurrentPin((p) => p.slice(0, -1));
      else if (step === 2) setNewPin((p) => p.slice(0, -1));
      else setConfirmPin((p) => p.slice(0, -1));
      setError("");
      return;
    }

    let current, setCurrent, len = 4;
    if (step === 1) { current = currentPin; setCurrent = setCurrentPin; }
    else if (step === 2) { current = newPin; setCurrent = setNewPin; }
    else { current = confirmPin; setCurrent = setConfirmPin; }

    if (current.length >= len) return;
    const next = current + k;
    setCurrent(next);

    if (next.length === len) {
      if (step === 1) {
        verifyCurrentPin(next);
      } else if (step === 2) {
        setTimeout(() => setStep(3), 300);
      } else {
        if (next !== newPin) {
          setError("PINs do not match");
          setConfirmPin("");
          shakeAnim();
        } else {
          submitNewPin(currentPin, newPin);
        }
      }
    }
  };

  const verifyCurrentPin = async (pin) => {
    setVerifying(true);
    console.log("[ChangePin] Verifying current PIN...");
    try {
      const phone = await SecurePin.getPhone();
      const res = await api.verifyPin(phone || "", pin);
      console.log("[ChangePin] Verify result:", res.success, res.message);
      if (res.success) {
        setTimeout(() => setStep(2), 300);
      } else {
        setError(res.message || "Invalid current PIN");
        setCurrentPin("");
        shakeAnim();
      }
    } catch (err) {
      setError("Verification failed. Please try again.");
      setCurrentPin("");
      shakeAnim();
    } finally {
      setVerifying(false);
    }
  };

  const submitNewPin = async (oldPin, newPinValue) => {
    setVerifying(true);
    console.log("[ChangePin] Submitting new PIN...");
    try {
      const res = await api.changePin(oldPin, newPinValue);
      console.log("[ChangePin] Submit result:", res.success, res.message);
      if (res.success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        // Keep the locally saved PIN in sync for biometric use
        await SecurePin.save(newPinValue);
        setSuccess(true);
      } else {
        setError(res.message || "Failed to change PIN");
        setConfirmPin("");
        shakeAnim();
      }
    } catch (err) {
      setError("Failed to change PIN. Please try again.");
      setConfirmPin("");
      shakeAnim();
    } finally {
      setVerifying(false);
    }
  };

  const shakeAnim = () => {
    Animated.sequence([
      Animated.timing(shake, { toValue: 8, duration: 55, useNativeDriver: true }),
      Animated.timing(shake, { toValue: -8, duration: 55, useNativeDriver: true }),
      Animated.timing(shake, { toValue: 0, duration: 55, useNativeDriver: true }),
    ]).start();
  };

  const pinValue = step === 1 ? currentPin : step === 2 ? newPin : confirmPin;
  const titles = { 1: "Enter Current PIN", 2: "Enter New PIN", 3: "Confirm New PIN" };

  if (loading) return <Preloader />;

  if (success) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
        <LinearGradient colors={[C.primary, C.primaryDark]} style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={22} color={C.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Change PIN</Text>
          <View style={{ width: 22 }} />
        </LinearGradient>
        <View style={styles.successWrap}>
          <View style={styles.successIconWrap}>
            <Ionicons name="checkmark" size={40} color={C.white} />
          </View>
          <Text style={styles.successTitle}>PIN Changed!</Text>
          <Text style={styles.successDesc}>Your PIN has been updated successfully.</Text>
          <TouchableOpacity style={styles.doneBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.doneBtnText}>Done</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <LinearGradient colors={[C.primary, C.primaryDark]} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={C.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Change PIN</Text>
        <View style={{ width: 22 }} />
      </LinearGradient>

      <View style={[styles.center, { paddingBottom: insets.bottom + S.xl }]}>
        <Text style={styles.stepLabel}>Step {step} of 3</Text>
        <Text style={styles.title}>{titles[step]}</Text>
        <Animated.View style={{ transform: [{ translateX: shake }] }}>
          <PinDots length={4} filled={pinValue.length} />
        </Animated.View>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {verifying ? <Text style={{ fontSize: F.sm, color: C.textMuted, marginTop: S.md }}>Verifying...</Text> : null}
      </View>

      <View style={{ paddingBottom: insets.bottom }}>
        <PinPad onPress={handleKey} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.white },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: S.xl, paddingVertical: S.base },
  headerTitle: { fontSize: F.lg, fontWeight: "800", color: C.white },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  stepLabel: { fontSize: F.sm, color: C.textMuted, marginBottom: S.sm },
  title: { fontSize: F.h3, fontWeight: "800", color: C.text, marginBottom: S.lg },
  error: { fontSize: F.sm, color: C.debit, marginTop: S.md },
  successWrap: { flex: 1, alignItems: "center", padding: S.xl, paddingTop: S.xxl },
  successIconWrap: {
    width: 80, height: 80, borderRadius: 40, backgroundColor: C.accent,
    alignItems: "center", justifyContent: "center", marginBottom: S.base,
  },
  successTitle: { fontSize: F.h3, fontWeight: "800", color: C.text, marginTop: S.base },
  successDesc: { fontSize: F.md, color: C.textMuted, marginTop: S.sm, textAlign: "center" },
  doneBtn: {
    width: "100%", backgroundColor: C.primary, borderRadius: R.sm,
    paddingVertical: S.md + 2, alignItems: "center", marginTop: S.xl,
  },
  doneBtnText: { color: C.white, fontSize: F.lg, fontWeight: "700" },
});
