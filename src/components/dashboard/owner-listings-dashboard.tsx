"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { EmptyState } from "../ui/empty-state";

export interface OwnerListingItem {
  id: string;
  slug: string;
  title: string;
  status: string;
  budgetMode: string;
  budgetCurrency: string | null;
  budgetMin: string | null;
  budgetMax: string | null;
  firstPublishedAt: string | Date | null;
  lastActivatedAt: string | Date | null;
  activeUntil: string | Date | null;
  activationSeq: number;
}

export interface OwnerListingsDashboardProps {
  initialListings: OwnerListingItem[];
  locale: string;
}

export function OwnerListingsDashboard({
  initialListings,
  locale,
}: OwnerListingsDashboardProps) {
  const isTr = locale === "tr";
  const [listings, setListings] = useState<OwnerListingItem[]>(initialListings);
  const [tab, setTab] = useState<"all" | "active" | "inactive" | "matched">("all");
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const filteredListings = listings.filter((l) => {
    if (tab === "all") return true;
    if (tab === "active") return l.status === "ACTIVE";
    if (tab === "inactive")
      return l.status === "INACTIVE_EXPIRED" || l.status === "INACTIVE_OWNER";
    if (tab === "matched") return l.status === "MATCHED" || l.status === "COMPLETED";
    return true;
  });

  const handleReactivate = async (id: string) => {
    setLoadingId(id);
    setActionError(null);
    try {
      const res = await fetch(`/api/listings/${id}/reactivate`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Reactivation failed");

      setListings((prev) =>
        prev.map((l) => (l.id === id ? { ...l, status: "ACTIVE", activationSeq: l.activationSeq + 1 } : l))
      );
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : "Error reactivating listing");
    } finally {
      setLoadingId(null);
    }
  };

  const handleDeactivate = async (id: string) => {
    setLoadingId(id);
    setActionError(null);
    try {
      const res = await fetch(`/api/listings/${id}/deactivate`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Deactivation failed");

      setListings((prev) =>
        prev.map((l) => (l.id === id ? { ...l, status: "INACTIVE_OWNER" } : l))
      );
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : "Error deactivating listing");
    } finally {
      setLoadingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(isTr ? "Bu ilanı silmek istediğinize emin misiniz?" : "Are you sure you want to delete this listing?")) {
      return;
    }

    setLoadingId(id);
    setActionError(null);
    try {
      const res = await fetch(`/api/listings/${id}/delete`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Deletion failed");

      setListings((prev) => prev.filter((l) => l.id !== id));
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : "Error deleting listing");
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Bar: Status Filter Tabs */}
      <div className="flex items-center gap-1 border-b border-[var(--color-border-subtle)] pb-4 overflow-x-auto">
        {(["all", "active", "inactive", "matched"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`rounded-lg px-3.5 py-1.5 text-xs font-medium transition-all ${
              tab === t
                ? "bg-[var(--color-surface-hover)] text-[var(--color-text-primary)] font-semibold border border-[var(--color-border-subtle)]"
                : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
            }`}
          >
            {t === "all"
              ? isTr ? "Tümü" : "All"
              : t === "active"
              ? isTr ? "Aktif (1 Hafta)" : "Active (1-Week)"
              : t === "inactive"
              ? isTr ? "Pasif / Süresi Dolanlar" : "Inactive / Expired"
              : isTr ? "Eşleşenler" : "Matched"}
          </button>
        ))}
      </div>

      {actionError && (
        <div className="rounded-md border border-[var(--color-danger)]/20 bg-[var(--color-danger)]/10 p-3 text-xs text-[var(--color-danger)]">
          {actionError}
        </div>
      )}

      {/* Listings Table / Cards */}
      {filteredListings.length === 0 ? (
        <div className="rounded-3xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-base)]/70 backdrop-blur-xl p-8 sm:p-12 text-center shadow-sm">
          {tab === "inactive" ? (
            <EmptyState
              title={isTr ? "Süresi Dolan veya Pasif İlan Yok" : "No Inactive or Expired Listings"}
              description={
                isTr
                  ? "Süresi dolmuş veya durdurulmuş bir ilanınız bulunmuyor. Aktif ilanlarınızı 'Aktif' sekmesinden inceleyebilirsiniz."
                  : "You have no expired or paused listings. Check active listings to see your live projects."
              }
              action={
                <Button variant="secondary" onClick={() => setTab("active")}>
                  {isTr ? "Aktif İlanları Gör" : "View Active Listings"}
                </Button>
              }
            />
          ) : tab === "matched" ? (
            <EmptyState
              title={isTr ? "Eşleşen İlan Bulunmuyor" : "No Matched Listings"}
              description={
                isTr
                  ? "Henüz bir bağımsız profesyonelle eşleşen projeniz yok. İlanlarınıza gelen teklifleri 'Gelen Teklifler' alanından değerlendirebilirsiniz."
                  : "No listings have matched with a professional yet. Review proposals in incoming offers."
              }
              action={
                <Link href={isTr ? "/tr/panel/teklifler/gelen" : "/en/dashboard/offers/received"}>
                  <Button variant="secondary">
                    {isTr ? "Gelen Teklifleri İncele" : "Review Incoming Offers"}
                  </Button>
                </Link>
              }
            />
          ) : tab === "active" ? (
            <EmptyState
              title={isTr ? "Aktif Proje İlanı Bulunmuyor" : "No Active Listings"}
              description={
                isTr
                  ? "Şu anda radarımızda canlı olan bir ilanınız yok. Yeni bir proje ilanı yayınlayarak bağımsız mühendislerden doğrudan teklif alabilirsiniz."
                  : "You currently have no active listings on our radar. Post a listing to get direct proposals."
              }
              action={
                <Link href={isTr ? "/tr/ilanlar/yeni" : "/en/listings/new"}>
                  <Button variant="primary">
                    {isTr ? "Yeni İlan Yayınla" : "Publish Listing"}
                  </Button>
                </Link>
              }
            />
          ) : (
            <EmptyState
              title={isTr ? "Henüz Bir Proje İlanı Yayınlamadınız" : "You Haven't Published Any Listings Yet"}
              description={
                isTr
                  ? "%100 komisyonsuz ve doğrudan iletişimle projeniz için bağımsız mühendis arayışınızı hemen başlatabilirsiniz."
                  : "Start finding independent engineers directly with 0% commission cut."
              }
              action={
                <Link href={isTr ? "/tr/ilanlar/yeni" : "/en/listings/new"}>
                  <Button variant="primary">
                    {isTr ? "+ İlk İlanınızı Yayınlayın" : "+ Post Your First Listing"}
                  </Button>
                </Link>
              }
            />
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredListings.map((listing) => {
            const firstDate = listing.firstPublishedAt
              ? new Date(listing.firstPublishedAt).toLocaleDateString(isTr ? "tr-TR" : "en-US")
              : "—";

            return (
              <div
                key={listing.id}
                className="flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-base)]/70 backdrop-blur-xl p-5 sm:p-6 transition-all duration-300 hover:border-blue-500/30 hover:shadow-lg hover:shadow-blue-500/5 hover:-translate-y-0.5"
              >
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={
                        listing.status === "ACTIVE"
                          ? "primary"
                          : listing.status === "MATCHED"
                          ? "secondary"
                          : "outline"
                      }
                      size="sm"
                    >
                      {listing.status}
                    </Badge>
                    <span className="text-xs text-[var(--color-text-tertiary)]">
                      {isTr ? "İlk Yayım:" : "Published:"} {firstDate}
                    </span>
                    {listing.activationSeq > 1 && (
                      <span className="text-xs text-[var(--color-text-tertiary)] font-mono">
                        (Seq #{listing.activationSeq})
                      </span>
                    )}
                  </div>

                  <h3 className="text-base font-semibold text-[var(--color-text-primary)]">
                    <Link
                      href={`/${locale}/listings/${listing.slug}`}
                      className="hover:underline"
                    >
                      {listing.title}
                    </Link>
                  </h3>
                </div>

                {/* Actions */}
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href={`/${locale}/dashboard/offers/received?listingId=${listing.id}`}
                  >
                    <Button variant="secondary" size="sm">
                      {isTr ? "Teklifler" : "Offers"}
                    </Button>
                  </Link>

                  {listing.status === "ACTIVE" ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeactivate(listing.id)}
                      disabled={loadingId === listing.id}
                    >
                      {isTr ? "Durdur" : "Deactivate"}
                    </Button>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleReactivate(listing.id)}
                      disabled={loadingId === listing.id}
                    >
                      {isTr ? "Yeniden Başlat (1 Hafta)" : "Reactivate (1-Week)"}
                    </Button>
                  )}

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(listing.id)}
                    disabled={loadingId === listing.id}
                    className="text-[var(--color-danger)] hover:bg-[var(--color-danger)]/10"
                  >
                    {isTr ? "Sil" : "Delete"}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
