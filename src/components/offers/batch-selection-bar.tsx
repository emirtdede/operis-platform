"use client";

import { Layers, Send, X, AlertCircle } from "lucide-react";
import { Button } from "../ui/button";

export interface BatchSelectionBarProps {
  selectedCount: number;
  maxLimit?: number;
  locale: string;
  onClear: () => void;
  onOpenWizard: () => void;
  onExitBatchMode?: () => void;
}

export function BatchSelectionBar({
  selectedCount,
  maxLimit = 5,
  locale,
  onClear,
  onOpenWizard,
  onExitBatchMode,
}: BatchSelectionBarProps) {
  const isTr = locale === "tr";
  const isMaxReached = selectedCount >= maxLimit;

  if (selectedCount === 0 && !onExitBatchMode) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 w-full max-w-xl px-4 animate-in fade-in slide-in-from-bottom-5 duration-200">
      <div className="rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-base)]/95 backdrop-blur-2xl p-3 sm:p-4 shadow-2xl shadow-blue-500/10 flex items-center justify-between gap-3 text-xs">
        {/* Left Side: Count & Limit Status */}
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-blue-500/15 border border-blue-500/25 flex items-center justify-center text-blue-400 shrink-0">
            <Layers className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-[var(--color-text-primary)] text-sm">
                {selectedCount}{" "}
                <span className="text-xs font-normal text-[var(--color-text-secondary)]">
                  / {maxLimit} {isTr ? "İlan Seçildi" : "Selected"}
                </span>
              </span>
              {isMaxReached && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/25">
                  <AlertCircle className="h-3 w-3" />
                  {isTr ? "Limit Doldu" : "Limit Reached"}
                </span>
              )}
            </div>
            <p className="text-[11px] text-[var(--color-text-tertiary)] hidden sm:block">
              {isTr
                ? "Tek seferde en fazla 5 ilana güvenli teklif iletebilirsiniz."
                : "You can submit proposals to up to 5 listings simultaneously."}
            </p>
          </div>
        </div>

        {/* Right Side: Actions */}
        <div className="flex items-center gap-2">
          {selectedCount > 0 && (
            <button
              type="button"
              onClick={onClear}
              className="px-3 py-2 rounded-xl text-xs text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-hover)] transition-colors cursor-pointer"
            >
              {isTr ? "Temizle" : "Clear"}
            </button>
          )}

          <Button
            variant="primary"
            size="md"
            onClick={onOpenWizard}
            disabled={selectedCount === 0}
            className="font-semibold flex items-center gap-2 shadow-lg shadow-blue-500/20"
          >
            <Send className="h-3.5 w-3.5" />
            <span>
              {isTr ? `Toplu Teklif Ver (${selectedCount})` : `Submit Batch (${selectedCount})`}
            </span>
          </Button>

          {onExitBatchMode && (
            <button
              type="button"
              onClick={onExitBatchMode}
              className="p-2 rounded-xl text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-hover)] transition-colors cursor-pointer ml-1"
              title={isTr ? "Toplu Moddan Çık" : "Exit Batch Mode"}
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
