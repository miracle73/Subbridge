// ============================================================
// SUBBRIDGE — Centralized OneSignal wrapper
// All OneSignal SDK interactions go through this module.
// Skipped entirely in Expo Go (native module not available).
// Ported from greatenterprise (yumpay-v1) integration.
// ============================================================
import React, { useState, useEffect, useCallback } from "react";
import {
  Modal, View, Text, StyleSheet, TouchableOpacity, Image,
} from "react-native";
import * as SecureStore from "expo-secure-store";
import { LinearGradient } from "expo-linear-gradient";
import Constants from "expo-constants";
import { C, F, R, S } from "../utils/theme";

const ONESIGNAL_APP_ID = "37ba850e-65a0-4a35-abde-df9482ac1a95";
const PUSH_PROMPT_KEY = "subbridge_push_prompt_shown_v1";
const LOGO_URI = require("../../assets/icon.png");

// Expo Go has no OneSignal native module — exempt it
const isExpoGo =
  Constants.executionEnvironment === "storeClient" ||
  Constants.appOwnership === "expo";

let OneSignal = null;
let LogLevel = null;
let initialized = false;
let clickListener = null;
let foregroundListener = null;
let subscriptionListener = null;
let pendingSubscriptionId = null;
let promptShown = false;
let onPromptReady = null;

function loadSdk() {
  if (OneSignal) return true;
  if (isExpoGo) return false;
  try {
    const mod = require("react-native-onesignal");
    OneSignal = mod.OneSignal;
    LogLevel = mod.LogLevel;
    return !!OneSignal;
  } catch (_) {
    return false;
  }
}

function isRegistered(subscriptionId) {
  return !!subscriptionId && !subscriptionId.startsWith("local-");
}

async function maybePrompt(subscriptionId) {
  if (isExpoGo) return;
  if (!isRegistered(subscriptionId)) return;
  if (promptShown) return;

  try {
    const seen = await SecureStore.getItemAsync(PUSH_PROMPT_KEY);
    if (seen === "true") return;
  } catch (_) {
    // Flag unreadable — assume already prompted so we never nag twice.
    return;
  }

  promptShown = true;
  // Persist BEFORE showing — the prompt must never appear a second time,
  // even if the user force-quits without tapping Enable / Not now.
  try { await SecureStore.setItemAsync(PUSH_PROMPT_KEY, "true"); } catch (_) {}
  pendingSubscriptionId = subscriptionId;
  if (onPromptReady) onPromptReady();
}

function setupPushSubscriptionObserver() {
  subscriptionListener = (subscription) => {
    maybePrompt(subscription?.current?.id);
  };
  OneSignal.User.pushSubscription.addEventListener("change", subscriptionListener);

  OneSignal.User.pushSubscription
    .getIdAsync()
    .then((id) => maybePrompt(id))
    .catch(() => {});
}

// ── Themed once-only push prompt UI ─────────────────────────
function PushPrompt({ visible, onDismiss }) {
  const handleAllow = async () => {
    try {
      await SecureStore.setItemAsync(PUSH_PROMPT_KEY, "true");
    } catch (_) {}
    try {
      if (OneSignal) OneSignal.Notifications.requestPermission(true);
    } catch (_) {}
    onDismiss();
  };

  const handleNotNow = async () => {
    try {
      await SecureStore.setItemAsync(PUSH_PROMPT_KEY, "true");
    } catch (_) {}
    onDismiss();
  };

  if (!visible) return null;

  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={handleNotNow}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <LinearGradient
            colors={[C.primaryLight, C.primary, C.primaryDark]}
            style={styles.cardHeader}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.logoRing}>
              <Image source={LOGO_URI} style={styles.logo} resizeMode="contain" />
            </View>
          </LinearGradient>

          <View style={styles.cardBody}>
            <Text style={styles.title}>Stay in the loop</Text>
            <Text style={styles.message}>
              Turn on notifications to get instant alerts for transactions, bill payments, and exclusive SubBridge updates.
            </Text>

            <TouchableOpacity style={styles.allowBtn} onPress={handleAllow} activeOpacity={0.85}>
              <LinearGradient
                colors={[C.accent, C.accentDark]}
                style={styles.allowGrad}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Text style={styles.allowText}>Enable Notifications</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity style={styles.notNowBtn} onPress={handleNotNow} activeOpacity={0.7}>
              <Text style={styles.notNowText}>Not now</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

class OneSignalService {
  static get isAvailable() {
    return !isExpoGo;
  }

