"use client";

import { useState } from "react";
import Link from "next/link";
import { Bell, Inbox, Send, Handshake, CheckCheck } from "lucide-react";
import { Button } from "../ui/button";
import { EmptyState } from "../ui/empty-state";

export interface NotificationItem {
  id: string;
  type: string;
  payloadJson: any;
  readAt: string | Date | null;
  createdAt: string | Date;
}

export interface NotificationsViewProps {
  initialNotifications: NotificationItem[];
  locale: string;
}

export function NotificationsView({ initialNotifications, locale }: NotificationsViewProps) {
  const isTr = locale === "tr";
  const [notifications, setNotifications] = useState<NotificationItem[]>(initialNotifications);
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [isMarkingAll, setIsMarkingAll] = useState(false);

  const filtered = notifications.filter((n) => {
    if (filter === "unread") return !n.readAt;
    return true;
  });

  const unreadCount = notifications.filter((n) => !n.readAt).length;

  const handleMarkAllRead = async () => {
    setIsMarkingAll(true);
    try {
      await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "markAllRead" }),
      });

      setNotifications((prev) =>
        prev.map((n) => ({ ...n, readAt: new Date().toISOString() }))
      );
    } catch {
      // Fallback
    } finally {
      setIsMarkingAll(false);
    }
  };

  const handleMarkSingleRead = async (id: string) => {
    try {
      await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationId: id }),
      });

      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, readAt: new Date().toISOString() } : n))
      );
    } catch {
      // Fallback
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "OFFER_RECEIVED":
        return <Inbox className="h-4 w-4 text-purple-400" />;
      case "OFFER_ACCEPTED":
      case "MATCHED":
        return <Handshake className="h-4 w-4 text-emerald-400" />;
      case "OFFER_REJECTED":
        return <Send className="h-4 w-4 text-amber-400" />;
      default:
        return <Bell className="h-4 w-4 text-blue-400" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Action Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-border-subtle)] pb-4">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setFilter("all")}
            className={`rounded-xl px-3.5 py-1.5 text-xs font-medium transition-colors ${
              filter === "all"
                ? "bg-[var(--color-surface-hover)] text-[var(--color-text-primary)] font-semibold shadow-sm"
                : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
            }`}
          >
            {isTr ? "Tümü" : "All"} ({notifications.length})
          </button>
          <button
            type="button"
            onClick={() => setFilter("unread")}
            className={`rounded-xl px-3.5 py-1.5 text-xs font-medium transition-colors ${
              filter === "unread"
                ? "bg-[var(--color-surface-hover)] text-[var(--color-text-primary)] font-semibold shadow-sm"
                : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
            }`}
          >
            {isTr ? "Okunmamış" : "Unread"} ({unreadCount})
          </button>
        </div>

        {unreadCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleMarkAllRead}
            isLoading={isMarkingAll}
            className="gap-1.5 text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
          >
            <CheckCheck className="h-3.5 w-3.5" aria-hidden="true" />
            <span>{isTr ? "Tümünü Okundu İşaretle" : "Mark All as Read"}</span>
          </Button>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-3xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-base)]/70 backdrop-blur-xl p-8 sm:p-12 text-center shadow-sm">
          <EmptyState
            title={isTr ? "Henüz Bir Bildiriminiz Yok" : "No Notifications Yet"}
            description={
              isTr
                ? "Projelerinize teklif geldiğinde, teklifleriniz sonuçlandığında veya takip ettiğiniz kategorilerde yeni ilanlar yayınlandığında burada listelenir."
                : "When you receive offers or matching updates, they will be listed here."
            }
            action={
              <Link href={isTr ? "/tr/ilanlar" : "/en/listings"}>
                <Button variant="secondary" size="md">
                  {isTr ? "İlanları Keşfet" : "Explore Listings"}
                </Button>
              </Link>
            }
          />
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((item) => {
            const isUnread = !item.readAt;
            const dateStr = new Date(item.createdAt).toLocaleString(isTr ? "tr-TR" : "en-US", {
              dateStyle: "medium",
              timeStyle: "short",
            });

            const title = item.payloadJson?.title || (isTr ? "Operis Bildirimi" : "Operis Alert");
            const message = item.payloadJson?.message || "";
            const actionUrl = item.payloadJson?.actionUrl;

            return (
              <div
                key={item.id}
                onClick={() => isUnread && handleMarkSingleRead(item.id)}
                className={`rounded-2xl border p-4 sm:p-5 transition-all duration-300 flex items-start gap-4 ${
                  isUnread
                    ? "border-blue-500/30 bg-blue-500/[0.04] shadow-sm"
                    : "border-[var(--color-border-subtle)] bg-[var(--color-surface-base)]/70 opacity-80 hover:opacity-100"
                }`}
              >
                <div className="h-9 w-9 rounded-xl bg-[var(--color-surface-hover)] border border-[var(--color-border-subtle)] flex items-center justify-center shrink-0 mt-0.5">
                  {getIcon(item.type)}
                </div>

                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-xs sm:text-sm text-[var(--color-text-primary)]">
                        {title}
                      </h3>
                      {isUnread && (
                        <span className="h-2 w-2 rounded-full bg-blue-500 shrink-0" aria-label="Yeni" />
                      )}
                    </div>
                    <span className="text-[11px] text-[var(--color-text-tertiary)] shrink-0">{dateStr}</span>
                  </div>

                  {message && (
                    <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
                      {message}
                    </p>
                  )}

                  {actionUrl && (
                    <div className="pt-2">
                      <Link href={actionUrl}>
                        <Button variant="secondary" size="sm" className="text-xs h-7 px-3">
                          {isTr ? "Detayları Görüntüle →" : "View Details →"}
                        </Button>
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
