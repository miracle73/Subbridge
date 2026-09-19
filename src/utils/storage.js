import * as SecureStore from "expo-secure-store";

const TOKEN_KEY = "subbridge_token";
const USER_KEY = "subbridge_user";
const PIN_KEY = "subbridge_pin";
const PHONE_KEY = "subbridge_phone";
const NAME_KEY = "subbridge_name";
const ONBOARDING_KEY = "subbridge_onboarded";

export const AuthToken = {
  async save(token, user) {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
    if (user) await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));
  },
  async get() {
    try { return await SecureStore.getItemAsync(TOKEN_KEY); } catch { return null; }
  },
  async getUser() {
    try {
      const raw = await SecureStore.getItemAsync(USER_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  },
  async getUserId() {
    const user = await AuthToken.getUser();
    return user?.id || null;
  },
  async clear() {
    try { await SecureStore.deleteItemAsync(TOKEN_KEY); } catch {}
    try { await SecureStore.deleteItemAsync(USER_KEY); } catch {}
  },
  async isLoggedIn() {
    return !!(await AuthToken.get());
  },
};

export const SecurePin = {
  // Saves the server-verified PIN and/or phone independently, so a
  // password login (save(null, phone)) never clobbers a good saved PIN.
  async save(pin, phone) {
    if (pin) await SecureStore.setItemAsync(PIN_KEY, String(pin));
    if (phone) await SecureStore.setItemAsync(PHONE_KEY, String(phone));
  },
  async get() {
    try { return await SecureStore.getItemAsync(PIN_KEY); } catch { return null; }
  },
  async getPhone() {
    try { return await SecureStore.getItemAsync(PHONE_KEY); } catch { return null; }
  },
  async setName(name) {
    if (name) await SecureStore.setItemAsync(NAME_KEY, String(name));
  },
  async getName() {
    try { return await SecureStore.getItemAsync(NAME_KEY); } catch { return null; }
  },
  async clear() {
    try { await SecureStore.deleteItemAsync(PIN_KEY); } catch {}
    try { await SecureStore.deleteItemAsync(PHONE_KEY); } catch {}
    try { await SecureStore.deleteItemAsync(NAME_KEY); } catch {}
  },
  async hasSavedPin() {
    const pin = await SecurePin.get();
    return !!pin;
  },
};

export const OnboardingFlag = {
  async set() { await SecureStore.setItemAsync(ONBOARDING_KEY, "done"); },
  async get() { return (await SecureStore.getItemAsync(ONBOARDING_KEY)) === "done"; },
};

const NAV_STATE_KEY = "subbridge_nav_state";

export const NavState = {
  async save(state) {
    try { await SecureStore.setItemAsync(NAV_STATE_KEY, JSON.stringify(state)); } catch {}
  },
  async get() {
    try {
      const raw = await SecureStore.getItemAsync(NAV_STATE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  },
  async clear() {
    try { await SecureStore.deleteItemAsync(NAV_STATE_KEY); } catch {}
  },
};
