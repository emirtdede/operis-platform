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

export const smsProvider: SmsProvider = new MockSmsProvider();
