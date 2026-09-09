"use client";

import React, { useState } from "react";
import { Dialog } from "../ui/dialog";
import { Button } from "../ui/button";
import { TextArea } from "../ui/text-area";
import { TextInput } from "../ui/text-input";
import { Select } from "../ui/select";

export interface SubmitOfferModalProps {
  isOpen: boolean;
  onClose: () => void;
  listingId: string;
  listingTitle: string;
  locale: string;
}

export function SubmitOfferModal({
  isOpen,
  onClose,
  listingId,
  listingTitle,
  locale,
}: SubmitOfferModalProps) {
  const isTr = locale === "tr";
  const [message, setMessage] = useState("");
  const [budgetCurrency, setBudgetCurrency] = useState("TRY");
  const [budgetMin, setBudgetMin] = useState("");
  const [budgetMax, setBudgetMax] = useState("");
  const [timelineValue, setTimelineValue] = useState("");
  const [timelineUnit, setTimelineUnit] = useState<"DAYS" | "WEEKS" | "MONTHS">("WEEKS");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (message.trim().length < 50) {
      setError(
        isTr
          ? "Teklif açıklaması en az 50 karakter olmalıdır."
          : "Offer proposal must be at least 50 characters."
      );
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch("/api/offers/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          listingId,
          message,
          budgetCurrency: budgetMin || budgetMax ? budgetCurrency : null,
          budgetMin: budgetMin || null,
          budgetMax: budgetMax || null,
          estimatedDurationValue: timelineValue ? parseInt(timelineValue, 10) : null,
          estimatedDurationUnit: timelineValue ? timelineUnit : null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to submit offer");
      }

      setSuccess(true);
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : isTr
          ? "Teklif gönderilemedi. Lütfen tekrar deneyin."
          : "Could not submit offer. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={isTr ? "Gizli Teklif Ver" : "Submit Private Offer"}
      description={
        isTr
          ? `"${listingTitle}" başlıklı projeye teklifinizi iletin. Teklifiniz yalnızca ilan sahibine açıktır.`
          : `Send your proposal for "${listingTitle}". Your offer is private and visible only to the listing owner.`
      }
    >
      {success ? (
        <div className="space-y-5 py-4 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <svg
              className="h-6 w-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/5 p-4 text-sm text-[var(--color-text-primary)] leading-relaxed">
            {isTr
              ? "Teklifiniz başarıyla ilan sahibine iletildi. İlan sahibi teklifinizi değerlendirdikten sonra size bildirim gelecektir."
              : "Your offer has been submitted to the listing owner. You will be notified when they review it."}
          </div>
          <Button
            variant="primary"
            size="lg"
            onClick={() => {
              setSuccess(false);
              onClose();
            }}
            className="w-full font-semibold"
          >
            {isTr ? "Tamam" : "Done"}
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3.5 text-xs text-red-400">
              {error}
            </div>
          )}

          <TextArea
            label={isTr ? "Teklif açıklaması" : "Proposal message"}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={
              isTr
                ? "Bu proje için uzmanlığınızı, yaklaşımınızı ve yapabileceklerinizi detaylıca açıklayın (en az 50 karakter)..."
                : "Explain your experience, approach, and how you will deliver this project (minimum 50 characters)..."
            }
            minLength={50}
            maxLength={3000}
            showCount
            required
            rows={5}
          />

          {/* Budget section */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-[var(--color-text-secondary)]">
              {isTr ? "Önerilen Bütçe (İsteğe Bağlı)" : "Proposed Budget (Optional)"}
            </label>
            <div className="grid grid-cols-3 gap-2">
              <Select
                value={budgetCurrency}
                onChange={(e) => setBudgetCurrency(e.target.value)}
                options={[
                  { value: "TRY", label: "TRY (₺)" },
                  { value: "USD", label: "USD ($)" },
                  { value: "EUR", label: "EUR (€)" },
                  { value: "GBP", label: "GBP (£)" },
                ]}
              />
              <TextInput
                type="number"
                placeholder={isTr ? "Min Tutar" : "Min Amount"}
                value={budgetMin}
                onChange={(e) => setBudgetMin(e.target.value)}
              />
              <TextInput
                type="number"
                placeholder={isTr ? "Maks Tutar" : "Max Amount"}
                value={budgetMax}
                onChange={(e) => setBudgetMax(e.target.value)}
              />
            </div>
          </div>

          {/* Timeline section */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-[var(--color-text-secondary)]">
              {isTr ? "Tahmini Süre (İsteğe Bağlı)" : "Estimated Timeline (Optional)"}
            </label>
            <div className="grid grid-cols-2 gap-2">
              <TextInput
                type="number"
                placeholder={isTr ? "Süre (örn: 2)" : "Duration (e.g. 2)"}
                value={timelineValue}
                onChange={(e) => setTimelineValue(e.target.value)}
              />
              <Select
                value={timelineUnit}
                onChange={(e) =>
                  setTimelineUnit(e.target.value as "DAYS" | "WEEKS" | "MONTHS")
                }
                options={[
                  { value: "DAYS", label: isTr ? "Gün" : "Days" },
                  { value: "WEEKS", label: isTr ? "Hafta" : "Weeks" },
                  { value: "MONTHS", label: isTr ? "Ay" : "Months" },
                ]}
              />
            </div>
          </div>

          {/* Statutory disclaimer */}
          <div className="rounded-2xl border border-blue-500/20 bg-blue-500/5 p-3.5 text-xs text-[var(--color-text-secondary)] leading-relaxed">
            {isTr
              ? "Operis kar amacı gütmeyen, ücretsiz bir platformdur; ticari risk almaz ve para tutmaz. Teklifiniz kabul edildiğinde karşı tarafla doğrudan anlaşır ve kendi bağımsız sözleşmenizi yürütürsünüz."
              : "Operis is a non-profit, zero-commission network; we assume zero commercial risk and hold no funds. Upon acceptance, counterparties agree directly and manage their own independent contracts."}
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              disabled={isSubmitting}
            >
              {isTr ? "İptal" : "Cancel"}
            </Button>
            <Button type="submit" variant="primary" size="md" className="font-semibold" isLoading={isSubmitting}>
              {isTr ? "Teklifi Gönder" : "Send Offer"}
            </Button>
          </div>
        </form>
      )}
    </Dialog>
  );
}
