import React from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export interface EmptyStateProps {
  title: string;
  description: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  title,
  description,
  action,
  icon,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={twMerge(
        clsx(
          "flex flex-col items-center justify-center p-8 sm:p-12 text-center rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)]",
          className
        )
      )}
    >
      {icon && (
        <div className="mb-4 text-[var(--text-muted)] p-3 rounded-full bg-[var(--bg-elevated)]" aria-hidden="true">
          {icon}
        </div>
      )}
      <h3 className="text-base font-semibold tracking-tight text-[var(--text-primary)]">
        {title}
      </h3>
      <p className="text-sm text-[var(--text-secondary)] mt-1.5 max-w-sm">
        {description}
      </p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
