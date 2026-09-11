"use client";

import React, { useState, useEffect } from "react";
import {
  User,
  AtSign,
  Globe,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Shield,
  Link as LinkIcon,
  Image as ImageIcon,
  Mail,
  Phone,
  Key,
  RefreshCw,
} from "lucide-react";
import { Button } from "../ui/button";
import { TextInput } from "../ui/text-input";
import { TextArea } from "../ui/text-area";
import { Checkbox } from "../ui/checkbox";

export interface ProfileLinkItem {
  type: string;
  label: string;
  url: string;
}

export interface ProfileSettingsFormProps {
  initialProfile: {
    displayName: string;
    handle: string;
    about: string | null;
    avatarUrl?: string | null;
    showLocation: boolean;
    revealPhoneAfterMatch: boolean;
    emailVerified?: boolean;
    phoneVerified?: boolean;
    email?: string;
    links: ProfileLinkItem[];
  };
  locale: string;
}

const getLinkTypes = (isTr: boolean) => [
  { value: "github", label: "GitHub", placeholder: "https://github.com/..." },
  {
    value: "behance",
    label: isTr ? "Behance (Portföy)" : "Behance (Portfolio)",
    placeholder: "https://behance.net/...",
  },
  {
    value: "dribbble",
    label: isTr ? "Dribbble (Tasarım)" : "Dribbble (Design)",
    placeholder: "https://dribbble.com/...",
  },
  { value: "linkedin", label: "LinkedIn", placeholder: "https://linkedin.com/in/..." },
  {
    value: "figma",
    label: isTr ? "Figma (Portföy)" : "Figma (Portfolio)",
    placeholder: "https://figma.com/@...",
  },
  { value: "gitlab", label: "GitLab", placeholder: "https://gitlab.com/..." },
  { value: "medium", label: "Medium / Blog", placeholder: "https://medium.com/@..." },
  { value: "twitter", label: "X (Twitter)", placeholder: "https://x.com/..." },
  {
    value: "website",
    label: isTr ? "Kişisel Web Sitesi" : "Personal Website",
    placeholder: isTr ? "https://alanadi.com" : "https://yourdomain.com",
  },
  {
    value: "portfolio",
    label: isTr ? "Diğer Portföy" : "Other Portfolio",
    placeholder: "https://...",
  },
];

