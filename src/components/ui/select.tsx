import React, { useId } from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  badge?: React.ReactNode;
  hint?: string;
  error?: string;
  options: SelectOption[];
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, badge, hint, error, id, options, ...props }, ref) => {
    const generatedId = useId();
    const selectId = id || generatedId;
    const hintId = `${selectId}-hint`;
    const errorId = `${selectId}-error`;

    return (
      <div className="w-full flex flex-col gap-1.5">
        {label && (
          <div className="min-h-[22px] flex items-center justify-between gap-2">
            <label
              htmlFor={selectId}
              className="text-xs font-medium text-[var(--color-text-secondary)] select-none flex items-center gap-1.5"
            >
              <span>{label}</span>
              {props.required && (
                <span className="text-red-400/80 text-[11px] font-normal" aria-hidden="true">
                  *
                </span>
              )}
            </label>
            {badge && (
              <span className="text-[10px] font-mono font-medium text-slate-400/80 px-2 py-0.5 rounded-md bg-white/[0.04] border border-white/[0.08] shadow-sm select-none">
                {badge}
              </span>
            )}
          </div>
        )}
        <div className="relative">
          <select
            ref={ref}
            id={selectId}
            aria-invalid={!!error}
            aria-describedby={clsx(error && errorId, hint && hintId) || undefined}
            className={twMerge(
              clsx(
                "w-full h-12 px-3.5 pr-10 text-sm rounded-xl font-normal transition-all duration-200",
                "bg-white/80 dark:bg-slate-900/60 backdrop-blur-xl text-[var(--color-text-primary)]",
                "border border-slate-200 dark:border-white/[0.08] hover:border-slate-300 dark:hover:border-white/[0.18]",
                "shadow-sm dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.06),0_1px_2px_rgba(0,0,0,0.25)]",
                "appearance-none",
                "focus-visible:outline-none focus-visible:border-blue-500 dark:focus-visible:border-blue-500/80 focus-visible:ring-4 focus-visible:ring-blue-500/15 focus-visible:bg-white dark:focus-visible:bg-slate-900/80",
                error
                  ? "border-[var(--color-danger)] focus-visible:ring-[var(--color-danger)]/20"
                  : "",
                className
              )
            )}
            {...props}
          >
            {options.map((opt) => (
              <option key={opt.value} value={opt.value} disabled={opt.disabled} className="bg-[#141517] text-[var(--color-text-primary)]">
                {opt.label}
              </option>
            ))}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3.5 text-slate-400">
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
        {hint && !error && (
          <p id={hintId} className="text-xs text-[var(--color-text-tertiary)]">
            {hint}
          </p>
        )}
        {error && (
          <p id={errorId} className="text-xs text-[var(--color-danger)] font-medium" role="alert">
            {error}
          </p>
        )}
      </div>
    );
  }
);

Select.displayName = "Select";
