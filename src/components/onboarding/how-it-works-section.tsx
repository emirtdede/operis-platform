"use client";

import { useState } from "react";
import Link from "next/link";
import {
  FileCode2,
  Lock,
  Handshake,
  Compass,
  Send,
  Zap,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/src/components/ui/button";
import { SpotlightCard } from "@/src/components/ui/spotlight-card";
import { getLocalizedRoute } from "@/src/lib/i18n/routes";

interface HowItWorksSectionProps {
  locale: string;
}

export function HowItWorksSection({ locale }: HowItWorksSectionProps) {
  const isTr = locale === "tr";
  const [role, setRole] = useState<"client" | "freelancer">("client");

  const clientSteps = [
    {
      num: "01",
      icon: FileCode2,
      title: isTr ? "Projenizi Ücretsiz Yayınlayın" : "Post Your Project for Free",
      description: isTr
        ? "Yazılım kapsamınızı, ihtiyaç duyulan teknolojileri ve bütçenizi tanımlayın. İlanınız 7 gün boyunca tazelik radarımızda aktif kalır."
        : "Define your technical scope, required technologies, and budget. Your listing stays active on our freshness radar for 7 days.",
      badge: isTr ? "Kolay ve Ücretsiz" : "Free & Instant",
    },
    {
      num: "02",
      icon: Lock,
      title: isTr
        ? "Şifrelenmiş Birebir Teklifleri İnceleyin"
        : "Review Encrypted 1-to-1 Proposals",
      description: isTr
        ? "Teklifler AES-256 ile korunur; rakipler göremez, fiyat kırma savaşı yaşanmaz. İletişim bilgileriniz gizli kalır."
        : "Proposals are AES-256 encrypted; competitors cannot view them, avoiding price undercutting. Your contact info stays private.",
      badge: isTr ? "Uçtan Uca Gizli" : "Private & Encrypted",
    },
    {
      num: "03",
      icon: Handshake,
      title: isTr ? "Doğrudan Eşleşin ve Çalışmaya Başlayın" : "Match Directly & Start Building",
      description: isTr
        ? "Teklifi onayladığınızda tarafların doğrudan iletişim bilgileri açılır. %0 komisyonla, kendi şartlarınızda çalışın."
        : "Accepting an offer unlocks verified contact channels. Work directly on your own contractual terms with 0% platform fee.",
      badge: isTr ? "%0 Komisyon" : "0% Platform Cut",
    },
  ];

  const freelancerSteps = [
    {
      num: "01",
      icon: Compass,
      title: isTr ? "Canlı İlanları Keşfedin" : "Discover Active Projects",
      description: isTr
        ? "Yalnızca son 1 hafta içinde yayınlanmış veya yenilenmiş güncel yazılım projelerini filtreleyin ve inceleyin."
        : "Browse strictly active software engineering listings published or reactivated within the last 1 week.",
      badge: isTr ? "Taze ve Aktif" : "Strictly Fresh",
    },
    {
      num: "02",
      icon: Send,
      title: isTr ? "Özel Teklifinizi Gönderin" : "Submit Your Private Proposal",
      description: isTr
        ? "Teklifiniz yalnızca ilan sahibi tarafından okunabilir. Kendi ücretinizi ve teslimat sürenizi özgürce belirleyin."
        : "Your proposal is visible only to the project owner. Freely set your own pricing and milestone timeline.",
      badge: isTr ? "Doğrudan İşverene" : "Direct to Client",
    },
    {
      num: "03",
      icon: Zap,
      title: isTr ? "Aracısız Bağımsız İş Birliği" : "Autonomous Direct Engagement",
      description: isTr
        ? "Teklifiniz kabul edildiğinde doğrudan iletişime geçin. Kazancınızdan komisyon kesilmez, %100'ü sizindir."
        : "Connect directly once matched. Keep 100% of your earnings with zero middleman deductions or escrow lock-ins.",
      badge: isTr ? "%100 Kazanç" : "100% Take-Home",
    },
  ];

  const steps = role === "client" ? clientSteps : freelancerSteps;

  return (
    <section
      id="how-it-works"
      aria-labelledby="how-it-works-heading"
      className="relative flex flex-col justify-center items-center min-h-[calc(100dvh-4rem)] w-full px-4 sm:px-6 lg:px-8 py-12 sm:py-16 snap-start scroll-mt-16"
    >
      <div className="mx-auto max-w-7xl w-full space-y-8 sm:space-y-10">
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <h2
            id="how-it-works-heading"
            className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[var(--color-text-primary)]"
          >
            {isTr ? "Nasıl Çalışır?" : "How It Works"}
          </h2>
          <p className="text-sm sm:text-base text-[var(--color-text-secondary)] max-w-2xl mx-auto">
            {isTr
              ? "Hem işverenler hem de yazılım profesyonelleri için doğrudan, şeffaf ve güvenli 3 adımlı süreç."
              : "A direct, transparent 3-step pathway engineered for both project owners and software engineers."}
          </p>
        </div>

        {/* Role Toggle Tabs */}
        <div className="flex justify-center mt-4">
          <div className="inline-flex items-center p-1.5 rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-base)]/80 backdrop-blur-xl shadow-sm">
            <button
              type="button"
              onClick={() => setRole("client")}
              className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 ${
                role === "client"
                  ? "bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-600 text-white shadow-md shadow-blue-500/20 border border-white/15"
                  : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-hover)]"
              }`}
            >
              {isTr ? "İş Verenler İçin" : "For Project Owners"}
            </button>
            <button
              type="button"
              onClick={() => setRole("freelancer")}
              className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 ${
                role === "freelancer"
                  ? "bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-600 text-white shadow-md shadow-blue-500/20 border border-white/15"
                  : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-hover)]"
              }`}
            >
              {isTr ? "Yazılımcılar & Uzmanlar İçin" : "For Software Engineers"}
            </button>
          </div>
        </div>

        {/* 3 Step Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {steps.map((step) => {
            const Icon = step.icon;
            return (
              <SpotlightCard
                key={step.num}
                className="p-6 sm:p-8 space-y-5 rounded-2xl flex flex-col justify-between"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-mono font-extrabold text-blue-500/60">
                      {step.num}
                    </span>
                    <span className="inline-flex items-center rounded-md border border-[var(--color-border-subtle)] bg-[var(--color-surface-hover)] px-2.5 py-0.5 text-xs font-medium text-[var(--color-text-secondary)]">
                      {step.badge}
                    </span>
                  </div>

                  <div className="h-10 w-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-lg font-bold text-[var(--color-text-primary)]">
                      {step.title}
                    </h3>
                    <p className="text-xs sm:text-sm text-[var(--color-text-secondary)] leading-relaxed">
                      {step.description}
                    </p>
                  </div>
                </div>

                <div className="pt-2 border-t border-[var(--color-border-subtle)]/60">
                  <span className="text-xs text-[var(--color-text-tertiary)] flex items-center gap-1.5">
                    <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" aria-hidden="true" />
                    <span>{isTr ? "Güvenli ve Doğrulanmış" : "Verified & Secure"}</span>
                  </span>
                </div>
              </SpotlightCard>
            );
          })}
        </div>

        {/* Action Footer */}
        <div className="text-center pt-2">
          {role === "client" ? (
            <Link href={getLocalizedRoute("newListing", locale)}>
              <Button variant="shimmer" size="md" className="gap-2">
                <span>{isTr ? "Hemen İlanınızı Oluşturun" : "Post Your First Project"}</span>
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Button>
            </Link>
          ) : (
            <Link href={getLocalizedRoute("feed", locale)}>
              <Button variant="shimmer" size="md" className="gap-2">
                <span>{isTr ? "Canlı İlanları İnceleyin" : "Explore Active Feed"}</span>
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Button>
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}
