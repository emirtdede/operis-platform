import React from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?:
    "neutral" | "success" | "warning" | "danger" | "accent" | "primary" | "secondary" | "outline";
  size?: "sm" | "md";
}

export function Badge({
  className,
  variant = "neutral",
  size = "md",
  children,
  ...props
}: BadgeProps) {
  const baseStyles =
    "inline-flex items-center font-medium rounded-full select-none uppercase tracking-wider";

  const variantStyles = {
    neutral:
      "bg-[var(--bg-elevated)] text-[var(--text-secondary)] border border-[var(--border-subtle)]",
    primary: "bg-[var(--accent)] text-[var(--accent-contrast)]",
    secondary:
      "bg-[var(--color-surface-hover)] text-[var(--color-text-secondary)] border border-[var(--color-border-subtle)]",
    outline:
      "bg-transparent text-[var(--color-text-primary)] border border-[var(--color-border-subtle)]",
    success: "bg-emerald-500/10 text-[var(--success)] border border-emerald-500/20",
    warning: "bg-amber-500/10 text-[var(--warning)] border border-amber-500/20",
    danger: "bg-red-500/10 text-[var(--danger)] border border-red-500/20",
    accent: "bg-[var(--accent)] text-[var(--accent-contrast)]",
  };

  const sizeStyles = {
    sm: "px-2 py-0.5 text-[10px]",
    md: "px-2.5 py-1 text-xs",
  };

  return (
    <span
      className={twMerge(clsx(baseStyles, variantStyles[variant], sizeStyles[size], className))}
      {...props}
    >
      {children}
    </span>
  );
}
