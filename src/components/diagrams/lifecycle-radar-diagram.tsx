"use client";

import { Clock, RefreshCw, Archive, CheckCircle2 } from "lucide-react";

export function LifecycleRadarDiagram() {
  const days = [1, 2, 3, 4, 5, 6, 7];

  return (
    <div className="relative w-full overflow-hidden rounded-3xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-base)]/80 p-8 backdrop-blur-xl shadow-2xl">
      {/* Top Header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-[var(--color-border-subtle)] pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-500">
            <Clock className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">
              7 Günlük Dinamik Canlılık Radarı
            </h3>
            <p className="text-xs text-[var(--color-text-secondary)]">
              Bayatlamayan taze pazar: 168 saatlik otomatik aktiflik ve tek tıkla yenileme
            </p>
          </div>
        </div>
        <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 text-xs font-medium text-cyan-500">
          <RefreshCw className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
          <span>Canlılık Döngüsü</span>
        </div>
      </div>

      {/* Main Interactive Radar Area */}
      <div className="relative flex flex-col lg:flex-row items-center justify-around gap-8 py-6">
        {/* Radar SVG Visualizer */}
        <div className="relative flex h-64 w-64 items-center justify-center">
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
              r="90"
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
              r="30"
              stroke="var(--color-border-subtle)"
              strokeWidth="1"
            />

            {/* Radar Crosshairs */}
            <line
              x1="100"
              y1="10"
              x2="100"
              y2="190"
              stroke="var(--color-border-subtle)"
              strokeWidth="0.75"
              strokeDasharray="2 4"
            />
            <line
              x1="10"
              y1="100"
              x2="190"
              y2="100"
              stroke="var(--color-border-subtle)"
              strokeWidth="0.75"
              strokeDasharray="2 4"
            />

            {/* 7 Day Milestones on the Perimeter */}
            {days.map((day, idx) => {
              const angle = (idx / 7) * 2 * Math.PI - Math.PI / 2;
              const cx = 100 + 75 * Math.cos(angle);
              const cy = 100 + 75 * Math.sin(angle);
              const isPassed = day <= 4;
              return (
                <g key={day}>
                  <circle
                    cx={cx}
                    cy={cy}
                    r={isPassed ? "5" : "3.5"}
                    fill={isPassed ? "#06b6d4" : "var(--color-border-strong)"}
                    className={day === 4 ? "animate-ping opacity-75" : ""}
                  />
                  <circle
                    cx={cx}
                    cy={cy}
                    r={isPassed ? "4" : "3"}
                    fill={isPassed ? "#06b6d4" : "var(--color-border-strong)"}
                  />
                </g>
              );
            })}
          </svg>

          {/* Radar Center Status */}
          <div className="relative z-10 flex flex-col items-center justify-center text-center">
            <div className="font-mono text-xl font-bold text-cyan-400">
              168:00
            </div>
            <div className="text-[10px] font-medium tracking-wider uppercase text-[var(--color-text-tertiary)]">
              Geri Sayım
            </div>
          </div>
        </div>

        {/* Lifecycle Milestones Legend & Workflow */}
        <div className="flex flex-col gap-4 max-w-sm w-full">
          <div className="flex items-start gap-3 rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-hover)] p-4">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-cyan-500/10 text-cyan-500">
              <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
            </div>
            <div>
              <div className="text-xs font-semibold text-[var(--color-text-primary)]">
                Gün 1 – 7: Aktif Keşif
              </div>
              <div className="text-[11px] text-[var(--color-text-secondary)] leading-relaxed">
                İlan akışta öne çıkar, bildirimler gönderilir ve doğrudan şifreli teklifler alınır.
              </div>
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-hover)] p-4">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500">
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
            </div>
            <div>
              <div className="text-xs font-semibold text-[var(--color-text-primary)]">
                Tek Tıkla Canlılık Yenileme
              </div>
              <div className="text-[11px] text-[var(--color-text-secondary)] leading-relaxed">
                İş veren tek bir tıklamayla sayacı yeniden 7 güne sıfırlayabilir ve listeyi taze tutar.
              </div>
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-hover)] p-4">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-500/10 text-slate-400">
              <Archive className="h-4 w-4" aria-hidden="true" />
            </div>
            <div>
              <div className="text-xs font-semibold text-[var(--color-text-primary)]">
                Otomatik Bayatlamayı Önleme
              </div>
              <div className="text-[11px] text-[var(--color-text-secondary)] leading-relaxed">
                Yenilenmeyen atıl ilanlar otomatik arşivlenir, arama kirliliği %0 seviyesinde tutulur.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
