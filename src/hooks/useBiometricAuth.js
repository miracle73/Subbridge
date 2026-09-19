import { useState } from "react";
import { Alert } from "react-native";
import api from "../services/api";
import { BiometricCrypto } from "../services/biometric";

export function useBiometricAuth() {
  const [authMode, setAuthMode] = useState(null); // "pin" | "biometric" | null

  const getAuthPayload = async (pin, transactionId, transactionData) => {
    if (authMode === "biometric") {
      const auth = await BiometricCrypto.authenticate();
      if (!auth.success) {
        Alert.alert("Authentication", auth.error || "Authentication failed");
        return null;
      }

      const challengeRes = await api.requestChallenge(transactionId, transactionData);
      if (!challengeRes.success) {
        Alert.alert("Error", challengeRes.message || "Failed to get challenge");
        return null;
      }

      const signature = await BiometricCrypto.signChallenge(challengeRes.data.challenge);
      return {
        signature,
        transactionId,
        transactionData,
      };
    }

    if (authMode === "pin") {
      if (!pin) {
        Alert.alert("Error", "Please enter your PIN");
        return null;
      }
      return { pin };
    }

    Alert.alert("Error", "Please select a payment method");
    return null;
  };

  return { authMode, setAuthMode, getAuthPayload };
}
