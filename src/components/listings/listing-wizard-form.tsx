"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "../ui/button";
import { TextInput } from "../ui/text-input";
import { TextArea } from "../ui/text-area";
import { Select } from "../ui/select";
import { Checkbox } from "../ui/checkbox";

export interface CategoryOption {
  id: string;
  slug: string;
  name: string;
}

export interface ListingWizardFormProps {
  categories: CategoryOption[];
  locale: string;
}

export function ListingWizardForm({ categories, locale }: ListingWizardFormProps) {
  const isTr = locale === "tr";
  const router = useRouter();

  const [step, setStep] = useState(1);
  const totalSteps = 9;

  // Form State
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? "");
  const [title, setTitle] = useState("");
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [scope, setScope] = useState("");
  const [summary, setSummary] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [budgetMode, setBudgetMode] = useState("RANGE");
  const [budgetCurrency, setBudgetCurrency] = useState("TRY");
  const [budgetMin, setBudgetMin] = useState("");
  const [budgetMax, setBudgetMax] = useState("");
  const timelineMode = "DURATION";
  const [timelineValue, setTimelineValue] = useState("2");
  const [timelineUnit, setTimelineUnit] = useState("WEEKS");

  // Review Declarations
  const [ackDirectRelationship, setAckDirectRelationship] = useState(false);
  const [ackNoPlatformPayment, setAckNoPlatformPayment] = useState(false);
  const [ackSevenDayExpiry, setAckSevenDayExpiry] = useState(false);
  const [ackProhibitedContent, setAckProhibitedContent] = useState(false);

  // Status State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedCategory = categories.find((c) => c.id === categoryId);

  // Validation per step
  const validateStep = (currentStep: number): boolean => {
    setError(null);
    if (currentStep === 1) {
      if (!categoryId) {
        setError(isTr ? "Lütfen bir kategori seçin." : "Please select a category.");
        return false;
      }
    } else if (currentStep === 2) {
      if (title.trim().length < 20 || title.trim().length > 120) {
        setError(
          isTr
            ? "Başlık 20 ile 120 karakter arasında olmalıdır."
            : "Title must be between 20 and 120 characters."
        );
        return false;
      }
      if (title === title.toUpperCase() && title.length > 5) {
        setError(
          isTr
            ? "Tamamı büyük harflerden oluşan başlık kullanılamaz."
            : "All-caps titles are not permitted."
        );
        return false;
      }
    } else if (currentStep === 4) {
      if (scope.trim().length < 200 || scope.trim().length > 6000) {
        setError(
          isTr
            ? "Proje kapsamı en az 200, en fazla 6000 karakter olmalıdır."
            : "Project scope must be between 200 and 6000 characters."
        );
        return false;
      }
    } else if (currentStep === 5) {
      if (summary.trim().length < 50 || summary.trim().length > 280) {
        setError(
          isTr
            ? "Kısa özet 50 ile 280 karakter arasında olmalıdır."
            : "Summary must be between 50 and 280 characters."
        );
        return false;
      }
    } else if (currentStep === 7) {
      if (budgetMode === "RANGE" && budgetMin && budgetMax) {
        if (parseFloat(budgetMin) > parseFloat(budgetMax)) {
          setError(
            isTr
              ? "Minimum bütçe maksimum bütçeden büyük olamaz."
              : "Minimum budget cannot exceed maximum budget."
          );
          return false;
        }
      }
    } else if (currentStep === 9) {
      if (
        !ackDirectRelationship ||
        !ackNoPlatformPayment ||
        !ackSevenDayExpiry ||
        !ackProhibitedContent
      ) {
        setError(
          isTr
            ? "Yayımlamak için tüm taahhüt onay kutularını işaretlemelisiniz."
            : "You must check all declaration checkboxes before publishing."
        );
        return false;
      }
    }
    return true;
  };

  const nextStep = () => {
    if (validateStep(step)) {
      setStep((prev) => Math.min(prev + 1, totalSteps));
    }
  };

  const prevStep = () => {
    setError(null);
    setStep((prev) => Math.max(prev - 1, 1));
  };

  const handlePublish = async () => {
    if (!validateStep(9)) return;

    setIsSubmitting(true);
    setError(null);

    const tags = tagsInput
      .split(",")
      .map((t) => t.trim())
      .filter((t) => t.length > 0)
      .slice(0, 10);

    const payload = {
      categoryId,
      title: title.trim(),
      summary: summary.trim(),
      scope: scope.trim(),
      answersJson: answers,
      tags,
      budgetMode,
      budgetCurrency: budgetMode !== "NEGOTIABLE" ? budgetCurrency : null,
      budgetMin: budgetMin || null,
      budgetMax: budgetMax || null,
      timelineMode,
      targetDate: null,
      timelineValue: timelineMode === "DURATION" ? parseInt(timelineValue, 10) : null,
      timelineUnit: timelineMode === "DURATION" ? timelineUnit : null,
      declarations: {
        ackDirectRelationship,
        ackNoPlatformPayment,
        ackSevenDayExpiry,
        ackProhibitedContent,
      },
    };

    try {
      const res = await fetch("/api/listings/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to publish listing");
      }

      router.push(`/${locale}/listings/${data.listing.slug}`);
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : isTr
          ? "İlan yayımlanamadı. Lütfen giriş yaptığınızdan emin olun."
          : "Could not publish listing. Please ensure you are logged in."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative overflow-hidden mx-auto max-w-3xl rounded-3xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-base)]/70 backdrop-blur-xl p-6 sm:p-10 shadow-2xl">
      {/* Background ambient glows */}
      <div
        className="pointer-events-none absolute -top-24 -right-24 w-72 h-72 rounded-full bg-blue-500/10 blur-3xl"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -bottom-24 -left-24 w-72 h-72 rounded-full bg-indigo-500/10 blur-3xl"
        aria-hidden="true"
      />

      <div className="relative z-10 space-y-8">
        {/* Progress Bar & Header */}
        <div>
          <div className="flex items-center justify-between text-xs text-[var(--color-text-secondary)] mb-2 font-medium">
            <span>{isTr ? `Adım ${step} / ${totalSteps}` : `Step ${step} of ${totalSteps}`}</span>
            <span className="font-bold text-blue-400 font-mono">{Math.round((step / totalSteps) * 100)}%</span>
          </div>
          <div
            className="h-2 w-full overflow-hidden rounded-full bg-[var(--color-surface-hover)] border border-[var(--color-border-subtle)]"
            role="progressbar"
            aria-valuenow={step}
            aria-valuemin={1}
            aria-valuemax={totalSteps}
            aria-label={isTr ? "İlan sihirbazı ilerleme durumu" : "Listing wizard progress"}
          >
            <div
              className="h-full bg-gradient-to-r from-blue-600 to-indigo-500 transition-all duration-300 shadow-sm"
              style={{ width: `${(step / totalSteps) * 100}%` }}
            />
          </div>
        </div>

        {error && (
          <div className="rounded-xl border border-[var(--color-danger)]/20 bg-[var(--color-danger)]/10 p-3.5 text-xs text-[var(--color-danger)]">
            {error}
          </div>
        )}

        {/* Step 1: Category Selection */}
        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-[var(--color-text-primary)]">
              {isTr ? "1. Proje Kategorisini Belirleyin" : "1. Select Project Category"}
            </h2>
            <p className="text-xs sm:text-sm text-[var(--color-text-secondary)]">
              {isTr
                ? "Projenizin ilgili olduğu ana teknoloji disiplinini seçin."
                : "Choose the technology category that best fits your requirements."}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setCategoryId(cat.id)}
                  className={`rounded-2xl border p-4 text-left transition-all duration-200 ${
                    categoryId === cat.id
                      ? "border-blue-500/60 bg-blue-500/10 shadow-md shadow-blue-500/10 font-semibold"
                      : "border-[var(--color-border-subtle)] bg-[var(--color-surface-base)]/50 hover:border-blue-500/30 hover:bg-[var(--color-surface-hover)]"
                  }`}
                >
                  <div className="text-sm font-semibold text-[var(--color-text-primary)]">{cat.name}</div>
                  <div className="text-xs text-[var(--color-text-tertiary)] mt-1 font-mono">/{cat.slug}</div>
                </button>
              ))}
            </div>
          </div>
        )}

      {/* Step 2: Title */}
      {step === 2 && (
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-[var(--color-text-primary)]">
            {isTr ? "2. Proje Başlığı" : "2. Project Title"}
          </h2>
          <p className="text-sm text-[var(--color-text-secondary)]">
            {isTr
              ? "İlanınızı en iyi özetleyen, açık ve profesyonel bir başlık girin (20–120 karakter)."
              : "Provide a clear and professional title (20–120 characters)."}
          </p>
          <TextInput
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={
              isTr
                ? "Örn: Next.js ve Tailwind ile Modern E-Ticaret Arayüzü Geliştirilmesi"
                : "e.g. Next.js and Tailwind Modern E-Commerce Frontend Development"
            }
            maxLength={120}
          />
          <div className="text-right text-xs text-[var(--color-text-tertiary)]">
            {title.length} / 120
          </div>
        </div>
      )}

      {/* Step 3: Template Questions */}
      {step === 3 && (
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-[var(--color-text-primary)]">
            {isTr ? "3. Kategoriye Özel Sorular" : "3. Category-Specific Questions"}
          </h2>
          <p className="text-sm text-[var(--color-text-secondary)]">
            {isTr
              ? `"${selectedCategory?.name}" kategorisi için temel proje parametreleri:`
              : `Key project parameters for "${selectedCategory?.name}":`}
          </p>

          <div className="space-y-3 pt-2">
            <Checkbox
              label={
                isTr
                  ? "Kullanıcı Girişi / Üyelik Sistemi Gerekiyor"
                  : "User Authentication / Login System Required"
              }
              checked={Boolean(answers.authRequired)}
              onChange={(e) =>
                setAnswers({ ...answers, authRequired: e.target.checked })
              }
            />
            <Checkbox
              label={
                isTr
                  ? "Yönetim (Admin) Paneli Gerekiyor"
                  : "Administration Panel Required"
              }
              checked={Boolean(answers.adminRequired)}
              onChange={(e) =>
                setAnswers({ ...answers, adminRequired: e.target.checked })
              }
            />
            <Checkbox
              label={
                isTr
                  ? "Mobil Cihazlarla Tam Uyumlu (Responsive) Tasarım"
                  : "Fully Responsive Mobile/Desktop Design"
              }
              checked={Boolean(answers.responsiveRequired)}
              onChange={(e) =>
                setAnswers({ ...answers, responsiveRequired: e.target.checked })
              }
            />
          </div>
        </div>
      )}

      {/* Step 4: Detailed Scope */}
      {step === 4 && (
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-[var(--color-text-primary)]">
            {isTr ? "4. Detaylı Proje Kapsamı" : "4. Detailed Project Scope"}
          </h2>
          <p className="text-sm text-[var(--color-text-secondary)]">
            {isTr
              ? "Gereksinimlerinizi, teknik detayları ve teslim edilecek çıktıları ayrıntılı yazın (200–6000 karakter, düz metin)."
              : "Explain your technical requirements, architecture, and expected deliverables (200–6000 characters, plain text)."}
          </p>
          <TextArea
            value={scope}
            onChange={(e) => setScope(e.target.value)}
            placeholder={
              isTr
                ? "Projenin hedefleri, kullanılacak teknolojiler, beklenen özellikler ve teslim süreci hakkında detaylı bilgi verin..."
                : "Describe project goals, required tech stack, feature breakdown, and delivery milestones..."
            }
            minLength={200}
            maxLength={6000}
            showCount
            rows={8}
          />
        </div>
      )}

      {/* Step 5: Summary */}
      {step === 5 && (
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-[var(--color-text-primary)]">
            {isTr ? "5. Kısa Özet" : "5. Brief Summary"}
          </h2>
          <p className="text-sm text-[var(--color-text-secondary)]">
            {isTr
              ? "Akışta ve arama kartlarında gösterilecek 1-2 cümlelik özet (50–280 karakter)."
              : "A 1-2 sentence preview for feed and search cards (50–280 characters)."}
          </p>
          <TextArea
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            placeholder={
              isTr
                ? "Örn: Mevcut Next.js web uygulamamız için yeni bir müşteri paneli ve grafik arayüzleri geliştirilecek deneyimli frontend uzmanı aranıyor."
                : "e.g. Looking for an experienced frontend specialist to build customer dashboard and reporting views for our Next.js application."
            }
            minLength={50}
            maxLength={280}
            showCount
            rows={3}
          />
        </div>
      )}

      {/* Step 6: Tags */}
      {step === 6 && (
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-[var(--color-text-primary)]">
            {isTr ? "6. Teknoloji Etiketleri" : "6. Technology Tags"}
          </h2>
          <p className="text-sm text-[var(--color-text-secondary)]">
            {isTr
              ? "Projede kullanılacak teknolojileri virgülle ayırarak girin (en fazla 10 etiket)."
              : "Enter comma-separated technology tags (up to 10 tags)."}
          </p>
          <TextInput
            value={tagsInput}
            onChange={(e) => setTagsInput(e.target.value)}
            placeholder="React, Next.js, TypeScript, Tailwind, PostgreSQL"
          />
        </div>
      )}

      {/* Step 7: Budget */}
      {step === 7 && (
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-[var(--color-text-primary)]">
            {isTr ? "7. Bütçe Bilgisi" : "7. Budget"}
          </h2>
          <p className="text-sm text-[var(--color-text-secondary)]">
            {isTr
              ? "Bütçe aralığınızı veya görüşülebilir olduğunu belirtin."
              : "Specify your budget mode and range."}
          </p>

          <div className="grid grid-cols-3 gap-2">
            <Button
              type="button"
              variant={budgetMode === "RANGE" ? "primary" : "secondary"}
              onClick={() => setBudgetMode("RANGE")}
            >
              {isTr ? "Aralık" : "Range"}
            </Button>
            <Button
              type="button"
              variant={budgetMode === "FIXED" ? "primary" : "secondary"}
              onClick={() => setBudgetMode("FIXED")}
            >
              {isTr ? "Sabit" : "Fixed"}
            </Button>
            <Button
              type="button"
              variant={budgetMode === "NEGOTIABLE" ? "primary" : "secondary"}
              onClick={() => setBudgetMode("NEGOTIABLE")}
            >
              {isTr ? "Görüşülebilir" : "Negotiable"}
            </Button>
          </div>

          {budgetMode !== "NEGOTIABLE" && (
            <div className="grid grid-cols-3 gap-3 pt-2">
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
              {budgetMode === "RANGE" && (
                <TextInput
                  type="number"
                  placeholder={isTr ? "Maks Tutar" : "Max Amount"}
                  value={budgetMax}
                  onChange={(e) => setBudgetMax(e.target.value)}
                />
              )}
            </div>
          )}
        </div>
      )}

      {/* Step 8: Timeline */}
      {step === 8 && (
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-[var(--color-text-primary)]">
            {isTr ? "8. Teslimat Takvimi" : "8. Project Timeline"}
          </h2>
          <p className="text-sm text-[var(--color-text-secondary)]">
            {isTr
              ? "Tahmini teslim sürenizi belirleyin."
              : "Specify your expected project duration."}
          </p>

          <div className="grid grid-cols-2 gap-3">
            <TextInput
              type="number"
              placeholder="2"
              value={timelineValue}
              onChange={(e) => setTimelineValue(e.target.value)}
            />
            <Select
              value={timelineUnit}
              onChange={(e) => setTimelineUnit(e.target.value)}
              options={[
                { value: "DAYS", label: isTr ? "Gün" : "Days" },
                { value: "WEEKS", label: isTr ? "Hafta" : "Weeks" },
                { value: "MONTHS", label: isTr ? "Ay" : "Months" },
              ]}
            />
          </div>
        </div>
      )}

      {/* Step 9: Review & Declarations */}
      {step === 9 && (
        <div className="space-y-6">
          <h2 className="text-xl font-bold text-[var(--color-text-primary)]">
            {isTr ? "9. Önizleme ve Zorunlu Taahhütler" : "9. Review & Declarations"}
          </h2>

          <div className="rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-hover)] p-4 space-y-2 text-xs">
            <div><strong>{isTr ? "Kategori:" : "Category:"}</strong> {selectedCategory?.name}</div>
            <div><strong>{isTr ? "Başlık:" : "Title:"}</strong> {title}</div>
            <div><strong>{isTr ? "Özet:" : "Summary:"}</strong> {summary}</div>
            <div>
              <strong>{isTr ? "Bütçe:" : "Budget:"}</strong>{" "}
              {budgetMode === "NEGOTIABLE"
                ? isTr ? "Görüşülebilir" : "Negotiable"
                : `${budgetMin || "0"} – ${budgetMax || budgetMin} ${budgetCurrency}`}
            </div>
          </div>

          <div className="space-y-3 pt-2">
            <Checkbox
              label={
                isTr
                  ? "Tüm müzakere, sözleşme ve çalışma süreçlerinin doğrudan serbest çalışan ile yürütüleceğini kabul ediyorum."
                  : "I understand that all negotiation, contract, and delivery terms are handled directly with the freelancer."
              }
              checked={ackDirectRelationship}
              onChange={(e) => setAckDirectRelationship(e.target.checked)}
              required
            />
            <Checkbox
              label={
                isTr
                  ? "Platformun ödeme almadığını, emanet (escrow) hizmeti sunmadığını ve uyuşmazlıklarda hakem olmadığını onaylıyorum."
                  : "I acknowledge that the platform does not process payments, provide escrow, or resolve commercial disputes."
              }
              checked={ackNoPlatformPayment}
              onChange={(e) => setAckNoPlatformPayment(e.target.checked)}
              required
            />
            <Checkbox
              label={
                isTr
                  ? "Bu ilanın 7 gün boyunca yayında kalacağını, 7 gün sonunda otomatik olarak pasif hale geleceğini onaylıyorum."
                  : "I acknowledge that this listing will remain active for 7 days and will expire automatically unless renewed."
              }
              checked={ackSevenDayExpiry}
              onChange={(e) => setAckSevenDayExpiry(e.target.checked)}
              required
            />
            <Checkbox
              label={
                isTr
                  ? "İlanın platform kurallarına ve yürürlükteki mevzuata uygun olduğunu, yasaklı içerik barındırmadığını taahhüt ediyorum."
                  : "I declare that this project complies with platform acceptable use rules and applicable laws."
              }
              checked={ackProhibitedContent}
              onChange={(e) => setAckProhibitedContent(e.target.checked)}
              required
            />
          </div>
        </div>
      )}

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between border-t border-[var(--color-border-subtle)] pt-6">
        {step > 1 ? (
          <Button type="button" variant="ghost" onClick={prevStep} disabled={isSubmitting}>
            {isTr ? "← Geri" : "← Back"}
          </Button>
        ) : (
          <div />
        )}

        {step < totalSteps ? (
          <Button type="button" variant="primary" onClick={nextStep}>
            {isTr ? "Devam Et →" : "Continue →"}
          </Button>
        ) : (
          <Button
            type="button"
            variant="primary"
            onClick={handlePublish}
            isLoading={isSubmitting}
          >
            {isTr ? "İlanı Ücretsiz Yayımla" : "Publish Listing for Free"}
          </Button>
        )}
      </div>
    </div>
  </div>
  );
}
