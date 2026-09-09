"use client";

import { useState } from "react";
import Link from "next/link";
import { Share2, Check } from "lucide-react";
import { Button } from "../ui/button";
import { SubmitOfferModal } from "../offers/submit-offer-modal";
import { getLocalizedRoute } from "@/src/lib/i18n/routes";

export interface ListingDetailActionsProps {
  listingId: string;
  listingTitle: string;
  ownerUserId: string;
  currentUserId?: string;
  isOwner: boolean;
  isActive: boolean;
  locale: string;
}

export function ListingDetailActions({
  listingId,
  listingTitle,
  isOwner,
  isActive,
  locale,
}: ListingDetailActionsProps) {
  const isTr = locale === "tr";
  const [modalOpen, setModalOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopyLink = async () => {
    try {
      if (typeof window !== "undefined") {
        await navigator.clipboard.writeText(window.location.href);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch {
      // Fallback
    }
  };

  const copyButton = (
    <Button
      type="button"
      variant="outline"
      size={isOwner ? "md" : "lg"}
      onClick={handleCopyLink}
      className="gap-2 transition-all"
      aria-label={copied ? (isTr ? "Bağlantı kopyalandı" : "Link copied") : (isTr ? "Bağlantıyı kopyala" : "Copy link")}
    >
      {copied ? (
        <>
          <Check className="h-4 w-4 text-emerald-400" aria-hidden="true" />
          <span className="text-emerald-400 font-semibold">{isTr ? "Kopyalandı" : "Copied"}</span>
        </>
      ) : (
        <>
          <Share2 className="h-4 w-4 text-[var(--color-text-secondary)]" aria-hidden="true" />
          <span>{isTr ? "Bağlantıyı Kopyala" : "Share Link"}</span>
        </>
      )}
    </Button>
  );

  if (isOwner) {
    return (
      <div className="flex flex-wrap items-center gap-3">
        <Link href={`${getLocalizedRoute("dashboardReceivedOffers", locale)}?listingId=${listingId}`}>
          <Button variant="primary">
            {isTr ? "Gelen Teklifleri İncele" : "View Received Offers"}
          </Button>
        </Link>
        <Link href={getLocalizedRoute("dashboardListings", locale)}>
          <Button variant="secondary">
            {isTr ? "İlanı Yönet" : "Manage Listing"}
          </Button>
        </Link>
        {copyButton}
      </div>
    );
  }

  if (!isActive) {
    return (
      <div className="space-y-3">
        <div className="rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-hover)] p-4 text-sm text-[var(--color-text-secondary)]">
          {isTr
            ? "Bu ilanın 7 günlük yayım süresi dolmuştur. Şu anda yeni teklif kabul edilmemektedir."
            : "This listing has expired. It is not currently accepting new offers."}
        </div>
        <div>{copyButton}</div>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button variant="primary" size="lg" onClick={() => setModalOpen(true)}>
        {isTr ? "Birebir Gizli Teklif Ver" : "Submit Private Offer"}
      </Button>
      {copyButton}

      <SubmitOfferModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        listingId={listingId}
        listingTitle={listingTitle}
        locale={locale}
      />
    </div>
  );
}

