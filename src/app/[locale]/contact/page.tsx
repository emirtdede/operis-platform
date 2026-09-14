import type { Metadata } from "next";
import Link from "next/link";
import { setRequestLocale } from "next-intl/server";
import { Mail, Building, ShieldCheck } from "lucide-react";
import { ContactForm } from "@/src/components/contact/contact-form";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const isTr = locale === "tr";

  return {
    title: isTr ? "İletişim & Destek Formu" : "Contact & Support",
    description: isTr
      ? "Operis destek ekibiyle iletişime geçin, teknik destek alın veya iş ortaklığı talebinizi iletin."
      : "Get in touch with the Operis team for support, enterprise inquiries, and partnerships.",
    alternates: {
      canonical: isTr ? "/tr/iletisim" : "/en/contact",
      languages: {
        tr: "/tr/iletisim",
        en: "/en/contact",
      },
    },
  };
}

export default async function ContactPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const isTr = locale === "tr";

  return (
    <main className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8 space-y-12">
      {/* Header */}
      <header className="text-center space-y-4 max-w-2xl mx-auto">
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[var(--color-text-primary)]">
          {isTr ? "Bizimle İletişime Geçin" : "We'd Love to Hear From You"}
        </h1>
        <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">
          {isTr
            ? "Teknik sorularınız, kurumsal iş birlikleri veya platform önerileriniz için aşağıdaki formu doldurabilirsiniz."
            : "Send us your questions, enterprise requirements, or feedback directly."}
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: Contact Info & Reassurances */}
        <div className="lg:col-span-5 space-y-6">
          <div className="rounded-3xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-base)]/70 backdrop-blur-xl p-6 sm:p-8 space-y-6 shadow-sm">
            <h2 className="text-base font-bold text-[var(--color-text-primary)]">
              {isTr ? "Operis İletişim Kanalları" : "Contact Channels"}
            </h2>

            <div className="space-y-4 text-xs">
              <div className="flex items-start gap-3">
                <div className="h-8 w-8 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center justify-center shrink-0">
                  <Mail className="h-4 w-4" aria-hidden="true" />
                </div>
                <div>
                  <span className="font-semibold text-[var(--color-text-primary)] block">
                    E-Posta
                  </span>
                  <span className="text-[var(--color-text-secondary)] font-mono">
                    destek@operis.pro
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="h-8 w-8 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20 flex items-center justify-center shrink-0">
                  <Building className="h-4 w-4" aria-hidden="true" />
                </div>
                <div>
                  <span className="font-semibold text-[var(--color-text-primary)] block">
                    {isTr ? "Kurumsal Merkez" : "Headquarters"}
                  </span>
                  <span className="text-[var(--color-text-secondary)]">
                    Levent, Beşiktaş / İstanbul
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="h-8 w-8 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center shrink-0">
                  <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                </div>
                <div>
                  <span className="font-semibold text-[var(--color-text-primary)] block">
                    {isTr ? "Yanıt Taahhüdü" : "Response SLA"}
                  </span>
                  <span className="text-[var(--color-text-secondary)]">
                    {isTr
                      ? "En geç 24 iş saati içerisinde yanıt verilir."
                      : "Within 24 business hours."}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-hover)]/40 text-xs text-[var(--color-text-tertiary)]">
            <p>
              {isTr ? "Resmi ve yasal şirket bilgileri için " : "For formal company details, view "}
              <Link
                href={isTr ? "/tr/yasal/iletisim" : "/en/legal/contact"}
                className="text-blue-400 hover:underline font-medium"
              >
                {isTr ? "Yasal İletişim Künyesi" : "Legal Contact Notice"}
              </Link>
              {isTr ? " sayfasını inceleyebilirsiniz." : "."}
            </p>
          </div>
        </div>

        {/* Right: Contact Form */}
        <div className="lg:col-span-7 rounded-3xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-base)]/70 backdrop-blur-xl p-6 sm:p-8 shadow-xl">
          <ContactForm locale={locale} />
        </div>
      </div>
    </main>
  );
}
