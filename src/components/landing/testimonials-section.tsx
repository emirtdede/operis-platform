"use client";

import { Star, CheckCircle2, MessageSquare, Building2, Code2, Cloud } from "lucide-react";
import { SpotlightCard } from "@/src/components/ui/spotlight-card";

interface TestimonialsSectionProps {
  isTr?: boolean;
}

export function TestimonialsSection({ isTr = true }: TestimonialsSectionProps) {
  const testimonials = [
    {
      author: isTr ? "Emre K." : "Emre K.",
      role: isTr ? "Kıdemli Full Stack Mühendisi" : "Senior Full Stack Engineer",
      company: "Ankara • 12 Yıl Deneyim",
      icon: Code2,
      accent: "text-blue-400 bg-blue-500/10 border-blue-500/20",
      quote: isTr
        ? "Geleneksel sitelerin kestiği %20 komisyondan kurtulmak tek bir SaaS sözleşmesinde 24.000 ₺ cebimde kalmasını sağladı. Şifreli teklif sayesinde kimseyle fiyat kırma savaşına girmeden teknik değerimi korudum."
        : "Saving a 20% platform cut kept an extra 24,000 ₺ in my pocket on a single SaaS contract. Blind encrypted offers protected my rate without underbidding wars.",
      highlight: isTr ? "+24.000 ₺ Net Kazanç Farkı" : "+24K ₺ Retained Earnings",
      tags: ["Next.js", "TypeScript", "%0 Komisyon"],
    },
    {
      author: isTr ? "Selin A." : "Selin A.",
      role: isTr ? "Teknoloji Girişimcisi & Kurucu" : "Fintech Founder & CEO",
      company: "İstanbul • Seri Girişimci",
      icon: Building2,
      accent: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
      quote: isTr
        ? "İlanı yayınladıktan 18 saat sonra doğrudan teknik mimariyle gelen 3 şifreli teklif aldık. Aracıya komisyon ödemeden doğrudan WhatsApp ve Slack üzerinden sözleşmemizi imzaladık."
        : "Within 18 hours of posting, we received 3 detailed encrypted proposals. We finalized terms directly over Slack without paying third-party broker fees.",
      highlight: isTr ? "18 Saatte Doğrudan Eşleşme" : "Direct Match in 18h",
      tags: [
        isTr ? "Doğrudan İletişim" : "Direct WhatsApp",
        isTr ? "Hızlı Eşleşme" : "Instant Match",
      ],
    },
    {
      author: isTr ? "Barış T." : "Baris T.",
      role: isTr ? "Kıdemli DevOps & Bulut Mimarı" : "Principal Cloud Architect",
      company: "İzmir • AWS & K8s Danışmanı",
      icon: Cloud,
      accent: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20",
      quote: isTr
        ? "En takdir ettiğim özellik 7 gün kuralı. Diğer sitelerde aylarca yanıt verilmeyen hayalet ilanlara teklif harcıyorduk; Operis'te ilan sahibi gerçekten aktif ve anında geri dönüş yapıyor."
        : "The 7-day lifecycle rule is brilliant. On legacy platforms you waste bids on ghost listings. On Operis, project owners are active and responsive.",
      highlight: isTr ? "Sıfır Hayalet İlan" : "Zero Ghost Listings",
      tags: [isTr ? "7 Gün Radarı" : "7-Day Radar", "Kubernetes", "AWS"],
    },
  ];

  return (
    <section className="w-full max-w-6xl mx-auto px-4 py-10 sm:py-14">
      {/* Section Header */}
      <div className="text-center space-y-3 max-w-3xl mx-auto mb-10">
        <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-3.5 py-1 text-xs font-semibold text-blue-400">
          <MessageSquare className="h-3.5 w-3.5" aria-hidden="true" />
          <span>{isTr ? "DOĞRULANMIŞ DENEYİMLER" : "VERIFIED COMMUNITY EXPERIENCES"}</span>
        </div>

        <h2 className="text-2xl sm:text-4xl font-extrabold text-[var(--color-text-primary)] tracking-tight">
          {isTr ? (
            <>
              Yazılımcılar ve İşverenler{" "}
              <span className="bg-gradient-to-r from-blue-400 via-cyan-400 to-emerald-400 bg-clip-text text-transparent">
                Neden Operis'i Seçiyor?
              </span>
            </>
          ) : (
            <>
              Why Engineers & Teams{" "}
              <span className="bg-gradient-to-r from-blue-400 via-cyan-400 to-emerald-400 bg-clip-text text-transparent">
                Choose Operis
              </span>
            </>
          )}
        </h2>

        <p className="text-xs sm:text-sm text-[var(--color-text-secondary)] leading-relaxed">
          {isTr
            ? "Aracı komisyonlarını kaldıran, teklif gizliliğini koruyan ve doğrudan iletişimi serbest bırakan ekosistemimizin üyelerinden geri bildirimler."
            : "Direct feedback from senior developers and tech teams leveraging 0% commission, encrypted bidding, and direct collaboration."}
        </p>
      </div>

      {/* Testimonial Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {testimonials.map((item, idx) => {
          const Icon = item.icon;
          return (
            <SpotlightCard
              key={idx}
              className="relative p-6 flex flex-col justify-between rounded-3xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-base)]/80 backdrop-blur-xl transition-all duration-300 hover:border-blue-500/40 hover:-translate-y-1"
            >
              <div className="space-y-4">
                {/* Header with 5 Stars and Verified Badge */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1 text-amber-400">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className="h-3.5 w-3.5 fill-amber-400 text-amber-400"
                        aria-hidden="true"
                      />
                    ))}
                  </div>

                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">
                    <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
                    <span>{isTr ? "Doğrulandı" : "Verified"}</span>
                  </span>
                </div>

                {/* Highlight Badge */}
                <div className="inline-block text-xs font-bold text-blue-400 bg-blue-500/10 px-2.5 py-1 rounded-lg border border-blue-500/20">
                  {item.highlight}
                </div>

                {/* Quote Text */}
                <p className="text-xs sm:text-sm text-[var(--color-text-secondary)] leading-relaxed italic">
                  "{item.quote}"
                </p>
              </div>

              {/* Author Footer */}
              <div className="mt-6 pt-4 border-t border-[var(--color-border-subtle)]/70 flex items-center gap-3">
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${item.accent}`}
                >
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </div>
                <div className="space-y-0.5 min-w-0">
                  <div className="text-sm font-bold text-[var(--color-text-primary)] truncate">
                    {item.author}
                  </div>
                  <div className="text-[11px] text-[var(--color-text-tertiary)] truncate">
                    {item.role}
                  </div>
                  <div className="text-[10px] text-[var(--color-text-tertiary)] opacity-80">
                    {item.company}
                  </div>
                </div>
              </div>
            </SpotlightCard>
          );
        })}
      </div>
    </section>
  );
}
