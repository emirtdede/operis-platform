"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Copy,
  Check,
  FileText,
  MessageCircle,
  Calendar,
  Mail,
  Layers,
  Award,
  Send,
  ShieldCheck,
  Quote,
} from "lucide-react";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { AvatarInitials } from "../ui/avatar-initials";
import { ContractDraftModal } from "./contract-draft-modal";
import { getLocalizedProfilePath } from "@/src/lib/i18n/routes";
import { EMOJI_REGEX, validateContentAppropriateness } from "@/src/lib/security/content-moderator";

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
  currentUser?: {
    displayName?: string;
    email?: string;
  };
  currentUserId: string;
  ownerUserId: string;
  isCompleted: boolean;
  userCompletionStatus?: string | null;
  counterpartyCompletionStatus?: string | null;
  initialEndorsements?: Array<{
    id: string;
    authorUserId: string;
    recipientUserId: string;
    content: string;
    projectTitleSnapshot?: string;
    createdAt: Date | string;
    authorDisplayName?: string;
  }>;
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
  currentUser,
  currentUserId,
  ownerUserId,
  isCompleted,
  userCompletionStatus,
  counterpartyCompletionStatus,
  initialEndorsements = [],
  locale,
}: MatchDetailsViewProps) {
  const isTr = locale === "tr";
  const [currentStatus, setCurrentStatus] = useState(status);
  const [completed, setCompleted] = useState(isCompleted);
  const [myMark, setMyMark] = useState(userCompletionStatus ?? "NOT_MARKED");
  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<"email" | "phone" | null>(null);
  const [contractModalOpen, setContractModalOpen] = useState(false);

  // Endorsements state
  const [endorsements, setEndorsements] = useState(initialEndorsements);
  const [endorsementText, setEndorsementText] = useState("");
  const [isSubmittingEndorsement, setIsSubmittingEndorsement] = useState(false);
  const [endorsementFeedback, setEndorsementFeedback] = useState<string | null>(null);

  const existingMyEndorsement = endorsements.find((e) => e.authorUserId === currentUserId);

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

  const matchedDateStr = new Date(matchedAt).toLocaleDateString(isTr ? "tr-TR" : "en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  // Instant Handshake Action URLs
  const cleanPhone = counterparty.phone
    ? counterparty.phone.replace(/[^0-9+]/g, "").replace(/^\+/, "")
    : null;

  const waText = encodeURIComponent(
    isTr
      ? `Merhaba ${counterparty.displayName}, Operis üzerinden '${listingTitle}' ilanımızda eşleştik. Proje detaylarını ve başlangıç takvimini görüşmek isterim.`
      : `Hello ${counterparty.displayName}, we matched on Operis for '${listingTitle}'. I would like to discuss project details and timeline.`
  );
  const waUrl = cleanPhone ? `https://wa.me/${cleanPhone}?text=${waText}` : null;

  const meetTitle = encodeURIComponent(
    isTr
      ? `Operis Tanışma & Proje Başlangıcı: ${listingTitle}`
      : `Operis Kickoff Meeting: ${listingTitle}`
  );
  const meetDetails = encodeURIComponent(
    isTr
      ? `Operis üzerindeki '${listingTitle}' projemiz için 30 dakikalık tanışma ve başlangıç toplantısı.\n\nİş Ortağı: ${counterparty.displayName} (${counterparty.email})\nReferans: OPR-ENG-${engagementId.slice(0, 8).toUpperCase()}`
      : `Kickoff meeting for '${listingTitle}' project on Operis.\n\nCounterparty: ${counterparty.displayName} (${counterparty.email})\nReference: OPR-ENG-${engagementId.slice(0, 8).toUpperCase()}`
  );
  const calendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${meetTitle}&details=${meetDetails}${
    counterparty.email && counterparty.email !== "—"
      ? `&add=${encodeURIComponent(counterparty.email)}`
      : ""
  }`;

  const emailSubject = encodeURIComponent(
    isTr ? `Operis Proje Eşleşmesi: ${listingTitle}` : `Operis Project Match: ${listingTitle}`
  );
  const emailBody = encodeURIComponent(
    isTr
      ? `Merhaba ${counterparty.displayName},\n\nOperis üzerinden '${listingTitle}' projemizde eşleştik.\n\nProje detaylarını, teknik mimariyi ve teslimat aşamalarını netleştirmek adına iletişime geçmek istedim.\n\nİyi çalışmalar dilerim.`
      : `Hello ${counterparty.displayName},\n\nWe successfully matched on Operis for '${listingTitle}'.\n\nI would like to connect to coordinate scope, technical requirements, and delivery milestones.\n\nBest regards.`
  );
  const mailUrl =
    counterparty.email && counterparty.email !== "—"
      ? `mailto:${counterparty.email}?subject=${emailSubject}&body=${emailBody}`
      : null;

  const handleMarkComplete = async () => {
    setIsLoading(true);
    setFeedback(null);
    try {
      const res = await fetch(`/api/work/${engagementId}/complete`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-locale": locale,
        },
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
      } else if (data.disputed) {
        setCurrentStatus("DISPUTED");
        setFeedback(
          isTr
            ? "Tamamlama itirazı mevcut. Durumu karşı tarafla doğrudan iletişim kurarak çözebilirsiniz."
            : "A completion dispute exists. Please coordinate directly with your counterparty."
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
        headers: {
          "Content-Type": "application/json",
          "x-locale": locale,
        },
        body: JSON.stringify({ action: "DISPUTES_COMPLETION" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Dispute action failed");

      setMyMark("DISPUTES_COMPLETION");
      setCurrentStatus("DISPUTED");
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

  const handleSubmitEndorsement = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanText = endorsementText.trim();
    if (!cleanText) return;

    if (cleanText.length < 20) {
      setEndorsementFeedback(
        isTr
          ? "Tavsiye notu en az 20 karakter olmalıdır."
          : "Endorsement must be at least 20 characters."
      );
      return;
    }

    if (EMOJI_REGEX.test(cleanText)) {
      setEndorsementFeedback(
        isTr
          ? "Tavsiye notu emoji içeremez. Lütfen profesyonel metin kullanınız."
          : "Endorsement cannot contain emojis. Please use plain text."
      );
      return;
    }

    if (!validateContentAppropriateness(cleanText).isValid) {
      setEndorsementFeedback(
        isTr
          ? "Tavsiye notunuz topluluk kurallarına aykırı veya uygunsuz ifadeler içeriyor."
          : "Endorsement contains inappropriate or prohibited language."
      );
      return;
    }

    setIsSubmittingEndorsement(true);
    setEndorsementFeedback(null);

    try {
      const res = await fetch(`/api/work/${engagementId}/endorse`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-locale": locale,
        },
        body: JSON.stringify({ content: cleanText, locale }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || (isTr ? "Tavsiye notu kaydedilemedi." : "Failed to record endorsement."));
      }

      setEndorsements((prev) => [...prev, data.endorsement]);
      setEndorsementText("");
      setEndorsementFeedback(
        isTr
          ? "Doğrulanmış tavsiye mektubunuz başarıyla kaydedildi ve iş ortağınızın profiline işlendi!"
          : "Your verified endorsement has been recorded and published on your counterparty's profile!"
      );
    } catch (err: unknown) {
      setEndorsementFeedback(
        err instanceof Error
          ? err.message
          : isTr
            ? "Tavsiye kaydedilemedi."
            : "Failed to record endorsement."
      );
    } finally {
      setIsSubmittingEndorsement(false);
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
                  : currentStatus === "DISPUTED"
                    ? "outline"
                    : currentStatus === "COMPLETION_PENDING"
                      ? "secondary"
                      : "outline"
              }
            >
              {completed
                ? isTr
                  ? "Tamamlandı"
                  : "Completed"
                : currentStatus === "DISPUTED"
                  ? isTr
                    ? "Uyuşmazlık Bildirildi"
                    : "Disputed"
                  : currentStatus === "COMPLETION_PENDING"
                    ? isTr
                      ? "Onay Bekleniyor"
                      : "Completion Pending"
                    : isTr
                      ? "Eşleşti / Aktif"
                      : "Matched"}
            </Badge>
            <span>{matchedDateStr}</span>
          </div>
        </div>

        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[var(--color-text-primary)]">
          {listingTitle}
        </h1>
      </div>

      {/* Bilateral Contract Draft Banner */}
      <div className="rounded-3xl border border-blue-500/25 bg-gradient-to-r from-blue-500/10 via-[var(--color-surface-base)] to-blue-500/5 p-6 sm:p-7 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-5">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-blue-400 font-bold text-sm">
            <FileText className="h-4 w-4" aria-hidden="true" />
            <span>
              {isTr
                ? "1-Tıkla Resmi Hizmet & Fikri Mülkiyet Devir Sözleşmesi"
                : "1-Click Service & IP Transfer Contract"}
            </span>
          </div>
          <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed max-w-xl">
            {isTr
              ? "Operis emanet havuzu tutmaz; 5846 sayılı FSEK ve 6325 sayılı doğrudan arabuluculuk maddeleriyle hukuki zırh sunar. Tek tıkla resmi sözleşmenizi PDF olarak kaydedip yazdırabilirsiniz."
              : "Operis takes zero commission and operates zero escrow. Review and print your official bilateral contract with full IP transfer and mediation clauses."}
          </p>
        </div>
        <Button
          variant="primary"
          size="md"
          onClick={() => setContractModalOpen(true)}
          className="gap-2 shrink-0 shadow-md shadow-blue-500/15"
        >
          <FileText className="h-4 w-4" aria-hidden="true" />
          <span>{isTr ? "Resmi PDF Sözleşmesi Oluştur" : "Generate Official PDF"}</span>
        </Button>
      </div>

      {/* Lightweight 3-Step Milestone Schedule Recommendation */}
      <div className="rounded-3xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-base)]/70 backdrop-blur-xl p-6 sm:p-7 shadow-sm space-y-4">
        <div className="flex items-center justify-between gap-3 border-b border-[var(--color-border-subtle)] pb-3">
          <div className="flex items-center gap-2 font-bold text-sm text-[var(--color-text-primary)]">
            <Layers className="h-4.5 w-4.5 text-blue-400" aria-hidden="true" />
            <span>
              {isTr
                ? "Tavsiye Edilen 3 Kademeli Avans ve Kilometre Çizelgesi"
                : "Recommended 3-Step Milestone & Advance Schedule"}
            </span>
          </div>
          <span className="text-xs text-[var(--color-text-tertiary)] font-mono">
            {isTr ? "Güvenli İş Birliği Modeli" : "Safe Collaboration Model"}
          </span>
        </div>

        <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
          {isTr
            ? "Platform emanet para tutmaz; ancak serbest çalışanın emeğini, işverenin de teslimatını korumak için aşağıdaki 3 adımlı ödeme çizelgesi tavsiye edilir:"
            : "Platform holds no escrow; following this 3-tier milestone schedule eliminates non-payment and non-delivery risks:"}
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4 space-y-1.5">
            <div className="flex items-center justify-between text-xs font-bold text-emerald-400">
              <span>{isTr ? "1. Aşama" : "Phase 1"}</span>
              <span className="px-2 py-0.5 rounded-lg bg-emerald-500/20 font-mono">%30</span>
            </div>
            <div className="font-semibold text-xs text-[var(--color-text-primary)]">
              {isTr ? "Tasarım ve Mimari Onayı" : "Design & Architecture Approval"}
            </div>
            <p className="text-[11px] text-[var(--color-text-secondary)] leading-normal">
              {isTr
                ? "Altyapı şablonları ve mimari onaylandığında %30 avans ödenir."
                : "30% initial advance once project architecture and UI are agreed."}
            </p>
          </div>

          <div className="rounded-2xl border border-blue-500/20 bg-blue-500/5 p-4 space-y-1.5">
            <div className="flex items-center justify-between text-xs font-bold text-blue-400">
              <span>{isTr ? "2. Aşama" : "Phase 2"}</span>
              <span className="px-2 py-0.5 rounded-lg bg-blue-500/20 font-mono">%40</span>
            </div>
            <div className="font-semibold text-xs text-[var(--color-text-primary)]">
              {isTr ? "Fonksiyonel Demo ve Test" : "Functional Demo & Testing"}
            </div>
            <p className="text-[11px] text-[var(--color-text-secondary)] leading-normal">
              {isTr
                ? "Çalışan prototip ve test sürümü sunulduğunda %40 ara ödeme yapılır."
                : "40% interim payment upon milestone demo and functional test."}
            </p>
          </div>

          <div className="rounded-2xl border border-purple-500/20 bg-purple-500/5 p-4 space-y-1.5">
            <div className="flex items-center justify-between text-xs font-bold text-purple-400">
              <span>{isTr ? "3. Aşama" : "Phase 3"}</span>
              <span className="px-2 py-0.5 rounded-lg bg-purple-500/20 font-mono">%30</span>
            </div>
            <div className="font-semibold text-xs text-[var(--color-text-primary)]">
              {isTr ? "Kaynak Kod & FSEK Devri" : "Source Code & IP Transfer"}
            </div>
            <p className="text-[11px] text-[var(--color-text-secondary)] leading-normal">
              {isTr
                ? "Canlıya alma, kod teslimi ve FSEK mülkiyet devriyle son %30 ödenir."
                : "Final 30% payment upon complete source code handover and deployment."}
            </p>
          </div>
        </div>
      </div>

      {/* Counterparty Contact & Instant Handshake Kit */}
      <div className="rounded-3xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-base)]/70 backdrop-blur-xl p-6 sm:p-8 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--color-border-subtle)] pb-4">
          <div>
            <h2 className="text-lg font-bold text-[var(--color-text-primary)]">
              {isTr ? "Eşleşilen Taraf ve İletişim Kanalları" : "Counterparty & Contact Channels"}
            </h2>
            <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
              {isTr
                ? "Sürtünmesiz doğrudan iletişim için hazır araçlar."
                : "Frictionless direct communication power tools."}
            </p>
          </div>
        </div>

        {/* Counterparty profile snippet */}
        <div className="flex items-center gap-4">
          <AvatarInitials name={counterparty.displayName} size="md" />
          <div>
            <Link
              href={getLocalizedProfilePath(counterparty.handle, locale)}
              className="text-base font-semibold text-[var(--color-text-primary)] hover:text-blue-400 transition-colors"
            >
              {counterparty.displayName}
            </Link>
            <div className="text-xs text-[var(--color-text-tertiary)] font-mono">
              @{counterparty.handle}
            </div>
          </div>
        </div>

        {/* Instant Handshake Kit (Buz Kırıcı Kiti - 3 Buttons) */}
        <div className="rounded-2xl border border-blue-500/25 bg-gradient-to-br from-blue-500/10 via-[var(--color-surface-hover)] to-transparent p-4 sm:p-5 space-y-3">
          <div className="flex items-center gap-2 font-bold text-xs text-blue-400">
            <ShieldCheck className="h-4 w-4" aria-hidden="true" />
            <span>
              {isTr
                ? "Eşleşme Sonrası Buz Kırıcı Kiti (Instant Handshake Kit)"
                : "Instant Handshake Kit"}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {/* WhatsApp */}
            {waUrl ? (
              <a
                href={waUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-sm transition-all hover:scale-[1.02]"
              >
                <MessageCircle className="h-4 w-4" aria-hidden="true" />
                <span>{isTr ? "WhatsApp ile Başlat" : "Start on WhatsApp"}</span>
              </a>
            ) : (
              <button
                type="button"
                onClick={() => {
                  if (typeof window !== "undefined") {
                    navigator.clipboard.writeText(decodeURIComponent(waText));
                    alert(
                      isTr
                        ? "WhatsApp mesaj taslağı panoya kopyalandı."
                        : "WhatsApp draft copied to clipboard."
                    );
                  }
                }}
                className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-emerald-600/80 hover:bg-emerald-600 text-white text-xs font-semibold shadow-sm transition-all"
              >
                <MessageCircle className="h-4 w-4" aria-hidden="true" />
                <span>{isTr ? "WhatsApp Taslağı" : "WhatsApp Draft"}</span>
              </button>
            )}

            {/* Google Meet / Calendar */}
            <a
              href={calendarUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-sm transition-all hover:scale-[1.02]"
            >
              <Calendar className="h-4 w-4" aria-hidden="true" />
              <span>{isTr ? "Takvim / Meet Daveti" : "Meet / Calendar Invite"}</span>
            </a>

            {/* Corporate Email Draft */}
            {mailUrl ? (
              <a
                href={mailUrl}
                className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-sm transition-all hover:scale-[1.02]"
              >
                <Mail className="h-4 w-4" aria-hidden="true" />
                <span>{isTr ? "Kurumsal E-Posta Aç" : "Draft Email"}</span>
              </a>
            ) : (
              <button
                type="button"
                disabled
                className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-[var(--color-surface-hover)] text-[var(--color-text-tertiary)] text-xs font-medium border border-[var(--color-border-subtle)] opacity-60 cursor-not-allowed"
              >
                <Mail className="h-4 w-4" aria-hidden="true" />
                <span>{isTr ? "E-Posta Belirtilmedi" : "No Email"}</span>
              </button>
            )}
          </div>
        </div>

        {/* Contact details grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
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
                  aria-label={
                    copiedField === "email"
                      ? isTr
                        ? "E-posta kopyalandı"
                        : "Email copied"
                      : isTr
                        ? "E-postayı kopyala"
                        : "Copy email"
                  }
                >
                  {copiedField === "email" ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-400" aria-hidden="true" />
                      <span className="text-emerald-400 font-medium">
                        {isTr ? "Kopyalandı" : "Copied"}
                      </span>
                    </>
                  ) : (
                    <>
                      <Copy
                        className="h-3.5 w-3.5 text-[var(--color-text-tertiary)]"
                        aria-hidden="true"
                      />
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
                  aria-label={
                    copiedField === "phone"
                      ? isTr
                        ? "Telefon kopyalandı"
                        : "Phone copied"
                      : isTr
                        ? "Telefonu kopyala"
                        : "Copy phone"
                  }
                >
                  {copiedField === "phone" ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-400" aria-hidden="true" />
                      <span className="text-emerald-400 font-medium">
                        {isTr ? "Kopyalandı" : "Copied"}
                      </span>
                    </>
                  ) : (
                    <>
                      <Copy
                        className="h-3.5 w-3.5 text-[var(--color-text-tertiary)]"
                        aria-hidden="true"
                      />
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
                ? "Proje bittiğinde her iki taraf da onay verdiğinde süreç tamamlanmış sayılır ve profilinize işlenir."
                : "When the work is done, both parties must confirm for the project to be verified on your profile."}
            </p>

            {counterpartyCompletionStatus === "MARKED_COMPLETE" && (
              <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-xl border border-emerald-500/20 w-fit">
                <Check className="h-3.5 w-3.5" />
                <span>
                  {isTr
                    ? `${counterparty.displayName} tamamlandı onayını verdi. Sizin onayınız bekleniyor.`
                    : `${counterparty.displayName} confirmed completion. Awaiting your confirmation.`}
                </span>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-3">
              <Button
                variant={myMark === "MARKED_COMPLETE" ? "secondary" : "primary"}
                onClick={handleMarkComplete}
                disabled={isLoading || myMark === "MARKED_COMPLETE"}
                className="gap-2"
              >
                <Check className="h-4 w-4" aria-hidden="true" />
                <span>
                  {myMark === "MARKED_COMPLETE"
                    ? isTr
                      ? "Tamamlandı Olarak İşaretlendi"
                      : "Marked Complete"
                    : isTr
                      ? "İşi Tamamlandı Olarak Onayla"
                      : "Confirm Work as Completed"}
                </span>
              </Button>

              <Button
                variant="ghost"
                onClick={handleDispute}
                disabled={isLoading || myMark === "DISPUTES_COMPLETION"}
                className="text-xs text-rose-400 hover:text-rose-300"
              >
                {isTr ? "İş Tamamlanmadı (Uyuşmazlık)" : "Work Incomplete (Dispute)"}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Bilateral Verified Endorsement Section (Topluluk Tavsiye Notları) */}
      {completed && (
        <div className="rounded-3xl border border-amber-500/25 bg-gradient-to-br from-amber-500/5 via-[var(--color-surface-base)] to-transparent backdrop-blur-xl p-6 sm:p-8 shadow-sm space-y-5">
          <div className="flex items-center justify-between gap-3 border-b border-[var(--color-border-subtle)] pb-3">
            <div className="flex items-center gap-2 font-bold text-base text-[var(--color-text-primary)]">
              <Award className="h-5 w-5 text-amber-400" aria-hidden="true" />
              <span>
                {isTr ? "Doğrulanmış Topluluk Tavsiye Mektubu" : "Verified Community Endorsement"}
              </span>
            </div>
            <span className="text-xs text-amber-400 font-semibold px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/20">
              {isTr
                ? "Sıfır Yıldız Puanı / %100 Gerçek Yorum"
                : "Zero Star Revenge / 100% Real Vouch"}
            </span>
          </div>

          <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
            {isTr
              ? "Manipülatif yıldız puanlamaları yerine, başarıyla tamamlanan iş birliğinize ilişkin 1 paragraflık doğrulanmış tavsiye mektubu bırakın. Bu mektup iş ortağınızın profilinde kalıcı bir güven kanıtı olarak sergilenir."
              : "Instead of revenge star ratings, leave a verified 1-paragraph testimonial letter for your collaboration. It is displayed permanently on your partner's public profile."}
          </p>

          {endorsementFeedback && (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 text-xs text-[var(--color-text-primary)] font-medium">
              {endorsementFeedback}
            </div>
          )}

          {existingMyEndorsement ? (
            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5 space-y-2">
              <div className="flex items-center justify-between text-xs text-emerald-400 font-semibold">
                <span className="flex items-center gap-1.5">
                  <Check className="h-4 w-4" />
                  {isTr ? "Tavsiye Notunuz Yayınlandı" : "Your Endorsement is Published"}
                </span>
                <span className="text-[10px] text-[var(--color-text-tertiary)]">
                  {new Date(existingMyEndorsement.createdAt).toLocaleDateString(
                    isTr ? "tr-TR" : "en-US"
                  )}
                </span>
              </div>
              <div className="relative pl-6 text-xs text-[var(--color-text-primary)] leading-relaxed italic border-l-2 border-emerald-500/40 my-2">
                <Quote className="h-3.5 w-3.5 text-emerald-400/50 absolute -left-1.5 -top-1" />"
                {existingMyEndorsement.content}"
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmitEndorsement} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-[var(--color-text-secondary)] mb-1.5">
                  {isTr
                    ? `${counterparty.displayName} için 1 Paragraflık Tavsiye Notu (20 - 500 Karakter)`
                    : `1-Paragraph Recommendation for ${counterparty.displayName} (20 - 500 Chars)`}
                </label>
                <textarea
                  value={endorsementText}
                  onChange={(e) => setEndorsementText(e.target.value)}
                  maxLength={500}
                  rows={4}
                  placeholder={
                    isTr
                      ? `${counterparty.displayName} ile projemizde çalıştık, API mimarisini taahhüt ettiği tarihten önce sıfır hatayla teslim etti...`
                      : `Worked with ${counterparty.displayName} on our project, delivered the core architecture ahead of schedule with zero defects...`
                  }
                  className="w-full rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-hover)] p-3 text-xs text-[var(--color-text-primary)] placeholder-[var(--color-text-tertiary)] focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50 transition-all resize-none"
                />
                <div className="flex items-center justify-between text-[11px] text-[var(--color-text-tertiary)] px-1 mt-1">
                  <span>
                    {isTr
                      ? "Platform kuralları gereği emoji kullanılamaz."
                      : "Emojis are prohibited."}
                  </span>
                  <span className={endorsementText.length > 500 ? "text-red-400 font-bold" : ""}>
                    {endorsementText.length} / 500
                  </span>
                </div>
              </div>

              <Button
                type="submit"
                variant="primary"
                size="sm"
                disabled={isSubmittingEndorsement || endorsementText.trim().length < 20}
                className="gap-2 bg-amber-600 hover:bg-amber-500 border-amber-600 text-white shadow-md shadow-amber-500/20"
              >
                <Send className="h-3.5 w-3.5" aria-hidden="true" />
                <span>
                  {isSubmittingEndorsement
                    ? isTr
                      ? "Kaydediliyor..."
                      : "Submitting..."
                    : isTr
                      ? "Doğrulanmış Tavsiye Notunu Yayınla"
                      : "Publish Verified Vouch"}
                </span>
              </Button>
            </form>
          )}
        </div>
      )}

      {/* Contract Modal */}
      <ContractDraftModal
        isOpen={contractModalOpen}
        onClose={() => setContractModalOpen(false)}
        engagementId={engagementId}
        listingTitle={listingTitle}
        category={category}
        matchedAt={matchedAt}
        offerMessage={offerMessage}
        budgetLabel={budgetLabel}
        timelineLabel={timelineLabel}
        counterparty={counterparty}
        currentUser={currentUser || { displayName: undefined, email: undefined }}
        isOwner={ownerUserId === currentUserId}
        locale={locale}
      />
    </div>
  );
}
