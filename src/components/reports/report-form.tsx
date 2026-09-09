"use client";

import React, { useState } from "react";
import { CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "../ui/button";
import { TextInput } from "../ui/text-input";
import { TextArea } from "../ui/text-area";

export interface ReportFormProps {
  locale: string;
  defaultTargetType?: string;
  defaultTargetIdentifier?: string;
}

const REASON_CODES = [
  { value: "SPAM_OR_SCAM", label: "Dolandırıcılık veya Sahte İlan / Teklif" },
  { value: "OFF_PLATFORM_ABUSE", label: "Kötüye Kullanım veya Taciz" },
  { value: "IP_VIOLATION", label: "Fikri Mülkiyet / Telif Hakkı İhlali" },
  { value: "PROHIBITED_CONTENT", label: "Yasaklanmış İçerik veya Hizmet" },
  { value: "OTHER", label: "Diğer Kural İhlali" },
];

export function ReportForm({
  locale,
  defaultTargetType = "listing",
  defaultTargetIdentifier = "",
}: ReportFormProps) {
  const isTr = locale === "tr";

  const [targetType, setTargetType] = useState(defaultTargetType);
  const [targetIdentifier, setTargetIdentifier] = useState(defaultTargetIdentifier);
  const [reasonCode, setReasonCode] = useState(REASON_CODES[0]!.value);
  const [details, setDetails] = useState("");

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
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetType,
          targetIdentifier: targetIdentifier.trim(),
          reasonCode,
          details: details.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Bildirim gönderilemedi");

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

  if (isSuccess) {
    return (
      <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-6 text-center space-y-3">
        <div className="mx-auto h-12 w-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
          <CheckCircle2 className="h-6 w-6" aria-hidden="true" />
        </div>
        <h2 className="text-base font-semibold text-[var(--color-text-primary)]">
          {isTr ? "Bildiriminiz Alındı" : "Report Received"}
        </h2>
        <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed max-w-md mx-auto">
          {isTr
            ? "Platform güvenliğine ve etik kurallara katkınız için teşekkür ederiz. İlgili kayıt moderatörlerimiz tarafından ivedilikle denetlenecektir."
            : "Thank you for helping keep Operis safe. Our security team will review this report promptly."}
        </p>
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
        placeholder={isTr ? "https://operis.pro/tr/ilanlar/... veya @kullaniciadi" : "URL or identifier"}
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
              {r.label}
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
