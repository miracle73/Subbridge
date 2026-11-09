// DEMO MODE — lets every screen move to the next one before the real APIs are wired up.
// Flip DEMO_MODE to false when integrating the backend.
export const DEMO_MODE = true;

const DEMO_USER = {
  id: 1,
  firstName: "Godwin",
  lastName: "Chidiebere",
  firstname: "Godwin",
  lastname: "Chidiebere",
  phone: "08114516826",
  email: "godwieberex124@gmail.com",
  has_pin: true,
  virtualAccount: { bankName: "PalmPay", accountNumber: "6698922282", accountName: "SubBridge – Godwin C." },
};

const ok = (data = {}, message = "Success") => ({ success: true, data, message });

/** Returns a fake successful response for flow-gating endpoints, or null to hit the real server. */
export function demoResponse(endpoint) {
  if (!DEMO_MODE) return null;
  const e = endpoint.split("?")[0];

  if (/sign-in-user|sign-in-with-pin/.test(e)) return ok({ token: "demo-token", id: DEMO_USER.id, user: DEMO_USER });
  if (/sign-up\/$|verify-sign-up|resend-verification-code/.test(e)) return ok({ id: DEMO_USER.id, user: DEMO_USER, token: "demo-token" });
  if (/^\/api\/users\/\d+\/$/.test(e)) return ok({ user: DEMO_USER });
  if (/^\/api\/wallet\/\d+\/$/.test(e)) return ok({ balance: 59160, accountNumber: "6698922282", bankName: "PalmPay" });
  if (/check-email-phone/.test(e)) return ok({ email: false, phone: false });
  if (/forgot-password|forgot-pin|resend-password-code|resend-pin-code/.test(e)) return ok({}, "Code sent");
  if (/verify-otp|verify-pin-otp/.test(e)) return ok({ resetToken: "demo-reset-token" });
  if (/reset-password|reset-pin|setup-pin|change-pin/.test(e)) return ok({});
  if (/verify-pin\/$/.test(e)) return ok(true);
  if (/cable\/verify/.test(e)) return ok({ customerName: "GODWIN CHIDIEBERE", Customer_Name: "GODWIN CHIDIEBERE", status: "verified" });
  if (/electricity\/verify/.test(e)) return ok({ customerName: "GODWIN CHIDIEBERE", customerAddress: "Umunze, Anambra" });
  if (/\/purchase\//.test(e)) {
    return ok({
      reference: `DEMO${Date.now()}`,
      status: "success",
      token: /electricity/.test(e) ? "4821-0937-1156-7720-3349" : undefined,
    }, "Transaction successful");
  }
  return null;
}
