"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  FolderTree,
  FileText,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
  Info,
  Clock,
  Coins,
} from "lucide-react";
import { Button } from "../ui/button";
import { TextInput } from "../ui/text-input";
import { TextArea } from "../ui/text-area";
import { Checkbox } from "../ui/checkbox";
import { Select } from "../ui/select";
import { getLocalizedListingPath } from "@/src/lib/i18n/routes";
import type { ListingWizardInput } from "@/src/modules/listings/wizard/schema";

export interface CategoryItem {
  id: string;
  key: string;
  slug: string;
  name: string;
}

export interface ListingWizardFormProps {
  categories: CategoryItem[];
  locale: string;
  userId?: string;
}

export function ListingWizardForm({ categories, locale, userId }: ListingWizardFormProps) {
  const isTr = locale === "tr";
  const router = useRouter();
  const draftKey = userId ? `operis_listing_draft_${userId}` : "operis_listing_draft";

  // Modern 3-Stage Stepper
  const [step, setStep] = useState(1);
  const totalSteps = 3;

  // Form State
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? "");
  const [title, setTitle] = useState("");
  const [answers, setAnswers] = useState<Record<string, unknown>>({
    authRequired: false,
    adminRequired: false,
    responsiveRequired: true,
  });
  const [scope, setScope] = useState("");
  const [summary, setSummary] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [budgetMode, setBudgetMode] = useState("RANGE");
  const [budgetCurrency, setBudgetCurrency] = useState("TRY");
  const [budgetMin, setBudgetMin] = useState("");
  const [budgetMax, setBudgetMax] = useState("");
  const [timelineMode, setTimelineMode] = useState<string>("DURATION_ESTIMATE");
  const [timelineValue, setTimelineValue] = useState("2");
  const [timelineUnit, setTimelineUnit] = useState("WEEKS");
  const [targetDate, setTargetDate] = useState("");
  const [projectType, setProjectType] = useState<string>("new_build");
  const [projectStage, setProjectStage] = useState<string>("requirements_ready");
  const [workPreference, setWorkPreference] = useState<string>("REMOTE");
  const [preferredLanguage, setPreferredLanguage] = useState<string>("any");

  // LocalStorage Draft Persistence
  useEffect(() => {
    try {
      let saved = localStorage.getItem(draftKey);
      if (!saved && !userId) {
        saved = localStorage.getItem("operis_listing_draft");
      }
      if (saved) {
        const d = JSON.parse(saved);
        if (d.categoryId) setCategoryId(d.categoryId);
        if (d.title) setTitle(d.title);
        if (d.summary) setSummary(d.summary);
        if (d.scope) setScope(d.scope);
        if (d.tagsInput) setTagsInput(d.tagsInput);
        if (d.budgetMode) setBudgetMode(d.budgetMode);
        if (d.budgetCurrency) setBudgetCurrency(d.budgetCurrency);
        if (d.budgetMin) setBudgetMin(d.budgetMin);
        if (d.budgetMax) setBudgetMax(d.budgetMax);
        if (d.timelineMode) setTimelineMode(d.timelineMode);
        if (d.timelineValue) setTimelineValue(d.timelineValue);
        if (d.timelineUnit) setTimelineUnit(d.timelineUnit);
        if (d.targetDate) setTargetDate(d.targetDate);
        if (d.projectType) setProjectType(d.projectType);
        if (d.projectStage) setProjectStage(d.projectStage);
        if (d.workPreference) setWorkPreference(d.workPreference);
        if (d.preferredLanguage) setPreferredLanguage(d.preferredLanguage);
      }
    } catch {
      // ignore
    }
  }, [draftKey, userId]);

  useEffect(() => {
    try {
      if (title || summary || scope) {
        localStorage.setItem(
          draftKey,
          JSON.stringify({
            categoryId,
            title,
            summary,
            scope,
            tagsInput,
            budgetMode,
            budgetCurrency,
            budgetMin,
            budgetMax,
            timelineMode,
            timelineValue,
            timelineUnit,
            targetDate,
            projectType,
            projectStage,
            workPreference,
            preferredLanguage,
          })
        );
      }
    } catch {
      // ignore
    }
  }, [
    categoryId,
    title,
    summary,
    scope,
    tagsInput,
    budgetMode,
    budgetCurrency,
    budgetMin,
    budgetMax,
    timelineMode,
    timelineValue,
    timelineUnit,
    targetDate,
    projectType,
    projectStage,
    workPreference,
    preferredLanguage,
  ]);

  // Review Declarations
  const [ackDirectRelationship, setAckDirectRelationship] = useState(false);
  const [ackNoPlatformPayment, setAckNoPlatformPayment] = useState(false);
  const [ackSevenDayExpiry, setAckSevenDayExpiry] = useState(false);
  const [ackProhibitedContent, setAckProhibitedContent] = useState(false);

  // Status State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedCategory = categories.find((c) => c.id === categoryId);

  // Validation per stage
  const validateStep = (currentStep: number): boolean => {
    setError(null);
    if (currentStep === 1) {
      if (!categoryId) {
        setError(isTr ? "Lütfen bir proje kategorisi seçin." : "Please select a project category.");
        return false;
      }
      if (title.trim().length < 20 || title.trim().length > 120) {
        setError(
          isTr
            ? "Proje başlığı en az 20, en fazla 120 karakter olmalıdır."
            : "Title must be between 20 and 120 characters."
        );
        return false;
      }
      if (title === title.toUpperCase() && title.length > 5) {
        setError(
          isTr
            ? "Tamamı büyük harflerden oluşan başlık kullanılamaz (§54 içerik kalite kuralı)."
            : "All-caps titles are not permitted."
        );
        return false;
      }
      if (summary.trim().length < 80 || summary.trim().length > 280) {
        setError(
          isTr
            ? "Kısa özet en az 80, en fazla 280 karakter olmalıdır (şu an: " +
                summary.trim().length +
                " karakter)."
            : "Summary must be between 80 and 280 characters."
        );
        return false;
      }
    } else if (currentStep === 2) {
      if (scope.trim().length < 200 || scope.trim().length > 6000) {
        setError(
          isTr
            ? "Proje kapsamı en az 200, en fazla 6000 karakter olmalıdır (şu an: " +
                scope.trim().length +
                " karakter)."
            : "Project scope must be between 200 and 6000 characters."
        );
        return false;
      }
    } else if (currentStep === 3) {
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
      if (timelineMode === "SPECIFIC_DATE") {
        if (!targetDate || new Date(targetDate).getTime() <= Date.now()) {
          setError(
            isTr
              ? "Lütfen gelecekte geçerli bir hedef teslim tarihi seçin."
              : "Please select a valid future target delivery date."
          );
          return false;
        }
      }
      if (
        !ackDirectRelationship ||
        !ackNoPlatformPayment ||
        !ackSevenDayExpiry ||
        !ackProhibitedContent
      ) {
        setError(
          isTr
            ? "Yayımlamak için lütfen 4 yasal taahhüt kutucuğunu da onaylayın."
            : "Please accept all 4 declaration checkboxes before publishing."
        );
        return false;
      }
    }
    return true;
  };

  const nextStep = () => {
    if (validateStep(step)) {
      setStep((prev) => Math.min(prev + 1, totalSteps));
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const prevStep = () => {
    setError(null);
    setStep((prev) => Math.max(prev - 1, 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handlePublish = async () => {
    if (!validateStep(3)) return;

    setIsSubmitting(true);
    setError(null);

    const tags = tagsInput
      .split(",")
      .map((t) => t.trim())
      .filter((t) => t.length > 0)
      .slice(0, 8);

    const mappedBudgetMode =
      budgetMode === "RANGE"
        ? "FIXED_RANGE"
        : budgetMode === "FIXED"
          ? "FIXED_EXACT"
          : "NEGOTIABLE";

    const payload = {
      categoryId,
      title: title.trim(),
      summary: summary.trim(),
      scope: scope.trim(),
      projectType: projectType as ListingWizardInput["projectType"],
      projectStage: projectStage as ListingWizardInput["projectStage"],
      answers: answers || {},
      tags,
      budgetMode: mappedBudgetMode,
      budgetCurrency: mappedBudgetMode !== "NEGOTIABLE" ? budgetCurrency : "TRY",
      budgetMin: budgetMin ? parseFloat(budgetMin) : null,
      budgetMax: budgetMax ? parseFloat(budgetMax) : null,
      timelineMode: timelineMode as ListingWizardInput["timelineMode"],
      targetDate: timelineMode === "SPECIFIC_DATE" && targetDate ? targetDate : null,
      timelineValue:
        timelineMode === "DURATION_ESTIMATE" && timelineValue ? parseInt(timelineValue, 10) : 2,
      timelineUnit: (timelineUnit || "WEEKS") as "DAYS" | "WEEKS" | "MONTHS",
      workPreference: workPreference as ListingWizardInput["workPreference"],
      preferredLanguage: preferredLanguage as ListingWizardInput["preferredLanguage"],
      noSecretsConfirmed: ackNoPlatformPayment,
      acceptableUseConfirmed: ackProhibitedContent,
      expiryAcknowledged: ackSevenDayExpiry,
      matchingRoleAcknowledged: ackDirectRelationship,
    };

    try {
      const res = await fetch("/api/listings/publish", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-locale": locale,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || (isTr ? "İlan yayınlanamadı." : "Failed to publish listing."));
      }

      try {
        localStorage.removeItem(draftKey);
        localStorage.removeItem("operis_listing_draft");
      } catch {
        // ignore
      }

      router.push(getLocalizedListingPath(data.listing.slug, locale));
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

  const stageTitles = [
    {
      step: 1,
      title: isTr ? "Proje Tanımı & Kategori" : "Project Info & Category",
      desc: isTr ? "Kategori, başlık ve kısa özet" : "Category, title & summary",
      icon: FolderTree,
    },
    {
      step: 2,
      title: isTr ? "Teknik Kapsam & Yetkinlikler" : "Technical Scope & Skills",
      desc: isTr ? "Gereksinimler ve teknoloji etiketleri" : "Deliverables & technology tags",
      icon: FileText,
    },
    {
      step: 3,
      title: isTr ? "Bütçe, Süreç & Yasal Onay" : "Budget, Timeline & Review",
      desc: isTr ? "Tahmini bütçe ve yasal güvenceler" : "Budget, timeline & guarantees",
      icon: ShieldCheck,
    },
  ];

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
        {/* 3-Stage Visual Stepper Header */}
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            {stageTitles.map((st) => {
              const Icon = st.icon;
              const isActive = step === st.step;
              const isDone = step > st.step;
              return (
                <button
                  key={st.step}
                  type="button"
                  onClick={() => {
                    if (isDone) setStep(st.step);
                  }}
                  disabled={!isDone && !isActive}
                  className={`flex flex-col items-start p-3 sm:p-3.5 rounded-2xl border text-left transition-all ${
                    isActive
                      ? "border-blue-500/60 bg-blue-500/10 text-blue-400 shadow-xs"
                      : isDone
                        ? "border-emerald-500/40 bg-emerald-500/5 text-emerald-400 hover:bg-emerald-500/10 cursor-pointer"
                        : "border-[var(--color-border-subtle)] bg-[var(--color-surface-base)]/40 text-[var(--color-text-tertiary)] opacity-60"
                  }`}
                >
                  <div className="flex items-center gap-1.5 text-xs font-bold mb-1">
                    {isDone ? (
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                    ) : (
                      <Icon className="h-3.5 w-3.5" />
                    )}
                    <span>{isTr ? `${st.step}. Aşama` : `Stage ${st.step}`}</span>
                  </div>
                  <div className="text-[11px] font-semibold text-[var(--color-text-primary)] truncate w-full">
                    {st.title}
                  </div>
                </button>
              );
            })}
          </div>

          <div
            className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--color-surface-hover)] border border-[var(--color-border-subtle)]"
            role="progressbar"
            aria-valuenow={step}
            aria-valuemin={1}
            aria-valuemax={totalSteps}
          >
            <div
              className="h-full bg-gradient-to-r from-blue-600 to-indigo-500 transition-all duration-300"
              style={{ width: `${(step / totalSteps) * 100}%` }}
            />
          </div>
        </div>

        {error && (
          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-xs font-medium text-red-400 animate-in fade-in duration-200">
            {error}
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* STAGE 1: Project Info & Category */}
        {/* ------------------------------------------------------------- */}
        {step === 1 && (
          <div className="space-y-6">
            <div className="space-y-1">
              <h2 className="text-xl font-bold text-[var(--color-text-primary)] flex items-center gap-2">
                <FolderTree className="h-5 w-5 text-blue-400" />
                <span>{isTr ? "1. Proje Tanımı ve Kategori" : "1. Project Info & Category"}</span>
              </h2>
              <p className="text-xs sm:text-sm text-[var(--color-text-secondary)]">
                {isTr
                  ? "Projenizin ana disiplinini seçin, net bir başlık ve kısa bir özet belirleyin."
                  : "Choose the technology category, clear title, and concise preview summary."}
              </p>
            </div>

            {/* Category Select (Clean Dropdown instead of 21 raw buttons) */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-[var(--color-text-primary)] block">
                {isTr ? "Proje Kategorisi *" : "Project Category *"}
              </label>
              <Select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                options={categories.map((c) => ({
                  value: c.id,
                  label: c.name,
                }))}
              />
              {selectedCategory && (
                <div className="text-[11px] text-blue-400 flex items-center gap-1.5 pt-0.5">
                  <Sparkles className="h-3 w-3" />
                  <span>
                    {isTr
                      ? `Seçilen alan: ${selectedCategory.name} (/${selectedCategory.slug})`
                      : `Selected: ${selectedCategory.name}`}
                  </span>
                </div>
              )}
            </div>

            {/* Project Title */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <label className="font-semibold text-[var(--color-text-primary)]">
                  {isTr ? "Proje Başlığı *" : "Project Title *"}
                </label>
                <span
                  className={`font-mono text-[11px] ${
                    title.length < 20 || title.length > 120 ? "text-amber-400" : "text-emerald-400"
                  }`}
                >
                  {title.length} / 120 (min: 20)
                </span>
              </div>
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
              <p className="text-[11px] text-[var(--color-text-tertiary)]">
                {isTr
                  ? "Açık ve profesyonel bir başlık girin. Tamamı büyük harf kullanımı yasaktır."
                  : "Keep it clear and professional. All-caps titles are forbidden."}
              </p>
            </div>

            {/* Project Summary */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <label className="font-semibold text-[var(--color-text-primary)]">
                  {isTr ? "Kısa Özet (Önizleme) *" : "Short Summary (Preview) *"}
                </label>
                <span
                  className={`font-mono text-[11px] ${
                    summary.length < 80 || summary.length > 280
                      ? "text-amber-400"
                      : "text-emerald-400"
                  }`}
                >
                  {summary.length} / 280 (min: 80)
                </span>
              </div>
              <TextArea
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                placeholder={
                  isTr
                    ? "Örn: Mevcut Next.js web uygulamamız için yeni bir müşteri paneli ve grafik arayüzleri geliştirecek deneyimli frontend uzmanı aranıyor."
                    : "e.g. Looking for an experienced frontend specialist to build customer dashboard and reporting views."
                }
                minLength={80}
                maxLength={280}
                rows={3}
              />

              <p className="text-[11px] text-[var(--color-text-tertiary)]">
                {isTr
                  ? "Akış kartlarında ve arama sonuçlarında gösterilecek 1-2 cümlelik vurucu özet."
                  : "Shown on search cards and public feed previews."}
              </p>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* STAGE 2: Technical Scope & Skills */}
        {/* ------------------------------------------------------------- */}
        {step === 2 && (
          <div className="space-y-6">
            <div className="space-y-1">
              <h2 className="text-xl font-bold text-[var(--color-text-primary)] flex items-center gap-2">
                <FileText className="h-5 w-5 text-cyan-400" />
                <span>
                  {isTr ? "2. Teknik Kapsam ve Yetkinlikler" : "2. Scope & Technical Skills"}
                </span>
              </h2>
              <p className="text-xs sm:text-sm text-[var(--color-text-secondary)]">
                {isTr
                  ? "İşin detaylarını, mimari gereksinimleri ve beklenen çıktıları ayrıntılı tanımlayın."
                  : "Detail the deliverables, architecture requirements, and tech stack."}
              </p>
            </div>

            {/* Detailed Scope */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <label className="font-semibold text-[var(--color-text-primary)]">
                  {isTr ? "Detaylı Proje Kapsamı *" : "Detailed Project Scope *"}
                </label>
                <span
                  className={`font-mono text-[11px] ${
                    scope.length < 200 ? "text-amber-400 font-bold" : "text-emerald-400"
                  }`}
                >
                  {scope.length} / 6000 ({isTr ? "en az 200 karakter" : "min: 200 chars"})
                </span>
              </div>
              <TextArea
                value={scope}
                onChange={(e) => setScope(e.target.value)}
                placeholder={
                  isTr
                    ? "Projenin hedefleri, mimarisi, teslim aşamaları, API entegrasyonları veya kod kalitesi beklentilerinizi ayrıntılı yazın..."
                    : "Describe project objectives, architecture, milestone deliverables, API expectations..."
                }
                minLength={200}
                maxLength={6000}
                rows={8}
              />
              <p className="text-[11px] text-[var(--color-text-tertiary)] flex items-center gap-1">
                <Info className="h-3 w-3 text-blue-400 shrink-0" />
                <span>
                  {isTr
                    ? "İlanınızın 7 günlük tazelik garantisi kapsamında onaylanması için en az 200 karakter detay yazılmalıdır."
                    : "At least 200 characters are required for quality verification."}
                </span>
              </p>
            </div>

            {/* Technology Tags */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-[var(--color-text-primary)] block">
                {isTr ? "Teknoloji Etiketleri ve Beceriler" : "Technology Tags & Skills"}
              </label>
              <TextInput
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                placeholder="React, Next.js, TypeScript, Tailwind, PostgreSQL"
              />
              <p className="text-[11px] text-[var(--color-text-tertiary)]">
                {isTr
                  ? "Kullanılacak dilleri veya kütüphaneleri virgülle ayırarak yazın (en fazla 10 etiket)."
                  : "Comma-separated keywords (max 10 tags)."}
              </p>
            </div>

            {/* Special Parameters Checkboxes */}
            <div className="rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-hover)]/30 p-4 space-y-3">
              <div className="text-xs font-bold text-[var(--color-text-primary)] uppercase tracking-wider">
                {isTr ? "Proje Özellikleri" : "Project Attributes"}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Checkbox
                  label={isTr ? "Üyelik / Auth Sistemi" : "Auth / User System"}
                  checked={Boolean(answers.authRequired)}
                  onChange={(e) => setAnswers({ ...answers, authRequired: e.target.checked })}
                />
                <Checkbox
                  label={isTr ? "Yönetim Paneli" : "Admin Dashboard"}
                  checked={Boolean(answers.adminRequired)}
                  onChange={(e) => setAnswers({ ...answers, adminRequired: e.target.checked })}
                />
                <Checkbox
                  label={isTr ? "Mobil Uyumlu (Responsive)" : "Mobile Responsive"}
                  checked={Boolean(answers.responsiveRequired)}
                  onChange={(e) => setAnswers({ ...answers, responsiveRequired: e.target.checked })}
                />
              </div>
            </div>

            {/* Project Context & Working Model */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-[var(--color-text-primary)] block">
                  {isTr ? "Proje Türü" : "Project Type"}
                </label>
                <Select
                  value={projectType}
                  onChange={(e) => setProjectType(e.target.value)}
                  options={[
                    { value: "new_build", label: isTr ? "Sıfırdan Yeni Proje" : "New Build / Green-field" },
                    { value: "improvement", label: isTr ? "Mevcut Projeyi Geliştirme" : "Feature Improvement" },
                    { value: "bug_fix", label: isTr ? "Hata Çözümü & Optimizasyon" : "Bug Fix & Optimization" },
                    { value: "migration", label: isTr ? "Altyapı / Versiyon Geçişi" : "Migration & Upgrade" },
                    { value: "integration", label: isTr ? "API & Servis Entegrasyonu" : "API & Integration" },
                    { value: "consulting", label: isTr ? "Teknik Mimari & Danışmanlık" : "Technical Consulting" },
                    { value: "audit", label: isTr ? "Güvenlik & Kod Denetimi" : "Security & Code Audit" },
                    { value: "maintenance", label: isTr ? "Sürekli Bakım & Destek" : "Ongoing Maintenance" },
                  ]}
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-[var(--color-text-primary)] block">
                  {isTr ? "Proje Aşaması" : "Project Stage"}
                </label>
                <Select
                  value={projectStage}
                  onChange={(e) => setProjectStage(e.target.value)}
                  options={[
                    { value: "idea", label: isTr ? "Fikir Aşaması (Kavramsal)" : "Idea / Conceptual" },
                    { value: "requirements_ready", label: isTr ? "Gereksinimler Hazır" : "Requirements Ready" },
                    { value: "design_ready", label: isTr ? "Tasarım / UI/UX Hazır" : "Design / Wireframes Ready" },
                    { value: "existing_code", label: isTr ? "Mevcut Kod Tabanı Var" : "Existing Codebase" },
                    { value: "production_system", label: isTr ? "Canlıda Çalışan Sistem" : "Production System" },
                  ]}
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-[var(--color-text-primary)] block">
                  {isTr ? "Çalışma Şekli" : "Work Preference"}
                </label>
                <Select
                  value={workPreference}
                  onChange={(e) => setWorkPreference(e.target.value)}
                  options={[
                    { value: "REMOTE", label: isTr ? "Uzaktan (Remote)" : "Remote" },
                    { value: "HYBRID", label: isTr ? "Hibrit" : "Hybrid" },
                    { value: "ONSITE", label: isTr ? "Ofiste / Yerinde" : "Onsite" },
                  ]}
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-[var(--color-text-primary)] block">
                  {isTr ? "İletişim Dili" : "Preferred Language"}
                </label>
                <Select
                  value={preferredLanguage}
                  onChange={(e) => setPreferredLanguage(e.target.value)}
                  options={[
                    { value: "any", label: isTr ? "Fark etmez (TR / EN)" : "Any (TR / EN)" },
                    { value: "tr", label: isTr ? "Türkçe" : "Turkish" },
                    { value: "en", label: isTr ? "İngilizce" : "English" },
                  ]}
                />
              </div>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* STAGE 3: Budget, Timeline & Declarations */}
        {/* ------------------------------------------------------------- */}
        {step === 3 && (
          <div className="space-y-6">
            <div className="space-y-1">
              <h2 className="text-xl font-bold text-[var(--color-text-primary)] flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-emerald-400" />
                <span>
                  {isTr ? "3. Bütçe, Süreç ve Yasal Beyanlar" : "3. Budget, Timeline & Terms"}
                </span>
              </h2>
              <p className="text-xs sm:text-sm text-[var(--color-text-secondary)]">
                {isTr
                  ? "Bütçe ve zaman planınızı belirleyin, platform kurallarını onaylayarak ilanınızı yayımlayın."
                  : "Specify budget, estimated delivery, and confirm platform terms."}
              </p>
            </div>

            {/* Budget & Timeline Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Budget Box */}
              <div className="rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-hover)]/30 p-4 space-y-3">
                <div className="flex items-center gap-1.5 text-xs font-bold text-[var(--color-text-primary)]">
                  <Coins className="h-4 w-4 text-emerald-400" />
                  <span>{isTr ? "Bütçe Yapısı" : "Budget Structure"}</span>
                </div>

                <div className="grid grid-cols-3 gap-1.5">
                  <Button
                    type="button"
                    size="sm"
                    variant={budgetMode === "RANGE" ? "primary" : "secondary"}
                    onClick={() => setBudgetMode("RANGE")}
                  >
                    {isTr ? "Aralık" : "Range"}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={budgetMode === "FIXED" ? "primary" : "secondary"}
                    onClick={() => setBudgetMode("FIXED")}
                  >
                    {isTr ? "Sabit" : "Fixed"}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={budgetMode === "NEGOTIABLE" ? "primary" : "secondary"}
                    onClick={() => setBudgetMode("NEGOTIABLE")}
                  >
                    {isTr ? "Görüşülür" : "Open"}
                  </Button>
                </div>

                {budgetMode !== "NEGOTIABLE" && (
                  <div className="grid grid-cols-3 gap-2 pt-1">
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
                      placeholder={isTr ? "Min Tutar" : "Min"}
                      value={budgetMin}
                      onChange={(e) => setBudgetMin(e.target.value)}
                    />
                    {budgetMode === "RANGE" && (
                      <TextInput
                        type="number"
                        placeholder={isTr ? "Maks Tutar" : "Max"}
                        value={budgetMax}
                        onChange={(e) => setBudgetMax(e.target.value)}
                      />
                    )}
                  </div>
                )}
              </div>

              {/* Timeline Box */}
              <div className="rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-hover)]/30 p-4 space-y-3">
                <div className="flex items-center gap-1.5 text-xs font-bold text-[var(--color-text-primary)]">
                  <Clock className="h-4 w-4 text-cyan-400" />
                  <span>{isTr ? "Zaman Planı" : "Timeline Plan"}</span>
                </div>

                <div className="grid grid-cols-3 gap-1.5">
                  <Button
                    type="button"
                    size="sm"
                    variant={timelineMode === "DURATION_ESTIMATE" ? "primary" : "secondary"}
                    onClick={() => setTimelineMode("DURATION_ESTIMATE")}
                  >
                    {isTr ? "Süre" : "Duration"}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={timelineMode === "SPECIFIC_DATE" ? "primary" : "secondary"}
                    onClick={() => setTimelineMode("SPECIFIC_DATE")}
                  >
                    {isTr ? "Tarih" : "Target Date"}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={timelineMode === "FLEXIBLE" ? "primary" : "secondary"}
                    onClick={() => setTimelineMode("FLEXIBLE")}
                  >
                    {isTr ? "Esnek" : "Flexible"}
                  </Button>
                </div>

                {timelineMode === "DURATION_ESTIMATE" && (
                  <div className="grid grid-cols-2 gap-2 pt-1">
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
                )}

                {timelineMode === "SPECIFIC_DATE" && (
                  <div className="pt-1">
                    <TextInput
                      type="date"
                      value={targetDate}
                      onChange={(e) => setTargetDate(e.target.value)}
                    />
                  </div>
                )}

                <p className="text-[11px] text-[var(--color-text-tertiary)]">
                  {timelineMode === "FLEXIBLE"
                    ? isTr
                      ? "Teslimat takvimi karşılıklı görüşülerek netleştirilecektir."
                      : "Milestone timeline to be agreed with the partner."
                    : isTr
                      ? "Teslimat için hedeflenen takvim aralığı."
                      : "Target milestone window."}
                </p>
              </div>
            </div>

            {/* Quick Preview Card */}
            <div className="rounded-2xl border border-blue-500/20 bg-blue-500/5 p-4 space-y-1.5 text-xs">
              <div className="font-bold text-blue-400">
                {isTr ? "İlan Özeti" : "Listing Summary"}
              </div>
              <div className="text-[var(--color-text-primary)] font-semibold truncate">{title}</div>
              <div className="text-[var(--color-text-secondary)] line-clamp-2">{summary}</div>
            </div>

            {/* 4 Mandatory Declarations */}
            <div className="space-y-3 pt-1">
              <div className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-secondary)]">
                {isTr ? "Zorunlu Yasal Beyanlar" : "Mandatory Platform Declarations"}
              </div>

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
                    ? "İlanın gizli bilgi, ticari sır veya doğrudan iletişim bilgisi (telefon, e-posta vb.) içermediğini onaylıyorum."
                    : "I confirm that this listing contains no confidential secrets, trade secrets, or direct contact information."
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
                    ? "İlanın platform kurallarına ve yürürlükteki mevzuata uygun olduğunu, yasaklı veya sahte içerik barındırmadığını taahhüt ediyorum."
                    : "I declare that this project complies with platform acceptable use rules and applicable laws."
                }
                checked={ackProhibitedContent}
                onChange={(e) => setAckProhibitedContent(e.target.checked)}
                required
              />
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* Navigation Buttons */}
        {/* ------------------------------------------------------------- */}
        <div className="flex items-center justify-between border-t border-[var(--color-border-subtle)] pt-6">
          {step > 1 ? (
            <Button type="button" variant="ghost" onClick={prevStep} disabled={isSubmitting}>
              {isTr ? "← Önceki Aşama" : "← Previous"}
            </Button>
          ) : (
            <div />
          )}

          {step < totalSteps ? (
            <Button type="button" variant="primary" onClick={nextStep}>
              {isTr ? "Sonraki Aşama →" : "Next Stage →"}
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
