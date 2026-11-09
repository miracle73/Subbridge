import React, { useState, useCallback } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, StatusBar, Switch,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { C, F, R, S } from "../../utils/theme";
import api from "../../services/api";
import { AuthToken, SecurePin } from "../../utils/storage";
import { Biometrics } from "../../utils/biometrics";
import { BiometricCrypto, resetBiometricState } from "../../services/biometric";
import BiometricPrompt from "../../components/BiometricPrompt";
import Preloader from "../../components/Preloader";

export default function ProfileScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [bioSupported, setBioSupported] = useState(false);
  const [bioEnabled, setBioEnabled] = useState(false);
  const [bioKeys, setBioKeys] = useState(false);
  const [bioLabel, setBioLabel] = useState("Fingerprint");
  const [showBioSetup, setShowBioSetup] = useState(false);

  const refreshBioKeys = () => { BiometricCrypto.hasKeys().then(setBioKeys).catch(() => {}); };

  const fetchProfile = useCallback(async () => {
    setLoading(true);
    console.log("[Profile] Fetching...");
    try {
      const res = await api.getUserProfile();
      console.log("[Profile] Result:", res.success, res.data ? Object.keys(res.data) : "null");
      if (res.success && res.data) {
        const u = res.data.user || res.data;
        setUser({
          ...u,
          firstName: u.firstName || u.firstname || "",
          lastName: u.lastName || u.lastname || "",
        });
      }
    } catch (err) {
      console.error("[Profile] Fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchProfile();
    Biometrics.isAvailable().then(setBioSupported);
    Biometrics.isEnabled().then(setBioEnabled);
    Biometrics.label().then(setBioLabel);
    refreshBioKeys();
  }, [fetchProfile]);

  const toggleBiometric = async (on) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (on) {
      setShowBioSetup(true);
    } else {
      Alert.alert(
        `Disable ${bioLabel}?`,
        `You will need to enter your PIN manually for logins and transactions.`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Disable",
            style: "destructive",
            onPress: async () => {
              await Biometrics.setEnabled(false);
              setBioEnabled(false);
              try {
                await api.deregisterBiometric();
                await BiometricCrypto.deleteKeys();
              } catch (e) {
                console.log("[Profile] Biometric deregister error:", e);
              }
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            },
          },
        ]
      );
    }
  };

  const handleLogout = () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: async () => {
          console.log("[Profile] Logging out...");
          // Wipe biometric setup first — server deregister needs the live token
          await resetBiometricState();
          await api.logout();
          await AuthToken.clear();
          await SecurePin.clear();
          console.log("[Profile] Logout complete, navigating to Auth");
          navigation.reset({ index: 0, routes: [{ name: "Auth" }] });
        },
      },
    ]);
  };

  const rows = [
    { icon: "person-outline", label: "Edit Profile", screen: "EditProfile" },
    { icon: "lock-closed-outline", label: "Change PIN", screen: "ChangePin" },
    { icon: "key-outline", label: "Forgot PIN", screen: "ForgotPassword", params: { mode: "pin", phone: user?.phone || "" } },
    { icon: "help-circle-outline", label: "Support", screen: "Support" },
  ];

  if (loading) return <Preloader />;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <LinearGradient colors={[C.primary, C.primaryDark]} style={styles.header}>
        <View style={{ width: 22 }} />
        <Text style={styles.headerTitle}>Profile</Text>
        <View style={{ width: 22 }} />
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.avatarSection}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{user?.firstName?.charAt(0)}{user?.lastName?.charAt(0)}</Text>
          </View>
          <Text style={styles.name}>{user?.firstName} {user?.lastName}</Text>
          <Text style={styles.phone}>{user?.phone}</Text>
          <Text style={styles.email}>{user?.email}</Text>
        </View>

        {rows.map((r, i) => (
          <TouchableOpacity
            key={i}
            style={styles.row}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); navigation.navigate(r.screen, r.params); }}
          >
            <Ionicons name={r.icon} size={20} color={C.primary} />
            <Text style={styles.rowLabel}>{r.label}</Text>
            <Ionicons name="chevron-forward" size={18} color={C.textLight} />
          </TouchableOpacity>
        ))}

        {bioSupported ? (
          <View style={styles.row}>
            <TouchableOpacity
              style={styles.rowMain}
              disabled={!(bioEnabled && !bioKeys)}
              activeOpacity={bioEnabled && !bioKeys ? 0.6 : 1}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                navigation.navigate("BiometricSetup");
              }}
            >
              <Ionicons name="finger-print-outline" size={20} color={C.primary} />
              <View style={styles.rowTexts}>
                <Text style={styles.rowLabel}>{bioLabel} (Auth & Payments)</Text>
                {bioEnabled && !bioKeys ? (
                  <Text style={styles.setupHint}>Setup needed — tap to finish</Text>
                ) : null}
              </View>
            </TouchableOpacity>
            <Switch
              value={bioEnabled}
              onValueChange={toggleBiometric}
              trackColor={{ false: C.border, true: C.primary }}
              thumbColor={C.white}
            />
          </View>
        ) : null}

        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color={C.debit} />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>

        <BiometricPrompt
          visible={showBioSetup}
          onClose={(enabled) => {
            setShowBioSetup(false);
            setBioEnabled(!!enabled);
            if (enabled) refreshBioKeys();
          }}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: S.xl, paddingVertical: S.base },
  headerTitle: { fontSize: F.lg, fontWeight: "800", color: C.white },
  scroll: { padding: S.xl },
  avatarSection: { alignItems: "center", paddingVertical: S.xl },
  avatar: {
    width: 80, height: 80, borderRadius: 40, backgroundColor: C.primaryLight,
    justifyContent: "center", alignItems: "center", borderWidth: 3, borderColor: C.primary,
  },
  avatarText: { fontSize: F.h2, fontWeight: "800", color: C.primary },
  name: { fontSize: F.xl, fontWeight: "800", color: C.text, marginTop: S.md },
  phone: { fontSize: F.md, color: C.textMuted, marginTop: S.xs },
  email: { fontSize: F.sm, color: C.textLight, marginTop: 4 },

  row: {
    flexDirection: "row", alignItems: "center", gap: S.md,
    backgroundColor: C.white, borderRadius: R.sm, padding: S.base,
    marginBottom: S.sm, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
  },
  rowLabel: { flex: 1, fontSize: F.md, fontWeight: "600", color: C.text },
  rowMain: { flex: 1, flexDirection: "row", alignItems: "center", gap: S.md },
  rowTexts: { flex: 1 },
  setupHint: { fontSize: F.xs, fontWeight: "700", color: C.warning, marginTop: 2 },

  logoutBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: S.sm,
    backgroundColor: C.debit + "10", borderRadius: R.sm, padding: S.base, marginTop: S.xl,
  },
  logoutText: { fontSize: F.md, fontWeight: "700", color: C.debit },
});
