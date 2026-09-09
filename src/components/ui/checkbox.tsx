import React, { useId } from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  label: React.ReactNode;
  hint?: string;
  error?: string;
}

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, label, hint, error, id, ...props }, ref) => {
    const generatedId = useId();
    const checkboxId = id || generatedId;
    const hintId = `${checkboxId}-hint`;
    const errorId = `${checkboxId}-error`;

    return (
      <div className="flex flex-col gap-1">
        <div className="flex items-start gap-3">
          <input
            ref={ref}
            type="checkbox"
            id={checkboxId}
            aria-invalid={!!error}
            aria-describedby={clsx(error && errorId, hint && hintId) || undefined}
            className={twMerge(
              clsx(
                "mt-0.5 h-4 w-4 shrink-0 rounded-md border border-white/20 bg-slate-900/60 text-blue-500 transition-all cursor-pointer",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 focus-visible:ring-offset-1 focus-visible:ring-offset-slate-950",
                "accent-blue-600 shadow-sm",
                error && "border-[var(--color-danger)]",
                className
              )
            )}
            {...props}
          />
          <div className="flex flex-col">
            <label
              htmlFor={checkboxId}
              className="text-xs font-normal text-[var(--color-text-secondary)] cursor-pointer select-none leading-relaxed hover:text-[var(--color-text-primary)] transition-colors"
            >
              {label}
              {props.required && (
                <span className="text-red-400/80 ml-1 text-[11px] font-normal" aria-hidden="true">
                  *
                </span>
              )}
            </label>
            {hint && (
              <p id={hintId} className="text-xs text-[var(--color-text-tertiary)] mt-0.5">
                {hint}
              </p>
            )}
          </div>
        </div>
        {error && (
          <p id={errorId} className="text-xs text-[var(--color-danger)] font-medium pl-7" role="alert">
            {error}
          </p>
        )}
      </div>
    );
  }
);

Checkbox.displayName = "Checkbox";
