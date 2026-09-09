"use client";

import { useState } from "react";
import Link from "next/link";
import { Copy, Check } from "lucide-react";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { AvatarInitials } from "../ui/avatar-initials";

export interface MatchDetailsViewProps {
  engagementId: string;
  listingTitle: string;
  category: string;
  matchedAt: string | Date;
  status: string;
  offerMessage: string;
  budgetLabel: string | null;
  timelineLabel: string | null;
  counterparty: {
    userId: string;
    displayName: string;
    handle: string;
    email: string;
    phone: string | null;
  };
  currentUserId: string;
  ownerUserId: string;
  isCompleted: boolean;
  userCompletionStatus?: string | null;
  counterpartyCompletionStatus?: string | null;
  locale: string;
}

export function MatchDetailsView({
  engagementId,
  listingTitle,
  category,
  matchedAt,
  status,
  offerMessage,
  budgetLabel,
  timelineLabel,
  counterparty,
  isCompleted,
  userCompletionStatus,
  counterpartyCompletionStatus,
  locale,
}: MatchDetailsViewProps) {
  const isTr = locale === "tr";
  const [currentStatus, setCurrentStatus] = useState(status);
  const [completed, setCompleted] = useState(isCompleted);
  const [myMark, setMyMark] = useState(userCompletionStatus ?? "NOT_MARKED");
  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<"email" | "phone" | null>(null);

  const handleCopy = async (text: string, field: "email" | "phone") => {
    try {
      if (typeof window !== "undefined") {
        await navigator.clipboard.writeText(text);
        setCopiedField(field);
        setTimeout(() => setCopiedField(null), 2000);
      }
    } catch {
      // Fallback
    }
  };


  const matchedDateStr = new Date(matchedAt).toLocaleDateString(
    isTr ? "tr-TR" : "en-US",
    { year: "numeric", month: "long", day: "numeric" }
  );

  const handleMarkComplete = async () => {
    setIsLoading(true);
    setFeedback(null);
    try {
      const res = await fetch(`/api/work/${engagementId}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "MARKED_COMPLETE" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Completion action failed");

      setMyMark("MARKED_COMPLETE");
      if (data.completed) {
        setCompleted(true);
        setCurrentStatus("COMPLETED");
        setFeedback(
          isTr
            ? "Her iki taraf da tamamlanmayı onayladı! Proje artık profilinizde tamamlanmış iş olarak görünecektir."
            : "Both parties have confirmed completion! This project will now appear on your public profile."
        );
      } else {
        setCurrentStatus("COMPLETION_PENDING");
        setFeedback(
          isTr
            ? "Tamamlandı olarak işaretlediniz. Karşı taraf da onayladığında proje tamamlanmış olarak kaydedilecektir."
            : "You marked the project as complete. Once the other party confirms, it will be finalized."
        );
      }
    } catch (err: unknown) {
      setFeedback(err instanceof Error ? err.message : "Error marking complete");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDispute = async () => {
    setIsLoading(true);
    setFeedback(null);
    try {
      const res = await fetch(`/api/work/${engagementId}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "DISPUTES_COMPLETION" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Dispute action failed");

      setMyMark("DISPUTES_COMPLETION");
      setFeedback(
        isTr
          ? "İşin henüz tamamlanmadığını belirttiniz. Durumu karşı tarafla doğrudan iletişim kurarak çözebilirsiniz."
          : "You indicated that the work is not complete. Please coordinate directly with your counterparty."
      );
    } catch (err: unknown) {
      setFeedback(err instanceof Error ? err.message : "Error reporting dispute");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      {/* Header Container */}
      <div className="rounded-3xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-base)]/70 backdrop-blur-xl p-6 sm:p-8 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Badge variant="secondary">{category}</Badge>
          <div className="flex items-center gap-2 text-xs text-[var(--color-text-tertiary)]">
            <Badge
              variant={
                completed
                  ? "primary"
                  : currentStatus === "COMPLETION_PENDING"
                  ? "secondary"
                  : "outline"
              }
            >
              {completed
                ? isTr ? "Tamamlandı" : "Completed"
                : currentStatus === "COMPLETION_PENDING"
                ? isTr ? "Onay Bekleniyor" : "Completion Pending"
                : isTr ? "Eşleşti / Aktif" : "Matched"}
            </Badge>
            <span>{matchedDateStr}</span>
          </div>
        </div>

        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[var(--color-text-primary)]">
          {listingTitle}
        </h1>
      </div>

      {/* Counterparty Contact Disclosure Card */}
      <div className="rounded-3xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-base)]/70 backdrop-blur-xl p-6 sm:p-8 shadow-sm space-y-6">
        <h2 className="text-lg font-bold text-[var(--color-text-primary)]">
          {isTr ? "Eşleşilen Taraf ve İletişim Kanalları" : "Counterparty & Contact Channels"}
        </h2>

        <div className="flex items-center gap-4 border-b border-[var(--color-border-subtle)] pb-4">
          <AvatarInitials name={counterparty.displayName} size="md" />
          <div>
            <Link
              href={`/${locale}/u/${counterparty.handle}`}
              className="text-base font-semibold text-[var(--color-text-primary)] hover:text-blue-400 transition-colors"
            >
              {counterparty.displayName}
            </Link>
            <div className="text-xs text-[var(--color-text-tertiary)] font-mono">
              @{counterparty.handle}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          {/* Email Channel */}
          <div className="rounded-2xl border border-blue-500/20 bg-blue-500/5 p-4 space-y-2 flex flex-col justify-between">
            <div>
              <span className="text-xs font-semibold text-[var(--color-text-secondary)] block mb-1">
                {isTr ? "Doğrulanmış E-Posta (Temel İletişim)" : "Verified Email"}
              </span>
              <a
                href={`mailto:${counterparty.email}`}
                className="text-sm font-medium text-blue-400 hover:text-blue-300 hover:underline break-all transition-colors"
              >
                {counterparty.email}
              </a>
            </div>
            {counterparty.email && counterparty.email !== "—" && (
              <div className="pt-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleCopy(counterparty.email, "email")}
                  className="gap-1.5 text-xs h-8 cursor-pointer"
                  aria-label={copiedField === "email" ? (isTr ? "E-posta kopyalandı" : "Email copied") : (isTr ? "E-postayı kopyala" : "Copy email")}
                >
                  {copiedField === "email" ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-400" aria-hidden="true" />
                      <span className="text-emerald-400 font-medium">{isTr ? "Kopyalandı" : "Copied"}</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5 text-[var(--color-text-tertiary)]" aria-hidden="true" />
                      <span>{isTr ? "E-Postayı Kopyala" : "Copy Email"}</span>
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>

          {/* Phone Channel */}
          <div className="rounded-2xl border border-blue-500/20 bg-blue-500/5 p-4 space-y-2 flex flex-col justify-between">
            <div>
              <span className="text-xs font-semibold text-[var(--color-text-secondary)] block mb-1">
                {isTr ? "Telefon / WhatsApp" : "Phone / Messaging"}
              </span>
              {counterparty.phone ? (
                <a
                  href={`tel:${counterparty.phone}`}
                  className="text-sm font-medium text-blue-400 hover:text-blue-300 hover:underline transition-colors"
                >
                  {counterparty.phone}
                </a>
              ) : (
                <span className="text-xs text-[var(--color-text-tertiary)] italic">
                  {isTr
                    ? "Telefon paylaşımı kullanıcı tarafından etkinleştirilmemiş."
                    : "Phone sharing was disabled by user in settings."}
                </span>
              )}
            </div>
            {counterparty.phone && (
              <div className="pt-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleCopy(counterparty.phone!, "phone")}
                  className="gap-1.5 text-xs h-8 cursor-pointer"
                  aria-label={copiedField === "phone" ? (isTr ? "Telefon kopyalandı" : "Phone copied") : (isTr ? "Telefonu kopyala" : "Copy phone")}
                >
                  {copiedField === "phone" ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-400" aria-hidden="true" />
                      <span className="text-emerald-400 font-medium">{isTr ? "Kopyalandı" : "Copied"}</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5 text-[var(--color-text-tertiary)]" aria-hidden="true" />
                      <span>{isTr ? "Numarayı Kopyala" : "Copy Phone"}</span>
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Agreed Offer Proposal Summary */}
      <div className="rounded-3xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-base)]/70 backdrop-blur-xl p-6 sm:p-8 shadow-sm space-y-4">
        <h2 className="text-lg font-bold text-[var(--color-text-primary)]">
          {isTr ? "Kabul Edilen Teklif Detayları" : "Accepted Proposal Details"}
        </h2>

        {(budgetLabel || timelineLabel) && (
          <div className="flex flex-wrap items-center gap-6 text-xs text-[var(--color-text-secondary)] border-b border-[var(--color-border-subtle)] pb-3">
            {budgetLabel && (
              <div>
                <strong>{isTr ? "Önerilen Bütçe:" : "Budget:"}</strong> {budgetLabel}
              </div>
            )}
            {timelineLabel && (
              <div>
                <strong>{isTr ? "Tahmini Süre:" : "Timeline:"}</strong> {timelineLabel}
              </div>
            )}
          </div>
        )}

        <div className="rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-hover)]/70 p-5 text-xs text-[var(--color-text-secondary)] leading-relaxed whitespace-pre-wrap">
          {offerMessage}
        </div>
      </div>

      {/* Bilateral Mutual Completion Section */}
      <div className="rounded-3xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-base)]/70 backdrop-blur-xl p-6 sm:p-8 shadow-sm space-y-4">
        <h2 className="text-lg font-bold text-[var(--color-text-primary)]">
          {isTr ? "İş Tamamlanma Teyidi" : "Mutual Completion Confirmation"}
        </h2>

        {feedback && (
          <div className="rounded-lg bg-[var(--color-surface-hover)] p-4 text-xs text-[var(--color-text-primary)] font-medium">
            {feedback}
          </div>
        )}

        {completed ? (
          <div className="rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-hover)] p-4 text-xs text-[var(--color-text-secondary)]">
            {isTr
              ? "Her iki taraf da işin tamamlandığını onaylamıştır. Bu proje genel profillerinizde başarıyla tamamlanan iş olarak listelenmektedir."
              : "Both parties have confirmed completion. This project is now published under completed work on your public profiles."}
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
              {isTr
                ? "İş başarıyla teslim edildiğinde her iki taraf da 'Tamamlandı' olarak işaretlemelidir. İki tarafın karşılıklı teyidi ile proje profillerinizde tamamlanmış iş olarak görünür."
                : "When deliverables are fulfilled, both parties confirm completion. Upon mutual confirmation, the project appears on your public profiles."}
            </p>

            {counterpartyCompletionStatus && (
              <div className="text-xs text-[var(--color-text-secondary)] pt-1">
                <span>{isTr ? "Karşı tarafın onay durumu: " : "Counterparty confirmation status: "}</span>
                <span className="font-semibold text-[var(--color-text-primary)]">
                  {counterpartyCompletionStatus === "MARKED_COMPLETE"
                    ? isTr ? "Tamamlandı olarak onayladı" : "Confirmed completion"
                    : isTr ? "Henüz onaylamadı" : "Pending confirmation"}
                </span>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Button
                variant="primary"
                onClick={handleMarkComplete}
                disabled={isLoading || myMark === "MARKED_COMPLETE"}
                isLoading={isLoading}
              >
                {myMark === "MARKED_COMPLETE"
                  ? isTr ? "Tamamlandı Olarak İşaretlendi" : "Marked Complete"
                  : isTr ? "İşi Tamamlandı Olarak İşaretle" : "Mark as Completed"}
              </Button>

              <Button
                variant="ghost"
                onClick={handleDispute}
                disabled={isLoading}
                className="text-[var(--color-danger)] hover:bg-[var(--color-danger)]/10 text-xs"
              >
                {isTr ? "İş Henüz Tamamlanmadı" : "Work Incomplete"}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Statutory Disclaimer */}
      <div className="rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-hover)] p-4 text-xs text-[var(--color-text-tertiary)] leading-relaxed space-y-1">
        <p className="font-semibold text-[var(--color-text-secondary)]">
          {isTr ? "Sözleşme ve Ödeme Uyarısı:" : "Contract & Payment Warning:"}
        </p>
        <p>
          {isTr
            ? "Yürürlükteki mevzuatın izin verdiği azami ölçüde, bu platform taraflar arasında emanet, ödeme veya sözleşmesel tahsilat hizmeti sağlamaz. Çalışma koşulları ve ödemeler doğrudan taraflar arasında gerçekleştirilmelidir."
            : "To the maximum extent permitted by applicable law, this platform provides no escrow, payment collection, or contract guarantees. Parties are responsible for contracting directly."}
        </p>
      </div>
    </div>
  );
}
