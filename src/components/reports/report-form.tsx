"use client";

import React, { useState } from "react";
import { CheckCircle2, AlertCircle, Copy, Check, LogIn, Mail } from "lucide-react";
import { Button } from "../ui/button";
import { TextInput } from "../ui/text-input";
import { TextArea } from "../ui/text-area";
import Link from "next/link";

export interface ReportFormProps {
  locale: string;
  defaultTargetType?: string;
  defaultTargetIdentifier?: string;
  hasSession?: boolean;
}

const REASON_CODES = [
  {
    value: "SCAM_FRAUD",
    labelTr: "Dolandırıcılık veya Sahte İlan / Teklif",
    labelEn: "Fraud, Scam or Fake Listing / Proposal",
  },
  {
    value: "HARASSMENT_ABUSE",
    labelTr: "Kötüye Kullanım veya Taciz",
    labelEn: "Abuse, Harassment or Off-Platform Conduct",
  },
  {
    value: "INTELLECTUAL_PROPERTY",
    labelTr: "Fikri Mülkiyet / Telif Hakkı İhlali",
    labelEn: "Intellectual Property / Copyright Infringement",
  },
  {
    value: "PROHIBITED_SERVICE",
    labelTr: "Yasaklanmış İçerik veya Hizmet",
    labelEn: "Prohibited Content or Restricted Service",
  },
  {
    value: "SPAM",
    labelTr: "İstenmeyen İçerik veya Reklam",
    labelEn: "Spam or Unsolicited Content",
  },
  {
    value: "OTHER",
    labelTr: "Diğer Kural İhlali",
    labelEn: "Other Policy Violation",
  },
];

