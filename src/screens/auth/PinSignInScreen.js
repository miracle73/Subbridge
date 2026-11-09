import React, { useState, useEffect, useRef } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Animated, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as SecureStore from "expo-secure-store";
import { C, F, R, S } from "../../utils/theme";
import { AuthToken, SecurePin } from "../../utils/storage";
import { Biometrics } from "../../utils/biometrics";
import PinDots from "../../components/PinDots";
import PinPad from "../../components/PinPad";
import ErrorModal from "../../components/ErrorModal";
import api from "../../services/api";

export default function PinSignInScreen({ navigation }) {
  const [pin, setPin] = useState("");
  const [errorModalVisible, setErrorModalVisible] = useState(false);
  const [errorModalMessage, setErrorModalMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [userName, setUserName] = useState("");
  const [bioReady, setBioReady] = useState(false);
  const shake = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    SecurePin.getName().then((n) => { if (n) setUserName(n); });
    Promise.all([Biometrics.isAvailable(), Biometrics.isEnabled()]).then(([a, e]) => {
      setBioReady(a && e);
    });
  }, []);

  const handleKey = (k) => {
    if (loading) return;
    if (k === "del") { setPin((p) => p.slice(0, -1)); return; }
    if (pin.length >= 4) return;
    const next = pin + k;
    setPin(next);
    if (next.length === 4) verifyPin(next);
  };

  const loginWithBiometric = async () => {
    if (loading) return;
    setLoading(true);
    const { pin: savedPin, error: bioError } = await Biometrics.getPinWithBiometric("Sign in to SubBridge");
    if (bioError || !savedPin) {
      setErrorModalMessage(bioError || "Biometric sign-in failed.");
      setErrorModalVisible(true);
      setPin("");
      setLoading(false);
      return;
    }
    setPin(savedPin);
    await verifyPin(savedPin);
  };

  const verifyPin = async (value) => {
    setLoading(true);
    console.log("[PinSignIn] Verifying PIN...");

    try {
      const phone = await SecurePin.getPhone();
      console.log("[PinSignIn] Phone:", phone);
      if (!phone) {
        setErrorModalMessage("No phone found. Please sign in with password.");
        setErrorModalVisible(true);
        setLoading(false);
        return;
      }

      const result = await api.signInWithPin(phone, value);
      console.log("[PinSignIn] Result:", result.success, result.message);

      if (result.success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        await SecurePin.save(value, phone);
        const user = result.data?.user;
        const name = user?.firstName || user?.firstname || user?.lastName || user?.lastname
          ? `${user.firstName || user.firstname || ""} ${user.lastName || user.lastname || ""}`.trim()
          : null;
        if (name) await SecurePin.setName(name);
        if (user?.has_pin === false) {
          navigation.replace("SetupPin", { phone });
        } else {
          navigation.replace("Home");
        }
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        const msg = result.message || "Incorrect PIN";
        if (/inactive|verif/i.test(msg)) {
          setLoading(false);
          navigation.replace("VerifyAccount", { phone });
          return;
        }
        try { await SecureStore.deleteItemAsync("subbridge_pin"); } catch {}
        setErrorModalMessage(msg);
        setErrorModalVisible(true);
        setPin("");
        setLoading(false);
        Animated.sequence([
          Animated.timing(shake, { toValue: 8, duration: 55, useNativeDriver: true }),
          Animated.timing(shake, { toValue: -8, duration: 55, useNativeDriver: true }),
          Animated.timing(shake, { toValue: 6, duration: 55, useNativeDriver: true }),
          Animated.timing(shake, { toValue: 0, duration: 55, useNativeDriver: true }),
        ]).start();
      }
    } catch (err) {
      setErrorModalMessage("Network error. Please try again.");
      setErrorModalVisible(true);
      setLoading(false);
    }
  };

  return (
    <>
    <View style={styles.container}>
      <TouchableOpacity style={styles.back} onPress={() => navigation.goBack()}>
        <Ionicons name="arrow-back" size={22} color={C.text} />
      </TouchableOpacity>

      <View style={styles.center}>
        <View style={styles.profileAvatar}>
          {userName ? (
            <Text style={styles.profileInitial}>{userName.charAt(0).toUpperCase()}</Text>
          ) : (
            <Ionicons name="person" size={36} color={C.primary} />
          )}
        </View>
        <Text style={styles.title}>
          {userName ? `Welcome Back, ${userName.split(" ")[0]}` : "Enter your PIN"}
        </Text>

        <Animated.View style={{ transform: [{ translateX: shake }] }}>
          <PinDots length={4} filled={pin.length} />
        </Animated.View>

        {loading ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 12 }}>
            <ActivityIndicator size="small" color={C.primary} />
            <Text style={{ fontSize: F.sm, color: C.textMuted, fontWeight: "600" }}>Verifying...</Text>
          </View>
        ) : null}

        <TouchableOpacity style={styles.forgotBtn} onPress={() => navigation.navigate("ForgotPassword", { mode: "pin" })}>
          <Ionicons name="key-outline" size={16} color={C.primary} />
          <Text style={styles.forgotText}>Forgot PIN?</Text>
        </TouchableOpacity>
      </View>

      <PinPad onPress={handleKey} onBiometric={bioReady ? loginWithBiometric : undefined} />
    </View>
    <ErrorModal visible={errorModalVisible} message={errorModalMessage} onClose={() => setErrorModalVisible(false)} />
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.white, paddingTop: 60 },
  back: { paddingHorizontal: S.xl },
  center: { flex: 1, justifyContent: "center", alignItems: "center", paddingBottom: S.xl },
  profileAvatar: {
    width: 72, height: 72, borderRadius: 36, backgroundColor: C.primaryLight,
    justifyContent: "center", alignItems: "center", borderWidth: 3, borderColor: C.primary,
  },
  profileInitial: { fontSize: 32, fontWeight: "800", color: C.primary },
  title: { fontSize: F.h3, fontWeight: "800", color: C.text, marginTop: S.base, marginBottom: S.lg },
  error: { fontSize: F.sm, color: C.debit, marginTop: S.md },
  forgotBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    marginTop: S.lg, paddingVertical: S.sm, paddingHorizontal: S.base,
    backgroundColor: C.primaryLight, borderRadius: R.sm, borderWidth: 1, borderColor: C.primary + "22"
  },
  forgotText: { fontSize: F.md, color: C.primary, fontWeight: "700" },
});
