import { AuthToken } from "../utils/storage";
import OneSignalService from "./OneSignalService";
import { isEmail } from "../utils/format";
import { ApiLog } from "./apiLog";

import { demoResponse, DEMO_MODE } from "./demoMode";
const BASE_URL = "https://subbridge.connectbridge.com.ng";

// The backend occasionally takes 5-10s (email/WhatsApp OTP sends). If a
// response tails past OkHttp's 10s read timeout, RN fetch throws
// "Network request failed" — retry a couple of times to absorb the blip.
//
// The first retry runs immediately and forces a brand new connection. The
// usual cause of "everything fails until I toggle mobile data" is a dead
// keep-alive socket still sitting in OkHttp's connection pool (after a
// network switch or an idle timeout): every request reused that socket and
// failed instantly, and only cycling the radio cleared the pool. Retrying
// with "Connection: close" bypasses the stale socket so the request heals
// itself instead of waiting for the user to toggle data.
const NETWORK_RETRY_DELAYS = [0, 1200, 3000];
// Reads should fail over quickly; POSTs may legitimately wait on OTP delivery
// (React Native itself leaves OkHttp timeouts at 0 = forever, so an explicit
// bound is what stops a half-dead socket from hanging a request indefinitely).
const READ_TIMEOUT_MS = 20000;
const WRITE_TIMEOUT_MS = 60000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Only idempotent/safe requests are auto-retried — never purchases.
const SAFE_POST_RETRY_RE =
  /^\/api\/(sign-in|sign-up|forgot-|resend-|verify-|reset-|setup-pin|change-pin|logout|check-email-phone)|^\/ajax\/|^\/verify-account\//;

function shouldRetry(endpoint, method) {
  if (method === "GET") return true;
  return SAFE_POST_RETRY_RE.test(endpoint);
}

// The backend stores phones in local format (0811...) but some auth routes
// expect the international format (234811...). These helpers convert between
// the two so we can retry a lookup with the other representation.
const toLocalPhone = (value) => {
  const d = String(value ?? "").replace(/\D/g, "");
  if (!d) return null;
  if (d.startsWith("234") && d.length >= 13) return "0" + d.slice(3);
  return d;
};

const toIntlPhone = (value) => {
  const d = String(value ?? "").replace(/\D/g, "");
  if (!d) return null;
  if (d.startsWith("234") && d.length >= 13) return d;
  if (d.startsWith("0")) return "234" + d.slice(1);
  return "234" + d;
};

