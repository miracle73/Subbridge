import AuthBackground, { withAuthStyles } from "";
import React, { useState, useRef } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Animated, StatusBar } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { C, F, R, S } from "../../utils/theme";
import { SecurePin } from "../../utils/storage";
import PinDots from "../../components/PinDots";
import PinPad from "../../components/PinPad";
import api from "../../services/api";

export default function SetupPinScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState(1);
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const shake = useRef(new Animated.Value(0)).current;

  const shakeAnim = () => {
    Animated.sequence([
      Animated.timing(shake, { toValue: 8, duration: 55, useNativeDriver: true }),
      Animated.timing(shake, { toValue: -8, duration: 55, useNativeDriver: true }),
      Animated.timing(shake, { toValue: 0, duration: 55, useNativeDriver: true }),
    ]).start();
  };

  const handleKey = (k) => {
    if (k === "del") {
      if (step === 1) setNewPin((p) => p.slice(0, -1));
      else setConfirmPin((p) => p.slice(0, -1));
      setError("");
      return;
    }
    const current = step === 1 ? newPin : confirmPin;
    const setCurrent = step === 1 ? setNewPin : setConfirmPin;
    if (current.length >= 4) return;
    const next = current + k;
    setCurrent(next);
    if (next.length === 4) {
      if (step === 1) {
        setTimeout(() => setStep(2), 300);
      } else if (next !== newPin) {
        setError("PINs do not match. Try again.");
        setConfirmPin("");
        shakeAnim();
      } else {
        submitPin(next);
      }
    }
  };

  const submitPin = async (pinValue) => {
    setSubmitting(true);
    setError("");
    try {
      const res = await api.setupPin(pinValue);
      if (res.success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        const phone = route.params?.phone || (await SecurePin.getPhone()) || "";
        await SecurePin.save(pinValue, phone);
        navigation.replace("Home");
      } else {
        setError(res.message || "Failed to set PIN. Please try again.");
        setConfirmPin("");
        setStep(1);
        setNewPin("");
        shakeAnim();
      }
    } catch (err) {
      setError("Network error. Please try again.");
      setConfirmPin("");
      shakeAnim();
    } finally {
      setSubmitting(false);
    }
  };

  const pinValue = step === 1 ? newPin : confirmPin;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <AuthBackground />
      <StatusBar barStyle="light-content" />
      <View style={styles.header}>
        <Ionicons name="shield-checkmark" size={48} color={C.white} />
        <Text style={styles.title}>Set Up Your PIN</Text>
        <Text style={styles.subtitle}>
          {step === 1 ? "Create a 4-digit PIN to secure your account" : "Confirm your 4-digit PIN"}
        </Text>
        <Text style={styles.stepLabel}>Step {step} of 2</Text>
      </View>

      <View style={styles.body}>
        <Animated.View style={[{ transform: [{ translateX: shake }] }, styles.dotsCard]}>
          <PinDots length={4} filled={pinValue.length} />
        </Animated.View>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {submitting ? <Text style={styles.busy}>Setting up PIN...</Text> : null}
      </View>

      <View style={{ paddingBottom: insets.bottom + S.md }}>
        <PinPad onPress={handleKey} />
      </View>
    </View>
  );
}

const styles = withAuthStyles(StyleSheet.create({
  container: { flex: 1, backgroundColor: C.primary },
  header: { alignItems: "center", paddingTop: S.xl, paddingHorizontal: S.xl },
  title: { fontSize: F.h2, fontWeight: "800", color: C.white, marginTop: S.base },
  subtitle: {
    fontSize: F.md, color: "rgba(255,255,255,0.75)",
    marginTop: S.xs, textAlign: "center", lineHeight: 22,
  },
  stepLabel: { fontSize: F.sm, color: "rgba(255,255,255,0.6)", marginTop: S.sm, fontWeight: "600" },
  body: { flex: 1, justifyContent: "center", alignItems: "center" },
  dotsCard: {
    backgroundColor: C.white, borderRadius: R.lg,
    paddingHorizontal: S.xl, paddingVertical: S.sm,
  },
  error: { fontSize: F.sm, color: "#FFD4D4", marginTop: S.md },
  busy: { fontSize: F.sm, color: "rgba(255,255,255,0.7)", marginTop: S.md },
}));
