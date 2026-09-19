import React, { useState, useEffect, useRef } from "react";
import { AppState } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import ErrorBoundary from "./src/components/ErrorBoundary";
import AppNavigator from "./src/navigation/AppNavigator";
import AuthLock from "./src/components/AuthLock";
import { SecurePin, AuthToken, NavState } from "./src/utils/storage";
import api from "./src/services/api";

export default function App() {
  const [locked, setLocked] = useState(false);
  const [ready, setReady] = useState(false);
  const [authKey, setAuthKey] = useState(0);
  const [savedRoute, setSavedRoute] = useState(null);
  const lastBg = useRef(0);
  const appState = useRef(AppState.currentState);
  const navRef = useRef(null);

  useEffect(() => {
    api.setOnAuthError(() => {
      AuthToken.clear();
      SecurePin.clear();
      NavState.clear();
      setReady(false);
      setLocked(false);
      setSavedRoute(null);
      setTimeout(() => {
        setAuthKey((k) => k + 1);
        setReady(true);
      }, 100);
    });
  }, []);

  useEffect(() => {
    (async () => {
      const isLoggedIn = await AuthToken.isLoggedIn();
      const pin = await SecurePin.get();
      if (isLoggedIn) {
        setLocked(true);
      }
      const saved = await NavState.get();
      if (saved?.routeName && saved.routeName !== "Splash" && saved.routeName !== "Onboarding") {
        setSavedRoute(saved.routeName);
      }
      setReady(true);
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
        // Only lock if user was away for 1+ seconds (covers real background/lock screen)
        const away = Date.now() - lastBg.current;
        if (away > 1000) {
          setLocked(true);
        }
      }

      appState.current = next;
    });
    return () => sub.remove();
  }, []);

  const handleNavStateChange = (state) => {
    if (!state) return;
    const route = state.routes?.[state.index];
    if (!route?.name || route.name === "Splash" || route.name === "Onboarding") return;
    const TAB_ROUTES = ["Home", "HomeTab", "TransactionsTab", "WalletTab", "ProfileTab"];
    if (TAB_ROUTES.includes(route.name)) {
      NavState.save({ routeName: route.name, timestamp: Date.now() });
    }
  };

  if (!ready) return null;

  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <StatusBar style="dark" hidden={false} translucent={false} backgroundColor="#fff" />
        {locked ? (
          <AuthLock onUnlock={() => setLocked(false)} />
        ) : (
          <NavigationContainer key={authKey} ref={navRef} onStateChange={handleNavStateChange}>
            <AppNavigator initialRouteName={savedRoute || "Splash"} />
          </NavigationContainer>
        )}
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}
