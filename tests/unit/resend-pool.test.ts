import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import crypto from "node:crypto";
import {
  ResendPoolService,
  MAX_RESEND_FREE_CONTACTS,
} from "@/src/modules/email/resend-pool-service";
import { resetDbForTesting } from "@/src/lib/db";
import {
  GET as unsubscribeGet,
  POST as unsubscribePost,
} from "@/src/app/api/newsletter/unsubscribe/route";
import {
  GET as consentGet,
  POST as consentPost,
} from "@/src/app/api/profile/marketing-consent/route";
import { POST as webhookPost } from "@/src/app/api/webhooks/resend/route";
import { ResendEmailProvider } from "@/src/lib/email";
import * as sessionModule from "@/src/modules/auth/session";

describe("Resend Pool & Free-Tier Quota Manager", () => {
  beforeEach(() => {
    process.env.AUTH_SECRET = "test_auth_secret_key_32_bytes_minimum_length_long";
    process.env.RESEND_WEBHOOK_SECRET = "whsec_test_secret_for_svix_verification_12345";
  });

  afterEach(() => {
    resetDbForTesting();
    vi.restoreAllMocks();
  });

  describe("Quota & Constants", () => {
    it("strictly adheres to the Resend free plan maximum of 1,000 audience contacts", () => {
      expect(MAX_RESEND_FREE_CONTACTS).toBe(1000);
    });
  });

  describe("Cryptographic 1-Click Unsubscribe Tokens", () => {
    const userId = "usr_sample_123";
    const email = "user@operis.pro";

    it("generates and verifies a valid HMAC-SHA256 unsubscribe token", () => {
      const token = ResendPoolService.generateUnsubscribeToken(userId, email);
      expect(typeof token).toBe("string");
      expect(token.length).toBeGreaterThan(20);

      const verified = ResendPoolService.verifyUnsubscribeToken(token);
      expect(verified.valid).toBe(true);
      expect(verified.userId).toBe(userId);
      expect(verified.email).toBe(email);
    });

    it("normalizes email to lowercase for consistent token verification", () => {
      const token = ResendPoolService.generateUnsubscribeToken(userId, "  USER@Operis.Pro  ");
      const verified = ResendPoolService.verifyUnsubscribeToken(token);
      expect(verified.valid).toBe(true);
      expect(verified.email).toBe("user@operis.pro");
    });

    it("rejects tampered tokens or mismatched signatures", () => {
      const token = ResendPoolService.generateUnsubscribeToken(userId, email);
      const decoded = JSON.parse(Buffer.from(token, "base64url").toString("utf8"));

      // Tamper with userId
      const tampered = Buffer.from(JSON.stringify({ ...decoded, u: "usr_hacked_456" })).toString(
        "base64url"
      );

      const result = ResendPoolService.verifyUnsubscribeToken(tampered);
      expect(result.valid).toBe(false);
    });

    it("rejects malformed non-base64 or invalid JSON tokens gracefully", () => {
      expect(ResendPoolService.verifyUnsubscribeToken("not-a-valid-token").valid).toBe(false);
      expect(ResendPoolService.verifyUnsubscribeToken("").valid).toBe(false);
      expect(ResendPoolService.verifyUnsubscribeToken("e30=").valid).toBe(false); // empty object {}
    });
  });

  describe("Unsubscribe HTTP Route Handlers", () => {
    const userId = "usr_unsub_test";
    const email = "subscriber@operis.pro";

    it("GET route returns 400 when token is missing", async () => {
      const req = new Request("http://localhost:3000/api/newsletter/unsubscribe", {
        method: "GET",
      });
      const res = await unsubscribeGet(req);
      expect(res.status).toBe(400);
      const text = await res.text();
      expect(text).toContain("Geçersiz İstek");
    });

    it("GET route returns 403 when token is invalid or tampered", async () => {
      const req = new Request(
        "http://localhost:3000/api/newsletter/unsubscribe?token=invalid_payload",
        {
          method: "GET",
        }
      );
      const res = await unsubscribeGet(req);
      expect(res.status).toBe(403);
      const text = await res.text();
      expect(text).toContain("Doğrulama Başarısız");
    });

    it("GET route processes valid token, renders confirmation page and sets noindex robots", async () => {
      const token = ResendPoolService.generateUnsubscribeToken(userId, email);
      vi.spyOn(ResendPoolService, "optOutUser").mockResolvedValue({ success: true });

      const req = new Request(
        `http://localhost:3000/api/newsletter/unsubscribe?token=${encodeURIComponent(token)}&locale=tr`,
        { method: "GET" }
      );
      const res = await unsubscribeGet(req);
      expect(res.status).toBe(200);
      expect(res.headers.get("Content-Type")).toContain("text/html");
      expect(res.headers.get("X-Robots-Tag")).toBe("noindex, nofollow");

      const html = await res.text();
      expect(html).toContain("Abonelikten Çıkıldı");
      expect(ResendPoolService.optOutUser).toHaveBeenCalledWith(userId);
    });

    it("POST route supports RFC 8058 One-Click Unsubscribe", async () => {
      const token = ResendPoolService.generateUnsubscribeToken(userId, email);
      vi.spyOn(ResendPoolService, "optOutUser").mockResolvedValue({ success: true });

      const req = new Request(
        `http://localhost:3000/api/newsletter/unsubscribe?token=${encodeURIComponent(token)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: "List-Unsubscribe=One-Click",
        }
      );
      const res = await unsubscribePost(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json).toEqual({
        success: true,
        unsubscribed: true,
        message: "Unsubscribed from marketing emails",
      });
      expect(ResendPoolService.optOutUser).toHaveBeenCalledWith(userId);
    });
  });

  describe("Resend Webhooks (Bounce & Complaint Handling)", () => {
    it("returns 401 when svix signature headers are missing", async () => {
      const req = new Request("http://localhost:3000/api/webhooks/resend", {
        method: "POST",
        body: JSON.stringify({ type: "email.bounced" }),
      });
      const res = await webhookPost(req);
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.error).toContain("Missing signature headers");
    });

    it("returns 400 when webhook secret is not configured", async () => {
      delete process.env.RESEND_WEBHOOK_SECRET;
      const req = new Request("http://localhost:3000/api/webhooks/resend", {
        method: "POST",
        headers: {
          "svix-id": "msg_123",
          "svix-timestamp": "1600000000",
          "svix-signature": "v1,invalid",
        },
        body: JSON.stringify({ type: "email.bounced" }),
      });
      const res = await webhookPost(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toContain("RESEND_WEBHOOK_SECRET is not configured");
    });

    it("processes valid bounce events and triggers bounce handling", async () => {
      const bounceEmail = "bounced.user@invalid-domain.com";
      const bounceSpy = vi.spyOn(ResendPoolService, "handleBounceOrComplaint").mockResolvedValue({
        affected: true,
      });

      // Construct valid svix signature with valid base64 key
      const secret = `whsec_${Buffer.from("test_secret_for_svix_verification_12345").toString("base64")}`;
      process.env.RESEND_WEBHOOK_SECRET = secret;
      const secretBytes = Buffer.from(secret.slice(6), "base64");

      const svixId = "msg_test_bounce_123";
      const svixTimestamp = Math.floor(Date.now() / 1000).toString();
      const payloadObj = {
        type: "email.bounced",
        data: {
          to: [bounceEmail],
          bounce: { message: "550 User not found" },
        },
      };
      const rawPayload = JSON.stringify(payloadObj);

      const toSign = `${svixId}.${svixTimestamp}.${rawPayload}`;
      const sig = crypto.createHmac("sha256", secretBytes).update(toSign).digest("base64");

      const req = new Request("http://localhost:3000/api/webhooks/resend", {
        method: "POST",
        headers: {
          "svix-id": svixId,
          "svix-timestamp": svixTimestamp,
          "svix-signature": `v1,${sig}`,
          "Content-Type": "application/json",
        },
        body: rawPayload,
      });

      const res = await webhookPost(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.received).toBe(true);
      expect(bounceSpy).toHaveBeenCalledWith(bounceEmail, "bounced", "550 User not found");
    });
  });

  describe("ResendEmailProvider Bounce Suppression & List-Unsubscribe", () => {
    it("suppresses email dispatch if recipient is marked as bounced", async () => {
      process.env.RESEND_API_KEY = "re_test_key_123";
      vi.spyOn(ResendPoolService, "isEmailBounced").mockResolvedValue(true);

      const provider = new ResendEmailProvider();
      const result = await provider.send({
        to: "bounced@operis.pro",
        template: "platform_notification",
        locale: "tr",
        variables: { subject: "Test", body: "Hello" },
        idempotencyKey: "idem_test_bounce",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("previously bounced or filed a complaint");
    });

    it("allows sending when recipient is not bounced", async () => {
      process.env.RESEND_API_KEY = "re_test_key_123";
      vi.spyOn(ResendPoolService, "isEmailBounced").mockResolvedValue(false);

      const provider = new ResendEmailProvider();
      const result = await provider.send({
        to: "active@operis.pro",
        template: "platform_notification",
        locale: "tr",
        variables: { subject: "Test", body: "Hello" },
        idempotencyKey: "idem_test_clean",
        unsubscribeUrl: "https://operis.pro/api/newsletter/unsubscribe?token=sample_token",
      });

      // In test mode (B25-RUNNER), egress to external endpoint api.resend.com is blocked
      expect(result.success).toBe(false);
      expect(result.error).toContain("B25-RUNNER");
    });
  });

  describe("Profile Marketing Consent API Route (/api/profile/marketing-consent)", () => {
    it("GET returns 401 when user is not logged in", async () => {
      vi.spyOn(sessionModule, "getSession").mockResolvedValue(null);
      const req = new Request("http://localhost:3000/api/profile/marketing-consent");
      const res = await consentGet(req);
      expect(res.status).toBe(401);
    });

    it("GET returns consent status when user is logged in", async () => {
      vi.spyOn(sessionModule, "getSession").mockResolvedValue({
        type: "SESSION",
        userId: "usr_active_999",
        email: "user@operis.pro",
        role: "USER",
        status: "ACTIVE",
        authVersion: 1,
        createdAt: Date.now(),
        expiresAt: Date.now() + 86400000,
      });

      vi.spyOn(ResendPoolService, "getUserConsentStatus").mockResolvedValue({
        hasConsent: true,
        status: "IN_POOL",
      });

      const req = new Request("http://localhost:3000/api/profile/marketing-consent");
      const res = await consentGet(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.consent).toEqual({ hasConsent: true, status: "IN_POOL" });
    });

    it("POST returns 401 when user is not logged in", async () => {
      vi.spyOn(sessionModule, "getSession").mockResolvedValue(null);
      const req = new Request("http://localhost:3000/api/profile/marketing-consent", {
        method: "POST",
        body: JSON.stringify({ consent: true }),
      });
      const res = await consentPost(req);
      expect(res.status).toBe(401);
    });

    it("POST returns 400 when consent boolean is missing", async () => {
      vi.spyOn(sessionModule, "getSession").mockResolvedValue({
        type: "SESSION",
        userId: "usr_active_999",
        email: "user@operis.pro",
        role: "USER",
        status: "ACTIVE",
        authVersion: 1,
        createdAt: Date.now(),
        expiresAt: Date.now() + 86400000,
      });

      const req = new Request("http://localhost:3000/api/profile/marketing-consent", {
        method: "POST",
        body: JSON.stringify({}),
      });
      const res = await consentPost(req);
      expect(res.status).toBe(400);
    });

    it("POST opts user in when consent is true", async () => {
      vi.spyOn(sessionModule, "getSession").mockResolvedValue({
        type: "SESSION",
        userId: "usr_active_999",
        email: "user@operis.pro",
        role: "USER",
        status: "ACTIVE",
        authVersion: 1,
        createdAt: Date.now(),
        expiresAt: Date.now() + 86400000,
      });

      vi.spyOn(ResendPoolService, "optInUser").mockResolvedValue({
        inPool: true,
        status: "IN_POOL",
      });

      const req = new Request("http://localhost:3000/api/profile/marketing-consent", {
        method: "POST",
        body: JSON.stringify({ consent: true }),
      });
      const res = await consentPost(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json).toEqual({ success: true, hasConsent: true, status: "IN_POOL" });
      expect(ResendPoolService.optInUser).toHaveBeenCalledWith("usr_active_999", "user@operis.pro");
    });

    it("POST opts user out and recycles slot when consent is false", async () => {
      vi.spyOn(sessionModule, "getSession").mockResolvedValue({
        type: "SESSION",
        userId: "usr_active_999",
        email: "user@operis.pro",
        role: "USER",
        status: "ACTIVE",
        authVersion: 1,
        createdAt: Date.now(),
        expiresAt: Date.now() + 86400000,
      });

      vi.spyOn(ResendPoolService, "optOutUser").mockResolvedValue({ success: true });

      const req = new Request("http://localhost:3000/api/profile/marketing-consent", {
        method: "POST",
        body: JSON.stringify({ consent: false }),
      });
      const res = await consentPost(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json).toEqual({ success: true, hasConsent: false, status: "OPTED_OUT" });
      expect(ResendPoolService.optOutUser).toHaveBeenCalledWith("usr_active_999");
    });
  });
});
