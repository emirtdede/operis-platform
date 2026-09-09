"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Briefcase, Send, Inbox, Bell, FolderTree, Settings } from "lucide-react";

export interface DashboardTabsProps {
  locale: string;
  counts?: {
    listings?: number;
    sentOffers?: number;
    receivedOffers?: number;
    notifications?: number;
  };
}

export function DashboardTabs({ locale, counts }: DashboardTabsProps) {
  const pathname = usePathname();
  const isTr = locale === "tr";

  const tabs = [
    {
      id: "listings",
      label: isTr ? "Yayınladığım İlanlar" : "My Published Listings",
      href: isTr ? "/tr/panel/ilanlarim" : "/en/dashboard/listings",
      matchPrefixes: [
        "/tr/panel/ilanlarim",
        "/en/dashboard/listings",
        "/tr/dashboard/listings",
      ],
      icon: Briefcase,
      count: counts?.listings,
    },
    {
      id: "sent-offers",
      label: isTr ? "Teklif Verdiğim İlanlar" : "Listings I Bid On",
      href: isTr ? "/tr/panel/teklifler/gonderilen" : "/en/dashboard/offers/sent",
      matchPrefixes: [
        "/tr/panel/teklifler/gonderilen",
        "/en/dashboard/offers/sent",
        "/tr/dashboard/offers/sent",
      ],
      icon: Send,
      count: counts?.sentOffers,
    },
    {
      id: "received-offers",
      label: isTr ? "Gelen Teklifler" : "Incoming Offers",
      href: isTr ? "/tr/panel/teklifler/gelen" : "/en/dashboard/offers/received",
      matchPrefixes: [
        "/tr/panel/teklifler/gelen",
        "/en/dashboard/offers/received",
        "/tr/dashboard/offers/received",
      ],
      icon: Inbox,
      count: counts?.receivedOffers,
    },
    {
      id: "notifications",
      label: isTr ? "Bildirimler" : "Notifications",
      href: isTr ? "/tr/panel/bildirimler" : "/en/dashboard/notifications",
      matchPrefixes: [
        "/tr/panel/bildirimler",
        "/en/dashboard/notifications",
        "/tr/dashboard/notifications",
      ],
      icon: Bell,
      count: counts?.notifications,
    },
    {
      id: "categories",
      label: isTr ? "Kategorilerim" : "Categories",
      href: isTr ? "/tr/panel/kategorilerim" : "/en/dashboard/categories",
      matchPrefixes: [
        "/tr/panel/kategorilerim",
        "/en/dashboard/categories",
        "/tr/dashboard/categories",
      ],
      icon: FolderTree,
    },
    {
      id: "settings",
      label: isTr ? "Ayarlar" : "Settings",
      href: isTr ? "/tr/panel/ayarlar" : "/en/dashboard/settings",
      matchPrefixes: [
        "/tr/panel/ayarlar",
        "/en/dashboard/settings",
        "/tr/dashboard/settings",
        "/tr/panel/guvenlik",
        "/en/dashboard/security",
      ],
      icon: Settings,
    },
  ];

  return (
    <nav
      aria-label={isTr ? "Panel Sekmeleri" : "Dashboard Navigation"}
      className="flex items-center gap-1.5 p-1.5 rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-base)]/80 backdrop-blur-xl shadow-sm overflow-x-auto scrollbar-none [-ms-overflow-style:none] [scrollbar-width:none]"
    >
      {tabs.map((tab) => {
        const isActive = tab.matchPrefixes.some((prefix) =>
          pathname.startsWith(prefix)
        );
        const Icon = tab.icon;

        return (
          <Link
            key={tab.id}
            href={tab.href}
            className={`flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-medium shrink-0 transition-all ${
              isActive
                ? "bg-blue-600 text-white shadow-md shadow-blue-500/25 font-semibold"
                : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-hover)]"
            }`}
          >
            <Icon className={`h-4 w-4 shrink-0 ${isActive ? "text-white" : "text-[var(--color-text-tertiary)]"}`} aria-hidden="true" />
            <span>{tab.label}</span>
            {typeof tab.count === "number" && (
              <span
                className={`ml-1 px-1.5 py-0.5 rounded-md text-[10px] font-mono ${
                  isActive
                    ? "bg-white/20 text-white font-bold"
                    : "bg-[var(--color-surface-hover)] text-[var(--color-text-tertiary)]"
                }`}
              >
                {tab.count}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
