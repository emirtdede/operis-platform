"use client";

import { useTranslations } from "next-intl";

export default function Loading() {
  const t = useTranslations("common");

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={t("loading")}
      className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 space-y-8 animate-pulse"
    >
      <span className="sr-only">{t("loading")}</span>

      {/* Header skeleton */}
      <div className="space-y-3 border-b border-[var(--color-border-subtle)] pb-6">
        <div className="h-8 w-64 rounded-lg bg-[var(--color-border-subtle)] opacity-70" />
        <div className="h-4 w-96 rounded bg-[var(--color-border-subtle)] opacity-40" />
      </div>

      {/* Grid skeletons */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className="rounded-3xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-base)]/70 backdrop-blur-xl p-6 space-y-4 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <div className="h-4 w-24 rounded-lg bg-[var(--color-border-subtle)] opacity-50" />
              <div className="h-5 w-16 rounded-full bg-[var(--color-border-subtle)] opacity-40" />
            </div>
            <div className="h-6 w-3/4 rounded-lg bg-[var(--color-border-subtle)] opacity-70" />
            <div className="space-y-2">
              <div className="h-4 w-full rounded-lg bg-[var(--color-border-subtle)] opacity-40" />
              <div className="h-4 w-5/6 rounded-lg bg-[var(--color-border-subtle)] opacity-40" />
            </div>
            <div className="pt-4 border-t border-[var(--color-border-subtle)] flex items-center justify-between">
              <div className="h-4 w-20 rounded-lg bg-[var(--color-border-subtle)] opacity-50" />
              <div className="h-8 w-24 rounded-xl bg-[var(--color-border-subtle)] opacity-60" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
