"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { AvatarInitials } from "../ui/avatar-initials";
import { Dialog } from "../ui/dialog";
import { Select } from "../ui/select";
import { TextArea } from "../ui/text-area";
import { EmptyState } from "../ui/empty-state";

export interface ReceivedOfferItem {
  id: string;
  listingId: string;
  listingTitle: string;
  offerorUserId: string;
  offerorDisplayName: string;
  offerorHandle: string;
  status: string;
  message: string;
  budgetCurrency: string | null;
  budgetMin: string | null;
  budgetMax: string | null;
  estimatedDurationValue: number | null;
  estimatedDurationUnit: string | null;
  createdAt: string | Date;
}

export interface ReceivedOffersDashboardProps {
  initialOffers: ReceivedOfferItem[];
  locale: string;
}

export function ReceivedOffersDashboard({
  initialOffers,
  locale,
}: ReceivedOffersDashboardProps) {
  const isTr = locale === "tr";
  const [offers, setOffers] = useState<ReceivedOfferItem[]>(initialOffers);

  // Accept Modal State
  const [acceptingOffer, setAcceptingOffer] = useState<ReceivedOfferItem | null>(null);
  const [isAccepting, setIsAccepting] = useState(false);
  const [acceptError, setAcceptError] = useState<string | null>(null);

  // Reject Modal State
  const [rejectingOffer, setRejectingOffer] = useState<ReceivedOfferItem | null>(null);
  const [rejectionCode, setRejectionCode] = useState<string>("BUDGET_MISMATCH");
  const [rejectionNote, setRejectionNote] = useState<string>("");
  const [isRejecting, setIsRejecting] = useState(false);
  const [rejectError, setRejectError] = useState<string | null>(null);

  const handleAcceptConfirm = async () => {
    if (!acceptingOffer) return;
    setIsAccepting(true);
    setAcceptError(null);

    try {
      const res = await fetch(`/api/offers/${acceptingOffer.id}/accept`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to accept offer");

      // Redirect to match page
      window.location.href = `/${locale}/work/${data.engagement.id}`;
    } catch (err: unknown) {
      setAcceptError(
        err instanceof Error ? err.message : "Error accepting offer"
      );
      setIsAccepting(false);
    }
  };

  const handleRejectConfirm = async () => {
    if (!rejectingOffer) return;
    setIsRejecting(true);
    setRejectError(null);

    try {
      const res = await fetch(`/api/offers/${rejectingOffer.id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rejectionCode,
          rejectionNote: rejectionNote || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to reject offer");

      setOffers((prev) =>
        prev.map((o) =>
          o.id === rejectingOffer.id ? { ...o, status: "REJECTED" } : o
        )
      );
      setRejectingOffer(null);
    } catch (err: unknown) {
      setRejectError(
        err instanceof Error ? err.message : "Error rejecting offer"
      );
    } finally {
      setIsRejecting(false);
    }
  };

  return (
    <div className="space-y-6">
      {offers.length === 0 ? (
        <div className="rounded-3xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-base)]/70 backdrop-blur-xl p-8 sm:p-12 text-center shadow-sm">
          <EmptyState
            title={isTr ? "Henüz teklif alınmadı" : "No received offers yet"}
            description={
              isTr
                ? "İlanlarınıza teklif geldiğinde bu ekranda listelenecektir."
                : "Offers submitted to your listings will appear here."
            }
            action={
              <Link href={`/${locale}/dashboard/listings`}>
                <Button variant="secondary">
                  {isTr ? "İlanlarımı İncele" : "View My Listings"}
                </Button>
              </Link>
            }
          />
        </div>
      ) : (
        <div className="space-y-4">
          {offers.map((offer) => {
            const dateStr = new Date(offer.createdAt).toLocaleDateString(
              isTr ? "tr-TR" : "en-US"
            );

            return (
              <div
                key={offer.id}
                className="rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-base)]/70 backdrop-blur-xl p-6 sm:p-7 space-y-4 shadow-sm transition-all duration-300 hover:border-blue-500/30 hover:shadow-lg"
              >
                {/* Header: Offeror details and status */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-border-subtle)] pb-3">
                  <Link
                    href={`/${locale}/u/${offer.offerorHandle}`}
                    className="flex items-center gap-3 hover:opacity-80 transition-opacity"
                  >
                    <AvatarInitials name={offer.offerorDisplayName} size="sm" />
                    <div>
                      <div className="text-sm font-semibold text-[var(--color-text-primary)]">
                        {offer.offerorDisplayName}
                      </div>
                      <div className="text-xs text-[var(--color-text-tertiary)]">
                        @{offer.offerorHandle}
                      </div>
                    </div>
                  </Link>

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
                    <span className="text-xs text-[var(--color-text-tertiary)]">
                      {dateStr}
                    </span>
                  </div>
                </div>

                {/* Listing Reference */}
                <div className="text-xs text-[var(--color-text-secondary)]">
                  <span className="font-semibold text-[var(--color-text-primary)]">
                    {isTr ? "İlan:" : "Project:"}
                  </span>{" "}
                  {offer.listingTitle}
                </div>

                {/* Proposal Message */}
                <div className="rounded-lg bg-[var(--color-surface-hover)] p-4 text-xs text-[var(--color-text-secondary)] leading-relaxed whitespace-pre-wrap">
                  {offer.message}
                </div>

                {/* Budget & Timeline */}
                <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
                  <div className="flex items-center gap-4 text-xs text-[var(--color-text-tertiary)]">
                    {offer.budgetMin && (
                      <span>
                        <strong>{isTr ? "Bütçe:" : "Budget:"}</strong> {offer.budgetMin}{" "}
                        {offer.budgetMax ? `– ${offer.budgetMax}` : ""}{" "}
                        {offer.budgetCurrency}
                      </span>
                    )}
                    {offer.estimatedDurationValue && (
                      <span>
                        <strong>{isTr ? "Süre:" : "Timeline:"}</strong> ~
                        {offer.estimatedDurationValue} {offer.estimatedDurationUnit}
                      </span>
                    )}
                  </div>

                  {/* Actions for PENDING offers */}
                  {offer.status === "PENDING" && (
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setRejectingOffer(offer)}
                        className="text-[var(--color-danger)] hover:bg-[var(--color-danger)]/10"
                      >
                        {isTr ? "Reddet" : "Reject"}
                      </Button>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => setAcceptingOffer(offer)}
                      >
                        {isTr ? "Teklifi Kabul Et" : "Accept Offer"}
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Acceptance Modal */}
      {acceptingOffer && (
        <Dialog
          isOpen={true}
          onClose={() => setAcceptingOffer(null)}
          title={isTr ? "Teklifi Kabul Et ve Eşleş" : "Accept Offer & Match"}
          description={
            isTr
              ? `"${acceptingOffer.offerorDisplayName}" kullanıcısının teklifini kabul etmek üzeresiniz.`
              : `You are about to accept the proposal from ${acceptingOffer.offerorDisplayName}.`
          }
        >
          <div className="space-y-4">
            {acceptError && (
              <div className="rounded-md border border-[var(--color-danger)]/20 bg-[var(--color-danger)]/10 p-3 text-xs text-[var(--color-danger)]">
                {acceptError}
              </div>
            )}

            <div className="rounded-2xl border border-blue-500/20 bg-blue-500/5 p-4 text-xs leading-relaxed text-[var(--color-text-secondary)] space-y-2">
              <p className="font-semibold text-[var(--color-text-primary)]">
                {isTr ? "Önemli Eşleştirme ve Sorumluluk Hatırlatması:" : "Important Matching Notice:"}
              </p>
              <p>
                {isTr
                  ? "Bu işlem ilanın diğer tüm bekleyen tekliflerini otomatik olarak reddeder ve karşı taraf ile doğrulanmış iletişim kanallarınızı paylaşır. Platform ödeme almaz, emanet (escrow) sağlamaz ve sözleşmesel güvence vermez. Tüm çalışma ve ödeme şartlarını doğrudan karşı tarafla yazılı olarak belirleyiniz."
                  : "This action will reject all other pending offers and reveal verified contact channels. The platform provides no escrow, payment holding, or contract enforcement."}
              </p>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button
                variant="ghost"
                onClick={() => setAcceptingOffer(null)}
                disabled={isAccepting}
              >
                {isTr ? "Vazgeç" : "Cancel"}
              </Button>
              <Button
                variant="primary"
                onClick={handleAcceptConfirm}
                isLoading={isAccepting}
              >
                {isTr ? "Onayla ve Eşleş" : "Confirm & Match"}
              </Button>
            </div>
          </div>
        </Dialog>
      )}

      {/* Rejection Modal */}
      {rejectingOffer && (
        <Dialog
          isOpen={true}
          onClose={() => setRejectingOffer(null)}
          title={isTr ? "Teklifi Reddet" : "Reject Offer"}
          description={
            isTr
              ? "Teklifi reddetme gerekçenizi seçebilir ve isteğe bağlı bir açıklama ekleyebilirsiniz."
              : "Select a reason for rejecting this offer with an optional note."
          }
        >
          <div className="space-y-4">
            {rejectError && (
              <div className="rounded-md border border-[var(--color-danger)]/20 bg-[var(--color-danger)]/10 p-3 text-xs text-[var(--color-danger)]">
                {rejectError}
              </div>
            )}

            <Select
              label={isTr ? "Reddetme Gerekçesi" : "Rejection Reason"}
              value={rejectionCode}
              onChange={(e) => setRejectionCode(e.target.value)}
              options={[
                { value: "BUDGET_MISMATCH", label: isTr ? "Bütçe Uyuşmazlığı" : "Budget Mismatch" },
                { value: "TIMELINE_MISMATCH", label: isTr ? "Zamanlama Uyuşmazlığı" : "Timeline Mismatch" },
                { value: "SCOPE_MISMATCH", label: isTr ? "Kapsam / Yetkinlik Uyuşmazlığı" : "Scope Mismatch" },
                { value: "OTHER", label: isTr ? "Diğer" : "Other" },
              ]}
            />

            <TextArea
              label={isTr ? "Açıklama (İsteğe Bağlı)" : "Note (Optional)"}
              value={rejectionNote}
              onChange={(e) => setRejectionNote(e.target.value)}
              placeholder={isTr ? "Teklif sahibine özel açıklama..." : "Private note to offeror..."}
              maxLength={500}
              showCount
              rows={3}
            />

            <div className="flex justify-end gap-3 pt-2">
              <Button
                variant="ghost"
                onClick={() => setRejectingOffer(null)}
                disabled={isRejecting}
              >
                {isTr ? "İptal" : "Cancel"}
              </Button>
              <Button
                variant="secondary"
                onClick={handleRejectConfirm}
                isLoading={isRejecting}
              >
                {isTr ? "Reddi Onayla" : "Confirm Rejection"}
              </Button>
            </div>
          </div>
        </Dialog>
      )}
    </div>
  );
}
