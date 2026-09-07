import React, { useState, useEffect, useRef } from "react";
import { AppState } from "react-native";
import { NavigationContainer, useNavigation } from "@react-navigation/native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import ErrorBoundary from "./src/components/ErrorBoundary";
import AppNavigator from "./src/navigation/AppNavigator";
import AuthLock from "./src/components/AuthLock";
import { SecurePin, AuthToken } from "./src/utils/storage";
import api from "./src/services/api";

function AuthRedirector() {
  const [forceAuth, setForceAuth] = useState(false);

  useEffect(() => {
    api.setOnAuthError(() => {
      setForceAuth(true);
    });
    return () => api.setOnAuthError(null);
  }, []);

  if (forceAuth) {
    return null;
  }

  return null;
}

export default function App() {
  const [locked, setLocked] = useState(false);
  const [ready, setReady] = useState(false);
  const [authKey, setAuthKey] = useState(0);
  const lastBg = useRef(0);
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    api.setOnAuthError(() => {
      AuthToken.clear();
      SecurePin.clear();
      setReady(false);
      setLocked(false);
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
      if (isLoggedIn && pin) {
        setLocked(true);
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
        const pin = await SecurePin.get();
        if (!isLoggedIn || !pin) return;
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

  if (!ready) return null;

  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <StatusBar style="dark" hidden={false} translucent={false} backgroundColor="#fff" />
        {locked ? (
          <AuthLock onUnlock={() => setLocked(false)} />
        ) : (
          <NavigationContainer key={authKey}>
            <AppNavigator />
          </NavigationContainer>
        )}
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}