// One attempt. A forced attempt always opens a fresh TCP/TLS connection
// instead of borrowing a possibly-dead pooled one.
async function fetchOnce(url, config, forceNewConnection, timeoutMs) {
  const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
  const timer = controller
    ? setTimeout(() => controller.abort(), timeoutMs)
    : null;
  const headers = forceNewConnection
    ? { ...config.headers, Connection: "close" }
    : config.headers;

  try {
    return await fetch(url, {
      ...config,
      headers,
      signal: controller ? controller.signal : undefined,
    });
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function fetchWithRetry(url, config, retries, forceFreshConnection = false, timeoutMs = WRITE_TIMEOUT_MS) {
  let lastError;
  for (let i = 0; i <= retries; i++) {
    try {
      return await fetchOnce(url, config, forceFreshConnection || i > 0, timeoutMs);
    } catch (err) {
      lastError = err;
      if (i >= retries) break;
      console.log(`[API] Network error (${err?.message}) — retry ${i + 1}/${retries} on a fresh connection`);
      const delay = NETWORK_RETRY_DELAYS[i] ?? 3000;
      if (delay) await sleep(delay);
    }
  }
  throw lastError;
}

class ApiService {
  constructor() {
    this.token = null;
    this.userId = null;
    this.onAuthError = null;
  }

  setOnAuthError(callback) {
    this.onAuthError = callback;
  }

  async init() {
    this.token = await AuthToken.get();
    this.userId = await AuthToken.getUserId();
    console.log("[API] init — token:", this.token ? this.token.substring(0, 20) + "..." : null, "userId:", this.userId);
  }

  async request(endpoint, method = "POST", body = null) {
    const demo = demoResponse(endpoint);
    if (demo) { console.log(`[API][DEMO] ${method} ${endpoint}`); return demo; }
    const headers = {
      "Content-Type": "application/json",
      Accept: "application/json",
    };

    if (this.token) {
      headers["Authorization"] = `Token ${this.token}`;
    }

    const config = { method, headers };
    if (body && method !== "GET") {
      config.body = JSON.stringify(body);
    }

    console.log(`[API] ${method} ${endpoint}`, body ? JSON.stringify(body) : "");
    console.log("[API] Headers:", JSON.stringify(headers));

    const startedAt = Date.now();
    const retryable = shouldRetry(endpoint, method);
    try {
      const response = await fetchWithRetry(
        `${BASE_URL}${endpoint}`,
        config,
        retryable ? NETWORK_RETRY_DELAYS.length : 0,
        // Purchases are never retried (a retry could double-charge), so make
        // sure their single attempt starts on a fresh connection instead of
        // a stale pooled socket.
        !retryable,
        method === "GET" ? READ_TIMEOUT_MS : WRITE_TIMEOUT_MS
      );

      if (response.status === 401 && this.token === "demo-token") {
        return { success: false, message: "Demo mode", data: null };
      }
      if (response.status === 401) {
        console.log("[API] 401 Unauthorized — clearing token, redirecting to auth");
        this.token = null;
        this.userId = null;
        await AuthToken.clear();
        if (this.onAuthError) this.onAuthError();
        return { success: false, message: "Session expired. Please login again.", data: null, unauthorized: true };
      }

      const text = await response.text();
      let raw;
      try { raw = text ? JSON.parse(text) : null; } catch { raw = text; }

      console.log(`[API] Response ${response.status}:`, JSON.stringify(raw)?.substring(0, 500));

      // /api/verify-pin/ returns raw true/false, not the envelope
      if (typeof raw === "boolean") {
        return { success: raw, message: raw ? "" : "Incorrect PIN", data: raw };
      }
      if (typeof raw === "string") {
        const t = raw.trim().toLowerCase();
        if (t === "true" || t === "1") return { success: true, message: "", data: true };
        if (t === "false" || t === "0") return { success: false, message: "Incorrect PIN", data: false };
      }

      const apiSuccess = raw?.success === true;
      const inner = raw?.data;

      // Some endpoints return flat: { success, message, data }
      // Others return double-nested: { success, data: { success, message, data } }
      const isDoubleNested = inner && typeof inner === "object" && "success" in inner && "data" in inner;

      let success, message, payload;
      if (isDoubleNested) {
        success = apiSuccess && inner.success === true;
        message = inner.message || "";
        payload = inner.data;
      } else {
        // If endpoint returns data without success envelope, assume success if data exists
        success = apiSuccess || (raw && 'data' in raw && raw.data !== undefined && raw.success === undefined);
        message = raw?.message || "";
        payload = inner !== undefined ? inner : raw;
      }

      const result = { success, message, data: payload, raw };

      // Normalize user object - API returns firstname/lastname, app uses firstName/lastName
      if (result.data?.user) {
        const u = result.data.user;
        result.data.user = {
          ...u,
          firstName: u.firstName || u.firstname || "",
          lastName: u.lastName || u.lastname || "",
        };
      }

      console.log(`[API] Parsed: success=${result.success} message="${result.message}" dataKeys=${result.data ? Object.keys(result.data) : "null"}`);

      // TEMP debug trail (Profile → API Logs) — remove once confirmed
      ApiLog.record({
        method,
        endpoint,
        status: response.status,
        req: typeof body === "object" ? JSON.stringify(body) : String(body || ""),
        res: typeof raw === "string" ? raw : JSON.stringify(raw),
        ms: Date.now() - startedAt,
        ok: result.success,
        msg: result.message || "",
      });

      return result;
    } catch (error) {
      console.error("[API] Error:", error.message, error);
      ApiLog.record({
        method,
        endpoint,
        status: 0,
        req: typeof body === "object" ? JSON.stringify(body) : String(body || ""),
        res: "",
        error: error.message,
        ms: Date.now() - startedAt,
        ok: false,
        msg: error.message,
      });
      return { success: false, message: "Network error. Please try again.", data: null };
    }
  }

  async get(endpoint) {
    return this.request(endpoint, "GET");
  }

  async post(endpoint, body) {
    return this.request(endpoint, "POST", body);
  }

  async put(endpoint, body) {
    return this.request(endpoint, "PUT", body);
  }

  async delete(endpoint) {
    return this.request(endpoint, "DELETE");
  }

  async signUp(data) {
    console.log("[API] signUp:", data.phone, data.firstName, data.lastName);
    const result = await this.post("/api/sign-up/", data);
    console.log("[API] signUp result:", result.success, result.message, result.data ? Object.keys(result.data) : "null");
    if (result.success && result.data) {
      const token = result.data.token;
      const user = result.data.user;
      this.userId = result.data.id;
      console.log("[API] signUp ok. token:", token ? "present" : "none (awaiting verification)", "userId:", this.userId);
      // Sign-up responses carry no session token — the account must be
      // verified first. Saving undefined to SecureStore would throw.
      if (token) {
        this.token = token;
        await AuthToken.save(token, user);
        OneSignalService.login(user?.id || this.userId || result.data?.id || null);
      }
    }
    return result;
  }


  // Check whether an email or phone (or both) is already registered.
  // Returns the same envelope shape as sign-up: { success, message, data, raw }.
  // success=true and data.email/data.emailer/data.phone = true means that
  // identifier is already in use. success=false means the check itself failed.
  //
  // The phone is checked in BOTH the international format sign-up submits
  // (234811...) and the local format the backend may store (0811...), so a
  // number cannot slip through just because of how it was written.
  async checkEmailPhone(identifier, email, phone) {
    console.log('[API] checkEmailPhone:', identifier, email, phone);
    const emailVal = String(email || '').trim();
    const intl = toIntlPhone(phone);
    const local = toLocalPhone(phone);
    const primary = intl || local || String(phone || '').trim();

    const takenFlags = (res) => {
      const d = res?.data || {};
      return {
        email: !!(d.email || d.emailer || d.emailTaken),
        phone: !!(d.phone || d.phoneNumber || d.phoneLocal || d.phoneTaken),
      };
    };

    const first = await this.post('/api/check-email-phone/', { email: emailVal, phone: primary });
    if (!first.success) return first;
    const a = takenFlags(first);
    if (a.email || a.phone) return first;
    if (!local || local === primary) return first;

    // Retry the lookup in local format before declaring the number free.
    const second = await this.post('/api/check-email-phone/', { email: emailVal, phone: local });
    const b = takenFlags(second);
    if (second.success && (b.email || b.phone)) return second;
    console.log('[API] checkEmailPhone result:', first.success, first.message);
    return first;
  }

  // Accepts an email address or a phone number as the identifier.
  // For emails both keys are sent so whichever the backend reads is covered.
  async signIn(identifier, password) {
    console.log("[API] signIn:", identifier);
    const byEmail = isEmail(identifier);
    const payload = byEmail
      ? { phone: String(identifier).trim(), email: String(identifier).trim(), password }
      : { phone: identifier, password };
    const result = await this.post("/api/sign-in-user/", payload);
    console.log("[API] signIn result:", result.success, result.message);
    if (result.success && result.data) {
      const token = result.data.token;
      const user = result.data.user;
      this.token = token;
      this.userId = result.data.id;
      console.log("[API] signIn saved token:", token?.substring(0, 20) + "...", "userId:", this.userId);
      await AuthToken.save(token, user);
      OneSignalService.login(user?.id || this.userId || result.data?.id || null);
    }
    return result;
  }

  async signInWithPin(phone, pin) {
    console.log("[API] signInWithPin:", phone);
    const result = await this.post("/api/sign-in-with-pin/", {
      phone,
      password: pin,
    });
    console.log("[API] signInWithPin result:", result.success, result.message);
    if (result.success && result.data) {
      const token = result.data.token;
      const user = result.data.user;
      this.token = token;
      this.userId = result.data.id;
      console.log("[API] signInWithPin saved token:", token?.substring(0, 20) + "...", "userId:", this.userId);
      await AuthToken.save(token, user);
      OneSignalService.login(user?.id || this.userId || result.data?.id || null);
    }
    return result;
  }

  async verifyPin(phone, pin) {
    console.log("[API] verifyPin:", phone);
    const result = await this.post("/api/verify-pin/", {
      phone,
      password: pin,
    });
    console.log("[API] verifyPin raw result:", result.success, result.data, result.message);
    const valid = result.success === true && result.data !== false;
    console.log("[API] verifyPin valid:", valid);
    return { success: valid, message: valid ? "" : result.message || "Incorrect PIN" };
  }

  async logout() {
    console.log("[API] logout");
    const result = await this.post("/api/logout/", {});
    this.token = null;
    this.userId = null;
    await AuthToken.clear();
    OneSignalService.logout();
    console.log("[API] logout done:", result.success);
    return result;
  }

  // ── Browser account-activation endpoints (public, form-urlencoded) ──
  // The mobile API has no signup-OTP route; activation reuses the browser
  // endpoints documented in the "Browser Password & PIN Recovery" folder.
  async postForm(endpoint, fields) {
    const demo = demoResponse(endpoint);
    if (demo) { console.log(`[API][DEMO] POST-FORM ${endpoint}`); return demo; }
    const body = Object.entries(fields)
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
      .join("&");
    console.log(`[API] POST-FORM ${endpoint}`, body);
    const startedAt = Date.now();
    try {
      const response = await fetchWithRetry(
        `${BASE_URL}${endpoint}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            Accept: "application/json",
          },
          body,
        },
        NETWORK_RETRY_DELAYS.length
      );
      const text = await response.text();
      let raw = null;
      try { raw = text ? JSON.parse(text) : null; } catch { raw = null; }
      console.log(`[API] Form ${response.status}:`, (text || "").substring(0, 300));

      // TEMP debug trail (Profile → API Logs) — remove once confirmed
      ApiLog.record({
        method: "POST-FORM",
        endpoint,
        status: response.status,
        req: body,
        res: text || "",
        ms: Date.now() - startedAt,
        ok: raw ? raw.status === "success" || raw.success === true : response.ok,
        msg: raw?.message || "",
      });

      if (raw && typeof raw === "object") {
        const ok = raw.status === "success" || raw.success === true;
        return { success: ok, message: raw.message || (ok ? "" : `Request failed (${response.status})`), data: raw };
      }
      // Non-JSON body (e.g. the browser form page rendering HTML): rely on HTTP status
      if (response.ok) return { success: true, message: "", data: null };
      return { success: false, message: `Request failed (${response.status})`, data: null };
    } catch (error) {
      console.error("[API] Form error:", error.message);
      ApiLog.record({
        method: "POST-FORM",
        endpoint,
        status: 0,
        req: body,
        res: "",
        error: error.message,
        ms: Date.now() - startedAt,
        ok: false,
        msg: error.message,
      });
      return { success: false, message: "Network error. Please try again.", data: null };
    }
  }

  // POST /ajax/verify-account/whatsapp/ — activates an account with the 6-digit WhatsApp code
  async verifyAccount(userId, code) {
    return this.postForm("/ajax/verify-account/whatsapp/", { user_id: userId, verification_code: code });
  }

  // POST /api/verify-sign-up/ — activates an account with the 6-digit WhatsApp code (JSON API)
  async verifySignUp(phone, code) {
    console.log("[API] verifySignUp:", phone);
    const result = await this.post("/api/verify-sign-up/", { phone, code });
    console.log("[API] verifySignUp result:", result.success, result.message);
    return result;
  }

  // POST /api/resend-verification-code/ — re-sends the activation code (JSON API)
  async resendVerificationCode(identifier) {
    console.log("[API] resendVerificationCode:", identifier);
    const result = await this.post("/api/resend-verification-code/", { phone: identifier });
    console.log("[API] resendVerificationCode result:", result.success, result.message);
    if (result.success) return result;
    // Fallback: legacy web form endpoint
    return this.postForm("/verify-account/", { identifier, resend_code: "1" });
  }

  async getUserProfile() {
    console.log("[API] getUserProfile userId:", this.userId);
    const result = await this.get(`/api/users/${this.userId}/`);
    console.log("[API] getUserProfile result:", result.success, result.data ? Object.keys(result.data) : "null");
    return result;
  }

  async updateUserData(data) {
    console.log("[API] updateUserData:", data);
    const result = await this.put(`/api/users/${this.userId}/`, data);
    console.log("[API] updateUserData result:", result.success, result.message);
    return result;
  }

  async getWalletBalance() {
    console.log("[API] getWalletBalance userId:", this.userId);
    const result = await this.get(`/api/wallet/${this.userId}/`);
    console.log("[API] getWalletBalance result:", result.success, result.data);
    return result;
  }

  async getWalletTransactions(page = 0, size = 10) {
    return this.get(
      `/api/wallet/${this.userId}/transactions/?page=${page}&size=${size}`
    );
  }

  async getDataProviders() {
    console.log("[API] getDataProviders");
    const result = await this.get("/api/data/providers/");
    if (result.success && result.data?.providers) {
      result.data = result.data.providers;
    }
    console.log("[API] getDataProviders result:", result.success, result.data?.length, "providers");
    return result;
  }

  async getDataPlans(provider, type) {
    const typeParam = type ? `&type=${type}` : "";
    console.log("[API] getDataPlans provider:", provider, "type:", type);
    const result = await this.get(`/api/data/plans/?provider=${provider}${typeParam}`);
    console.log("[API] getDataPlans raw:", JSON.stringify(result.data).substring(0, 300));
    const types = result.data?.types || [];
    if (result.success && result.data?.plans) {
      result.data = { plans: result.data.plans, types };
    } else if (result.success && Array.isArray(result.data)) {
      result.data = { plans: result.data, types };
    }
    console.log("[API] getDataPlans result:", result.success, result.data?.plans?.length, "plans, types:", types);
    return result;
  }

  async purchaseData(data) {
    const payload = { ...data };
    if (payload.phoneNumber) {
      payload.phone = payload.phoneNumber;
      delete payload.phoneNumber;
    }
    console.log("[API] purchaseData:", payload);
    const result = await this.post("/api/data/purchase/", payload);
    console.log("[API] purchaseData result:", result.success, result.message);
    return result;
  }

  async getCableProviders() {
    console.log("[API] getCableProviders");
    const result = await this.get("/api/cable/providers/");
    if (result.success && result.data?.providers) {
      result.data = result.data.providers;
    }
    console.log("[API] getCableProviders result:", result.success, result.data?.length, "providers");
    return result;
  }

  async getCablePlans(provider) {
    console.log("[API] getCablePlans provider:", provider);
    const result = await this.get(`/api/cable/plans/?provider=${provider}`);
    if (result.success && result.data?.plans) {
      result.data = result.data.plans;
    }
    console.log("[API] getCablePlans result:", result.success, result.data?.length, "plans");
    return result;
  }

  async verifySmartcard(provider, smartcardNumber) {
    console.log("[API] verifySmartcard:", provider, smartcardNumber);
    const result = await this.post("/api/cable/verify/", {
      provider,
      smartcardNumber,
    });
    console.log("[API] verifySmartcard result:", result.success, result.data);
    return result;
  }

  async purchaseCable(data) {
    console.log("[API] purchaseCable:", data);
    const result = await this.post("/api/cable/purchase/", data);
    console.log("[API] purchaseCable result:", result.success, result.message);
    return result;
  }

  async getElectricityProviders() {
    console.log("[API] getElectricityProviders");
    const result = await this.get("/api/electricity/providers/");
    if (result.success && result.data?.providers) {
      result.data = result.data.providers;
    }
    console.log("[API] getElectricityProviders result:", result.success, result.data?.length, "providers");
    return result;
  }

  async verifyMeter(provider, meterNumber, meterType) {
    console.log("[API] verifyMeter:", provider, meterNumber, meterType);
    const result = await this.post("/api/electricity/verify/", {
      provider,
      meterNumber,
      meterType,
    });
    console.log("[API] verifyMeter result:", result.success, result.data);
    return result;
  }

  async purchaseElectricity(data) {
    console.log("[API] purchaseElectricity:", data);
    const result = await this.post("/api/electricity/purchase/", data);
    console.log("[API] purchaseElectricity result:", result.success, result.message);
    return result;
  }

  async getNotifications() {
    console.log("[API] getNotifications");
    const result = await this.get("/api/mobile/alerts/");
    console.log("[API] getNotifications result:", result?.success, result?.data?.length);
    return result;
  }

  async getMobileHistory() {
    console.log("[API] getMobileHistory");
    const result = await this.get("/api/mobile/history/");
    console.log("[API] getMobileHistory result:", result?.success, result?.data?.length);
    return result;
  }

  async getTransactionHistory(page = 0, size = 20, category) {
    const catParam = category && category !== "All" ? `&category=${category.toLowerCase()}` : "";
    console.log("[API] getTransactionHistory page:", page, "category:", category);
    const result = await this.get(
      `/api/transactions/${this.userId}/?page=${page}&size=${size}${catParam}`
    );
    if (result.success && result.data?.transactions) {
      result.data = result.data.transactions;
    }
    console.log("[API] getTransactionHistory result:", result.success, result.data?.length, "transactions");
    return result;
  }

  async getRecentTransactions() {
    console.log("[API] getRecentTransactions");
    const result = await this.get("/api/transactions/recent/");
    if (result.success && result.data?.transactions) {
      result.data = result.data.transactions;
    }
    console.log("[API] getRecentTransactions result:", result.success, result.data?.length, "transactions");
    return result;
  }

  async getSupportInfo() {
    console.log("[API] getSupportInfo");
    const result = await this.get("/api/support/");
    console.log("[API] getSupportInfo result:", result.success, result.data ? Object.keys(result.data) : "null");
    return result;
  }

  async getBanks() {
    console.log("[API] getBanks");
    const result = await this.get("/api/banks/");
    console.log("[API] getBanks result:", result.success, result.data?.length, "banks");
    return result;
  }

  async getReferralDashboard(year, month) {
    const y = year || new Date().getFullYear();
    const m = month || new Date().getMonth() + 1;
    console.log("[API] getReferralDashboard", y, m);
    const result = await this.get(`/api/mobile/referral?year=${y}&month=${m}`);
    console.log("[API] getReferralDashboard result:", result.success, result.data ? Object.keys(result.data) : "null");
    return result;
  }

  async getReferralEarnings(page = 1, filters = {}) {
    const params = [`page=${page}`];
    if (filters.year) params.push(`year=${filters.year}`);
    if (filters.month) params.push(`month=${filters.month}`);
    if (filters.product) params.push(`product=${filters.product}`);
    console.log("[API] getReferralEarnings", params.join("&"));
    const result = await this.get(`/api/mobile/referral/earnings?${params.join("&")}`);
    console.log("[API] getReferralEarnings result:", result.success, "count:", result.data?.count);
    return result;
  }

  async getCommissionRates() {
    console.log("[API] getCommissionRates");
    const result = await this.get("/api/mobile/commission");
    console.log("[API] getCommissionRates result:", result.success);
    return result;
  }

  async bonusTransferToWallet(payload) {
    console.log("[API] bonusTransferToWallet:", payload?.amount);
    const result = await this.post("/api/mobile/bonus-transfer/", payload);
    console.log("[API] bonusTransferToWallet result:", result.success, result.message);
    return result;
  }

  async paystackResolve(bankCode, accountNumber) {
    console.log("[API] paystackResolve:", bankCode, accountNumber);
    const result = await this.post("/api/mobile/paystack-resolve/", { bankCode, accountNumber });
    console.log("[API] paystackResolve result:", result.success, result.data);
    return result;
  }

  async paystackBankTransfer(payload) {
    console.log("[API] paystackBankTransfer:", payload?.amount, payload?.bankCode, payload?.accountNumber);
    const result = await this.post("/api/mobile/paystack-bank-transfer/", payload);
    console.log("[API] paystackBankTransfer result:", result.success, result.message);
    return result;
  }

  async changePassword(currentPassword, newPassword) {
    return this.post("/api/change-password/", { currentPassword, newPassword });
  }

  async changePin(currentPin, newPin) {
    console.log("[API] changePin");
    const result = await this.post("/api/change-pin/", { currentPin, newPin });
    console.log("[API] changePin result:", result.success, result.message);
    return result;
  }

  async setupPin(pin) {
    console.log("[API] setupPin");
    const result = await this.post("/api/setup-pin/", { pin });
    console.log("[API] setupPin result:", result.success, result.message);
    return result;
  }

  async forgotPassword(identifier) {
    if (isEmail(String(identifier))) {
      console.log("[API] forgotPassword:", identifier, { phone: identifier });
      const result = await this.post("/api/forgot-password/", { phone: identifier });
      console.log("[API] forgotPassword result:", result.success, result.message);
      return result;
    }
    const local = toLocalPhone(identifier);
    const intl = toIntlPhone(identifier);
    console.log("[API] forgotPassword:", local, { phone: local });
    let result = await this.post("/api/forgot-password/", { phone: local });
    if (!result.success && intl && intl !== local) {
      console.log("[API] forgotPassword retry with intl:", intl);
      const retry = await this.post("/api/forgot-password/", { phone: intl });
      if (retry.success) return retry;
    }
    console.log("[API] forgotPassword result:", result.success, result.message);
    return result;
  }

  async resendPasswordCode(identifier) {
    console.log("[API] resendPasswordCode:", identifier);
    if (isEmail(String(identifier || ""))) {
      const result = await this.post("/api/resend-password-code/", { phone: identifier });
      console.log("[API] resendPasswordCode email result:", result.success, result.message);
      return result;
    }
    const local = toLocalPhone(identifier);
    const intl = toIntlPhone(identifier);
    let result = await this.post("/api/resend-password-code/", { phone: local });
    if (!result.success && intl && intl !== local) {
      const retry = await this.post("/api/resend-password-code/", { phone: intl });
      if (retry.success) return retry;
    }
    console.log("[API] resendPasswordCode result:", result.success, result.message);
    return result;
  }

  async verifyOtp(identifier, otp) {
    console.log("[API] verifyOtp:", identifier, otp);
    if (isEmail(String(identifier || ""))) {
      const result = await this.post("/api/verify-otp/", { phone: identifier, code: otp });
      console.log("[API] verifyOtp email result:", result.success, result.message);
      return result;
    }
    const local = toLocalPhone(identifier);
    const intl = toIntlPhone(identifier);
    let result = await this.post("/api/verify-otp/", { phone: local, code: otp });
    if (!result.success && intl && intl !== local) {
      console.log("[API] verifyOtp retry with intl:", intl);
      const retry = await this.post("/api/verify-otp/", { phone: intl, code: otp });
      if (retry.success) return retry;
    }
    console.log("[API] verifyOtp result:", result.success, result.message);
    return result;
  }

  async resetPassword(identifier, resetToken, newPassword) {
    console.log("[API] resetPassword:", identifier);
    if (isEmail(String(identifier || ""))) {
      const result = await this.post("/api/reset-password/", { phone: identifier, resetToken, newPassword });
      console.log("[API] resetPassword email result:", result.success, result.message);
      return result;
    }
    const result = await this.post("/api/reset-password/", { phone: identifier, resetToken, newPassword });
    console.log("[API] resetPassword result:", result.success, result.message);
    return result;
  }

  async forgotPin(identifier) {
    if (isEmail(String(identifier))) {
      console.log("[API] forgotPin:", identifier, { phone: identifier });
      const result = await this.post("/api/forgot-pin/", { phone: identifier });
      console.log("[API] forgotPin result:", result.success, result.message);
      return result;
    }
    const local = toLocalPhone(identifier);
    const intl = toIntlPhone(identifier);
    console.log("[API] forgotPin:", local, { phone: local });
    let result = await this.post("/api/forgot-pin/", { phone: local });
    if (!result.success && intl && intl !== local) {
      console.log("[API] forgotPin retry with intl:", intl);
      const retry = await this.post("/api/forgot-pin/", { phone: intl });
      if (retry.success) return retry;
    }
    console.log("[API] forgotPin result:", result.success, result.message);
    return result;
  }

  async resendPinCode(identifier) {
    console.log("[API] resendPinCode:", identifier);
    if (isEmail(String(identifier || ""))) {
      const result = await this.post("/api/resend-pin-code/", { phone: identifier });
      console.log("[API] resendPinCode email result:", result.success, result.message);
      return result;
    }
    const local = toLocalPhone(identifier);
    const intl = toIntlPhone(identifier);
    let result = await this.post("/api/resend-pin-code/", { phone: local });
    if (!result.success && intl && intl !== local) {
      const retry = await this.post("/api/resend-pin-code/", { phone: intl });
      if (retry.success) return retry;
    }
    console.log("[API] resendPinCode result:", result.success, result.message);
    return result;
  }

  async verifyPinOtp(identifier, otp) {
    console.log("[API] verifyPinOtp:", identifier, otp);
    if (isEmail(String(identifier || ""))) {
      const result = await this.post("/api/verify-pin-otp/", { phone: identifier, code: otp });
      console.log("[API] verifyPinOtp email result:", result.success, result.message);
      return result;
    }
    const local = toLocalPhone(identifier);
    const intl = toIntlPhone(identifier);
    let result = await this.post("/api/verify-pin-otp/", { phone: local, code: otp });
    if (!result.success && intl && intl !== local) {
      console.log("[API] verifyPinOtp retry with intl:", intl);
      const retry = await this.post("/api/verify-pin-otp/", { phone: intl, code: otp });
      if (retry.success) return retry;
    }
    console.log("[API] verifyPinOtp result:", result.success, result.message);
    return result;
  }

  async resetPin(identifier, resetToken, newPin) {
    console.log("[API] resetPin:", identifier);
    if (isEmail(String(identifier || ""))) {
      const result = await this.post("/api/reset-pin/", { phone: identifier, resetToken, newPin });
      console.log("[API] resetPin email result:", result.success, result.message);
      return result;
    }
    const result = await this.post("/api/reset-pin/", { phone: identifier, resetToken, newPin });
    console.log("[API] resetPin result:", result.success, result.message);
    return result;
  }

  async registerBiometricKey(publicKeyPem) {
    console.log("[API] registerBiometricKey");
    const result = await this.post("/api/biometric/register-key/", { publicKey: publicKeyPem });
    console.log("[API] registerBiometricKey result:", result.success, result.message);
    return result;
  }

  async requestChallenge(transactionId, transactionData) {
    console.log("[API] requestChallenge:", transactionId);
    const result = await this.post("/api/biometric/challenge/", {
      transactionId,
      transactionData,
    });
    if (result.success && !result.data && result.message !== undefined) {
      const raw = result.raw;
      if (raw && raw.challenge) {
        result.data = { challenge: raw.challenge, transactionId: raw.transactionId, expiresInSeconds: raw.expiresInSeconds };
      }
    }
    console.log("[API] requestChallenge result:", result.success, result.data?.challenge?.substring(0, 50));
    return result;
  }

  async verifySignature(transactionId, signature, transactionData) {
    console.log("[API] verifySignature:", transactionId);
    const result = await this.post("/api/biometric/verify-and-process/", {
      transactionId,
      signature,
      transactionData,
    });
    console.log("[API] verifySignature result:", result.success, result.message);
    return result;
  }

  async getBiometricStatus() {
    if (DEMO_MODE) return { registered: false, active: false };
    console.log("[API] getBiometricStatus");
    const headers = { Accept: "application/json" };
    if (this.token) headers["Authorization"] = `Token ${this.token}`;
    try {
      const response = await fetch(`${BASE_URL}/api/biometric/status/`, { method: "GET", headers });
      const text = await response.text();
      let raw;
      try { raw = text ? JSON.parse(text) : null; } catch { raw = text; }
      console.log("[API] getBiometricStatus:", JSON.stringify(raw));
      return raw;
    } catch (error) {
      console.error("[API] getBiometricStatus error:", error.message);
      return { registered: false, active: false };
    }
  }

  async deregisterBiometric() {
    console.log("[API] deregisterBiometric");
    const result = await this.delete("/api/biometric/deregister/");
    console.log("[API] deregisterBiometric result:", result.success, result.message);
    return result;
  }
}

export default new ApiService();
