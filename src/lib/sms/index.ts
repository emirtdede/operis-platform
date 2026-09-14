import { Locale } from "@/src/lib/i18n/config";

export interface ProviderResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface SmsProvider {
  sendOtp(input: {
    phoneE164: string;
    code: string;
    locale: Locale;
    idempotencyKey: string;
  }): Promise<ProviderResult>;
}

class MockSmsProvider implements SmsProvider {
  private sentMessages: Array<{
    phoneE164: string;
    code: string;
    locale: Locale;
    sentAt: Date;
  }> = [];

  async sendOtp(input: {
    phoneE164: string;
    code: string;
    locale: Locale;
    idempotencyKey: string;
  }): Promise<ProviderResult> {
    this.sentMessages.push({
      phoneE164: input.phoneE164,
      code: input.code,
      locale: input.locale,
      sentAt: new Date(),
    });

    return {
      success: true,
      messageId: `mock_sms_${Date.now()}_${input.idempotencyKey}`,
    };
  }

  getRecentSent(phoneE164: string) {
    return this.sentMessages.filter((m) => m.phoneE164 === phoneE164);
  }
}

export class NetgsmSmsProvider implements SmsProvider {
  async sendOtp(input: {
    phoneE164: string;
    code: string;
    locale: Locale;
    idempotencyKey: string;
  }): Promise<ProviderResult> {
    const usercode = process.env.NETGSM_USERCODE;
    const password = process.env.NETGSM_PASSWORD;
    const header = process.env.NETGSM_HEADER;
    const apiKey = process.env.SMS_API_KEY;

    if (!apiKey && (!usercode || !password || !header)) {
      return { success: false, error: "NETGSM credentials or SMS_API_KEY are missing" };
    }

    try {
      const msg =
        input.locale === "en"
          ? `Your Operis verification code is: ${input.code}`
          : `Operis dogrulama kodunuz: ${input.code}`;

      const gsm = input.phoneE164.replace(/\+/g, "");

      const bodyPayload = apiKey
        ? { apikey: apiKey, msg, gsm }
        : { usercode, password, msgheader: header, msg, gsm };

      const baseUrl = process.env.NETGSM_BASE_URL || "https://api.netgsm.com.tr";

      // B25-RUNNER: In test mode, egress to external endpoints is strictly forbidden
      if (process.env.TEST_PROD === "1" || process.env.NODE_ENV === "test") {
        const parsedUrl = new URL(baseUrl);
        if (!["localhost", "127.0.0.1"].includes(parsedUrl.hostname)) {
          return {
            success: false,
            error: `B25-RUNNER: External network egress to ${parsedUrl.hostname} is strictly blocked in test mode.`,
          };
        }
      }

      // Netgsm HTTP API dispatch with 10s timeout
      const res = await fetch(`${baseUrl.replace(/\/+$/, "")}/sms/send/get`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bodyPayload),
        signal: AbortSignal.timeout(10000),
      });

      if (!res.ok) {
        return {
          success: false,
          error: `Netgsm HTTP error: status ${res.status}`,
        };
      }

      const responseText = (await res.text()).trim();
      const match = responseText.match(/^00\s+(\d+)$/);
      if (!match) {
        return {
          success: false,
          error: `Netgsm delivery rejected or unexpected response: ${responseText.slice(0, 100)}`,
        };
      }

      const jobId = match[1];
      return { success: true, messageId: `netgsm_${jobId}` };
    } catch (err: unknown) {
      return {
        success: false,
        error: err instanceof Error ? err.message : "Netgsm connection error",
      };
    }
  }
}

function isBuildPhase(): boolean {
  return (
    process.env.NEXT_PHASE === "phase-production-build" ||
    process.env.NEXT_PRIVATE_BUILD_WORKER !== undefined ||
    process.env.npm_lifecycle_event === "build" ||
    process.argv.some((arg) => arg.includes("build"))
  );
}

function createSmsProvider(): SmsProvider {
  const providerType = process.env.SMS_PROVIDER;
  if (providerType === "netgsm") {
    if (process.env.NODE_ENV === "production" && !isBuildPhase()) {
      const hasNetgsmCreds =
        process.env.NETGSM_USERCODE && process.env.NETGSM_PASSWORD && process.env.NETGSM_HEADER;
      const hasApiKey = process.env.SMS_API_KEY;
      if (!hasNetgsmCreds && !hasApiKey) {
        throw new Error(
          "Production error: NETGSM credentials (NETGSM_USERCODE, NETGSM_PASSWORD, NETGSM_HEADER) or SMS_API_KEY must be configured when SMS_PROVIDER=netgsm."
        );
      }
    }
    return new NetgsmSmsProvider();
  }
  if (providerType === "twilio") {
    if (process.env.NODE_ENV === "production" && !isBuildPhase()) {
      throw new Error(
        "SMS_PROVIDER=twilio is configured but Twilio client transport is not implemented in production."
      );
    }
    console.error("Warning: SMS_PROVIDER=twilio is not implemented. Using mock in non-production.");
  }
  if (process.env.NODE_ENV === "production" && !isBuildPhase()) {
    throw new Error(
      `Invalid production configuration: SMS_PROVIDER cannot be '${providerType || "undefined"}'. A valid real provider (e.g. 'netgsm') must be configured in production.`
    );
  }
  return new MockSmsProvider();
}

export const smsProvider: SmsProvider = {
  sendOtp: (input) => createSmsProvider().sendOtp(input),
};
