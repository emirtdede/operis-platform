import Link from "next/link";
import { Clock, ArrowUpRight, CheckCircle2 } from "lucide-react";
import { AvatarInitials } from "../ui/avatar-initials";
import { Badge } from "../ui/badge";

export interface ListingCardProps {
  id: string;
  slug: string;
  title: string;
  summary: string;
  categoryName: string;
  budgetMode: string;
  budgetCurrency: string | null;
  budgetMin: string | null;
  budgetMax: string | null;
  timelineMode: string;
  targetDate: string | null;
  timelineValue: number | null;
  timelineUnit: string | null;
  ownerHandle: string;
  ownerDisplayName: string;
  firstPublishedAt: Date | string;
  lastActivatedAt: Date | string;
  activeUntil: Date | string;
  activationSeq: number;
  locale: string;
}

export function ListingCard({
  slug,
  title,
  summary,
  categoryName,
  budgetMode,
  budgetCurrency,
  budgetMin,
  budgetMax,
  timelineValue,
  timelineUnit,
  ownerHandle,
  ownerDisplayName,
  firstPublishedAt,
  activeUntil,
  activationSeq,
  locale,
}: ListingCardProps) {
  const isTr = locale === "tr";

  // Calculate remaining active days
  const now = new Date();
  const until = new Date(activeUntil);
  const diffMs = until.getTime() - now.getTime();
  const diffDays = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));

  // Format first published date
  const firstDate = new Date(firstPublishedAt);
  const formattedFirstDate = new Intl.DateTimeFormat(isTr ? "tr-TR" : "en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(firstDate);

  // Budget label formatting
  let budgetLabel = isTr ? "Belirtilmedi" : "Not specified";
  if (budgetMin && budgetMax) {
    budgetLabel = `${parseFloat(budgetMin).toLocaleString(isTr ? "tr-TR" : "en-US")} – ${parseFloat(budgetMax).toLocaleString(isTr ? "tr-TR" : "en-US")} ${budgetCurrency ?? ""}`;
  } else if (budgetMin) {
    budgetLabel = `${isTr ? "Min" : "From"} ${parseFloat(budgetMin).toLocaleString(isTr ? "tr-TR" : "en-US")} ${budgetCurrency ?? ""}`;
  } else if (budgetMode === "NEGOTIABLE") {
    budgetLabel = isTr ? "Görüşülebilir" : "Negotiable";
  }

  // Timeline label formatting
  let timelineLabel: string | null = null;
  if (timelineValue && timelineUnit) {
    const unitLabel =
      timelineUnit === "DAYS"
        ? isTr ? "gün" : "days"
        : timelineUnit === "WEEKS"
        ? isTr ? "hafta" : "weeks"
        : isTr ? "ay" : "months";
    timelineLabel = `~${timelineValue} ${unitLabel}`;
  }

  return (
    <article className="group relative overflow-hidden rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-base)]/75 p-6 backdrop-blur-xl transition-all duration-300 hover:-translate-y-0.5 hover:border-blue-500/40 hover:shadow-xl hover:shadow-blue-500/5">
      <div className="flex flex-col gap-4">
        {/* Top Header: Category Badge & Freshness Indicator */}
        <div className="flex items-center justify-between gap-2 text-xs">
          <Badge variant="secondary" className="font-medium bg-blue-500/10 text-blue-400 border-blue-500/20">
            {categoryName}
          </Badge>
          
          <div className="flex items-center gap-1.5 font-medium text-[var(--color-text-secondary)]">
            <span className={`h-2 w-2 rounded-full ${diffDays > 0 ? "bg-cyan-500 animate-pulse" : "bg-red-500"}`} />
            <span>
              {diffDays > 0
                ? isTr
                  ? `${diffDays} gün aktif`
                  : `Active for ${diffDays} days`
                : isTr
                ? "Süresi doldu"
                : "Expired"}
            </span>
          </div>
        </div>

        {/* Title */}
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-lg font-bold leading-snug text-[var(--color-text-primary)] group-hover:text-blue-400 transition-colors">
            <Link href={isTr ? `/tr/ilanlar/${slug}` : `/en/listings/${slug}`} className="focus:outline-none">
              <span className="absolute inset-0" aria-hidden="true" />
              {title}
            </Link>
          </h3>
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[var(--color-surface-hover)] text-[var(--color-text-tertiary)] group-hover:bg-blue-500/10 group-hover:text-blue-400 transition-colors">
            <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
          </div>
        </div>

        {/* Summary Description */}
        <p className="line-clamp-2 text-xs sm:text-sm text-[var(--color-text-secondary)] leading-relaxed">
          {summary}
        </p>

        {/* Commercial Metadata Badges */}
        <div className="flex flex-wrap items-center gap-4 text-xs pt-1">
          <div className="inline-flex items-center gap-2 rounded-lg bg-[var(--color-surface-hover)] px-3 py-1.5 text-[var(--color-text-primary)] font-mono font-medium">
            <span className="text-[var(--color-text-tertiary)] font-sans">
              {isTr ? "Bütçe:" : "Budget:"}
            </span>
            <span className="text-emerald-400">{budgetLabel}</span>
          </div>

          {timelineLabel && (
            <div className="inline-flex items-center gap-2 rounded-lg bg-[var(--color-surface-hover)] px-3 py-1.5 text-[var(--color-text-secondary)]">
              <Clock className="h-3.5 w-3.5 text-cyan-400" aria-hidden="true" />
              <span>{timelineLabel}</span>
            </div>
          )}
        </div>

        {/* Footer: Owner info & first published date */}
        <div className="relative z-10 mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-[var(--color-border-subtle)]/60 pt-4 text-xs text-[var(--color-text-secondary)]">
          <Link
            href={isTr ? `/tr/profil/${ownerHandle}` : `/en/profile/${ownerHandle}`}
            className="flex items-center gap-2.5 hover:text-[var(--color-text-primary)] transition-colors"
          >
            <AvatarInitials name={ownerDisplayName} size="sm" />
            <span className="font-semibold text-[var(--color-text-primary)]">{ownerDisplayName}</span>
          </Link>

          <div className="flex items-center gap-2 text-[var(--color-text-tertiary)]">
            <span>{isTr ? "İlk yayım:" : "Published:"} {formattedFirstDate}</span>
            {activationSeq > 1 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-indigo-500/10 px-2 py-0.5 text-[10px] font-medium text-indigo-400 border border-indigo-500/20">
                <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
                <span>{isTr ? "Yenilendi" : "Reactivated"}</span>
              </span>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
