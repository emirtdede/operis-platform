"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Mail, Lock, ShieldAlert, KeyRound, Eye, EyeOff } from "lucide-react";
import { Button } from "../ui/button";
import { TextInput } from "../ui/text-input";

export interface LoginFormProps {
  locale: string;
}

export function LoginForm({ locale }: LoginFormProps) {
  const isTr = locale === "tr";
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [totpCode, setTotpCode] = useState("");
  const [requires2FA, setRequires2FA] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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

      router.push(isTr ? "/tr/akis" : "/en/feed");
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
                    ? isTr ? "Şifreyi gizle" : "Hide password"
                    : isTr ? "Şifreyi göster" : "Show password"
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

      <Button
        type="submit"
        variant="primary"
        size="lg"
        className="w-full text-sm font-semibold mt-2"
        isLoading={isLoading}
      >
        {requires2FA
          ? isTr ? "Doğrula ve Giriş Yap" : "Verify & Sign In"
          : isTr ? "Giriş Yap" : "Sign In"}
      </Button>

      <div className="pt-2 text-center text-xs text-[var(--color-text-secondary)]">
        {isTr ? "Henüz bir hesabınız yok mu?" : "Do not have an account?"}{" "}
        <Link
          href={`/${locale}/register`}
          className="font-medium text-blue-400 hover:text-blue-300 transition-colors hover:underline"
        >
          {isTr ? "Hemen Kaydolun" : "Sign Up"}
        </Link>
      </div>
    </form>
  );
}
