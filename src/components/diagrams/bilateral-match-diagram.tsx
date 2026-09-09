"use client";

import { ShieldCheck, Lock, UserCheck, KeyRound } from "lucide-react";

export function BilateralMatchDiagram() {
  return (
    <div className="relative w-full overflow-hidden rounded-3xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-base)]/80 p-8 backdrop-blur-xl shadow-2xl">
      {/* Subtle Ambient Glow */}
      <div className="pointer-events-none absolute -top-12 -left-12 h-44 w-44 rounded-full bg-blue-500/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-12 -right-12 h-44 w-44 rounded-full bg-violet-500/10 blur-3xl" />

      {/* Top Header */}
      <div className="relative z-10 mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-[var(--color-border-subtle)] pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-500 border border-blue-500/20 shadow-sm">
            <Lock className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">
              Birebir Gizli Teklif & Kriptografik Kasa
            </h3>
            <p className="text-xs text-[var(--color-text-secondary)]">
              AES-256-GCM ile şifrelenmiş, yalnızca iki tarafın görebildiği kör indeksli teklif akışı
            </p>
          </div>
        </div>
        <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-1 text-xs font-medium text-emerald-500 shadow-sm">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span>Şifreleme Aktif</span>
        </div>
      </div>

      {/* SVG Canvas Area */}
      <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8 py-8 px-4">
        {/* Left Node: Client / Project Owner */}
        <div className="flex flex-col items-center gap-3 text-center z-10">
          <div className="relative flex h-20 w-20 items-center justify-center rounded-3xl border border-blue-500/40 bg-blue-500/10 text-blue-500 shadow-xl shadow-blue-500/20 backdrop-blur-md">
            <UserCheck className="h-10 w-10" aria-hidden="true" />
            <span className="absolute -top-1 -right-1 flex h-4 w-4">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-4 w-4 bg-blue-500" />
            </span>
          </div>
          <div>
            <div className="font-semibold text-sm text-[var(--color-text-primary)]">
              İş Veren
            </div>
            <div className="text-xs text-[var(--color-text-secondary)]">
              Proje Sahibi
            </div>
          </div>
        </div>

        {/* Center Animated Path & Vault */}
        <div className="relative flex-1 flex flex-col items-center justify-center w-full max-w-md py-4">
          {/* Animated SVG Laser Pipeline */}
          <svg
            className="w-full h-24 overflow-visible"
            viewBox="0 0 300 80"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <defs>
              <linearGradient id="beamGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.8" />
                <stop offset="50%" stopColor="#6366f1" stopOpacity="1" />
                <stop offset="100%" stopColor="#a855f7" stopOpacity="0.8" />
              </linearGradient>
              <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="4" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>

            {/* Static Track */}
            <path
              d="M 10 40 Q 150 -10 290 40"
              stroke="var(--color-border-subtle)"
              strokeWidth="2"
              strokeDasharray="4 4"
            />
            {/* Animated Laser Beam */}
            <path
              d="M 10 40 Q 150 -10 290 40"
              stroke="url(#beamGradient)"
              strokeWidth="3"
              strokeLinecap="round"
              filter="url(#glow)"
              strokeDasharray="40 180"
              strokeDashoffset="0"
              className="animate-[dash_3s_linear_infinite]"
            >
              <animate
                attributeName="stroke-dashoffset"
                from="220"
                to="0"
                dur="3s"
                repeatCount="indefinite"
              />
            </path>
          </svg>

          {/* Central Security Vault Badge */}
          <div className="relative -mt-12 flex flex-col items-center gap-2 rounded-2xl border border-indigo-500/40 bg-[var(--color-surface-elevated)]/90 px-6 py-3.5 shadow-2xl backdrop-blur-xl">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-indigo-400" aria-hidden="true" />
              <span className="font-mono text-xs font-bold text-indigo-400 uppercase tracking-wider">
                AES-256-GCM Vault
              </span>
            </div>
            <div className="font-mono text-[10px] text-[var(--color-text-tertiary)] tracking-widest">
              HMAC-SHA256 BLIND INDEX
            </div>
          </div>
        </div>

        {/* Right Node: Freelancer / Engineer */}
        <div className="flex flex-col items-center gap-3 text-center z-10">
          <div className="relative flex h-20 w-20 items-center justify-center rounded-3xl border border-violet-500/40 bg-violet-500/10 text-violet-500 shadow-xl shadow-violet-500/20 backdrop-blur-md">
            <KeyRound className="h-10 w-10" aria-hidden="true" />
            <span className="absolute -top-1 -right-1 flex h-4 w-4">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-4 w-4 bg-violet-500" />
            </span>
          </div>
          <div>
            <div className="font-semibold text-sm text-[var(--color-text-primary)]">
              Yazılımcı
            </div>
            <div className="text-xs text-[var(--color-text-secondary)]">
              Doğrulanmış Profesyonel
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Features Ticker */}
      <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3 border-t border-[var(--color-border-subtle)] pt-4 text-xs text-[var(--color-text-secondary)]">
        <div className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
          <span>Üçüncü taraflara tamamen kapalı teklifler</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
          <span>Arama motorları teklif tutarlarını dizinleyemez</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-violet-500" />
          <span>Taraflar onaylayana kadar veriler şifrelidir</span>
        </div>
      </div>
    </div>
  );
}
