import * as SecureStore from "expo-secure-store";
import * as LocalAuthentication from "expo-local-authentication";
import forge from "node-forge";

const PRIVATE_KEY_STORE = "subbridge_bio_private_key";
const PUBLIC_KEY_STORE = "subbridge_bio_public_key";

export const BiometricCrypto = {
  async hasKeys() {
    const priv = await SecureStore.getItemAsync(PRIVATE_KEY_STORE);
    return !!priv;
  },

  async getPublicKeyPem() {
    return SecureStore.getItemAsync(PUBLIC_KEY_STORE);
  },

  async generateKeyPair() {
    const keys = forge.pki.rsa.generateKeyPair({ bits: 2048, workers: -1 });
    const publicKeyPem = forge.pki.publicKeyToPem(keys.publicKey);
    const privateKeyPem = forge.pki.privateKeyToPem(keys.privateKey);
    await SecureStore.setItemAsync(PUBLIC_KEY_STORE, publicKeyPem);
    await SecureStore.setItemAsync(PRIVATE_KEY_STORE, privateKeyPem);
    return publicKeyPem;
  },

  async signChallenge(challenge) {
    const privateKeyPem = await SecureStore.getItemAsync(PRIVATE_KEY_STORE);
    if (!privateKeyPem) throw new Error("No private key stored");
    const privateKey = forge.pki.privateKeyFromPem(privateKeyPem);
    const md = forge.md.sha256.create();
    md.update(challenge, "utf8");
    const signature = privateKey.sign(md);
    return forge.util.encode64(signature);
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
