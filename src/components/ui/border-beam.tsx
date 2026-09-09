"use client";

import React from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export interface BorderBeamProps {
  className?: string;
  size?: number;
  duration?: number;
  borderWidth?: number;
  colorFrom?: string;
  colorTo?: string;
}

export function BorderBeam({
  className,
  duration = 8,
  borderWidth = 1.5,
  colorFrom = "#38bdf8",
  colorTo = "#818cf8",
}: BorderBeamProps) {
  return (
    <div
      aria-hidden="true"
      style={
        {
          "--beam-duration": `${duration}s`,
          "--beam-from": colorFrom,
          "--beam-to": colorTo,
          "--beam-border": `${borderWidth}px`,
        } as React.CSSProperties
      }
      className={twMerge(
        clsx(
          "pointer-events-none absolute -inset-[1px] rounded-[inherit] overflow-hidden select-none",
          className
        )
      )}
    >
      <div
        style={{
          animationDuration: `${duration}s`,
        }}
        className="absolute -inset-[100%] animate-[spin_8s_linear_infinite] bg-[conic-gradient(from_0deg,transparent_0_340deg,var(--beam-from)_350deg,var(--beam-to)_360deg)] opacity-90"
      />
      <div className="absolute inset-[1px] rounded-[inherit] bg-[var(--color-surface-base)]" />
    </div>
  );
}
