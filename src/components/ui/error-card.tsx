"use client";

import React from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export interface ErrorCardProps extends React.HTMLAttributes<HTMLDivElement> {
  code?: string | number;
  badgeText?: string;
  badgeColor?: "amber" | "rose" | "blue" | "emerald";
  title: string;
  subtitle?: string;
  description?: string;
  icon?: React.ReactNode;
  statusLabel?: string;
  showStatusIndicator?: boolean;
  children?: React.ReactNode;
  className?: string;
}

export function ErrorCard({
  code,
  badgeText,
  badgeColor = "blue",
  title,
  subtitle,
  description,
  icon,
  statusLabel,
  showStatusIndicator = true,
  children,
  className,
  ...props
}: ErrorCardProps) {
  const colorMap = {
    amber: {
      ambient1: "bg-amber-500/15",
      ambient2: "bg-orange-500/10",
      iconBg: "bg-amber-500/10 border-amber-500/20 text-amber-400",
      badge: "text-amber-400 border-amber-500/30 bg-amber-500/10",
      watermark: "text-amber-500/5 dark:text-amber-400/10",
    },
    rose: {
      ambient1: "bg-rose-500/15",
      ambient2: "bg-red-500/10",
      iconBg: "bg-rose-500/10 border-rose-500/20 text-rose-400",
      badge: "text-rose-400 border-rose-500/30 bg-rose-500/10",
      watermark: "text-rose-500/5 dark:text-rose-400/10",
    },
    blue: {
      ambient1: "bg-blue-500/15",
      ambient2: "bg-indigo-500/10",
      iconBg: "bg-blue-500/10 border-blue-500/20 text-blue-400",
      badge: "text-blue-400 border-blue-500/30 bg-blue-500/10",
      watermark: "text-blue-500/5 dark:text-blue-400/10",
    },
    emerald: {
      ambient1: "bg-emerald-500/15",
      ambient2: "bg-teal-500/10",
      iconBg: "bg-emerald-500/10 border-emerald-500/20 text-emerald-400",
      badge: "text-emerald-400 border-emerald-500/30 bg-emerald-500/10",
      watermark: "text-emerald-500/5 dark:text-emerald-400/10",
    },
  };

  const currentColors = colorMap[badgeColor];

  return (
    <div
      className={twMerge(
        clsx(
          "relative overflow-hidden max-w-lg w-full text-center p-6 sm:p-10 rounded-3xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-base)]/80 backdrop-blur-2xl shadow-2xl transition-all duration-300",
          className
        )
      )}
      {...props}
    >
      {/* Ambient Neon Glows */}
      <div
        className={`pointer-events-none absolute -top-32 -right-32 w-72 h-72 rounded-full ${currentColors.ambient1} blur-3xl`}
        aria-hidden="true"
      />
      <div
        className={`pointer-events-none absolute -bottom-32 -left-32 w-72 h-72 rounded-full ${currentColors.ambient2} blur-3xl`}
        aria-hidden="true"
      />

      {/* Large Watermark Glyphs */}
      {code && (
        <div
          aria-hidden="true"
          className={`pointer-events-none select-none absolute inset-0 flex items-center justify-center font-mono font-black text-[130px] sm:text-[170px] leading-none tracking-tighter ${currentColors.watermark}`}
        >
          {code}
        </div>
      )}

      {/* Top Status Header */}
      {showStatusIndicator && (
        <div className="relative z-10 flex items-center justify-between pb-6 mb-2 border-b border-[var(--color-border-subtle)]/50 text-[11px] text-[var(--color-text-tertiary)]">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span className="font-medium text-[var(--color-text-secondary)]">
              {statusLabel || "Operis Systems: Operational"}
            </span>
          </div>
          {badgeText && (
            <span
              className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold tracking-wider uppercase border ${currentColors.badge}`}
            >
              {badgeText}
            </span>
          )}
        </div>
      )}

      {/* Main Content Area */}
      <div className="relative z-10 space-y-6">
        {icon && (
          <div
            className={`mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border shadow-inner ${currentColors.iconBg}`}
          >
            {icon}
          </div>
        )}

        <div className="space-y-2">
          {subtitle && (
            <p className="text-xs font-mono font-semibold tracking-widest uppercase text-blue-400">
              {subtitle}
            </p>
          )}
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[var(--color-text-primary)]">
            {title}
          </h1>
          {description && (
            <p className="text-xs sm:text-sm text-[var(--color-text-secondary)] leading-relaxed max-w-md mx-auto">
              {description}
            </p>
          )}
        </div>

        {children}
      </div>
    </div>
  );
}