export function ReportForm({
  locale,
  defaultTargetType = "listing",
  defaultTargetIdentifier = "",
  hasSession = true,
}: ReportFormProps) {
  const isTr = locale === "tr";

  const [targetType, setTargetType] = useState(defaultTargetType);
  const [targetIdentifier, setTargetIdentifier] = useState(defaultTargetIdentifier);
  const [reasonCode, setReasonCode] = useState(REASON_CODES[0]!.value);
  const [details, setDetails] = useState("");

  const [trackingCode, setTrackingCode] = useState<string>("");
  const [copiedTracking, setCopiedTracking] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-locale": locale,
        },
        body: JSON.stringify({
          targetType,
          targetIdentifier: targetIdentifier.trim(),
          reasonCode,
          details: details.trim(),
          locale,
        }),
      });

      const data = await res.json();
      if (!res.ok)
        throw new Error(
          data.error || (isTr ? "Bildirim gönderilemedi." : "Failed to submit report.")
        );

      const generatedCode =
        data.reportId ?? `OPR-REP-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      setTrackingCode(generatedCode);
      setIsSuccess(true);
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : isTr
            ? "İşlem başarısız oldu. Lütfen tekrar deneyiniz."
            : "Report could not be submitted."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyCode = () => {
    if (!trackingCode) return;
    navigator.clipboard.writeText(trackingCode);
    setCopiedTracking(true);
    setTimeout(() => setCopiedTracking(false), 2000);
  };

  if (isSuccess) {
    return (
      <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-6 text-center space-y-4">
        <div className="mx-auto h-12 w-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
          <CheckCircle2 className="h-6 w-6" aria-hidden="true" />
        </div>
        <h2 className="text-base font-semibold text-[var(--color-text-primary)]">
          {isTr ? "Bildiriminiz Başarıyla Alındı" : "Report Received Successfully"}
        </h2>
        <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed max-w-md mx-auto">
          {isTr
            ? "Platform güvenliğine ve etik kurallara katkınız için teşekkür ederiz. İlgili kayıt moderatörlerimiz tarafından ivedilikle denetlenecektir."
            : "Thank you for helping keep Operis safe. Our security team will review this report promptly."}
        </p>

        {trackingCode && (
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl border border-emerald-500/30 bg-[var(--color-surface-base)] shadow-sm">
            <span className="text-[11px] font-mono text-[var(--color-text-secondary)]">
              {isTr ? "Takip Kodu:" : "Tracking ID:"}
            </span>
            <code className="text-xs font-mono font-bold text-emerald-400">{trackingCode}</code>
            <button
              type="button"
              onClick={handleCopyCode}
              aria-label={isTr ? "Takip kodunu kopyala" : "Copy tracking ID"}
              className="p-1 hover:text-emerald-300 transition-colors cursor-pointer"
            >
              {copiedTracking ? (
                <Check className="h-3.5 w-3.5 text-emerald-400" aria-hidden="true" />
              ) : (
                <Copy
                  className="h-3.5 w-3.5 text-[var(--color-text-tertiary)]"
                  aria-hidden="true"
                />
              )}
            </button>
          </div>
        )}

        <div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setIsSuccess(false);
              setDetails("");
            }}
            className="text-xs"
          >
            {isTr ? "Yeni İhbar Bildir" : "Submit Another Report"}
          </Button>
        </div>
      </div>
    );
  }

  if (!hasSession) {
    const returnUrl = isTr ? "/tr/sikayet-bildir" : "/en/report";
    const loginUrl = isTr
      ? `/tr/giris?returnUrl=${encodeURIComponent(returnUrl)}`
      : `/en/login?returnUrl=${encodeURIComponent(returnUrl)}`;

    return (
      <div className="space-y-6 rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-base)]/80 p-6 sm:p-8 text-center">
        <div className="mx-auto h-12 w-12 rounded-2xl bg-blue-500/10 text-blue-400 flex items-center justify-center border border-blue-500/20">
          <LogIn className="h-6 w-6" aria-hidden="true" />
        </div>
        <div className="space-y-2 max-w-md mx-auto">
          <h2 className="text-base font-bold text-[var(--color-text-primary)]">
            {isTr ? "Bildirim Göndermek İçin Giriş Yapın" : "Sign In to Submit Abuse Report"}
          </h2>
          <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
            {isTr
              ? "Bildiriminizin incelenme durumunu takip edebilmek ve sahte/spam raporlamaları önlemek için Operis oturumu gereklidir."
              : "An Operis account is required to submit verified reports and track resolution status."}
          </p>
        </div>

        <div className="pt-1">
          <Link href={loginUrl}>
            <Button variant="primary" size="md" className="gap-2 shadow-lg shadow-blue-500/20">
              <LogIn className="h-4 w-4" aria-hidden="true" />
              <span>{isTr ? "Giriş Yaparak Bildir" : "Log In & Report"}</span>
            </Button>
          </Link>
        </div>

        <div className="pt-3 border-t border-[var(--color-border-subtle)]/60 text-[11px] text-[var(--color-text-tertiary)] flex items-center justify-center gap-1.5">
          <Mail className="h-3.5 w-3.5 text-blue-400" aria-hidden="true" />
          <span>
            {isTr
              ? "Hesabınız yoksa veya FSEK/DMCA telif hakkı sahibiyseniz:"
              : "No account or DMCA / copyright owner?"}{" "}
            <a href="mailto:legal@operis.pro" className="text-blue-400 hover:underline font-medium">
              legal@operis.pro
            </a>
          </span>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="flex items-center gap-2.5 rounded-xl border border-red-500/20 bg-red-500/10 p-3.5 text-xs text-red-400">
          <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}

      <div className="space-y-1.5">
        <label className="text-xs font-medium text-[var(--color-text-secondary)]">
          {isTr ? "Bildirim Türü" : "Target Type"}
        </label>
        <select
          value={targetType}
          onChange={(e) => setTargetType(e.target.value)}
          className="w-full h-11 px-3.5 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-base)] text-xs text-[var(--color-text-primary)] focus:outline-none focus:border-blue-500"
        >
          <option value="listing">{isTr ? "Proje İlanı" : "Project Listing"}</option>
          <option value="profile">{isTr ? "Kullanıcı Profili" : "User Profile"}</option>
          <option value="offer">{isTr ? "Teklif veya Mesaj" : "Offer or Message"}</option>
          <option value="general">{isTr ? "Genel Güvenlik İhlali" : "General Abuse"}</option>
        </select>
      </div>

      <TextInput
        label={isTr ? "Hedef Bağlantı veya İlan Başlığı" : "Target URL or Title"}
        value={targetIdentifier}
        onChange={(e) => setTargetIdentifier(e.target.value)}
        placeholder={
          isTr ? "https://operis.pro/tr/ilanlar/... veya @kullaniciadi" : "URL or identifier"
        }
        required
      />

      <div className="space-y-1.5">
        <label className="text-xs font-medium text-[var(--color-text-secondary)]">
          {isTr ? "İhlal Nedeni" : "Reason Category"}
        </label>
        <select
          value={reasonCode}
          onChange={(e) => setReasonCode(e.target.value)}
          className="w-full h-11 px-3.5 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-base)] text-xs text-[var(--color-text-primary)] focus:outline-none focus:border-blue-500"
        >
          {REASON_CODES.map((r) => (
            <option key={r.value} value={r.value}>
              {isTr ? r.labelTr : r.labelEn}
            </option>
          ))}
        </select>
      </div>

      <TextArea
        label={isTr ? "Detaylı Açıklama ve Kanıtlar" : "Detailed Explanation"}
        value={details}
        onChange={(e) => setDetails(e.target.value)}
        placeholder={
          isTr
            ? "Lütfen şüpheli durumu, neden kurallara aykırı olduğunu ve varsa ekran alıntısı veya referans bilgilerini detaylandırın..."
            : "Describe the violation in detail..."
        }
        required
        rows={5}
      />

      <Button
        type="submit"
        variant="primary"
        size="lg"
        className="w-full text-sm font-semibold cursor-pointer"
        isLoading={isLoading}
      >
        {isTr ? "Şikayeti Güvenlik Ekibine İlet" : "Submit Abuse Report"}
      </Button>
    </form>
  );
}
