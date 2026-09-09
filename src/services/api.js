import { AuthToken } from "../utils/storage";

const BASE_URL = "https://subbridge.connectbridge.com.ng";

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

    try {
      const response = await fetch(`${BASE_URL}${endpoint}`, config);

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
        success = apiSuccess;
        message = raw?.message || "";
        payload = inner;
      }

      const result = { success, message, data: payload };

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

      return result;
    } catch (error) {
      console.error("[API] Error:", error.message, error);
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
      this.token = token;
      this.userId = result.data.id;
      console.log("[API] signUp saved token:", token?.substring(0, 20) + "...", "userId:", this.userId);
      await AuthToken.save(token, user);
    }
    return result;
  }

  async signIn(phone, password) {
    console.log("[API] signIn:", phone);
    const result = await this.post("/api/sign-in-user/", { phone, password });
    console.log("[API] signIn result:", result.success, result.message);
    if (result.success && result.data) {
      const token = result.data.token;
      const user = result.data.user;
      this.token = token;
      this.userId = result.data.id;
      console.log("[API] signIn saved token:", token?.substring(0, 20) + "...", "userId:", this.userId);
      await AuthToken.save(token, user);
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
    console.log("[API] logout done:", result.success);
    return result;
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

  async changePin(currentPin, newPin) {
    console.log("[API] changePin");
    const result = await this.post("/api/change-pin/", { currentPin, newPin });
    console.log("[API] changePin result:", result.success, result.message);
    return result;
  }

  async forgotPassword(phone) {
    console.log("[API] forgotPassword:", phone);
    const result = await this.post("/api/forgot-password/", { phone });
    console.log("[API] forgotPassword result:", result.success, result.message);
    return result;
  }

  async verifyOtp(phone, otp) {
    console.log("[API] verifyOtp:", phone, otp);
    const result = await this.post("/api/verify-otp/", { phone, otp });
    console.log("[API] verifyOtp result:", result.success, result.message);
    return result;
  }

  async resetPassword(phone, newPassword) {
    console.log("[API] resetPassword:", phone);
    const result = await this.post("/api/reset-password/", { phone, newPassword });
    console.log("[API] resetPassword result:", result.success, result.message);
    return result;
  }
}

export default new ApiService();
