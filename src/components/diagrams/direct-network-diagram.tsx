"use client";

import { Zap, Ban, ArrowRight, Check, ShieldAlert } from "lucide-react";

export function DirectNetworkDiagram() {
  return (
    <div className="relative w-full overflow-hidden rounded-3xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-base)]/80 p-8 backdrop-blur-xl shadow-2xl">
      {/* Subtle Ambient Glow */}
      <div className="pointer-events-none absolute -top-12 -right-12 h-44 w-44 rounded-full bg-violet-500/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-12 -left-12 h-44 w-44 rounded-full bg-emerald-500/10 blur-3xl" />

      {/* Top Header */}
      <div className="relative z-10 mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-[var(--color-border-subtle)] pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-violet-500/10 text-violet-500 border border-violet-500/20 shadow-sm">
            <Zap className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">
              Doğrudan P2P Ağ & Sıfır Komisyon
            </h3>
            <p className="text-xs text-[var(--color-text-secondary)]">
              Emanet (escrow) ve komisyon kesintisi yok: %100 doğrudan anlaşma ve net hakediş
            </p>
          </div>
        </div>
        <div className="inline-flex items-center gap-2 rounded-full border border-violet-500/30 bg-violet-500/10 px-3.5 py-1 text-xs font-medium text-violet-500 shadow-sm">
          <span className="h-1.5 w-1.5 rounded-full bg-violet-500 animate-pulse" />
          <span>%0 Komisyon Garantisi</span>
        </div>
      </div>

      {/* Comparison Grid: Old Intermediary vs Direct Platform */}
      <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
        {/* Legacy Intermediary Model (Bypassed) */}
        <div className="relative rounded-3xl border border-dashed border-red-500/30 bg-red-500/5 p-6 space-y-4 backdrop-blur-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-red-400">
              Geleneksel Aracı / Emanetçi Model
            </span>
            <Ban className="h-4 w-4 text-red-400" aria-hidden="true" />
          </div>

          <div className="flex items-center justify-between gap-2 text-xs font-mono text-[var(--color-text-tertiary)]">
            <div className="rounded-xl border border-red-500/20 bg-[var(--color-surface-base)]/80 backdrop-blur-md px-3 py-2 text-center shadow-sm">
              Müşteri
            </div>
            <ArrowRight className="h-3.5 w-3.5 text-red-400" aria-hidden="true" />
            <div className="flex flex-col items-center rounded-xl border border-red-500/30 bg-red-500/10 px-3.5 py-2 text-red-400 shadow-sm">
              <span className="font-bold">%20 - %30 Komisyon</span>
              <span className="text-[9px]">Emanet Havuzu</span>
            </div>
            <ArrowRight className="h-3.5 w-3.5 text-red-400" aria-hidden="true" />
            <div className="rounded-xl border border-red-500/20 bg-[var(--color-surface-base)]/80 backdrop-blur-md px-3 py-2 text-center shadow-sm">
              Yazılımcı
            </div>
          </div>

          <div className="text-[11px] text-[var(--color-text-tertiary)] leading-relaxed">
            Yüksek komisyon kesintileri, haftalarca süren fon blokeleri ve bürokratik engellerle tarafların serbestliği kısıtlanır.
          </div>
        </div>

        {/* Direct Peer-to-Peer Model (Our Platform) */}
        <div className="relative rounded-3xl border border-emerald-500/40 bg-emerald-500/5 p-6 space-y-4 shadow-xl shadow-emerald-500/5 backdrop-blur-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
              Bu Platform: %100 Doğrudan Eşleşme
            </span>
            <Check className="h-4 w-4 text-emerald-400" aria-hidden="true" />
          </div>

          <div className="flex items-center justify-between gap-2 text-xs font-mono">
            <div className="rounded-xl border border-emerald-500/30 bg-[var(--color-surface-base)]/90 backdrop-blur-md px-3 py-2 text-center text-[var(--color-text-primary)] font-medium shadow-sm">
              İş Veren
            </div>
            <div className="flex-1 relative flex items-center justify-center">
              <div className="h-0.5 w-full bg-gradient-to-r from-emerald-500 to-teal-500" />
              <span className="absolute rounded-full bg-emerald-500 px-2.5 py-0.5 text-[9px] font-bold text-white shadow-md shadow-emerald-500/20">
                0% Kesinti
              </span>
            </div>
            <div className="rounded-xl border border-emerald-500/30 bg-[var(--color-surface-base)]/90 backdrop-blur-md px-3 py-2 text-center text-[var(--color-text-primary)] font-medium shadow-sm">
              Yazılımcı
            </div>
          </div>

          <div className="text-[11px] text-[var(--color-text-secondary)] leading-relaxed">
            Platform yalnızca profesyonelleri eşleştirir. Ödeme ve sözleşme doğrudan taraflar arasında gerçekleşir; hakedişin tamamı yazılımcıda kalır.
          </div>
        </div>
      </div>

      {/* Compliance / Legal Transparency Notice */}
      <div className="relative z-10 mt-4 flex items-center gap-3 rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-hover)]/70 backdrop-blur-md p-3.5 text-[11px] text-[var(--color-text-tertiary)]">
        <ShieldAlert className="h-4 w-4 shrink-0 text-indigo-400" aria-hidden="true" />
        <span>
          Yasal uyarı: Bu platform bir emanet (escrow) kuruluşu veya ödeme kuruluşu değildir. Tüm ticari şartlar tarafların özgür iradesiyle doğrudan müzakere edilir.
        </span>
      </div>
    </div>
  );
}
