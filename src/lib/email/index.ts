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
  | "listing_expired";

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

export const emailProvider: TransactionalEmailProvider = new MockEmailProvider();

export class EmailAdapter {
  static async sendTransactionalEmail(input: {
    to: string;
    subject: string;
    body: string;
  }): Promise<boolean> {
    await emailProvider.send({
      to: input.to,
      template: "new_offer_received",
      locale: "tr",
      variables: {
        subject: input.subject,
        body: input.body,
      },
      idempotencyKey: `tx_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    });
    return true;
  }
}

