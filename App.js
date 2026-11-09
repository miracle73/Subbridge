import React, { useState, useEffect, useRef } from "react";
import { AppState, BackHandler, Platform, Alert, View, StyleSheet } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import ErrorBoundary from "./src/components/ErrorBoundary";
import AppNavigator from "./src/navigation/AppNavigator";
import AuthLock from "./src/components/AuthLock";
import WhatsAppFab from "./src/components/WhatsAppFab";
import { SecurePin, AuthToken, NavState, PendingSignup } from "./src/utils/storage";
import { CrashLog } from "./src/services/crashLog";
import { resetBiometricState } from "./src/services/biometric";
import OneSignalService from "./src/services/OneSignalService";
import api from "./src/services/api";

const AUTH_ROUTES = ["Splash", "Onboarding", "Auth", "SignUp", "VerifyAccount", "SignIn", "PinSignIn", "ForgotPassword", "VerifyOtp", "ResetPassword", "SetupPin"];

// Capture fatal JS errors before the process dies; native crashes are
// caught separately via the keygen marker in crashLog.js.
function installCrashHandler() {
  try {
    const utils = global.ErrorUtils;
    if (!utils || !utils.setGlobalHandler) return;
    const previous = utils.getGlobalHandler ? utils.getGlobalHandler() : null;
    utils.setGlobalHandler((error, isFatal) => {
      try {
        CrashLog.record({
          type: isFatal ? "js-fatal" : "js-error",
          title: isFatal ? "Fatal JavaScript error" : "JavaScript error",
          detail: `${(error && error.message) || String(error)}\n${(error && error.stack) || ""}`.slice(0, 4000),
        });
      } catch (e) {}
      if (previous) previous(error, isFatal);
    });
  } catch (e) {}
}
installCrashHandler();

function PushPromptHost() {
  const { visible, dismiss, PushPromptComponent } = OneSignalService.usePushPrompt();
  if (!PushPromptComponent) return null;
  return <PushPromptComponent visible={visible} onDismiss={dismiss} />;
}

