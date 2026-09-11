"use client";

import React, { useState } from "react";
import {
  Lock,
  Shield,
  Smartphone,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  Laptop,
  Trash2,
  AlertTriangle,
  X,
} from "lucide-react";
import { Button } from "../ui/button";
import { TextInput } from "../ui/text-input";
import { TextArea } from "../ui/text-area";
import { Badge } from "../ui/badge";

export interface SecuritySettingsViewProps {
  locale: string;
  twoFactorEnabled: boolean;
}

export function SecuritySettingsView({ locale, twoFactorEnabled }: SecuritySettingsViewProps) {
  const isTr = locale === "tr";

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(
    null
  );

  const [is2FAEnabled, setIs2FAEnabled] = useState(twoFactorEnabled);
  const [is2FALoading, setIs2FALoading] = useState(false);
  const [is2FASetupModalOpen, setIs2FASetupModalOpen] = useState(false);
  const [is2FADisableModalOpen, setIs2FADisableModalOpen] = useState(false);
  const [setupSecret, setSetupSecret] = useState("");
  const [_setupOtpUri, setSetupOtpUri] = useState("");
  const [setupTotpCode, setSetupTotpCode] = useState("");
  const [disableAuthInput, setDisableAuthInput] = useState("");
  const [setupError, setSetupError] = useState<string | null>(null);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleteReason, setDeleteReason] = useState("");
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setFeedback({
        type: "error",
        message: isTr ? "Yeni şifreler eşleşmiyor." : "New passwords do not match.",
      });
      return;
    }

    setIsLoading(true);
    setFeedback(null);

    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-locale": locale,
        },
        body: JSON.stringify({ currentPassword, newPassword, locale }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || (isTr ? "Şifre değiştirilemedi." : "Failed to change password."));

      setFeedback({
        type: "success",
        message: isTr ? "Şifreniz başarıyla değiştirildi." : "Password successfully updated.",
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: unknown) {
      setFeedback({
        type: "error",
        message:
          err instanceof Error ? err.message : isTr ? "İşlem başarısız oldu." : "Operation failed.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggle2FA = async () => {
    if (is2FAEnabled) {
      setDisableAuthInput("");
      setSetupError(null);
      setIs2FADisableModalOpen(true);
      return;
    }

    setIs2FALoading(true);
    setSetupError(null);
    try {
      const res = await fetch("/api/auth/2fa", {
        headers: { "x-locale": locale },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "2FA kurulumu başlatılamadı.");

      setSetupSecret(data.secret);
      setSetupOtpUri(data.otpAuthUri || "");
      setSetupTotpCode("");
      setIs2FASetupModalOpen(true);
    } catch (err: unknown) {
      setFeedback({
        type: "error",
        message: err instanceof Error ? err.message : "2FA kurulum bilgisi alınamadı.",
      });
    } finally {
      setIs2FALoading(false);
    }
  };

  const handleConfirmEnable2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!setupTotpCode.trim() || setupTotpCode.trim().length !== 6) {
      setSetupError(isTr ? "Lütfen 6 haneli doğrulama kodunu giriniz." : "Please enter the 6-digit code.");
      return;
    }

    setIs2FALoading(true);
    setSetupError(null);

    try {
      const res = await fetch("/api/auth/2fa", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-locale": locale,
        },
        body: JSON.stringify({
          enabled: true,
          secret: setupSecret,
          totpCode: setupTotpCode.trim(),
          locale,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || (isTr ? "2FA doğrulanamadı." : "Failed to verify 2FA."));

      setIs2FAEnabled(true);
      setIs2FASetupModalOpen(false);
      setFeedback({
        type: "success",
        message: isTr
          ? "İki aşamalı doğrulama (2FA) başarıyla aktif edildi."
          : "Two-factor authentication enabled successfully.",
      });
    } catch (err: unknown) {
      setSetupError(err instanceof Error ? err.message : "Doğrulama hatası.");
    } finally {
      setIs2FALoading(false);
    }
  };

  const handleConfirmDisable2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!disableAuthInput.trim()) {
      setSetupError(isTr ? "Lütfen şifrenizi veya 2FA kodunuzu giriniz." : "Please enter your password or 2FA code.");
      return;
    }

    setIs2FALoading(true);
    setSetupError(null);

    try {
      const isOtp = /^\d{6}$/.test(disableAuthInput.trim());
      const res = await fetch("/api/auth/2fa", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-locale": locale,
        },
        body: JSON.stringify({
          enabled: false,
          password: !isOtp ? disableAuthInput.trim() : undefined,
          totpCode: isOtp ? disableAuthInput.trim() : undefined,
          locale,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || (isTr ? "2FA kapatılamadı." : "Failed to disable 2FA."));

      setIs2FAEnabled(false);
      setIs2FADisableModalOpen(false);
      setFeedback({
        type: "success",
        message: isTr
          ? "İki aşamalı doğrulama devre dışı bırakıldı."
          : "Two-factor authentication disabled.",
      });
    } catch (err: unknown) {
      setSetupError(err instanceof Error ? err.message : "Doğrulama hatası.");
    } finally {
      setIs2FALoading(false);
    }
  };

  const handleDeleteAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    const expectedConfirm = isTr ? "HESABIMI SİL" : "DELETE";
    if (deleteConfirmText.trim() !== expectedConfirm) {
      setFeedback({
        type: "error",
        message: isTr
          ? `Lütfen onaylamak için tam olarak "${expectedConfirm}" yazınız.`
          : `Please type exactly "${expectedConfirm}" to confirm.`,
      });
      return;
    }

    setIsDeletingAccount(true);
    setFeedback(null);

    try {
      const res = await fetch("/api/account/delete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-locale": locale,
        },
        body: JSON.stringify({ reason: deleteReason.trim(), locale }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || (isTr ? "Hesap silinemedi." : "Failed to delete account."));

      setIsDeleteModalOpen(false);
      setFeedback({
        type: "success",
        message: isTr
          ? "Hesabınız ve kişisel verileriniz kalıcı olarak silindi. Yönlendiriliyorsunuz..."
          : "Your account and personal data have been permanently deleted. Redirecting...",
      });

      setTimeout(() => {
        window.location.href = isTr ? "/tr" : "/en";
      }, 1200);
    } catch (err: unknown) {
      setFeedback({
        type: "error",
        message:
          err instanceof Error
            ? err.message
            : isTr
              ? "Hesap silme işlemi başarısız oldu."
              : "Account deletion failed.",
      });
    } finally {
      setIsDeletingAccount(false);
    }
  };

  return (
    <div className="space-y-8">
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

      {/* Section 1: Password Change */}
      <form
        onSubmit={handlePasswordChange}
        className="rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-base)]/70 backdrop-blur-xl p-6 sm:p-7 space-y-4 shadow-sm"
      >
        <h2 className="text-base font-semibold text-[var(--color-text-primary)] flex items-center gap-2">
          <Lock className="h-4 w-4 text-blue-400" aria-hidden="true" />
          <span>{isTr ? "Şifre Değiştir" : "Change Password"}</span>
        </h2>

        <div className="space-y-3 max-w-md">
          <TextInput
            label={isTr ? "Mevcut Şifreniz" : "Current Password"}
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
            startIcon={<KeyRound className="h-4 w-4" aria-hidden="true" />}
          />

          <TextInput
            label={isTr ? "Yeni Şifre" : "New Password"}
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            startIcon={<Lock className="h-4 w-4" aria-hidden="true" />}
          />

          <TextInput
            label={isTr ? "Yeni Şifre (Tekrar)" : "Confirm New Password"}
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            startIcon={<Lock className="h-4 w-4" aria-hidden="true" />}
          />
        </div>

        <div className="pt-2">
          <Button
            type="submit"
            variant="primary"
            size="md"
            className="font-semibold text-xs px-6"
            isLoading={isLoading}
          >
            {isTr ? "Şifreyi Güncelle" : "Update Password"}
          </Button>
        </div>
      </form>

      {/* Section 2: Two-Factor Authentication (2FA) */}
      <div className="rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-base)]/70 backdrop-blur-xl p-6 sm:p-7 space-y-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <h2 className="text-base font-semibold text-[var(--color-text-primary)] flex items-center gap-2">
              <Smartphone className="h-4 w-4 text-purple-400" aria-hidden="true" />
              <span>
                {isTr ? "İki Aşamalı Doğrulama (2FA - TOTP)" : "Two-Factor Authentication (2FA)"}
              </span>
            </h2>
            <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed max-w-xl">
              {isTr
                ? "Giriş yaparken şifrenize ek olarak Google Authenticator veya 1Password uygulamanızdan 6 haneli tek kullanımlık kod istenir."
                : "Require a 6-digit TOTP verification code from your authenticator app on every login."}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Badge variant={is2FAEnabled ? "primary" : "outline"} size="sm">
              {is2FAEnabled ? (isTr ? "AKTİF" : "ENABLED") : isTr ? "DEVRE DIŞI" : "DISABLED"}
            </Badge>

            <Button
              type="button"
              variant={is2FAEnabled ? "outline" : "primary"}
              size="sm"
              onClick={handleToggle2FA}
              isLoading={is2FALoading}
              className="text-xs font-semibold"
            >
              {is2FAEnabled
                ? isTr
                  ? "Devre Dışı Bırak"
                  : "Disable 2FA"
                : isTr
                  ? "2FA Kur & Etkinleştir"
                  : "Setup 2FA"}
            </Button>
          </div>
        </div>
      </div>

      {/* Section 3: Active Sessions & Audit */}
      <div className="rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-base)]/70 backdrop-blur-xl p-6 sm:p-7 space-y-4 shadow-sm">
        <h2 className="text-base font-semibold text-[var(--color-text-primary)] flex items-center gap-2">
          <Laptop className="h-4 w-4 text-emerald-400" aria-hidden="true" />
          <span>
            {isTr ? "Aktif Oturum ve Güvenlik Durumu" : "Active Session & Security Status"}
          </span>
        </h2>

        <div className="p-4 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-hover)] flex items-center justify-between text-xs">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <Shield className="h-4 w-4" aria-hidden="true" />
            </div>
            <div>
              <p className="font-semibold text-[var(--color-text-primary)]">
                {isTr ? "Mevcut Oturum (Bu Cihaz)" : "Current Session (This Device)"}
              </p>
              <p className="text-[11px] text-[var(--color-text-tertiary)]">
                {isTr
                  ? "HTTP-Only Güvenli Oturum Çerezi ile korunuyor"
                  : "Secured with HTTP-Only cookie"}
              </p>
            </div>
          </div>

          <span className="inline-flex items-center gap-1.5 text-[11px] text-emerald-400 font-medium">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>{isTr ? "Canlı" : "Active"}</span>
          </span>
        </div>
      </div>

      {/* Section 4: Danger Zone - Account Deletion */}
      <div className="rounded-2xl border border-red-500/30 bg-red-500/5 backdrop-blur-xl p-6 sm:p-7 space-y-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-base font-semibold text-red-400 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-400" aria-hidden="true" />
              <span>{isTr ? "Tehlikeli Bölge: Hesabı ve Verileri Sil" : "Danger Zone: Delete Account & Data"}</span>
            </h2>
            <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed max-w-xl">
              {isTr
                ? "KVKK ve GDPR gereğince profil bilgileriniz, şifreli kimlik kayıtlarınız ve taslak ilanlarınız kalıcı olarak temizlenir. Bu işlem geri alınamaz."
                : "Under GDPR and KVKK, your public profile, encrypted identity records, and draft listings will be permanently purged. This action cannot be undone."}
            </p>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setIsDeleteModalOpen(true);
              setDeleteConfirmText("");
              setDeleteReason("");
            }}
            className="border-red-500/40 text-red-400 hover:bg-red-500/10 hover:border-red-500/60 text-xs font-semibold gap-1.5 cursor-pointer"
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
            <span>{isTr ? "Hesabımı Sil" : "Delete My Account"}</span>
          </Button>
        </div>
      </div>

      {/* Confirmation Modal */}
      {isDeleteModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200"
          role="dialog"
          aria-modal="true"
          aria-label={isTr ? "Hesap Silme Onayı" : "Account Deletion Confirmation"}
        >
          <div className="relative w-full max-w-md rounded-2xl border border-red-500/30 bg-[var(--color-surface-base)] p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-[var(--color-border-subtle)] pb-4">
              <div className="flex items-center gap-2.5 text-red-400">
                <div className="h-9 w-9 rounded-xl bg-red-500/15 border border-red-500/25 flex items-center justify-center">
                  <Trash2 className="h-5 w-5" aria-hidden="true" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[var(--color-text-primary)]">
                    {isTr ? "Hesabınızı Silmek Üzeresiniz" : "Confirm Account Deletion"}
                  </h3>
                  <p className="text-[11px] text-[var(--color-text-tertiary)]">
                    {isTr ? "Geri Alınamaz İşlem" : "Permanent & Irreversible"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                className="p-1 rounded-lg text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-hover)] transition-colors cursor-pointer"
                aria-label={isTr ? "Kapat" : "Close"}
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
              {isTr
                ? "Hesabınızı sildiğinizde açık teklifleriniz geri çekilecek, aktif ilanlarınız sonlandırılacak ve profiliniz 'Eski Kullanıcı' olarak anonimleştirilecektir. Devam eden veya uyuşmazlık incelemesindeki projeleriniz varsa silme işlemi engellenecektir."
                : "Deleting your account will withdraw pending proposals, conclude active listings, and anonymize your profile. If you have active or disputed engagements, account deletion will be blocked."}
            </p>

            <form onSubmit={handleDeleteAccount} className="space-y-4">
              <TextArea
                label={isTr ? "Ayrılma Nedeni (İsteğe Bağlı)" : "Reason for Leaving (Optional)"}
                value={deleteReason}
                onChange={(e) => setDeleteReason(e.target.value)}
                rows={2}
                placeholder={isTr ? "Operis deneyiminizi nasıl geliştirebiliriz?" : "How could we improve?"}
              />

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[var(--color-text-primary)]">
                  {isTr
                    ? "Onaylamak için lütfen \"HESABIMI SİL\" yazınız:"
                    : "Please type \"DELETE\" to confirm:"}
                </label>
                <TextInput
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder={isTr ? "HESABIMI SİL" : "DELETE"}
                  required
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-[var(--color-border-subtle)]">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setIsDeleteModalOpen(false)}
                  disabled={isDeletingAccount}
                >
                  {isTr ? "Vazgeç" : "Cancel"}
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={
                    isDeletingAccount ||
                    deleteConfirmText.trim() !== (isTr ? "HESABIMI SİL" : "DELETE")
                  }
                  isLoading={isDeletingAccount}
                  className="bg-red-600 hover:bg-red-700 text-white font-semibold cursor-pointer"
                >
                  {isTr ? "Kalıcı Olarak Sil" : "Permanently Delete"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2FA Setup Modal */}
      {is2FASetupModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200"
          role="dialog"
          aria-modal="true"
          aria-label={isTr ? "2FA Kurulumu" : "2FA Setup"}
        >
          <div className="relative w-full max-w-md rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-base)] p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-[var(--color-border-subtle)] pb-4">
              <div className="flex items-center gap-2.5 text-purple-400">
                <Smartphone className="h-5 w-5" aria-hidden="true" />
                <h3 className="font-semibold text-sm text-[var(--color-text-primary)]">
                  {isTr ? "İki Aşamalı Doğrulama Kurulumu" : "Two-Factor Authentication Setup"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIs2FASetupModalOpen(false)}
                className="text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] transition-colors"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleConfirmEnable2FA} className="space-y-4">
              {setupError && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-400">
                  {setupError}
                </div>
              )}

              <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
                {isTr
                  ? "Google Authenticator veya 1Password uygulamanıza aşağıdaki gizli anahtarı manuel ekleyin veya taratın:"
                  : "Add the following secret key to your Authenticator app (Google Authenticator, 1Password):"}
              </p>

              <div className="p-3 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-hover)] font-mono text-center text-sm tracking-wider text-purple-400 select-all break-all">
                {setupSecret}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[var(--color-text-secondary)]">
                  {isTr ? "Uygulamadaki 6 Haneli Kod" : "6-Digit Authenticator Code"}
                </label>
                <TextInput
                  value={setupTotpCode}
                  onChange={(e) => setSetupTotpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="000000"
                  maxLength={6}
                  required
                  className="text-center font-mono text-base tracking-widest"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-[var(--color-border-subtle)]">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setIs2FASetupModalOpen(false)}
                  disabled={is2FALoading}
                >
                  {isTr ? "Vazgeç" : "Cancel"}
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  isLoading={is2FALoading}
                  disabled={setupTotpCode.length !== 6}
                >
                  {isTr ? "Doğrula ve Etkinleştir" : "Verify & Enable"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2FA Disable Modal (Re-authentication required) */}
      {is2FADisableModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200"
          role="dialog"
          aria-modal="true"
          aria-label={isTr ? "2FA Kapatma Onayı" : "Disable 2FA Confirmation"}
        >
          <div className="relative w-full max-w-md rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-base)] p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-[var(--color-border-subtle)] pb-4">
              <div className="flex items-center gap-2.5 text-amber-400">
                <Shield className="h-5 w-5" aria-hidden="true" />
                <h3 className="font-semibold text-sm text-[var(--color-text-primary)]">
                  {isTr ? "2FA Devre Dışı Bırakma" : "Disable Two-Factor Authentication"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIs2FADisableModalOpen(false)}
                className="text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] transition-colors"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleConfirmDisable2FA} className="space-y-4">
              {setupError && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-400">
                  {setupError}
                </div>
              )}

              <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
                {isTr
                  ? "Güvenliğiniz için iki aşamalı doğrulamayı kapatmadan önce hesap şifrenizi veya güncel 6 haneli 2FA kodunuzu giriniz:"
                  : "For security reasons, please enter your current account password or active 6-digit TOTP code to disable 2FA:"}
              </p>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[var(--color-text-secondary)]">
                  {isTr ? "Şifre veya 6 Haneli 2FA Kodu" : "Password or 6-digit 2FA Code"}
                </label>
                <TextInput
                  type="password"
                  value={disableAuthInput}
                  onChange={(e) => setDisableAuthInput(e.target.value)}
                  placeholder={isTr ? "Mevcut şifreniz veya 2FA kodu" : "Current password or 2FA code"}
                  required
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-[var(--color-border-subtle)]">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setIs2FADisableModalOpen(false)}
                  disabled={is2FALoading}
                >
                  {isTr ? "Vazgeç" : "Cancel"}
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  isLoading={is2FALoading}
                  disabled={!disableAuthInput.trim()}
                  className="bg-amber-600 hover:bg-amber-700 text-white"
                >
                  {isTr ? "Onayla ve Kapat" : "Confirm & Disable"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
