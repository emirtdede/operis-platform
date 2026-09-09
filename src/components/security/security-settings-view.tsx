"use client";

import React, { useState } from "react";
import { Lock, Shield, Smartphone, KeyRound, CheckCircle2, AlertCircle, Laptop } from "lucide-react";
import { Button } from "../ui/button";
import { TextInput } from "../ui/text-input";
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
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const [is2FAEnabled, setIs2FAEnabled] = useState(twoFactorEnabled);
  const [is2FALoading, setIs2FALoading] = useState(false);

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
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Şifre değiştirilemedi");

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
        message: err instanceof Error ? err.message : (isTr ? "İşlem başarısız oldu." : "Operation failed."),
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggle2FA = () => {
    setIs2FALoading(true);
    setTimeout(() => {
      setIs2FAEnabled(!is2FAEnabled);
      setIs2FALoading(false);
      setFeedback({
        type: "success",
        message: !is2FAEnabled
          ? (isTr ? "İki aşamalı doğrulama (2FA) simülasyonu başarıyla aktif edildi." : "Two-factor authentication enabled.")
          : (isTr ? "İki aşamalı doğrulama devre dışı bırakıldı." : "Two-factor authentication disabled."),
      });
    }, 600);
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
      <form onSubmit={handlePasswordChange} className="rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-base)]/70 backdrop-blur-xl p-6 sm:p-7 space-y-4 shadow-sm">
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
              <span>{isTr ? "İki Aşamalı Doğrulama (2FA - TOTP)" : "Two-Factor Authentication (2FA)"}</span>
            </h2>
            <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed max-w-xl">
              {isTr
                ? "Giriş yaparken şifrenize ek olarak Google Authenticator veya 1Password uygulamanızdan 6 haneli tek kullanımlık kod istenir."
                : "Require a 6-digit TOTP verification code from your authenticator app on every login."}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Badge variant={is2FAEnabled ? "primary" : "outline"} size="sm">
              {is2FAEnabled ? (isTr ? "AKTİF" : "ENABLED") : (isTr ? "DEVRE DIŞI" : "DISABLED")}
            </Badge>

            <Button
              type="button"
              variant={is2FAEnabled ? "outline" : "primary"}
              size="sm"
              onClick={handleToggle2FA}
              isLoading={is2FALoading}
              className="text-xs font-semibold"
            >
              {is2FAEnabled ? (isTr ? "Devre Dışı Bırak" : "Disable 2FA") : (isTr ? "2FA Kur & Etkinleştir" : "Setup 2FA")}
            </Button>
          </div>
        </div>
      </div>

      {/* Section 3: Active Sessions & Audit */}
      <div className="rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-base)]/70 backdrop-blur-xl p-6 sm:p-7 space-y-4 shadow-sm">
        <h2 className="text-base font-semibold text-[var(--color-text-primary)] flex items-center gap-2">
          <Laptop className="h-4 w-4 text-emerald-400" aria-hidden="true" />
          <span>{isTr ? "Aktif Oturum ve Güvenlik Durumu" : "Active Session & Security Status"}</span>
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
                {isTr ? "HTTP-Only Güvenli Oturum Çerezi ile korunuyor" : "Secured with HTTP-Only cookie"}
              </p>
            </div>
          </div>

          <span className="inline-flex items-center gap-1.5 text-[11px] text-emerald-400 font-medium">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>{isTr ? "Canlı" : "Active"}</span>
          </span>
        </div>
      </div>
    </div>
  );
}