export function ProfileSettingsForm({ initialProfile, locale }: ProfileSettingsFormProps) {
  const isTr = locale === "tr";
  const linkTypes = getLinkTypes(isTr);

  const [displayName, setDisplayName] = useState(initialProfile.displayName || "");
  const [handle, setHandle] = useState(initialProfile.handle || "");
  const [about, setAbout] = useState(initialProfile.about || "");
  const [avatarUrl, setAvatarUrl] = useState(initialProfile.avatarUrl || "");
  const [avatarPreviewError, setAvatarPreviewError] = useState(false);
  const [showLocation, setShowLocation] = useState(initialProfile.showLocation ?? false);
  const [revealPhoneAfterMatch, setRevealPhoneAfterMatch] = useState(
    initialProfile.revealPhoneAfterMatch ?? false
  );

  const [emailVerified] = useState(initialProfile.emailVerified ?? false);
  const [phoneVerified, setPhoneVerified] = useState(initialProfile.phoneVerified ?? false);
  const [showPhoneModal, setShowPhoneModal] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [isSubmittingOtp, setIsSubmittingOtp] = useState(false);
  const [isResendingEmail, setIsResendingEmail] = useState(false);
  const [isResendingPhone, setIsResendingPhone] = useState(false);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);
  const [verificationFeedback, setVerificationFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  useEffect(() => {
    if (cooldownSeconds <= 0) return;
    const timer = setInterval(() => {
      setCooldownSeconds((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldownSeconds]);

  const handleResendEmail = async () => {
    if (cooldownSeconds > 0 || isResendingEmail) return;
    setIsResendingEmail(true);
    setVerificationFeedback(null);
    try {
      const res = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-locale": locale },
        body: JSON.stringify({ type: "email", locale }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || (isTr ? "E-posta gönderilemedi." : "Failed to send email."));
      setVerificationFeedback({ type: "success", message: data.message });
      setCooldownSeconds(60);
    } catch (err: unknown) {
      setVerificationFeedback({
        type: "error",
        message: err instanceof Error ? err.message : isTr ? "E-posta gönderilemedi." : "Failed to send email.",
      });
    } finally {
      setIsResendingEmail(false);
    }
  };

  const handleResendPhone = async () => {
    if (cooldownSeconds > 0 || isResendingPhone) return;
    setIsResendingPhone(true);
    setVerificationFeedback(null);
    try {
      const res = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-locale": locale },
        body: JSON.stringify({ type: "phone", locale }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || (isTr ? "SMS gönderilemedi." : "Failed to send SMS."));
      setVerificationFeedback({ type: "success", message: data.message });
      setCooldownSeconds(60);
    } catch (err: unknown) {
      setVerificationFeedback({
        type: "error",
        message: err instanceof Error ? err.message : isTr ? "SMS gönderilemedi." : "Failed to send SMS.",
      });
    } finally {
      setIsResendingPhone(false);
    }
  };

  const handleVerifyPhone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otpCode.trim().length !== 6 || isSubmittingOtp) return;
    setIsSubmittingOtp(true);
    setVerificationFeedback(null);
    try {
      const res = await fetch("/api/auth/verify-phone", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-locale": locale },
        body: JSON.stringify({ code: otpCode.trim(), locale }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || (isTr ? "Kod doğrulanamadı." : "Verification failed."));
      setPhoneVerified(true);
      setShowPhoneModal(false);
      setOtpCode("");
      setVerificationFeedback({ type: "success", message: data.message });
    } catch (err: unknown) {
      setVerificationFeedback({
        type: "error",
        message: err instanceof Error ? err.message : isTr ? "Kod doğrulanamadı." : "Verification failed.",
      });
    } finally {
      setIsSubmittingOtp(false);
    }
  };

  useEffect(() => {
    setAvatarPreviewError(false);
  }, [avatarUrl]);

  const [links, setLinks] = useState<ProfileLinkItem[]>(initialProfile.links || []);
  const [newLinkType, setNewLinkType] = useState("github");
  const [newLinkLabel, setNewLinkLabel] = useState("");
  const [newLinkUrl, setNewLinkUrl] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(
    null
  );

  const handleAddLink = () => {
    if (!newLinkUrl.trim()) return;
    const defaultLabel =
      linkTypes.find((t) => t.value === newLinkType)?.label || (isTr ? "Bağlantı" : "Link");
    const item: ProfileLinkItem = {
      type: newLinkType,
      label: newLinkLabel.trim() || defaultLabel,
      url: newLinkUrl.trim().startsWith("http")
        ? newLinkUrl.trim()
        : `https://${newLinkUrl.trim()}`,
    };

    setLinks([...links, item]);
    setNewLinkLabel("");
    setNewLinkUrl("");
  };

  const handleRemoveLink = (index: number) => {
    setLinks(links.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setFeedback(null);

    try {
      // 1. Update Profile Information
      const resProfile = await fetch("/api/profile", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-locale": locale,
        },
        body: JSON.stringify({
          displayName: displayName.trim(),
          handle: handle.trim(),
          about: about.trim() || null,
          avatarUrl: avatarUrl.trim() || null,
          showLocation,
          revealPhoneAfterMatch,
          locale,
        }),
      });

      const dataProfile = await resProfile.json();
      if (!resProfile.ok) throw new Error(dataProfile.error || (isTr ? "Profil güncellenemedi." : "Failed to update profile."));

      // 2. Update Links
      const resLinks = await fetch("/api/profile/links", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-locale": locale,
        },
        body: JSON.stringify({ links, locale }),
      });

      const dataLinks = await resLinks.json();
      if (!resLinks.ok) throw new Error(dataLinks.error || (isTr ? "Bağlantılar güncellenemedi." : "Failed to update links."));

      setFeedback({
        type: "success",
        message: isTr
          ? "Profiliniz ve bağlantılarınız başarıyla güncellendi!"
          : "Profile and links successfully saved!",
      });
    } catch (err: unknown) {
      setFeedback({
        type: "error",
        message:
          err instanceof Error
            ? err.message
            : isTr
              ? "Güncelleme başarısız oldu."
              : "Update failed.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {feedback && (
        <div
          className={`flex items-center gap-3 rounded-2xl border p-4 text-xs ${
            feedback.type === "success"
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
              : "border-red-500/20 bg-red-500/10 text-red-400"
          }`}
        >
          {feedback.type === "success" ? (
            <CheckCircle2 className="h-5 w-5 shrink-0" aria-hidden="true" />
          ) : (
            <AlertCircle className="h-5 w-5 shrink-0" aria-hidden="true" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Section 1: Temel Profil Bilgileri */}
      <div className="rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-base)]/70 backdrop-blur-xl p-6 sm:p-7 space-y-5">
        <h2 className="text-base font-semibold text-[var(--color-text-primary)] flex items-center gap-2">
          <User className="h-4 w-4 text-blue-400" aria-hidden="true" />
          <span>{isTr ? "Temel Profil Bilgileri" : "Basic Profile Information"}</span>
        </h2>

        {/* Profil Resmi Ekleme / Önizleme Kartı */}
        <div className="p-4 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-hover)]/40 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-start gap-4">
            {/* Live Preview Avatar */}
            <div className="flex items-center gap-3 sm:flex-col sm:items-center shrink-0">
              <div className="h-16 w-16 rounded-full border-2 border-blue-500/30 bg-blue-500/10 text-blue-400 flex items-center justify-center font-bold text-base overflow-hidden shadow-inner shrink-0">
                {avatarUrl.trim() && !avatarPreviewError ? (
                  <img
                    src={avatarUrl.trim()}
                    alt={displayName || "Profil Resmi"}
                    className="w-full h-full object-cover rounded-full"
                    onError={() => setAvatarPreviewError(true)}
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <span>
                    {(displayName || "DY")
                      .trim()
                      .split(/\s+/)
                      .map((p) => p[0])
                      .slice(0, 2)
                      .join("")
                      .toUpperCase() || "DY"}
                  </span>
                )}
              </div>
              <span className="text-[10px] text-[var(--color-text-tertiary)] uppercase font-semibold tracking-wider sm:text-center">
                {isTr ? "Önizleme" : "Preview"}
              </span>
            </div>

            {/* Input & Açıklama */}
            <div className="min-w-0 flex-1 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <label className="text-xs font-semibold text-[var(--color-text-primary)] flex items-center gap-1.5">
                  <ImageIcon className="h-3.5 w-3.5 text-blue-400" aria-hidden="true" />
                  <span>
                    {isTr ? "Profil Resmi Bağlantısı (URL)" : "Profile Picture Link (URL)"}
                  </span>
                </label>
                {avatarUrl.trim().length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setAvatarUrl("");
                      setAvatarPreviewError(false);
                    }}
                    className="text-[11px] font-medium text-red-400 hover:text-red-300 transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 className="h-3 w-3" aria-hidden="true" />
                    <span>{isTr ? "Resmi Kaldır" : "Remove Picture"}</span>
                  </button>
                )}
              </div>

              <TextInput
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                placeholder="https://images.unsplash.com/... veya https://avatars.githubusercontent.com/..."
                startIcon={
                  <LinkIcon
                    className="h-4 w-4 text-[var(--color-text-tertiary)]"
                    aria-hidden="true"
                  />
                }
              />

              <p className="text-[11px] text-[var(--color-text-tertiary)] leading-normal">
                {isTr
                  ? "Sistem güvenliği ve gizliliğiniz gereği sunucularımıza doğrudan görsel dosyası yüklenmez. GitHub, Gravatar, Unsplash veya diğer halka açık doğrudan görsel bağlantınızı (HTTPS) yapıştırabilirsiniz."
                  : "For privacy and system security, image files are not stored on our servers. Paste any direct public HTTPS image URL from GitHub, Gravatar, Unsplash, or CDN."}
              </p>

              {avatarUrl.trim().length > 0 && avatarPreviewError && (
                <div className="text-[11px] text-amber-400/90 flex items-center gap-1.5 bg-amber-500/10 px-2.5 py-1.5 rounded-lg border border-amber-500/20">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  <span>
                    {isTr
                      ? "Görsel yüklenemedi. Lütfen doğrudan bir görsel URL'si (PNG, JPG, WebP) girdiğinizden emin olun."
                      : "Image failed to load. Please make sure the URL points directly to an image."}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <TextInput
            label={isTr ? "Görünen Adınız" : "Display Name"}
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder={isTr ? "Ad Soyad veya Takma Ad" : "Full Name or Alias"}
            required
            startIcon={<User className="h-4 w-4" aria-hidden="true" />}
          />

          <TextInput
            label={isTr ? "Kullanıcı Adı (Handle)" : "Username (Handle)"}
            value={handle}
            onChange={(e) => setHandle(e.target.value)}
            placeholder={isTr ? "kullaniciadi" : "username"}
            required
            startIcon={<AtSign className="h-4 w-4" aria-hidden="true" />}
          />
        </div>

        <TextArea
          label={isTr ? "Hakkınızda & Biyografi" : "About & Bio"}
          value={about}
          onChange={(e) => setAbout(e.target.value)}
          placeholder={
            isTr
              ? "Teknoloji deneyimleriniz, uzmanlık alanlarınız ve odaklandığınız projelerden bahsedin..."
              : "Describe your engineering experience, core tech stack, and focus..."
          }
          rows={4}
        />
      </div>

      {/* Section: Hesap ve Güvenlik Doğrulamaları */}
      <div className="rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-base)]/70 backdrop-blur-xl p-6 sm:p-7 space-y-5">
        <h2 className="text-base font-semibold text-[var(--color-text-primary)] flex items-center gap-2">
          <Shield className="h-4 w-4 text-emerald-400" aria-hidden="true" />
          <span>{isTr ? "Hesap ve Güvenlik Doğrulamaları" : "Account & Security Verifications"}</span>
        </h2>

        {verificationFeedback && (
          <div
            className={`flex items-center gap-3 rounded-xl border p-3.5 text-xs ${
              verificationFeedback.type === "success"
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                : "border-red-500/20 bg-red-500/10 text-red-400"
            }`}
          >
            {verificationFeedback.type === "success" ? (
              <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
            ) : (
              <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
            )}
            <span>{verificationFeedback.message}</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* E-Posta Doğrulama Kartı */}
          <div className="p-4 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-hover)]/30 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-blue-400" aria-hidden="true" />
                <span className="text-xs font-semibold text-[var(--color-text-primary)]">
                  {isTr ? "E-Posta Adresi" : "Email Address"}
                </span>
              </div>
              {emailVerified ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
                  <span>{isTr ? "Doğrulandı" : "Verified"}</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  <AlertCircle className="h-3 w-3" aria-hidden="true" />
                  <span>{isTr ? "Doğrulanmadı" : "Unverified"}</span>
                </span>
              )}
            </div>
            <p className="text-xs text-[var(--color-text-secondary)] truncate">
              {initialProfile.email || "—"}
            </p>
            {!emailVerified && (
              <div className="pt-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleResendEmail}
                  disabled={cooldownSeconds > 0 || isResendingEmail}
                  className="w-full text-xs font-medium gap-1.5 h-8 cursor-pointer"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${isResendingEmail ? "animate-spin" : ""}`} aria-hidden="true" />
                  <span>
                    {cooldownSeconds > 0
                      ? `${isTr ? "Tekrar gönder" : "Resend in"} (${cooldownSeconds}s)`
                      : isTr ? "Doğrulama E-postası Gönder" : "Send Verification Email"}
                  </span>
                </Button>
              </div>
            )}
          </div>

          {/* Telefon Doğrulama Kartı */}
          <div className="p-4 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-hover)]/30 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-purple-400" aria-hidden="true" />
                <span className="text-xs font-semibold text-[var(--color-text-primary)]">
                  {isTr ? "Telefon Numarası" : "Phone Number"}
                </span>
              </div>
              {phoneVerified ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
                  <span>{isTr ? "Doğrulandı" : "Verified"}</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  <AlertCircle className="h-3 w-3" aria-hidden="true" />
                  <span>{isTr ? "Doğrulanmadı" : "Unverified"}</span>
                </span>
              )}
            </div>
            <p className="text-[11px] text-[var(--color-text-tertiary)]">
              {phoneVerified
                ? isTr ? "Telefon numaranız güvenle şifrelenmiş ve doğrulanmıştır." : "Your phone number is encrypted and verified."
                : isTr ? "İlan verme ve teklif gönderme işlemleri için telefon doğrulaması zorunludur." : "Phone verification is required to publish listings and submit offers."}
            </p>
            {!phoneVerified && (
              <div className="pt-1 flex items-center gap-2">
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    setShowPhoneModal(true);
                    if (cooldownSeconds === 0) {
                      handleResendPhone();
                    }
                  }}
                  className="flex-1 text-xs font-semibold gap-1.5 h-8 cursor-pointer"
                >
                  <Key className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>{isTr ? "Telefonu Doğrula (SMS OTP)" : "Verify Phone (SMS OTP)"}</span>
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Inline OTP Input Modal/Card */}
        {showPhoneModal && !phoneVerified && (
          <div className="p-4 rounded-xl border border-blue-500/30 bg-blue-500/5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[var(--color-text-primary)] flex items-center gap-1.5">
                <Key className="h-4 w-4 text-blue-400" aria-hidden="true" />
                <span>{isTr ? "SMS ile Gelen 6 Haneli Doğrulama Kodunu Giriniz" : "Enter the 6-digit SMS verification code"}</span>
              </span>
              <button
                type="button"
                onClick={() => setShowPhoneModal(false)}
                className="text-xs text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)]"
              >
                {isTr ? "Vazgeç" : "Cancel"}
              </button>
            </div>

            <div className="flex flex-col sm:flex-row gap-2.5">
              <input
                type="text"
                maxLength={6}
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                placeholder="123456"
                className="w-full sm:w-48 h-9 text-center tracking-widest text-base font-mono font-bold rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-base)] text-[var(--color-text-primary)] focus:outline-none focus:border-blue-500"
              />
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={handleVerifyPhone}
                disabled={otpCode.length !== 6 || isSubmittingOtp}
                isLoading={isSubmittingOtp}
                className="text-xs font-semibold h-9 px-4 cursor-pointer"
              >
                {isTr ? "Kodu Onayla" : "Confirm Code"}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleResendPhone}
                disabled={cooldownSeconds > 0 || isResendingPhone}
                className="text-xs font-medium h-9 px-3 gap-1 cursor-pointer"
              >
                <RefreshCw className={`h-3 w-3 ${isResendingPhone ? "animate-spin" : ""}`} aria-hidden="true" />
                <span>
                  {cooldownSeconds > 0
                    ? `${isTr ? "Tekrar gönder" : "Resend in"} (${cooldownSeconds}s)`
                    : isTr ? "Tekrar Kod Gönder" : "Resend Code"}
                </span>
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Section 2: Gizlilik ve Görünürlük Tercihleri */}
      <div className="rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-base)]/70 backdrop-blur-xl p-6 sm:p-7 space-y-4">
        <h2 className="text-base font-semibold text-[var(--color-text-primary)] flex items-center gap-2">
          <Shield className="h-4 w-4 text-purple-400" aria-hidden="true" />
          <span>{isTr ? "Gizlilik & İletişim Tercihleri" : "Privacy & Contact Preferences"}</span>
        </h2>

        <div className="space-y-3 pt-1">
          <Checkbox
            label={
              <div>
                <span className="font-medium text-xs text-[var(--color-text-primary)]">
                  {isTr ? "Konumumu Profilimde Göster" : "Show Location on Profile"}
                </span>
                <p className="text-[11px] text-[var(--color-text-tertiary)]">
                  {isTr
                    ? "Ülke ve şehir bilginiz herkese açık profilinizde rozet olarak listelenir."
                    : "Your city and country will be shown publicly on your profile badge."}
                </p>
              </div>
            }
            checked={showLocation}
            onChange={(e) => setShowLocation(e.target.checked)}
          />

          <Checkbox
            label={
              <div>
                <span className="font-medium text-xs text-[var(--color-text-primary)]">
                  {isTr
                    ? "Eşleşme Sonrası Telefon Numaramı Paylaş"
                    : "Reveal Phone Number After Match"}
                </span>
                <p className="text-[11px] text-[var(--color-text-tertiary)]">
                  {isTr
                    ? "Bir teklif kabul edildiğinde oluşturulan özel çalışma alanında karşı tarafa telefon numaranız gösterilir."
                    : "Reveals your verified phone number in the direct match workspace once a proposal is accepted."}
                </p>
              </div>
            }
            checked={revealPhoneAfterMatch}
            onChange={(e) => setRevealPhoneAfterMatch(e.target.checked)}
          />
        </div>
      </div>

      {/* Section 3: Sosyal ve Portföy Bağlantıları */}
      <div className="rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-base)]/70 backdrop-blur-xl p-6 sm:p-7 space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-[var(--color-text-primary)] flex items-center gap-2">
            <LinkIcon className="h-4 w-4 text-emerald-400" aria-hidden="true" />
            <span>{isTr ? "Sosyal & Portföy Bağlantıları" : "Social & Portfolio Links"}</span>
          </h2>
          <span className="text-xs text-[var(--color-text-tertiary)]">
            {links.length} / 10 {isTr ? "bağlantı" : "links"}
          </span>
        </div>

        {/* Existing links */}
        {links.length > 0 && (
          <div className="space-y-2">
            {links.map((link, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between gap-3 p-3 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-hover)]"
              >
                <div className="flex items-center gap-2.5 truncate">
                  <Globe className="h-4 w-4 text-blue-400 shrink-0" aria-hidden="true" />
                  <span className="font-medium text-xs text-[var(--color-text-primary)]">
                    {link.label}
                  </span>
                  <span className="text-xs text-[var(--color-text-tertiary)] truncate max-w-[280px]">
                    {link.url}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveLink(idx)}
                  className="text-red-400 hover:text-red-300 p-1 rounded-lg hover:bg-red-500/10 cursor-pointer transition-colors"
                  title={isTr ? "Sil" : "Remove"}
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Add Link Input Group */}
        {links.length < 10 && (
          <div className="p-4 rounded-xl border border-dashed border-[var(--color-border-subtle)] bg-[var(--color-surface-hover)]/40 space-y-3">
            <span className="text-xs font-medium text-[var(--color-text-secondary)]">
              {isTr ? "+ Yeni Bağlantı Ekle" : "+ Add New Link"}
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
              <div className="sm:col-span-3">
                <select
                  value={newLinkType}
                  onChange={(e) => setNewLinkType(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-base)] text-xs text-[var(--color-text-primary)] focus:outline-none focus:border-blue-500"
                >
                  {linkTypes.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-3">
                <input
                  type="text"
                  placeholder={isTr ? "Etiket (Örn: GitHub)" : "Label (e.g. GitHub)"}
                  value={newLinkLabel}
                  onChange={(e) => setNewLinkLabel(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-base)] text-xs text-[var(--color-text-primary)] focus:outline-none focus:border-blue-500"
                />
              </div>
              <div className="sm:col-span-4">
                <input
                  type="url"
                  placeholder={
                    linkTypes.find((t) => t.value === newLinkType)?.placeholder || "https://..."
                  }
                  value={newLinkUrl}
                  onChange={(e) => setNewLinkUrl(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-base)] text-xs text-[var(--color-text-primary)] focus:outline-none focus:border-blue-500"
                />
              </div>
              <div className="sm:col-span-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="md"
                  onClick={handleAddLink}
                  className="w-full h-10 gap-1.5 text-xs font-semibold cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>{isTr ? "Ekle" : "Add"}</span>
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Save Button */}
      <div className="flex justify-end pt-2">
        <Button
          type="submit"
          variant="primary"
          size="lg"
          className="font-semibold text-sm px-8"
          isLoading={isLoading}
        >
          {isTr ? "Değişiklikleri Kaydet" : "Save Changes"}
        </Button>
      </div>
    </form>
  );
}
