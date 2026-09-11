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

class NetgsmSmsProvider implements SmsProvider {
  async sendOtp(input: {
    phoneE164: string;
    code: string;
    locale: Locale;
    idempotencyKey: string;
  }): Promise<ProviderResult> {
    const apiKey = process.env.SMS_API_KEY;
    if (!apiKey) {
      return { success: false, error: "SMS_API_KEY is missing for Netgsm" };
    }

    try {
      const msg =
        input.locale === "en"
          ? `Your Operis verification code is: ${input.code}`
          : `Operis dogrulama kodunuz: ${input.code}`;

      // Netgsm HTTP API dispatch
      const res = await fetch("https://api.netgsm.com.tr/sms/send/get", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apikey: apiKey,
          msg,
          gsm: input.phoneE164.replace(/\+/g, ""),
        }),
      });

      if (!res.ok) {
        return { success: false, error: "Netgsm dispatch failed" };
      }

      return { success: true, messageId: `netgsm_${Date.now()}` };
    } catch (err: unknown) {
      return {
        success: false,
        error: err instanceof Error ? err.message : "Netgsm connection error",
      };
    }
  }
}

function createSmsProvider(): SmsProvider {
  const providerType = process.env.SMS_PROVIDER;
  if (providerType === "netgsm") {
    return new NetgsmSmsProvider();
  }
  if (providerType === "twilio" && process.env.NODE_ENV === "production") {
    console.error(
      "Critical: SMS_PROVIDER=twilio is configured but Twilio transport is not initialized. Using fallback provider."
    );
  }
  return new MockSmsProvider();
}

export const smsProvider: SmsProvider = createSmsProvider();
