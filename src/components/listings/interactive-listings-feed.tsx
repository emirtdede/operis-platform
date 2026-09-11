"use client";

import { useState } from "react";
import { Layers, Flame, Briefcase, Zap } from "lucide-react";
import { ListingCard } from "./listing-card";
import { FeedListingItem } from "@/src/modules/listings/feed/service";
import { BatchSelectionBar } from "../offers/batch-selection-bar";
import { BatchOfferWizardModal, BatchListingTarget } from "../offers/batch-offer-wizard-modal";
import { QuickOfferDrawer } from "../offers/quick-offer-drawer";
import { SubmitOfferModal } from "../offers/submit-offer-modal";

export interface InteractiveListingsFeedProps {
  items: FeedListingItem[];
  locale: string;
}

export function InteractiveListingsFeed({ items, locale }: InteractiveListingsFeedProps) {
  const isTr = locale === "tr";

  // Quick Filter Chips State
  const [chipLast24h, setChipLast24h] = useState(false);
  const [chipFixedBudget, setChipFixedBudget] = useState(false);
  const [chipQuickResponse, setChipQuickResponse] = useState(false);

  // Batch Mode State
  const [isBatchMode, setIsBatchMode] = useState(false);
  const [selectedListingIds, setSelectedListingIds] = useState<string[]>([]);
  const [isBatchWizardOpen, setIsBatchWizardOpen] = useState(false);

  // Quick Offer Drawer State
  const [quickOfferListing, setQuickOfferListing] = useState<BatchListingTarget | null>(null);

  // Full Modal Fallback State
  const [fullModalListing, setFullModalListing] = useState<BatchListingTarget | null>(null);
  const [fullModalInitialData, setFullModalInitialData] = useState<{
    message?: string;
    budgetCurrency?: string;
    budgetMin?: string;
    budgetMax?: string;
    timelineValue?: string;
    timelineUnit?: "DAYS" | "WEEKS" | "MONTHS";
  } | undefined>(undefined);

  const maxBatchLimit = 5;

  const toggleSelectListing = (id: string) => {
    setSelectedListingIds((prev) => {
      if (prev.includes(id)) {
        return prev.filter((item) => item !== id);
      }
      if (prev.length >= maxBatchLimit) {
        return prev;
      }
      return [...prev, id];
    });
  };

  const handleClearSelection = () => {
    setSelectedListingIds([]);
  };

  const handleExitBatchMode = () => {
    setIsBatchMode(false);
    setSelectedListingIds([]);
  };

  // Filter items based on active quick chips
  const now = new Date().getTime();
  const filteredItems = items.filter((item) => {
    if (chipLast24h) {
      const pubTime = new Date(item.firstPublishedAt).getTime();
      if (now - pubTime > 24 * 60 * 60 * 1000) return false;
    }
    if (chipFixedBudget) {
      if (!item.budgetMin || parseFloat(item.budgetMin) <= 0) return false;
    }
    if (chipQuickResponse) {
      if (item.activationSeq < 1 || new Date(item.activeUntil).getTime() <= now) return false;
    }
    return true;
  });

  // Filter selected targets
  const selectedTargets: BatchListingTarget[] = items
    .filter((item) => selectedListingIds.includes(item.id))
    .map((item) => ({
      id: item.id,
      slug: item.slug,
      title: item.title,
      categoryName: item.categoryName,
      budgetMin: item.budgetMin,
      budgetMax: item.budgetMax,
      budgetCurrency: item.budgetCurrency,
      ownerDisplayName: item.ownerDisplayName,
    }));

  return (
    <div className="space-y-4">
      {/* Top Controls Toolbar: Toggle Batch Mode & Quick Filter Chips */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1 border-b border-[var(--color-border-subtle)]/40">
        {/* Quick Filter Chips Toolbar */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setChipLast24h((prev) => !prev)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer border ${
              chipLast24h
                ? "bg-rose-500/15 text-rose-400 border-rose-500/30 shadow-xs"
                : "bg-[var(--color-surface-hover)] border-[var(--color-border-subtle)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
            }`}
          >
            <Flame
              className={`h-3.5 w-3.5 ${chipLast24h ? "text-rose-400" : "text-[var(--color-text-tertiary)]"}`}
            />
            <span>{isTr ? "Son 24 Saatte Yayınlananlar" : "Published in Last 24h"}</span>
          </button>

          <button
            type="button"
            onClick={() => setChipFixedBudget((prev) => !prev)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer border ${
              chipFixedBudget
                ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30 shadow-xs"
                : "bg-[var(--color-surface-hover)] border-[var(--color-border-subtle)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
            }`}
          >
            <Briefcase
              className={`h-3.5 w-3.5 ${chipFixedBudget ? "text-emerald-400" : "text-[var(--color-text-tertiary)]"}`}
            />
            <span>{isTr ? "Bütçesi Belirli İlanlar" : "Defined Budget"}</span>
          </button>

          <button
            type="button"
            onClick={() => setChipQuickResponse((prev) => !prev)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer border ${
              chipQuickResponse
                ? "bg-amber-500/15 text-amber-400 border-amber-500/30 shadow-xs"
                : "bg-[var(--color-surface-hover)] border-[var(--color-border-subtle)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
            }`}
          >
            <Zap
              className={`h-3.5 w-3.5 ${chipQuickResponse ? "text-amber-400" : "text-[var(--color-text-tertiary)]"}`}
            />
            <span>{isTr ? "Hızlı Yanıt Veren İşverenler" : "Quick-Responding"}</span>
          </button>

          {(chipLast24h || chipFixedBudget || chipQuickResponse) && (
            <button
              type="button"
              onClick={() => {
                setChipLast24h(false);
                setChipFixedBudget(false);
                setChipQuickResponse(false);
              }}
              className="text-xs text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] underline ml-1 cursor-pointer"
            >
              {isTr ? "Filtreleri Temizle" : "Clear Filters"}
            </button>
          )}
        </div>

        {/* Batch Mode Button */}
        <div className="flex items-center justify-between sm:justify-end gap-3">
          <div className="text-xs text-[var(--color-text-tertiary)]">
            <span>
              {filteredItems.length} {isTr ? "ilan" : "listings"}
            </span>
          </div>

          <button
            type="button"
            onClick={() => {
              setIsBatchMode(!isBatchMode);
              if (isBatchMode) setSelectedListingIds([]);
            }}
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer border shrink-0 ${
              isBatchMode
                ? "bg-blue-500 text-white border-blue-600 shadow-md shadow-blue-500/20"
                : "bg-[var(--color-surface-hover)] border-[var(--color-border-subtle)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
            }`}
          >
            <Layers className="h-3.5 w-3.5" />
            <span>
              {isBatchMode
                ? isTr
                  ? "Toplu Modu Kapat"
                  : "Exit Batch Mode"
                : isTr
                  ? "Toplu Teklif Modu"
                  : "Batch Offer Mode"}
            </span>
          </button>
        </div>
      </div>

      {/* Listings Grid */}
      {filteredItems.length === 0 ? (
        <div className="rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-base)]/60 p-12 text-center space-y-2">
          <p className="text-sm font-semibold text-[var(--color-text-primary)]">
            {isTr
              ? "Seçilen filtrelere uygun ilan bulunamadı"
              : "No listings match the selected filters"}
          </p>
          <p className="text-xs text-[var(--color-text-secondary)]">
            {isTr
              ? "Daha fazla sonuç görmek için filtreleri sıfırlayabilirsiniz."
              : "Reset filters to view all active listings."}
          </p>
          <button
            type="button"
            onClick={() => {
              setChipLast24h(false);
              setChipFixedBudget(false);
              setChipQuickResponse(false);
            }}
            className="text-xs font-semibold text-blue-400 hover:underline pt-2 cursor-pointer"
          >
            {isTr ? "Tüm Filtreleri Temizle" : "Reset All Filters"}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredItems.map((item) => (
            <ListingCard
              key={item.id}
              id={item.id}
              slug={item.slug}
              title={item.title}
              summary={item.summary}
              categoryName={item.categoryName}
              budgetMode={item.budgetMode}
              budgetCurrency={item.budgetCurrency}
              budgetMin={item.budgetMin}
              budgetMax={item.budgetMax}
              timelineMode={item.timelineMode}
              targetDate={item.targetDate}
              timelineValue={item.timelineValue}
              timelineUnit={item.timelineUnit}
              ownerHandle={item.ownerHandle}
              ownerDisplayName={item.ownerDisplayName}
              firstPublishedAt={item.firstPublishedAt}
              lastActivatedAt={item.lastActivatedAt}
              activeUntil={item.activeUntil}
              activationSeq={item.activationSeq}
              viewCount={item.viewCount}
              clickCount={item.clickCount}
              locale={locale}
              isBatchMode={isBatchMode}
              isSelected={selectedListingIds.includes(item.id)}
              onToggleSelect={toggleSelectListing}
              onQuickOffer={(target) => setQuickOfferListing(target)}
            />
          ))}
        </div>
      )}

      {/* Floating Batch Selection Bar */}
      <BatchSelectionBar
        selectedCount={selectedListingIds.length}
        maxLimit={maxBatchLimit}
        locale={locale}
        onClear={handleClearSelection}
        onOpenWizard={() => setIsBatchWizardOpen(true)}
        onExitBatchMode={isBatchMode ? handleExitBatchMode : undefined}
      />

      {/* Batch Offer Wizard Modal */}
      {isBatchWizardOpen && (
        <BatchOfferWizardModal
          isOpen={isBatchWizardOpen}
          onClose={() => setIsBatchWizardOpen(false)}
          selectedListings={selectedTargets}
          locale={locale}
          onRemoveListing={(id) => {
            setSelectedListingIds((prev) => prev.filter((item) => item !== id));
          }}
          onSuccess={() => {
            setSelectedListingIds([]);
            setIsBatchMode(false);
          }}
        />
      )}

      {/* Quick Offer Drawer */}
      {quickOfferListing && (
        <QuickOfferDrawer
          isOpen={!!quickOfferListing}
          onClose={() => setQuickOfferListing(null)}
          listing={quickOfferListing}
          locale={locale}
          onOpenFullModal={(initialData) => {
            setFullModalListing(quickOfferListing);
            setFullModalInitialData(initialData);
            setQuickOfferListing(null);
          }}
          onSuccess={() => {
            setQuickOfferListing(null);
          }}
        />
      )}

      {/* Detailed Full Proposal Modal (Fallback) */}
      {fullModalListing && (
        <SubmitOfferModal
          isOpen={!!fullModalListing}
          onClose={() => {
            setFullModalListing(null);
            setFullModalInitialData(undefined);
          }}
          listingId={fullModalListing.id}
          listingTitle={fullModalListing.title}
          locale={locale}
          initialData={fullModalInitialData}
        />
      )}
    </div>
  );
}
