import { DEMO_MODE } from "../services/demoMode";
import * as LocalAuthentication from "expo-local-authentication";
import * as SecureStore from "expo-secure-store";
import { SecurePin } from "./storage";

const ENABLED_KEY = "subbridge_biometric_enabled";
const ASKED_KEY = "subbridge_biometric_asked";

/**
 * Central biometric helper.
 * Security model: the PIN itself stays in expo-secure-store (encrypted
 * keychain / EncryptedSharedPreferences). Biometric auth is required fresh
 * on EVERY use — nothing biometric is cached, and the PIN is only read
 * from secure storage after a successful device authentication.
 */
export const Biometrics = {
  /** Device has biometric hardware AND at least one biometric enrolled */
  async isAvailable() {
    try {
      const [hasHardware, enrolled] = await Promise.all([
        LocalAuthentication.hasHardwareAsync(),
        LocalAuthentication.isEnrolledAsync(),
      ]);
      return hasHardware && enrolled;
    } catch {
      return false;
    }
  },

  /** Friendly label: "Face ID", "Fingerprint" or "Biometrics" */
  async label() {
    try {
      const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
      if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
        return "Face ID";
      }
      if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
        return "Fingerprint";
      }
    } catch {}
    return "Biometrics";
  },

  /** One-shot device authentication. Returns true only on success. */
  async authenticate(reason) {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: reason || "Authenticate to continue",
        cancelLabel: "Cancel",
        fallbackLabel: "Use PIN",
        disableDeviceFallback: false,
      });
      return result.success === true;
    } catch {
      return false;
    }
  },

  async isEnabled() {
    try {
      const v = await SecureStore.getItemAsync(ENABLED_KEY);
      // Demo: biometrics is on by default until the user switches it off.
      return v === "1" || (DEMO_MODE && v === null);
    } catch {
      return false;
    }
  },

  async setEnabled(on) {
    try {
      if (on) await SecureStore.setItemAsync(ENABLED_KEY, "1");
      else if (DEMO_MODE) await SecureStore.setItemAsync(ENABLED_KEY, "0");
      else await SecureStore.deleteItemAsync(ENABLED_KEY);
    } catch {}
  },

  async wasAsked() {
    try {
      return (await SecureStore.getItemAsync(ASKED_KEY)) === "1";
    } catch {
      return false;
    }
  },

  async markAsked() {
    try {
      await SecureStore.setItemAsync(ASKED_KEY, "1");
    } catch {}
  },

  /** Full local reset — clears the enabled toggle and the asked flag.
   *  Called on logout so the next account must set up biometrics fresh. */
  async reset() {
    try { await SecureStore.deleteItemAsync(ENABLED_KEY); } catch {}
    try { await SecureStore.deleteItemAsync(ASKED_KEY); } catch {}
  },

  /**
   * Full flow for PIN-gated actions: biometric must be enabled and a PIN
   * saved, then the user authenticates and the saved PIN is returned.
   * Returns { pin } on success or { error } on failure.
   */
  async getPinWithBiometric(reason) {
    const enabled = await Biometrics.isEnabled();
    if (!enabled) return { error: "Biometric unlock is not enabled." };
    if (DEMO_MODE) {
      // Demo: a successful fingerprint/Face ID scan is enough to sign in.
      const ok = await Biometrics.authenticate(reason);
      if (!ok) return { error: "Authentication cancelled." };
      return { pin: (await SecurePin.get()) || "0000" };
    }
    const savedPin = await SecurePin.get();
    if (!savedPin || savedPin.length < 4) {
      return { error: "No saved PIN found. Please enter your PIN." };
    }
    const ok = await Biometrics.authenticate(reason);
    if (!ok) return { error: "Authentication cancelled." };
    // Re-read after auth so the PIN is only touched post-authentication
    const pin = await SecurePin.get();
    if (!pin) return { error: "No saved PIN found. Please enter your PIN." };
    return { pin };
  },
};
