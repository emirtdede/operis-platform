import React from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export interface TabItem {
  id: string;
  label: React.ReactNode;
  count?: number;
}

export interface TabsProps {
  tabs: TabItem[];
  activeTab: string;
  onChange: (id: string) => void;
  className?: string;
}

export function Tabs({ tabs, activeTab, onChange, className }: TabsProps) {
  return (
    <div
      role="tablist"
      className={twMerge(
        clsx(
          "flex items-center gap-1 border-b border-[var(--border-subtle)] overflow-x-auto select-none no-scrollbar",
          className
        )
      )}
    >
      {tabs.map((tab) => {
        const isActive = tab.id === activeTab;
        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            aria-controls={`panel-${tab.id}`}
            onClick={() => onChange(tab.id)}
            className={clsx(
              "flex items-center gap-2 py-2.5 px-3.5 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]",
              isActive
                ? "border-[var(--accent)] text-[var(--text-primary)]"
                : "border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            )}
          >
            <span>{tab.label}</span>
            {typeof tab.count === "number" && (
              <span
                className={clsx(
                  "px-1.5 py-0.5 text-xs rounded-full font-semibold",
                  isActive
                    ? "bg-[var(--accent)] text-[var(--accent-contrast)]"
                    : "bg-[var(--bg-elevated)] text-[var(--text-secondary)]"
                )}
              >
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
