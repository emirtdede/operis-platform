"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Mail, Lock, ShieldAlert, KeyRound, Eye, EyeOff, Zap } from "lucide-react";
import { Button } from "../ui/button";
import { TextInput } from "../ui/text-input";

export interface LoginFormProps {
  locale: string;
  returnUrl?: string;
}

function getSafeReturnUrl(url: string | undefined | null, fallback: string): string {
  if (!url) return fallback;
  if (/^\/(tr|en)(\/|$)/.test(url) && !url.startsWith("//")) {
    return url;
  }
  return fallback;
}

export function LoginForm({ locale, returnUrl }: LoginFormProps) {
  const isTr = locale === "tr";
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [totpCode, setTotpCode] = useState("");
  const [requires2FA, setRequires2FA] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isQuickLoggingIn, setIsQuickLoggingIn] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const defaultRedirect = isTr ? "/tr/akis" : "/en/feed";
  const targetRedirect = getSafeReturnUrl(returnUrl, defaultRedirect);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-locale": locale,
        },
        body: JSON.stringify({
          email: email.trim(),
          password,
          totpCode: requires2FA ? totpCode.trim() : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        if (data.requires2FA) {
          setRequires2FA(true);
          return;
        }
        throw new Error(data.error || "Login failed");
      }

      router.push(targetRedirect);
      router.refresh();
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : isTr
            ? "Giriş yapılamadı. Bilgilerinizi kontrol ediniz."
            : "Invalid email or password."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickLogin = async () => {
    setIsQuickLoggingIn(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/quick-login", {
        method: "POST",
        headers: {
          "x-locale": locale,
        },
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || (isTr ? "Hızlı giriş başarısız oldu" : "Quick login failed"));
      }

      router.push(targetRedirect);
      router.refresh();
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : isTr
            ? "Hızlı giriş yapılamadı. Lütfen tekrar deneyiniz."
            : "Quick login failed. Please try again."
      );
    } finally {
      setIsQuickLoggingIn(false);
    }
  };

  const handleFillDemo = () => {
    setEmail("kullanici@operis.pro");
    setPassword("OperisUser2026!");
    setError(null);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="flex items-center gap-2.5 rounded-xl border border-red-500/20 bg-red-500/10 p-3.5 text-xs text-red-400">
          <ShieldAlert className="h-4 w-4 shrink-0 text-red-400" aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}

      {!requires2FA ? (
        <>
          <TextInput
            label={isTr ? "E-posta adresi" : "Email address"}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="ornek@alanadi.com"
            required
            autoComplete="email"
            startIcon={<Mail className="h-4 w-4" aria-hidden="true" />}
          />

          <TextInput
            label={isTr ? "Şifre" : "Password"}
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••••••"
            required
            autoComplete="current-password"
            startIcon={<Lock className="h-4 w-4" aria-hidden="true" />}
            endIcon={
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="p-1 rounded-md text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                aria-label={
                  showPassword
                    ? isTr
                      ? "Şifreyi gizle"
                      : "Hide password"
                    : isTr
                      ? "Şifreyi göster"
                      : "Show password"
                }
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <Eye className="h-4 w-4" aria-hidden="true" />
                )}
              </button>
            }
          />

          <div className="flex justify-end">
            <Link
              href={`/${locale}/forgot-password`}
              className="text-xs text-[var(--color-text-secondary)] hover:text-blue-400 transition-colors"
            >
              {isTr ? "Şifremi unuttum" : "Forgot password?"}
            </Link>
          </div>
        </>
      ) : (
        <TextInput
          label={isTr ? "İki aşamalı doğrulama kodu (2FA)" : "Two-factor code (2FA)"}
          type="text"
          value={totpCode}
          onChange={(e) => setTotpCode(e.target.value)}
          placeholder="6 haneli kod"
          required
          maxLength={6}
          autoFocus
          startIcon={<KeyRound className="h-4 w-4" aria-hidden="true" />}
        />
      )}

      {/* Main Submit Button */}
      <Button
        type="submit"
        variant="primary"
        size="lg"
        className="w-full text-sm font-semibold mt-2"
        isLoading={isLoading}
      >
        {requires2FA
          ? isTr
            ? "Doğrula ve Giriş Yap"
            : "Verify & Sign In"
          : isTr
            ? "Giriş Yap"
            : "Sign In"}
      </Button>

      {/* Quick Login Section directly under Giriş Yap */}
      <div className="pt-2 space-y-3">
        <div className="relative flex items-center justify-center">
          <div className="border-t border-[var(--color-border-subtle)] w-full" />
          <span className="bg-[var(--color-surface-base)] px-3 text-[11px] font-medium text-[var(--color-text-tertiary)] uppercase tracking-wider shrink-0">
            {isTr ? "veya tek tıkla" : "or quick access"}
          </span>
          <div className="border-t border-[var(--color-border-subtle)] w-full" />
        </div>

        <Button
          type="button"
          variant="secondary"
          size="lg"
          onClick={handleQuickLogin}
          isLoading={isQuickLoggingIn}
          className="w-full gap-2.5 font-semibold text-sm rounded-xl border border-blue-500/30 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 hover:text-blue-300 transition-all cursor-pointer shadow-sm"
        >
          <Zap className="h-4 w-4 fill-blue-400 text-blue-400" aria-hidden="true" />
          <span>{isTr ? "Hızlı Giriş Yap (Normal Kullanıcı)" : "Quick Sign In (Normal User)"}</span>
        </Button>

        {/* Demo Account Info & Pre-fill Shortcut */}
        <div className="flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-base)]/80 text-[11px] text-[var(--color-text-tertiary)]">
          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 truncate">
            <span className="font-medium text-[var(--color-text-secondary)]">
              {isTr ? "Kullanıcı:" : "User:"}
            </span>
            <span className="font-mono text-blue-400">kullanici@operis.pro</span>
            <span className="hidden sm:inline text-[var(--color-border-subtle)]">•</span>
            <span className="font-mono">OperisUser2026!</span>
          </div>
          <button
            type="button"
            onClick={handleFillDemo}
            className="shrink-0 text-blue-400 hover:text-blue-300 hover:underline font-medium cursor-pointer"
          >
            {isTr ? "Forma Yaz" : "Pre-fill"}
          </button>
        </div>
      </div>

      <div className="pt-2 text-center text-xs text-[var(--color-text-secondary)]">
        {isTr ? "Henüz bir hesabınız yok mu?" : "Do not have an account?"}{" "}
        <Link
          href={
            returnUrl
              ? `/${locale}/register?returnUrl=${encodeURIComponent(returnUrl)}`
              : `/${locale}/register`
          }
          className="font-medium text-blue-400 hover:text-blue-300 transition-colors hover:underline"
        >
          {isTr ? "Hemen Kaydolun" : "Sign Up"}
        </Link>
      </div>
    </form>
  );
}
