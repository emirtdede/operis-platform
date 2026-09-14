"use client";

import { Users, Clock, Percent, Star, ShieldCheck } from "lucide-react";

interface PlatformTrustStripProps {
  isTr?: boolean;
}

export function PlatformTrustStrip({ isTr = true }: PlatformTrustStripProps) {
  const trustMetrics = [
    {
      icon: Users,
      value: "1.400+",
      label: isTr ? "Doğrulanmış Mühendis" : "Verified Engineers",
      subtext: isTr ? "Kıdemli yazılım & sistem uzmanı" : "Senior engineers & architects",
      accent: "text-blue-500",
      borderGlow: "group-hover:border-blue-500/30",
    },
    {
      icon: Clock,
      value: "< 36s",
      label: isTr ? "İlk Teklif Süresi" : "First Response Time",
      subtext: isTr ? "7 günlük taze radar hızı" : "Guaranteed active listings",
      accent: "text-cyan-400",
      borderGlow: "group-hover:border-cyan-500/30",
    },
    {
      icon: Percent,
      value: "%0",
      label: isTr ? "Komisyon Kesintisi" : "Platform Commission",
      subtext: isTr ? "0 ₺ aracı payı, %100 doğrudan" : "Zero escrow cuts, 100% net",
      accent: "text-emerald-400",
      borderGlow: "group-hover:border-emerald-500/30",
    },
    {
      icon: Star,
      value: "4.9 / 5",
      label: isTr ? "Eşleşme Memnuniyeti" : "Match Satisfaction",
      subtext: isTr ? "Şeffaf doğrudan iş birliği" : "Direct collaboration rating",
      accent: "text-amber-400",
      borderGlow: "group-hover:border-amber-500/30",
    },
  ];

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-4 sm:py-6">
      <div className="relative overflow-hidden rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-base)]/70 backdrop-blur-xl p-4 sm:p-6 shadow-lg shadow-blue-500/5">
        <div
          className="pointer-events-none absolute -left-12 -top-12 h-32 w-32 rounded-full bg-blue-500/10 blur-2xl"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute -right-12 -bottom-12 h-32 w-32 rounded-full bg-emerald-500/10 blur-2xl"
          aria-hidden="true"
        />

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 divide-y sm:divide-y-0 lg:divide-x divide-[var(--color-border-subtle)]/60">
          {trustMetrics.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div
                key={idx}
                className={`group flex items-center gap-3.5 sm:gap-4 p-2 sm:p-3 transition-all duration-200 ${
                  idx > 1 ? "pt-4 sm:pt-2" : ""
                } ${idx > 0 ? "lg:pl-6" : ""}`}
              >
                <div
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--color-surface-hover)] border border-[var(--color-border-subtle)] ${item.borderGlow} transition-colors`}
                >
                  <Icon className={`h-5 w-5 ${item.accent}`} aria-hidden="true" />
                </div>
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5">
                    <span className="text-lg sm:text-xl font-extrabold font-display text-[var(--color-text-primary)]">
                      {item.value}
                    </span>
                    {idx === 0 && (
                      <ShieldCheck className="h-4 w-4 text-blue-400" aria-hidden="true" />
                    )}
                  </div>
                  <div className="text-xs font-bold text-[var(--color-text-secondary)]">
                    {item.label}
                  </div>
                  <div className="text-[11px] text-[var(--color-text-tertiary)] hidden sm:block">
                    {item.subtext}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
