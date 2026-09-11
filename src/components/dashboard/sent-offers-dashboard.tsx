"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, X } from "lucide-react";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { EmptyState } from "../ui/empty-state";
import { SubmitOfferModal } from "../offers/submit-offer-modal";
import { getLocalizedListingPath, getLocalizedWorkspacePath } from "@/src/lib/i18n/routes";

export interface SentOfferItem {
  id: string;
  listingId: string;
  listingSlug: string;
  listingTitle: string;
  status: string;
  message: string;
  budgetCurrency: string | null;
  budgetMin: string | null;
  budgetMax: string | null;
  estimatedDurationValue: number | null;
  estimatedDurationUnit: string | null;
  createdAt: string | Date;
  updatedAt: string | Date;
  engagementId?: string | null;
}

export interface SentOffersDashboardProps {
  initialOffers: SentOfferItem[];
  locale: string;
}

export function SentOffersDashboard({ initialOffers, locale }: SentOffersDashboardProps) {
  const isTr = locale === "tr";
  const [offers, setOffers] = useState<SentOfferItem[]>(initialOffers);
  const [filter, setFilter] = useState<string>("all");
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [withdrawingOffer, setWithdrawingOffer] = useState<SentOfferItem | null>(null);
  const [withdrawError, setWithdrawError] = useState<string | null>(null);
  const [editingOffer, setEditingOffer] = useState<SentOfferItem | null>(null);

  // Close modal on Escape
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && withdrawingOffer) {
        setWithdrawingOffer(null);
        setWithdrawError(null);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [withdrawingOffer]);

  const filteredOffers = offers.filter((o) => {
    if (filter === "all") return true;
    return o.status.toLowerCase() === filter.toLowerCase();
  });

  const confirmWithdraw = async () => {
    if (!withdrawingOffer) return;

    setLoadingId(withdrawingOffer.id);
    setWithdrawError(null);

    try {
      const res = await fetch(`/api/offers/${withdrawingOffer.id}/withdraw`, {
        method: "POST",
        headers: {
          "x-locale": locale,
        },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          data.error || (isTr ? "Teklif geri çekilemedi." : "Could not withdraw offer.")
        );
      }

      setOffers((prev) =>
        prev.map((o) => (o.id === withdrawingOffer.id ? { ...o, status: "WITHDRAWN" } : o))
      );
      setWithdrawingOffer(null);
    } catch (err: unknown) {
      setWithdrawError(
        err instanceof Error ? err.message : isTr ? "İşlem başarısız oldu." : "Operation failed."
      );
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Filter Tabs */}
      <div className="flex items-center gap-1 border-b border-[var(--color-border-subtle)] pb-4 overflow-x-auto">
        {(["all", "pending", "accepted", "rejected", "withdrawn"] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              filter === f
                ? "bg-[var(--color-surface-hover)] text-[var(--color-text-primary)] font-semibold"
                : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
            }`}
          >
            {f === "all"
              ? isTr
                ? "Tümü"
                : "All"
              : f === "pending"
                ? isTr
                  ? "Beklemede"
                  : "Pending"
                : f === "accepted"
                  ? isTr
                    ? "Kabul Edilenler"
                    : "Accepted"
                  : f === "rejected"
                    ? isTr
                      ? "Reddedilenler"
                      : "Rejected"
                    : isTr
                      ? "Geri Çekilenler"
                      : "Withdrawn"}
          </button>
        ))}
      </div>

      {filteredOffers.length === 0 ? (
        <div className="rounded-3xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-base)]/70 backdrop-blur-xl p-8 sm:p-12 text-center shadow-sm">
          <EmptyState
            title={isTr ? "Teklif bulunamadı" : "No offers found"}
            description={
              isTr
                ? "Henüz bir projeye teklif vermediniz veya bu filtrede teklif bulunmuyor."
                : "You have not submitted proposals or none match this filter."
            }
            action={
              <Link href={isTr ? "/tr/ilanlar" : "/en/listings"}>
                <Button variant="primary">{isTr ? "İlanları Keşfet" : "Explore Listings"}</Button>
              </Link>
            }
          />
        </div>
      ) : (
        <div className="space-y-4">
          {filteredOffers.map((offer) => {
            const dateStr = new Date(offer.createdAt).toLocaleDateString(isTr ? "tr-TR" : "en-US");

            return (
              <div
                key={offer.id}
                className="rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-base)]/70 backdrop-blur-xl p-5 sm:p-6 space-y-3 shadow-sm transition-all duration-300 hover:border-blue-500/30 hover:shadow-lg"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={
                        offer.status === "ACCEPTED"
                          ? "primary"
                          : offer.status === "PENDING"
                            ? "secondary"
                            : "outline"
                      }
                      size="sm"
                    >
                      {offer.status}
                    </Badge>
                    <span className="text-xs text-[var(--color-text-tertiary)]">{dateStr}</span>
                  </div>

                  {offer.status === "PENDING" && (
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditingOffer(offer)}
                        disabled={loadingId === offer.id}
                        className="cursor-pointer"
                      >
                        {isTr ? "Düzenle" : "Edit"}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setWithdrawingOffer(offer)}
                        disabled={loadingId === offer.id}
                        className="text-[var(--color-danger)] hover:bg-[var(--color-danger)]/10 cursor-pointer"
                      >
                        {isTr ? "Teklifi Geri Çek" : "Withdraw"}
                      </Button>
                    </div>
                  )}

                  {offer.status === "ACCEPTED" && offer.engagementId && (
                    <Link href={getLocalizedWorkspacePath(offer.engagementId, locale)}>
                      <Button variant="primary" size="sm">
                        {isTr ? "Eşleşme ve İletişim Detayları →" : "View Match & Contact →"}
                      </Button>
                    </Link>
                  )}
                </div>

                <h3 className="font-semibold text-base text-[var(--color-text-primary)]">
                  <Link
                    href={getLocalizedListingPath(offer.listingSlug, locale)}
                    className="hover:underline"
                  >
                    {offer.listingTitle}
                  </Link>
                </h3>

                <p className="line-clamp-2 text-xs text-[var(--color-text-secondary)] leading-relaxed">
                  {offer.message}
                </p>

                {(offer.budgetMin || offer.estimatedDurationValue) && (
                  <div className="flex flex-wrap items-center gap-4 text-xs text-[var(--color-text-tertiary)] pt-1 border-t border-[var(--color-border-subtle)]">
                    {offer.budgetMin && (
                      <span>
                        <strong>{isTr ? "Bütçe:" : "Budget:"}</strong> {offer.budgetMin}{" "}
                        {offer.budgetMax ? `– ${offer.budgetMax}` : ""} {offer.budgetCurrency}
                      </span>
                    )}
                    {offer.estimatedDurationValue && (
                      <span>
                        <strong>{isTr ? "Süre:" : "Timeline:"}</strong> ~
                        {offer.estimatedDurationValue} {offer.estimatedDurationUnit}
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Accessible Withdrawal Confirmation Modal Dialog */}
      {withdrawingOffer && (
        <div
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="withdraw-dialog-title"
          aria-describedby="withdraw-dialog-description"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150"
        >
          <div className="relative w-full max-w-md rounded-3xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-base)] p-6 sm:p-8 shadow-2xl space-y-6">
            <button
              type="button"
              onClick={() => {
                setWithdrawingOffer(null);
                setWithdrawError(null);
              }}
              className="absolute top-5 right-5 p-1.5 rounded-lg text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-hover)] transition-colors"
              aria-label={isTr ? "Kapat" : "Close"}
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>

            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center shrink-0">
                <AlertTriangle className="h-5 w-5" aria-hidden="true" />
              </div>
              <h2
                id="withdraw-dialog-title"
                className="text-base font-bold text-[var(--color-text-primary)]"
              >
                {isTr ? "Teklifi Geri Çekmek İstiyor Musunuz?" : "Withdraw Proposal?"}
              </h2>
            </div>

            <p
              id="withdraw-dialog-description"
              className="text-xs text-[var(--color-text-secondary)] leading-relaxed"
            >
              {isTr
                ? `"${withdrawingOffer.listingTitle}" projesine verdiğiniz teklifi geri çekiyorsunuz. İlanın mevcut 7 günlük yayım döngüsü boyunca bu projeye tekrar teklif sunamazsınız.`
                : `You are withdrawing your proposal for "${withdrawingOffer.listingTitle}". You will not be able to submit another offer for this project during its current 7-day cycle.`}
            </p>

            {withdrawError && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-400">
                {withdrawError}
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setWithdrawingOffer(null);
                  setWithdrawError(null);
                }}
                disabled={loadingId === withdrawingOffer.id}
              >
                {isTr ? "Vazgeç" : "Cancel"}
              </Button>
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={confirmWithdraw}
                disabled={loadingId === withdrawingOffer.id}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {loadingId === withdrawingOffer.id
                  ? isTr
                    ? "Geri Çekiliyor..."
                    : "Withdrawing..."
                  : isTr
                    ? "Evet, Teklifi Geri Çek"
                    : "Confirm Withdrawal"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Proposal Edit Modal */}
      {editingOffer && (
        <SubmitOfferModal
          isOpen={Boolean(editingOffer)}
          onClose={() => setEditingOffer(null)}
          listingId={editingOffer.listingId}
          listingTitle={editingOffer.listingTitle}
          locale={locale}
          offerId={editingOffer.id}
          initialData={{
            message: editingOffer.message,
            budgetCurrency: editingOffer.budgetCurrency ?? (isTr ? "TRY" : "USD"),
            budgetMin: editingOffer.budgetMin ?? "",
            budgetMax: editingOffer.budgetMax ?? "",
            timelineValue: editingOffer.estimatedDurationValue
              ? String(editingOffer.estimatedDurationValue)
              : "",
            timelineUnit: (editingOffer.estimatedDurationUnit as "DAYS" | "WEEKS" | "MONTHS") ?? "WEEKS",
          }}
          onSuccess={(updatedData) => {
            if (updatedData) {
              setOffers((prev) =>
                prev.map((o) =>
                  o.id === editingOffer.id
                    ? {
                        ...o,
                        message: updatedData.message ?? o.message,
                        budgetCurrency: updatedData.budgetCurrency ?? o.budgetCurrency,
                        budgetMin: updatedData.budgetMin ?? o.budgetMin,
                        budgetMax: updatedData.budgetMax ?? o.budgetMax,
                        estimatedDurationValue:
                          updatedData.estimatedDurationValue !== undefined
                            ? updatedData.estimatedDurationValue
                            : o.estimatedDurationValue,
                        estimatedDurationUnit:
                          updatedData.estimatedDurationUnit !== undefined
                            ? updatedData.estimatedDurationUnit
                            : o.estimatedDurationUnit,
                        updatedAt: new Date(),
                      }
                    : o
                )
              );
            }
            setEditingOffer(null);
          }}
        />
      )}
    </div>
  );
}