export default function App() {
  const [locked, setLocked] = useState(false);
  const [ready, setReady] = useState(false);
  const [authKey, setAuthKey] = useState(0);
  const [initialRoute, setInitialRoute] = useState("Splash");
  const [routeName, setRouteName] = useState(null);
  const lastBg = useRef(0);
  const appState = useRef(AppState.currentState);
  const navRef = useRef(null);

  useEffect(() => {
    OneSignalService.initialize();
    return () => OneSignalService.dispose();
  }, []);

  useEffect(() => {
    api.setOnAuthError(() => {
      AuthToken.clear();
      SecurePin.clear();
      NavState.clear();
      PendingSignup.clear();
      // Token is already dead — only wipe local biometric state
      resetBiometricState({ deregister: false }).catch(() => {});
      OneSignalService.logout();
      setReady(false);
      setLocked(false);
      setRouteName(null);
      setTimeout(() => {
        setAuthKey((k) => k + 1);
        setInitialRoute("Splash");
        setReady(true);
      }, 100);
    });
  }, []);

  useEffect(() => {
    (async () => {
      const isLoggedIn = await AuthToken.isLoggedIn();
      const pending = await PendingSignup.get();
      if (isLoggedIn) {
        setLocked(true);
        // Associate this device with the logged-in user for targeted pushes
        AuthToken.getUserId().then((uid) => { if (uid) OneSignalService.login(uid); }).catch(() => {});
      }
      const saved = await NavState.get();
      const savedOk =
        saved?.routeName && saved.routeName !== "Splash" && saved.routeName !== "Onboarding";
      if (isLoggedIn) {
        // Logged-in cold start goes straight to the last tab (or Home) —
        // never through Splash/Auth. AuthLock is shown as an overlay.
        setInitialRoute(savedOk ? saved.routeName : "Home");
      } else if (pending) {
        // Signup awaiting OTP: process death while copying the code must
        // resume on the verification screen, not Auth.
        setInitialRoute("VerifyAccount");
      } else {
        setInitialRoute("Splash");
      }
      setReady(true);

      // Surface any crash recorded during the previous session.
      try {
        const hasNewCrash = await CrashLog.harvest();
        if (hasNewCrash) {
          setTimeout(() => {
            const canNavigate = !!navRef.current;
            Alert.alert(
              "App crashed last session",
              "The app closed unexpectedly last time and the crash details were saved.\n\nView them now under Profile → Crash Logs.",
              canNavigate
                ? [
                    { text: "View logs", onPress: () => { try { navRef.current?.navigate("CrashLogs"); } catch (e) {} } },
                    { text: "Later", style: "cancel" },
                  ]
                : [{ text: "OK", style: "cancel" }]
            );
          }, 900);
        }
      } catch (e) {
        console.log("[App] Crash harvest error:", e?.message);
      }
    })();
  }, [authKey]);

  useEffect(() => {
    const sub = AppState.addEventListener("change", async (next) => {
      const prev = appState.current;

      // Going to background — record time
      if (prev === "active" && next !== "active") {
        lastBg.current = Date.now();
      }

      // Coming back to foreground
      if (next === "active" && prev !== "active") {
        const isLoggedIn = await AuthToken.isLoggedIn();
        if (!isLoggedIn) return;
        // Only re-lock after 30 minutes away — brief app switches
        // (e.g. copying an OTP) must resume seamlessly, not bounce to Auth.
        const away = Date.now() - lastBg.current;
        if (away > 30 * 60 * 1000) {
          setLocked(true);
        }
      }

      appState.current = next;
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (Platform.OS !== "android") return undefined;
    const ROOT_ROUTES = ["Home", "HomeTab", "TransactionsTab", "MenuTab", "WalletTab", "ProfileTab"];
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      const state = navRef.current?.getRootState?.();
      if (!state || !state.routes?.length) return false;
      const route = state.routes[state.index];
      if (route && ROOT_ROUTES.includes(route.name)) return true;
      return false;
    });
    return () => sub.remove();
  }, []);

  const handleNavStateChange = (state) => {
    if (!state) return;
    const route = state.routes?.[state.index];
    if (!route?.name) return;
    setRouteName(route.name);
    if (route.name === "Splash" || route.name === "Onboarding") return;
    const TAB_ROUTES = ["Home", "HomeTab", "TransactionsTab", "MenuTab", "WalletTab", "ProfileTab"];
    if (TAB_ROUTES.includes(route.name)) {
      NavState.save({ routeName: route.name, timestamp: Date.now() });
    }
  };

  if (!ready) return null;

  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <StatusBar style="dark" hidden={false} />
        <NavigationContainer key={authKey} ref={navRef} onStateChange={handleNavStateChange}>
          <AppNavigator initialRouteName={initialRoute} />
        </NavigationContainer>
        {/* Lock is an overlay — the navigator stays mounted underneath so
            the user's screen (and form state) is preserved across lock/unlock. */}
        {locked ? (
          <View style={StyleSheet.absoluteFill}>
            <AuthLock
              onUnlock={() => setLocked(false)}
              onForgotPin={async () => {
                // Reset the stack to ONLY the recovery screen — Back must
                // never reveal the dashboard without unlocking.
                setLocked(false);
                let phone = "";
                try { phone = (await SecurePin.getPhone()) || ""; } catch (e) {}
                try {
                  navRef.current?.reset({
                    index: 0,
                    routes: [{ name: "ForgotPassword", params: { mode: "pin", phone } }],
                  });
                } catch (e) {}
              }}
              onLogout={() => {
                // Full reset back to Splash → Auth after logging out
                setLocked(false);
                setRouteName(null);
                setAuthKey((k) => k + 1);
                setInitialRoute("Splash");
              }}
            />
          </View>
        ) : null}
        {routeName && !AUTH_ROUTES.includes(routeName) ? <WhatsAppFab /> : null}
        <PushPromptHost />
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}
