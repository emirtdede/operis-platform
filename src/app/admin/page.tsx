import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import {
  Layers,
  Clock,
  Send,
  Handshake,
  AlertTriangle,
  UserX,
  Inbox,
  ShieldCheck,
  Activity,
  ArrowLeft,
} from "lucide-react";
import { AdminService } from "@/src/modules/admin/service";
import { ModerationService } from "@/src/modules/moderation/service";
import { Badge } from "@/src/components/ui/badge";
import { Button } from "@/src/components/ui/button";

export const metadata: Metadata = {
  title: "Yönetim & Moderasyon Merkezi | Operis",
  description: "Operis operasyonel yönetim, moderasyon merkezi ve idari denetim izleme konsolu.",
  robots: {
    index: false,
    follow: false,
  },
};

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage({
  searchParams,
}: {
  searchParams?: Promise<{ lang?: string }>;
}) {
  const sp = searchParams ? await searchParams : {};
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get("NEXT_LOCALE")?.value || cookieStore.get("fp_locale")?.value;
  const effectiveLocale = sp.lang === "tr" || sp.lang === "en" ? sp.lang : (cookieLocale === "en" ? "en" : "tr");
  const isTr = effectiveLocale === "tr";
  const locale = isTr ? "tr" : "en";

  let metrics = {
    activeListings: 0,
    expiredListingsLast24h: 0,
    offersLast24h: 0,
    matchesLast24h: 0,
    openReports: 0,
    suspendedUsers: 0,
    deadLetters: 0,
  };

  let openReports: Array<Record<string, unknown>> = [];
  let auditLogs: Array<Record<string, unknown>> = [];

  try {
    metrics = await AdminService.getDashboardMetrics();
    openReports = await ModerationService.getReports("open");
    auditLogs = await AdminService.getAuditLogs(20);
  } catch {
    // Graceful fallback for unconfigured database in local/preview environments
  }

  const statCards = [
    {
      label: isTr ? "Aktif İlanlar" : "Active Listings",
      hint: isTr ? "7 günlük radarda canlı ilanlar" : "Currently live on 7-day radar",
      value: metrics.activeListings,
      icon: Layers,
      color: "text-blue-500",
    },
    {
      label: isTr ? "Süresi Dolanlar (24s)" : "Expired (Last 24h)",
      hint: isTr ? "168 saat sınırında otomatik devredildi" : "Auto-transitioned at 168h mark",
      value: metrics.expiredListingsLast24h,
      icon: Clock,
      color: "text-amber-500",
    },
    {
      label: isTr ? "Teklifler (Son 24s)" : "Offers (Last 24h)",
      hint: isTr ? "Şifrelenmiş birebir teklifler" : "Encrypted 1-to-1 proposals",
      value: metrics.offersLast24h,
      icon: Send,
      color: "text-purple-500",
    },
    {
      label: isTr ? "Eşleşmeler (24s)" : "Matches (Last 24h)",
      hint: isTr ? "Oluşturulan doğrudan çalışma alanları" : "Bilateral collaborations formed",
      value: metrics.matchesLast24h,
      icon: Handshake,
      color: "text-emerald-500",
    },
    {
      label: isTr ? "Açık Şikayetler" : "Open Abuse Reports",
      hint: isTr ? "İnceleme bekleyen bildirimler" : "Pending moderator review",
      value: metrics.openReports,
      icon: AlertTriangle,
      color: "text-red-500",
    },
    {
      label: isTr ? "Askıya Alınanlar" : "Suspended Users",
      hint: isTr ? "Güvenlik yaptırımı uygulanan hesaplar" : "Safety enforcement actions",
      value: metrics.suspendedUsers,
      icon: UserX,
      color: "text-rose-500",
    },
    {
      label: isTr ? "İletilemeyen Olaylar" : "Dead Outbox Events",
      hint: isTr ? "Kuyrukta bekleyen arkaplan görevleri" : "Undelivered background jobs",
      value: metrics.deadLetters,
      icon: Inbox,
      color: "text-orange-500",
    },
  ];

  return (
    <main className="min-h-screen bg-[var(--bg-canvas)] text-[var(--text-primary)] p-6 sm:p-10 space-y-8">
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--color-border-subtle)] pb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">
              {isTr ? "Operis Yönetim Konsolu" : "Operis Admin Console"}
            </h1>
            <Badge variant="outline">{isTr ? "Yetkili Girişi" : "Restricted"}</Badge>
          </div>
          <p className="text-xs text-[var(--color-text-secondary)] mt-1">
            {isTr
              ? "Operasyonel yönetim, moderasyon merkezi ve idari denetim izleme. Kişisel veriler en aza indirilmiştir."
              : "Operational dashboard and moderation center. PII is strictly minimized by default."}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href={`/admin?lang=${isTr ? "en" : "tr"}`}
            className="text-xs px-3 py-1.5 rounded-xl border border-[var(--color-border-subtle)] hover:bg-[var(--color-surface-hover)] font-medium transition-colors"
          >
            {isTr ? "English (EN)" : "Türkçe (TR)"}
          </Link>
          <Link href={`/${locale}`}>
            <Button variant="secondary" size="sm" className="gap-2">
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              <span>{isTr ? "Siteye Dön" : "Return to Site"}</span>
            </Button>
          </Link>
        </div>
      </header>

      {/* Operational Metrics Cards */}
      <section aria-label={isTr ? "Platform Operasyonel Metrikleri" : "Platform Operational Metrics"} className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className="rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-base)] p-5 space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs text-[var(--color-text-secondary)] font-medium">
                  {card.label}
                </span>
                <Icon className={`h-4 w-4 ${card.color}`} aria-hidden="true" />
              </div>
              <div className="text-2xl font-bold tracking-tight text-[var(--color-text-primary)]">
                {card.value}
              </div>
              <p className="text-[11px] text-[var(--color-text-tertiary)] truncate">
                {card.hint}
              </p>
            </div>
          );
        })}
      </section>

      {/* Main Grid: Open Reports & Audit Log */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Open Reports Section */}
        <section
          aria-label={isTr ? "Açık İhlal Bildirimleri" : "Open Abuse Reports"}
          className="rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-base)] p-6 space-y-4"
        >
          <div className="flex items-center justify-between border-b border-[var(--color-border-subtle)] pb-3">
            <h2 className="text-base font-bold flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" aria-hidden="true" />
              <span>{isTr ? "Açık İhlal Bildirimleri" : "Open Abuse Reports"}</span>
            </h2>
            <Badge variant="secondary">{openReports.length}</Badge>
          </div>

          {openReports.length === 0 ? (
            <div className="p-8 text-center text-xs text-[var(--color-text-tertiary)] flex flex-col items-center justify-center gap-2">
              <ShieldCheck className="h-8 w-8 text-emerald-500/50" aria-hidden="true" />
              <span>
                {isTr
                  ? "Açık ihlal veya şikayet kaydı bulunmuyor. Tüm moderasyon kuyrukları temiz."
                  : "No open abuse reports. All moderation queues are clear."}
              </span>
            </div>
          ) : (
            <div className="space-y-3 max-h-[400px] overflow-y-auto">
              {openReports.map((report) => (
                <div
                  key={report.id as string}
                  className="rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-hover)] p-3 text-xs space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">{report.reasonCode as string}</span>
                    <Badge variant="outline" size="sm">
                      {report.targetType as string}
                    </Badge>
                  </div>
                  <p className="text-[var(--color-text-secondary)]">
                    {(report.details as string) || (isTr ? "Ek açıklama girilmedi." : "No extra details provided.")}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Audit Log Section */}
        <section
          aria-label={isTr ? "İdari Denetim Günlüğü" : "Administrative Audit Log"}
          className="rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-base)] p-6 space-y-4"
        >
          <div className="flex items-center justify-between border-b border-[var(--color-border-subtle)] pb-3">
            <h2 className="text-base font-bold flex items-center gap-2">
              <Activity className="h-4 w-4 text-blue-500" aria-hidden="true" />
              <span>{isTr ? "İdari Denetim Günlüğü" : "Administrative Audit Log"}</span>
            </h2>
            <Badge variant="secondary">{auditLogs.length}</Badge>
          </div>

          {auditLogs.length === 0 ? (
            <div className="p-8 text-center text-xs text-[var(--color-text-tertiary)]">
              {isTr ? "Kayıtlı idari işlem kaydı bulunmuyor." : "No recent audit records recorded."}
            </div>
          ) : (
            <div className="space-y-3 max-h-[400px] overflow-y-auto font-mono text-xs">
              {auditLogs.map((log) => (
                <div
                  key={log.id as string}
                  className="rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-hover)] p-3 space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-[var(--color-text-primary)]">
                      {log.action as string}
                    </span>
                    <span className="text-[var(--color-text-tertiary)] text-[10px]">
                      {new Date(log.createdAt as string).toISOString()}
                    </span>
                  </div>
                  <div className="text-[var(--color-text-secondary)]">
                    {isTr ? "Hedef:" : "Target:"} {log.targetType as string} ({log.targetId as string})
                  </div>
                  <div className="text-[var(--color-text-tertiary)] text-[11px]">
                    {isTr ? "Gerekçe:" : "Reason:"} {log.reason as string}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
