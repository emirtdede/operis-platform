import React from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export interface EmptyStateProps {
  title: string;
  description: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
  variant?: "default" | "card";
}

export function EmptyState({
  title,
  description,
  action,
  icon,
  className,
  variant = "default",
}: EmptyStateProps) {
  return (
    <div
      className={twMerge(
        clsx(
          "flex flex-col items-center justify-center text-center",
          variant === "card"
            ? "p-8 sm:p-12 rounded-3xl bg-[var(--color-surface-base)]/60 border border-[var(--color-border-subtle)] backdrop-blur-xl shadow-sm"
            : "py-4 px-2 sm:py-6",
          className
        )
      )}
    >
      {icon && (
        <div
          className="mb-4 text-[var(--color-text-tertiary)] p-3 rounded-full bg-[var(--color-surface-raised)] border border-[var(--color-border-subtle)]"
          aria-hidden="true"
        >
          {icon}
        </div>
      )}
      <h3 className="text-base sm:text-lg font-semibold tracking-tight text-[var(--color-text-primary)]">
        {title}
      </h3>
      <p className="text-sm text-[var(--color-text-secondary)] mt-2 max-w-md leading-relaxed">
        {description}
      </p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