  static initialize() {
    if (initialized || isExpoGo) return;
    if (!loadSdk()) return;
    initialized = true;

    try {
      OneSignal.Debug.setLogLevel(LogLevel.None);
      OneSignal.initialize(ONESIGNAL_APP_ID);

      clickListener = () => {};
      foregroundListener = () => {};

      OneSignal.Notifications.addEventListener("click", clickListener);
      OneSignal.Notifications.addEventListener("foregroundWillDisplay", foregroundListener);

      setupPushSubscriptionObserver();
    } catch (_) {
      initialized = false;
    }
  }

  static dispose() {
    if (isExpoGo || !OneSignal) return;
    try {
      if (clickListener) {
        OneSignal.Notifications.removeEventListener("click", clickListener);
        clickListener = null;
      }
      if (foregroundListener) {
        OneSignal.Notifications.removeEventListener("foregroundWillDisplay", foregroundListener);
        foregroundListener = null;
      }
      if (subscriptionListener) {
        OneSignal.User.pushSubscription.removeEventListener("change", subscriptionListener);
        subscriptionListener = null;
      }
    } catch (_) {}
    initialized = false;
  }

  static login(externalId) {
    if (isExpoGo || !OneSignal || !externalId) return;
    try { OneSignal.login(String(externalId)); } catch (_) {}
  }

  static logout() {
    if (isExpoGo || !OneSignal) return;
    try { OneSignal.logout(); } catch (_) {}
  }

  static setEmail(email) {
    if (isExpoGo || !OneSignal || !email) return;
    try { OneSignal.User.addEmail(email); } catch (_) {}
  }

  static removeEmail(email) {
    if (isExpoGo || !OneSignal || !email) return;
    try { OneSignal.User.removeEmail(email); } catch (_) {}
  }

  static setTags(tags) {
    if (isExpoGo || !OneSignal || !tags) return;
    try { OneSignal.User.addTags(tags); } catch (_) {}
  }

  static async hasNotificationPermission() {
    if (isExpoGo || !OneSignal) return false;
    try { return await OneSignal.Notifications.getPermissionAsync(); }
    catch (_) { return false; }
  }

  static requestNotificationPermission(fallbackToSettings) {
    if (isExpoGo || !OneSignal) return Promise.resolve(false);
    try {
      return OneSignal.Notifications.requestPermission(!!fallbackToSettings);
    } catch (_) {
      return Promise.resolve(false);
    }
  }

  static async getPushSubscriptionId() {
    if (isExpoGo || !OneSignal) return null;
    try { return await OneSignal.User.pushSubscription.getIdAsync(); }
    catch (_) { return null; }
  }

  // Hook for App.js to render the themed prompt
  static usePushPrompt() {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
      onPromptReady = () => setVisible(true);
      if (pendingSubscriptionId) {
        setVisible(true);
        pendingSubscriptionId = null;
      }
      return () => { onPromptReady = null; };
    }, []);

    const dismiss = useCallback(() => setVisible(false), []);

    return { visible, dismiss, PushPromptComponent: isExpoGo ? null : PushPrompt };
  }
}

export default OneSignalService;

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(10,14,26,0.72)",
    alignItems: "center",
    justifyContent: "center",
    padding: 28,
  },
  card: {
    width: "100%",
    maxWidth: 380,
    backgroundColor: "#fff",
    borderRadius: 24,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.28,
    shadowRadius: 24,
    elevation: 16,
  },
  cardHeader: {
    paddingTop: 34,
    paddingBottom: 30,
    alignItems: "center",
  },
  logoRing: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: C.accent,
    overflow: "hidden",
  },
  logo: { width: 64, height: 64 },
  cardBody: { paddingHorizontal: 26, paddingTop: 24, paddingBottom: 26 },
  title: {
    fontSize: 22,
    fontWeight: "900",
    color: C.primary,
    textAlign: "center",
    marginBottom: 10,
    letterSpacing: -0.3,
  },
  message: {
    fontSize: 14.5,
    color: C.textMuted,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 24,
  },
  allowBtn: {
    borderRadius: 28,
    overflow: "hidden",
    shadowColor: C.accent,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },
  allowGrad: {
    paddingVertical: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  allowText: {
    color: C.white,
    fontSize: 15.5,
    fontWeight: "900",
    letterSpacing: 0.2,
  },
  notNowBtn: {
    marginTop: 14,
    paddingVertical: 10,
    alignItems: "center",
  },
  notNowText: {
    color: C.textMuted,
    fontSize: 14,
    fontWeight: "600",
  },
});
