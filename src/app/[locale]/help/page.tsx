import type { Metadata } from "next";
import Link from "next/link";
import { setRequestLocale } from "next-intl/server";
import { HelpCircle, Clock, Lock, Handshake, Percent, MessageSquare } from "lucide-react";
import { Button } from "@/src/components/ui/button";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const isTr = locale === "tr";

  return {
    title: isTr ? "Yardım Merkezi & Sıkça Sorulan Sorular" : "Help Center & FAQ",
    description: isTr
      ? "1 haftalık canlılık döngüsü, %0 komisyonsuz doğrudan model ve şifreli teklifler hakkında detaylı rehber."
      : "Complete guide to Operis 1-week lifecycles, zero-commission model, and encrypted proposals.",
    alternates: {
      canonical: isTr ? "/tr/yardim" : "/en/help",
      languages: {
        tr: "/tr/yardim",
        en: "/en/help",
      },
    },
  };
}

export default async function HelpPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const isTr = locale === "tr";

  const topics = [
    {
      icon: Clock,
      color: "text-blue-400 bg-blue-500/10 border-blue-500/20",
      title: isTr ? "1 Haftalık Canlılık ve Radar Kuralı" : "1-Week Freshness Radar",
      desc: isTr
        ? "Operis'teki tüm ilanlar en fazla 1 hafta (168 saat) boyunca yayında kalır. Süresi dolan ilanlar otomatik olarak pasife alınır. İlan sahibi tek tıkla 1 hafta daha ücretsiz yenileyebilir. Bu sayede radarımızda asla bayat veya unutulmuş ilan yer almaz."
        : "Every listing stays live for exactly 1 week. Expired listings transition to inactive status and can be renewed for free with one click.",
    },
    {
      icon: Percent,
      color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
      title: isTr ? "%0 Komisyon & Emanetsiz (No-Escrow) Model" : "0% Commission Cut",
      desc: isTr
        ? "Operis bağımsız eşleştirme ağıdır. Kazancınızdan veya ilan bütçenizden asla yüzde komisyonu kesilmez. Platform emanet para tutmaz veya ödeme aracılığı yapmaz; taraflar doğrudan kendi sözleşmelerini yapar ve ödemelerini doğrudan gerçekleştirir."
        : "Operis takes 0% cut. The platform does not hold escrow or process payments; parties transact directly with full autonomy.",
    },
    {
      icon: Lock,
      color: "text-purple-400 bg-purple-500/10 border-purple-500/20",
      title: isTr ? "Uçtan Uca Şifreli Gizli Teklifler" : "Encrypted Blind Proposals",
      desc: isTr
        ? "İlanlara ilettiğiniz teklifler rakiplere ve arama motorlarına tamamen kapalıdır. Teklif yalnızca ilan sahibi tarafından incelenebilir. Fiyat kırma yarışı yaşanmaz; mühendisler kendi gerçek değerlerini özgürce yansıtır."
        : "Proposals are strictly private and encrypted via AES-256-GCM. Competing bidders cannot see your rates or messages.",
    },
    {
      icon: Handshake,
      color: "text-amber-400 bg-amber-500/10 border-amber-500/20",
      title: isTr ? "Doğrudan İletişim ve Eşleşme Alanı" : "Direct Match Collaboration",
      desc: isTr
        ? "İlan sahibi bir teklifi kabul ettiği anda sistem iki taraf arasında özel bir çalışma alanı açar. Doğrulanmış e-posta ve telefon bilgileri paylaşılır ve diğer tüm bekleyen teklifler otomatik olarak nezaketle kapatılır."
        : "Once a proposal is accepted, a direct bilateral workspace is unlocked with verified contacts, and all other pending bids are politely closed.",
    },
  ];

  return (
    <main className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8 space-y-12">
      {/* Hero Header */}
      <header className="text-center space-y-4 max-w-2xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-blue-500/30 bg-blue-500/10 text-xs font-semibold text-blue-400 shadow-sm">
          <HelpCircle className="h-4 w-4" aria-hidden="true" />
          <span>{isTr ? "Bilgi Bankası & Destek" : "Knowledge Base"}</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[var(--color-text-primary)]">
          {isTr ? "Nasıl Çalışır? Nelere Dikkat Edilmeli?" : "How Operis Works & Guidelines"}
        </h1>
        <p className="text-sm sm:text-base text-[var(--color-text-secondary)] leading-relaxed">
          {isTr
            ? "Mühendisler ve teknoloji ekipleri için doğrudan, şeffaf ve aracısız eşleştirme ağımızın temel işleyiş prensipleri."
            : "Core principles of our transparent, zero-commission technology matching network."}
        </p>
      </header>

      {/* Grid of Core Topics */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {topics.map((item, idx) => {
          const Icon = item.icon;
          return (
            <div
              key={idx}
              className="rounded-3xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-base)]/70 backdrop-blur-xl p-6 sm:p-8 space-y-4 shadow-sm hover:border-blue-500/30 transition-all duration-300"
            >
              <div
                className={`h-11 w-11 rounded-2xl border flex items-center justify-center ${item.color}`}
              >
                <Icon className="h-5 w-5" aria-hidden="true" />
              </div>
              <h2 className="text-lg font-bold text-[var(--color-text-primary)]">{item.title}</h2>
              <p className="text-xs sm:text-sm text-[var(--color-text-secondary)] leading-relaxed">
                {item.desc}
              </p>
            </div>
          );
        })}
      </section>

      {/* Help Callout */}
      <div className="rounded-3xl border border-blue-500/30 bg-gradient-to-r from-blue-500/10 via-indigo-500/5 to-transparent p-8 sm:p-10 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-sm">
        <div className="space-y-2 text-center sm:text-left">
          <h2 className="text-lg font-bold text-[var(--color-text-primary)]">
            {isTr ? "Sorunuza Yanıt Bulamadınız mı?" : "Still Have Questions?"}
          </h2>
          <p className="text-xs text-[var(--color-text-secondary)] max-w-md">
            {isTr
              ? "Platform ekibimizle doğrudan iletişime geçebilir, teknik destek veya kurumsal ortaklık talebinde bulunabilirsiniz."
              : "Reach out directly to our support and engineering team."}
          </p>
        </div>

        <Link href={isTr ? "/tr/iletisim" : "/en/contact"}>
          <Button variant="primary" size="lg" className="gap-2 shrink-0">
            <MessageSquare className="h-4 w-4" aria-hidden="true" />
            <span>{isTr ? "Destek Ekibine Yazın" : "Contact Support"}</span>
          </Button>
        </Link>
      </div>
    </main>
  );
}
