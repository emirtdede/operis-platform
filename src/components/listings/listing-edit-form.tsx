"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Layers, DollarSign, Tag, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "../ui/button";
import { TextInput } from "../ui/text-input";
import { TextArea } from "../ui/text-area";

export interface ListingEditFormProps {
  listing: {
    id: string;
    slug: string;
    title: string;
    summary: string;
    scope: string;
    tags: string[];
    budgetMin: string | null;
    budgetMax: string | null;
  };
  locale: string;
}

export function ListingEditForm({ listing, locale }: ListingEditFormProps) {
  const isTr = locale === "tr";
  const router = useRouter();

  const [title, setTitle] = useState(listing.title);
  const [summary, setSummary] = useState(listing.summary);
  const [scope, setScope] = useState(listing.scope);
  const [tagsStr, setTagsStr] = useState((listing.tags || []).join(", "));
  const [budgetMin, setBudgetMin] = useState(listing.budgetMin || "");
  const [budgetMax, setBudgetMax] = useState(listing.budgetMax || "");

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const parsedTags = tagsStr
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);

      const res = await fetch(`/api/listings/${listing.id}/update`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          summary: summary.trim(),
          scope: scope.trim(),
          tags: parsedTags,
          budgetMin: budgetMin ? budgetMin.toString() : null,
          budgetMax: budgetMax ? budgetMax.toString() : null,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "İlan güncellenemedi");

      setSuccess(true);
      setTimeout(() => {
        router.push(isTr ? `/tr/ilanlar/${listing.slug}` : `/en/listings/${listing.slug}`);
        router.refresh();
      }, 1500);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : (isTr ? "Güncelleme başarısız oldu." : "Update failed."));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="flex items-center gap-2.5 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-xs text-red-400">
          <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="flex items-center gap-2.5 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-xs text-emerald-400">
          <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{isTr ? "İlan başarıyla güncellendi! Yönlendiriliyorsunuz..." : "Listing successfully updated! Redirecting..."}</span>
        </div>
      )}

      <div className="rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-base)]/70 backdrop-blur-xl p-6 sm:p-7 space-y-4">
        <TextInput
          label={isTr ? "Proje Başlığı" : "Project Title"}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          maxLength={120}
          startIcon={<Layers className="h-4 w-4" aria-hidden="true" />}
        />

        <TextArea
          label={isTr ? "Kısa Özet (Radar & Akış Görünümü)" : "Summary (Radar & Feed Overview)"}
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          required
          maxLength={280}
          rows={3}
        />

        <TextArea
          label={isTr ? "Detaylı İş Kapsamı ve İhtiyaçlar" : "Detailed Scope & Requirements"}
          value={scope}
          onChange={(e) => setScope(e.target.value)}
          required
          rows={6}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <TextInput
            label={isTr ? "Minimum Bütçe (TRY)" : "Min Budget (TRY)"}
            type="number"
            value={budgetMin}
            onChange={(e) => setBudgetMin(e.target.value)}
            placeholder="30000"
            startIcon={<DollarSign className="h-4 w-4" aria-hidden="true" />}
          />

          <TextInput
            label={isTr ? "Maksimum Bütçe (TRY)" : "Max Budget (TRY)"}
            type="number"
            value={budgetMax}
            onChange={(e) => setBudgetMax(e.target.value)}
            placeholder="50000"
            startIcon={<DollarSign className="h-4 w-4" aria-hidden="true" />}
          />
        </div>

        <TextInput
          label={isTr ? "Teknoloji Etiketleri (Virgülle ayırın)" : "Tech Stack Tags (Comma separated)"}
          value={tagsStr}
          onChange={(e) => setTagsStr(e.target.value)}
          placeholder="Next.js, TypeScript, PostgreSQL, Docker"
          startIcon={<Tag className="h-4 w-4" aria-hidden="true" />}
        />
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <Button
          type="button"
          variant="secondary"
          size="lg"
          onClick={() => router.back()}
          disabled={isLoading}
        >
          {isTr ? "Vazgeç" : "Cancel"}
        </Button>

        <Button
          type="submit"
          variant="primary"
          size="lg"
          className="font-semibold text-sm px-8"
          isLoading={isLoading}
        >
          {isTr ? "Güncellemeleri Kaydet" : "Save Changes"}
        </Button>
      </div>
    </form>
  );
}
