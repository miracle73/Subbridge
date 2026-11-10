import { useDarkMode, darkVariant, DARK } from "../../utils/darkMode";
import { FadeIn, Float } from "../../components/Motion";
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
  const [dark, toggleDark] = useDarkMode();
  const st = dark ? darkStyles : styles;
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
  const nav = (r) => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); navigation.navigate(r.screen, r.params); };
  const groups = [
    ["ACCOUNT", [
      { icon: "👤", label: "Edit profile", screen: "EditProfile" },
      { icon: "🤝", label: "Referrals & commission", screen: "Rewards" },
      { icon: "🧾", label: "Transactions", screen: "TransactionsTab" },
    ]],
    ["SECURITY", [
      { icon: "🔒", label: "Change PIN", screen: "ChangePin" },
      { icon: "🔑", label: "Forgot PIN", screen: "ForgotPassword", params: { mode: "pin", phone: user?.phone || "", email: user?.email || "" } },
      { icon: "🔐", label: "Change password", screen: "ForgotPassword", params: { mode: "password", phone: user?.phone || "", email: user?.email || "" } },
    ]],
  ];

  const Row = ({ r, first }) => (
    <TouchableOpacity style={[st.row, !first && st.rowDivider]} onPress={() => nav(r)} activeOpacity={0.7}>
      <View style={st.rowIcon}><Text style={{ fontSize: 16 }}>{r.icon}</Text></View>
      <Text style={st.rowLabel}>{r.label}</Text>
      <Ionicons name="chevron-forward" size={18} color={C.textLight} />
    </TouchableOpacity>
  );

  return (
    <View style={st.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
        <LinearGradient colors={[C.primary, C.primaryDark]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[st.hero, { paddingTop: insets.top + S.xl }]}>
          <Float style={[st.blob, { width: 240, height: 240, top: -90, right: -70 }]} range={12} />
          <Float style={[st.blob, { width: 150, height: 150, bottom: -70, left: -40, backgroundColor: C.gold + "2E" }]} range={10} duration={5200} />
          <Text style={[st.spark, { top: insets.top + 20, left: 30 }]}>✦</Text>
          <Text style={[st.spark, { top: insets.top + 110, right: 40, fontSize: 12 }]}>✦</Text>
          <View style={st.avatar}>
            <Text style={st.avatarText}>{user?.firstName?.charAt(0)}{user?.lastName?.charAt(0)}</Text>
            <View style={st.onlineDot} />
          </View>
          <Text style={st.name}>{user?.firstName} {user?.lastName}</Text>
          <Text style={st.meta}>{[user?.phone, user?.email].filter(Boolean).join(" · ")}</Text>
        </LinearGradient>

        <View style={{ paddingHorizontal: S.xl }}>
          {groups.map(([title, items], gi) => (
            <FadeIn key={title} delay={80 * gi}>
              <Text style={st.groupTitle}>{title}</Text>
              <View style={st.card}>
                {items.map((r, i) => <Row key={r.label} r={r} first={i === 0} />)}
                {title === "SECURITY" && bioSupported ? (
                  <View style={[st.row, st.rowDivider]}>
                    <TouchableOpacity
                      style={st.rowMain}
                      activeOpacity={0.7}
                      onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); navigation.navigate("BiometricSetup"); }}
                    >
                      <View style={st.rowIcon}><Text style={{ fontSize: 16 }}>🫆</Text></View>
                      <View style={{ flex: 1 }}>
                        <Text style={st.rowLabel}>Biometrics ({bioLabel})</Text>
                        {bioEnabled && !bioKeys ? <Text style={st.setupHint}>Setup needed — tap to finish</Text> : null}
                      </View>
                    </TouchableOpacity>
                    <Switch value={bioEnabled} onValueChange={toggleBiometric} trackColor={{ false: C.border, true: C.primary }} thumbColor={C.white} />
                  </View>
                ) : null}
              </View>
            </FadeIn>
          ))}

          <Text style={st.groupTitle}>PREFERENCES</Text>
          <View style={st.card}>
            <View style={st.row}>
              <View style={st.rowIcon}><Text style={{ fontSize: 16 }}>🌙</Text></View>
              <Text style={st.rowLabel}>Dark mode</Text>
              <Switch value={dark} onValueChange={toggleDark} trackColor={{ false: C.border, true: C.primary }} thumbColor={C.white} />
            </View>
            <Row r={{ icon: "💬", label: "Support", screen: "Support" }} first={false} />
          </View>

          <TouchableOpacity style={st.logoutBtn} onPress={handleLogout} activeOpacity={0.8}>
            <Text style={st.logoutText}>Log out</Text>
          </TouchableOpacity>
        </View>

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

const shadow = { shadowColor: "#1A2680", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.07, shadowRadius: 18, elevation: 2 };
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  hero: { alignItems: "center", paddingBottom: S.xxl, borderBottomLeftRadius: 32, borderBottomRightRadius: 32, overflow: "hidden" },
  blob: { position: "absolute", borderRadius: 999, backgroundColor: "rgba(255,255,255,0.07)" },
  spark: { position: "absolute", color: "#FFD36B", fontSize: 16, fontWeight: "800" },
  avatar: { width: 88, height: 88, borderRadius: 44, backgroundColor: C.white, justifyContent: "center", alignItems: "center" },
  avatarText: { fontSize: 28, fontWeight: "900", color: C.primary },
  onlineDot: { position: "absolute", right: 4, bottom: 4, width: 18, height: 18, borderRadius: 9, backgroundColor: C.credit, borderWidth: 3, borderColor: C.white },
  name: { fontSize: F.xxl, fontWeight: "900", color: C.white, marginTop: S.md },
  meta: { fontSize: F.sm, color: C.onPrimaryMuted, marginTop: 4, textAlign: "center", paddingHorizontal: S.xl },

  groupTitle: { fontSize: 11, fontWeight: "800", letterSpacing: 1, color: C.textMuted, marginTop: S.xl, marginBottom: S.sm, marginLeft: 4 },
  card: { backgroundColor: C.white, borderRadius: 20, paddingHorizontal: S.base, ...shadow },
  row: { flexDirection: "row", alignItems: "center", gap: S.md, paddingVertical: 14 },
  rowDivider: { borderTopWidth: 1, borderTopColor: "#EEF0F7" },
  rowMain: { flex: 1, flexDirection: "row", alignItems: "center", gap: S.md },
  rowIcon: { width: 36, height: 36, borderRadius: 11, backgroundColor: C.primaryLight, alignItems: "center", justifyContent: "center" },
  rowLabel: { flex: 1, fontSize: F.base, fontWeight: "600", color: C.text },
  setupHint: { fontSize: F.xs, fontWeight: "700", color: C.warning, marginTop: 2 },

  logoutBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: S.sm, backgroundColor: C.debit + "14", borderRadius: 18, padding: S.base, marginTop: S.xl },
  logoutText: { fontSize: F.base, fontWeight: "800", color: C.debit },
});

const darkStyles = darkVariant(styles, {
  container: { backgroundColor: DARK.bg },
  card: { backgroundColor: DARK.card },
  rowLabel: { color: DARK.text },
  rowIcon: { backgroundColor: DARK.cardAlt },
  rowDivider: { borderTopColor: "#252D5C" },
  groupTitle: { color: DARK.muted },
});
