"use client";

import { Clock, RefreshCw, Archive, CheckCircle2, Calendar } from "lucide-react";

export function LifecycleRadarDiagram() {
  const days = [
    { num: 1, label: "1. Gün", passed: true },
    { num: 2, label: "2. Gün", passed: true },
    { num: 3, label: "3. Gün", passed: true },
    { num: 4, label: "4. Gün", passed: true, current: true },
    { num: 5, label: "5. Gün", passed: false },
    { num: 6, label: "6. Gün", passed: false },
    { num: 7, label: "7. Gün", passed: false },
  ];

  return (
    <div className="relative w-full overflow-hidden rounded-3xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-base)]/80 p-6 sm:p-8 backdrop-blur-xl shadow-2xl">
      {/* Top Header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-[var(--color-border-subtle)] pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-cyan-500/10 text-cyan-500 border border-cyan-500/20 shadow-sm">
            <Clock className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-bold text-[var(--color-text-primary)]">
              1 Haftalık Canlılık Radarı
            </h3>
            <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
              Bayatlamayan taze pazar: 1 haftalık otomatik aktiflik ve tek tıkla ücretsiz yenileme
            </p>
          </div>
        </div>
        <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3.5 py-1 text-xs font-medium text-cyan-400 shadow-sm">
          <RefreshCw className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
          <span>Sürekli Güncel Akış</span>
        </div>
      </div>

      {/* Main Interactive Radar Area */}
      <div className="relative flex flex-col lg:flex-row items-center justify-around gap-8 py-4">
        {/* Radar SVG Visualizer */}
        <div className="relative flex h-64 w-64 items-center justify-center shrink-0">
          {/* Rotating Radar Sweep Cone */}
          <div
            aria-hidden="true"
            className="absolute inset-2 rounded-full animate-radar-sweep pointer-events-none"
            style={{
              background:
                "conic-gradient(from 0deg, transparent 0deg, transparent 270deg, rgba(6, 182, 212, 0.25) 360deg)",
            }}
          />

          {/* SVG Concentric Rings */}
          <svg
            className="absolute inset-0 h-full w-full"
            viewBox="0 0 200 200"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            {/* Outer Ring */}
            <circle
              cx="100"
              cy="100"
              r="88"
              stroke="var(--color-border-subtle)"
              strokeWidth="1.5"
              strokeDasharray="4 6"
            />
            {/* Middle Ring */}
            <circle
              cx="100"
              cy="100"
              r="60"
              stroke="var(--color-border-subtle)"
              strokeWidth="1"
            />
            {/* Inner Ring */}
            <circle
              cx="100"
              cy="100"
              r="34"
              stroke="var(--color-border-subtle)"
              strokeWidth="1"
            />

            {/* Radar Crosshairs */}
            <line
              x1="100"
              y1="12"
              x2="100"
              y2="188"
              stroke="var(--color-border-subtle)"
              strokeWidth="0.75"
              strokeDasharray="2 4"
            />
            <line
              x1="12"
              y1="100"
              x2="188"
              y2="100"
              stroke="var(--color-border-subtle)"
              strokeWidth="0.75"
              strokeDasharray="2 4"
            />

            {/* 7 Days Progress Markers */}
            {days.map((item, idx) => {
              const angle = (idx / 7) * 2 * Math.PI - Math.PI / 2;
              const cx = 100 + 74 * Math.cos(angle);
              const cy = 100 + 74 * Math.sin(angle);
              return (
                <g key={item.num}>
                  {item.current && (
                    <>
                      {/* Concentric Sonar Pulse Wave 1 */}
                      <circle
                        cx={cx}
                        cy={cy}
                        r="6"
                        fill="none"
                        stroke="#22d3ee"
                        strokeWidth="2"
                        opacity="0.8"
                      >
                        <animate
                          attributeName="r"
                          values="6;20"
                          dur="2s"
                          repeatCount="indefinite"
                        />
                        <animate
                          attributeName="opacity"
                          values="0.8;0"
                          dur="2s"
                          repeatCount="indefinite"
                        />
                        <animate
                          attributeName="stroke-width"
                          values="2;0.5"
                          dur="2s"
                          repeatCount="indefinite"
                        />
                      </circle>
                      {/* Concentric Sonar Pulse Wave 2 (delayed phase) */}
                      <circle
                        cx={cx}
                        cy={cy}
                        r="6"
                        fill="none"
                        stroke="#06b6d4"
                        strokeWidth="1.5"
                        opacity="0.6"
                      >
                        <animate
                          attributeName="r"
                          values="6;20"
                          begin="1s"
                          dur="2s"
                          repeatCount="indefinite"
                        />
                        <animate
                          attributeName="opacity"
                          values="0.6;0"
                          begin="1s"
                          dur="2s"
                          repeatCount="indefinite"
                        />
                        <animate
                          attributeName="stroke-width"
                          values="1.5;0.5"
                          begin="1s"
                          dur="2s"
                          repeatCount="indefinite"
                        />
                      </circle>
                      {/* Luminous beacon core glow */}
                      <circle
                        cx={cx}
                        cy={cy}
                        r="9"
                        fill="#06b6d4"
                        opacity="0.3"
                      >
                        <animate
                          attributeName="r"
                          values="8;11;8"
                          dur="2s"
                          repeatCount="indefinite"
                        />
                        <animate
                          attributeName="opacity"
                          values="0.2;0.45;0.2"
                          dur="2s"
                          repeatCount="indefinite"
                        />
                      </circle>
                    </>
                  )}
                  <circle
                    cx={cx}
                    cy={cy}
                    r={item.current ? "6" : item.passed ? "5.5" : "4"}
                    fill={item.passed ? "#06b6d4" : "var(--color-surface-elevated)"}
                    stroke={item.current ? "#ffffff" : item.passed ? "#22d3ee" : "var(--color-border-strong)"}
                    strokeWidth={item.current ? "2" : "1.5"}
                  />
                </g>
              );
            })}
          </svg>

          {/* Radar Center Status: User Friendly 1 Hafta */}
          <div className="relative z-10 flex flex-col items-center justify-center text-center p-3 rounded-2xl bg-[var(--color-surface-base)]/90 backdrop-blur-md border border-cyan-500/20 shadow-lg">
            <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-cyan-400">
              <Calendar className="h-3 w-3" aria-hidden="true" />
              <span>Döngü</span>
            </div>
            <div className="font-display text-xl sm:text-2xl font-extrabold text-[var(--color-text-primary)]">
              1 HAFTA
            </div>
            <div className="text-[10px] font-medium text-[var(--color-text-tertiary)]">
              Canlı İlan Süresi
            </div>
          </div>
        </div>

        {/* Lifecycle Milestones: Clear Value for Users */}
        <div className="flex flex-col gap-3.5 max-w-md w-full">
          <div className="flex items-start gap-3.5 rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-hover)]/60 p-4 transition-colors hover:border-cyan-500/30">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
            </div>
            <div>
              <div className="text-xs font-bold text-[var(--color-text-primary)]">
                1 Hafta Boyunca Akışta En Üstte
              </div>
              <div className="text-[11px] text-[var(--color-text-secondary)] mt-0.5 leading-relaxed">
                Yayınlanan ilanınız 1 hafta boyunca canlı kalır, ilgili kategorideki uzman geliştiricilere anında önerilir.
              </div>
            </div>
          </div>

          <div className="flex items-start gap-3.5 rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-hover)]/60 p-4 transition-colors hover:border-amber-500/30">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
            </div>
            <div>
              <div className="text-xs font-bold text-[var(--color-text-primary)]">
                Tek Tıkla Ücretsiz Süre Uzatma
              </div>
              <div className="text-[11px] text-[var(--color-text-secondary)] mt-0.5 leading-relaxed">
                1 hafta bittiğinde ilanınız asla silinmez; panelinizden tek bir tıkla süresini 1 hafta daha ücretsiz uzatabilirsiniz.
              </div>
            </div>
          </div>

          <div className="flex items-start gap-3.5 rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-hover)]/60 p-4 transition-colors hover:border-emerald-500/30">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Archive className="h-4 w-4" aria-hidden="true" />
            </div>
            <div>
              <div className="text-xs font-bold text-[var(--color-text-primary)]">
                Terk Edilmiş veya Bayat İlan Yok
              </div>
              <div className="text-[11px] text-[var(--color-text-secondary)] mt-0.5 leading-relaxed">
                Yanıt verilmeyen ve atıl kalan eski projeler otomatik arşivlenir; sitede yalnızca gerçekten aktif işler listelenir.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
