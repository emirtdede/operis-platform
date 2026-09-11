import { Locale } from "@/src/lib/i18n/config";

export type EmailTemplateKey =
  | "verify_email"
  | "password_reset"
  | "new_offer_received"
  | "offer_accepted"
  | "offer_rejected"
  | "match_created"
  | "completion_requested"
  | "listing_expiring"
  | "listing_expired"
  | "platform_notification"
  | "contact_form"
  | (string & {});

export interface TransactionalEmailProvider {
  send(input: {
    to: string;
    template: EmailTemplateKey;
    locale: Locale;
    variables: Record<string, string>;
    idempotencyKey: string;
  }): Promise<{ success: boolean; messageId?: string; error?: string }>;
}

class MockEmailProvider implements TransactionalEmailProvider {
  private sentEmails: Array<{
    to: string;
    template: EmailTemplateKey;
    locale: Locale;
    variables: Record<string, string>;
    sentAt: Date;
  }> = [];

  async send(input: {
    to: string;
    template: EmailTemplateKey;
    locale: Locale;
    variables: Record<string, string>;
    idempotencyKey: string;
  }) {
    this.sentEmails.push({
      to: input.to,
      template: input.template,
      locale: input.locale,
      variables: input.variables,
      sentAt: new Date(),
    });

    return {
      success: true,
      messageId: `mock_email_${Date.now()}_${input.idempotencyKey}`,
    };
  }

  getRecentSent(to: string) {
    return this.sentEmails.filter((m) => m.to === to);
  }
}

class ResendEmailProvider implements TransactionalEmailProvider {
  async send(input: {
    to: string;
    template: EmailTemplateKey;
    locale: Locale;
    variables: Record<string, string>;
    idempotencyKey: string;
  }): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const apiKey = process.env.EMAIL_API_KEY;
    const from = process.env.EMAIL_FROM || "noreply@operis.pro";

    if (!apiKey) {
      return { success: false, error: "EMAIL_API_KEY is missing for Resend provider" };
    }

    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "Idempotency-Key": input.idempotencyKey,
        },
        body: JSON.stringify({
          from,
          to: input.to,
          subject: input.variables.subject || `Operis - ${input.template}`,
          text: input.variables.body || JSON.stringify(input.variables, null, 2),
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        return { success: false, error: errData.message || "Resend dispatch failed" };
      }

      const data = await res.json();
      return { success: true, messageId: data.id };
    } catch (err: unknown) {
      return {
        success: false,
        error: err instanceof Error ? err.message : "Resend network error",
      };
    }
  }
}

function createEmailProvider(): TransactionalEmailProvider {
  const providerType = process.env.EMAIL_PROVIDER;
  if (providerType === "resend") {
    return new ResendEmailProvider();
  }
  if (providerType === "smtp" && process.env.NODE_ENV === "production") {
    console.error(
      "Critical: EMAIL_PROVIDER=smtp is configured but SMTP direct transport is not initialized. Using fallback provider."
    );
  }
  return new MockEmailProvider();
}

export const emailProvider: TransactionalEmailProvider = createEmailProvider();

export class EmailAdapter {
  static async sendTransactionalEmail(input: {
    to: string;
    subject: string;
    body: string;
    template?: EmailTemplateKey;
    locale?: "tr" | "en";
    idempotencyKey?: string;
  }): Promise<boolean> {
    const result = await emailProvider.send({
      to: input.to,
      template: input.template || "platform_notification",
      locale: input.locale || "tr",
      variables: {
        subject: input.subject,
        body: input.body,
      },
      idempotencyKey:
        input.idempotencyKey || `tx_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    });
    return Boolean(result.success);
  }
}
