import * as SecureStore from "expo-secure-store";
import * as LocalAuthentication from "expo-local-authentication";
import { CrashLog } from "./crashLog";
import { Biometrics } from "../utils/biometrics";
import api from "./api";

const PRIVATE_KEY_STORE = "subbridge_bio_private_key";
const PUBLIC_KEY_STORE = "subbridge_bio_public_key";

let quickCrypto = null;
let loadError = null;

function loadQuickCrypto() {
  if (quickCrypto) return quickCrypto;
  if (loadError) throw loadError;
  try {
    quickCrypto = require("react-native-quick-crypto");
    if (!quickCrypto.generateKeyPair || !quickCrypto.createSign) {
      throw new Error("react-native-quick-crypto is missing generateKeyPair/createSign");
    }
    return quickCrypto;
  } catch (e) {
    loadError = new Error(
      "Native crypto unavailable. Build a custom APK/dev client (not Expo Go): " + (e?.message || e)
    );
    throw loadError;
  }
}

function generateKeyPairPem(QC) {
  return new Promise((resolve, reject) => {
    QC.generateKeyPair(
      "rsa",
      {
        modulusLength: 2048,
        publicExponent: 0x10001,
        publicKeyEncoding: { type: "spki", format: "pem" },
        privateKeyEncoding: { type: "pkcs8", format: "pem" },
      },
      (err, publicKeyPem, privateKeyPem) => {
        if (err) reject(err);
        else resolve({ publicKeyPem, privateKeyPem });
      }
    );
  });
}

export const BiometricCrypto = {
  async hasKeys() {
    const priv = await SecureStore.getItemAsync(PRIVATE_KEY_STORE);
    return !!priv;
  },

  async getPublicKeyPem() {
    return SecureStore.getItemAsync(PUBLIC_KEY_STORE);
  },

  async generateKeyPair() {
    // Marker stages let us detect (on next launch) exactly where the
    // process died if the native crypto module crashes the app.
    // It is cleared on JS errors too — a surviving marker therefore
    // means a genuine native death (signal handlers never ran).
    await CrashLog.beginKeygen("module-load");
    try {
      const QC = loadQuickCrypto();
      // Cheap native sanity probe — fails fast (JS side) if the module is broken
      // before we reach the expensive RSA key generation.
      if (typeof QC.randomBytes === "function") {
        try { QC.randomBytes(8); } catch (e) { console.log("[BiometricCrypto] randomBytes probe failed:", e?.message); }
      }
      await CrashLog.setKeygenStage("rsa-keygen");
      const { publicKeyPem, privateKeyPem } = await generateKeyPairPem(QC);
      await CrashLog.setKeygenStage("save-keys");
      await SecureStore.setItemAsync(PUBLIC_KEY_STORE, publicKeyPem);
      await SecureStore.setItemAsync(PRIVATE_KEY_STORE, privateKeyPem);
      await CrashLog.endKeygen();
      return publicKeyPem;
    } catch (e) {
      await CrashLog.endKeygen();
      throw e;
    }
  },

  async signChallenge(challenge) {
    const privateKeyPem = await SecureStore.getItemAsync(PRIVATE_KEY_STORE);
    if (!privateKeyPem) throw new Error("No private key stored");
    const QC = loadQuickCrypto();
    const signer = QC.createSign("SHA256");
    signer.update(challenge, "utf8");
    // quick-crypto 1.x has no end() — only call it if present (node-compat)
    if (typeof signer.end === "function") signer.end();
    return signer.sign(privateKeyPem, "base64");
  },

  async deleteKeys() {
    try { await SecureStore.deleteItemAsync(PRIVATE_KEY_STORE); } catch {}
    try { await SecureStore.deleteItemAsync(PUBLIC_KEY_STORE); } catch {}
  },

  async authenticate() {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    if (!hasHardware) return { success: false, error: "No biometric hardware" };
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();
    if (!isEnrolled) return { success: false, error: "No biometrics enrolled" };
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: "Authenticate to sign transaction",
      cancelLabel: "Use PIN",
    });
    return { success: result.success, error: result.success ? null : "Authentication cancelled" };
  },
};

/**
 * Wipe every trace of the current account's biometric setup so the next
 * account that logs in must register its own signature/status from scratch.
 * - deregister: also removes the public key on the server — requires a
 *   still-valid auth token, so call BEFORE logging out. On 401/session
 *   expiry pass { deregister: false } (the token is already dead).
 */
export async function resetBiometricState({ deregister = true } = {}) {
  if (deregister) {
    try {
      await api.deregisterBiometric();
    } catch (e) {
      console.log("[Biometric] deregister on reset failed:", e?.message);
    }
  }
  try { await Biometrics.reset(); } catch (e) { console.log("[Biometric] local reset failed:", e?.message); }
  await BiometricCrypto.deleteKeys();
}
