"use client";

import { Zap, Ban, ArrowRight, Check, Handshake } from "lucide-react";

export function DirectNetworkDiagram() {
  return (
    <div className="relative w-full overflow-hidden rounded-3xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-base)]/80 p-6 sm:p-8 backdrop-blur-xl shadow-2xl">
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
            <h3 className="text-sm sm:text-base font-bold text-[var(--color-text-primary)]">
              Doğrudan İş Birliği & %0 Komisyon
            </h3>
            <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
              Aracı kurum yok, komisyon kesintisi yok: Kazancınızın %100'ü doğrudan cebinizde kalır.
            </p>
          </div>
        </div>
        <div className="inline-flex items-center gap-2 rounded-full border border-violet-500/30 bg-violet-500/10 px-3.5 py-1 text-xs font-medium text-violet-400 shadow-sm">
          <span className="h-2 w-2 rounded-full bg-violet-400 animate-pulse" />
          <span>%0 Komisyon Garantisi</span>
        </div>
      </div>

      {/* Comparison Grid: Old Intermediary vs Direct Platform */}
      <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-6 py-3">
        {/* Legacy Intermediary Model (Bypassed) */}
        <div className="relative rounded-3xl border border-dashed border-red-500/30 bg-red-500/5 p-6 space-y-4 backdrop-blur-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-red-400 flex items-center gap-2">
              <Ban className="h-4 w-4 text-red-400" aria-hidden="true" />
              <span>Geleneksel Freelance Siteleri</span>
            </span>
            <span className="text-[10px] font-semibold text-red-400/80 bg-red-500/10 px-2.5 py-0.5 rounded-full">
              Kayıp Model
            </span>
          </div>

          <div className="flex items-center justify-between gap-2 text-xs font-mono">
            <div className="rounded-xl border border-red-500/20 bg-[var(--color-surface-base)]/90 px-3 py-2 text-center text-[var(--color-text-primary)] shadow-sm">
              Müşteri
            </div>
            <ArrowRight className="h-3.5 w-3.5 text-red-400/70 shrink-0" aria-hidden="true" />
            <div className="flex flex-col items-center rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-red-400 shadow-sm text-center">
              <span className="font-bold text-xs">%20 - %30 Kesinti</span>
              <span className="text-[9px] text-red-300/70">Haftalarca Bloke</span>
            </div>
            <ArrowRight className="h-3.5 w-3.5 text-red-400/70 shrink-0" aria-hidden="true" />
            <div className="rounded-xl border border-red-500/20 bg-[var(--color-surface-base)]/90 px-3 py-2 text-center text-[var(--color-text-primary)] shadow-sm">
              Yazılımcı
            </div>
          </div>

          <div className="text-[11px] text-[var(--color-text-secondary)] leading-relaxed">
            Yüksek komisyon kesintileri, haftalarca süren fon blokeleri ve aracı kurum
            bürokrasisiyle hem iş verenin bütçesi hem de yazılımcının kazancı eritilir.
          </div>
        </div>

        {/* Direct Peer-to-Peer Model (Our Platform) */}
        <div className="relative rounded-3xl border border-emerald-500/40 bg-emerald-500/5 p-6 space-y-4 shadow-xl shadow-emerald-500/5 backdrop-blur-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-2">
              <Check className="h-4 w-4 text-emerald-400" aria-hidden="true" />
              <span>Operis: %100 Doğrudan Eşleşme</span>
            </span>
            <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/15 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
              Avantajlı
            </span>
          </div>

          <div className="flex items-center justify-between gap-2 text-xs font-mono">
            <div className="rounded-xl border border-emerald-500/30 bg-[var(--color-surface-base)]/90 px-3.5 py-2 text-center text-[var(--color-text-primary)] font-semibold shadow-sm">
              İş Veren
            </div>
            <div className="flex-1 relative flex items-center justify-center px-1">
              <div className="h-1 w-full rounded-full bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-500 animate-pulse" />
              <span className="absolute rounded-full bg-emerald-500 px-3 py-0.5 text-[10px] font-extrabold text-white shadow-md shadow-emerald-500/30">
                %0 Kesinti • Net
              </span>
            </div>
            <div className="rounded-xl border border-emerald-500/30 bg-[var(--color-surface-base)]/90 px-3.5 py-2 text-center text-[var(--color-text-primary)] font-semibold shadow-sm">
              Yazılımcı
            </div>
          </div>

          <div className="text-[11px] text-[var(--color-text-secondary)] leading-relaxed">
            Platform yalnızca iki tarafı doğrudan buluşturur. Ödeme ve sözleşme aracıya takılmadan
            gerçekleşir; bütçenin ve hakedişin tamamı yazılımcıda kalır.
          </div>
        </div>
      </div>

      {/* User-Friendly Notice */}
      <div className="relative z-10 mt-4 flex items-center gap-3 rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-hover)]/70 backdrop-blur-md p-3.5 text-xs text-[var(--color-text-secondary)]">
        <Handshake className="h-4 w-4 shrink-0 text-emerald-400" aria-hidden="true" />
        <span>
          <strong className="text-[var(--color-text-primary)] font-semibold">
            Özgür ve Güvenli Ticaret:
          </strong>{" "}
          Ödemelerinizi dilediğiniz yöntemle (banka transferi, şirket faturası, sözleşmeli hakediş)
          doğrudan birbirinize gerçekleştirirsiniz.
        </span>
      </div>
    </div>
  );
}
