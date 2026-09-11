"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { ShieldAlert, Lock, ArrowLeft, UserCheck, Shield } from "lucide-react";
import { BrandLogo } from "@/src/components/layout/brand-logo";

interface AdminAccessDeniedClientProps {
  currentRole?: string;
  errorReason?: string;
}

export function AdminAccessDeniedClient({
  currentRole = "USER",
  errorReason = "Standart kullanıcı hesaplarının bu yönetim konsoluna erişim izni bulunmamaktadır.",
}: AdminAccessDeniedClientProps) {
  const [adminKey, setAdminKey] = useState("");
  const [adminEmail, setAdminEmail] = useState("admin@operis.pro");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleAdminLogin = (role: "ADMIN" | "SECURITY_ADMIN") => {
    if (!adminKey.trim()) {
      setErrorMsg("Lütfen güvenlik anahtarını / PIN kodunu giriniz.");
      return;
    }
    setErrorMsg(null);
    startTransition(async () => {
      try {
        const res = await fetch("/api/admin/auth/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            adminKey: adminKey.trim(),
            role,
            email: adminEmail,
            displayName: role === "ADMIN" ? "Demir Yıldız (Admin)" : "Güvenlik Sorumlusu",
          }),
        });

        const data = await res.json().catch(() => ({}));

        if (res.ok) {
          window.location.reload();
        } else {
          setErrorMsg(data.error || "Yetkilendirme doğrulanamadı.");
        }
      } catch {
        setErrorMsg("Bağlantı hatası oluştu.");
      }
    });
  };

  return (
    <div className="min-h-screen bg-[#0a0b0e] flex items-center justify-center p-4 selection:bg-red-600 selection:text-white">
      {/* Background Decorative Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-lg bg-[#12141a] border border-red-500/30 rounded-3xl p-8 space-y-6 shadow-2xl backdrop-blur-xl">
        {/* Header with Brand and Lock Icon */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-5">
          <BrandLogo size="sm" showText={true} />
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/30 text-red-400 font-mono text-[11px] font-semibold">
            <Lock className="h-3.5 w-3.5" />
            <span>403 FORBIDDEN</span>
          </div>
        </div>

        {/* Threat / Warning Box */}
        <div className="p-4 rounded-2xl bg-red-500/5 border border-red-500/20 space-y-2">
          <div className="flex items-center gap-2 text-red-400 font-semibold text-sm">
            <ShieldAlert className="h-5 w-5 shrink-0" />
            <span>Yetkisiz Yönetim Girişimi Engellendi</span>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">{errorReason}</p>
          <div className="flex items-center gap-2 pt-1 font-mono text-[11px]">
            <span className="text-slate-500">Mevcut Oturum Rolü:</span>
            <span className="px-2 py-0.5 rounded bg-slate-800 text-amber-300 border border-slate-700">
              {currentRole}
            </span>
            <span className="text-slate-500">•</span>
            <span className="text-red-400">Erişim Reddedildi</span>
          </div>
        </div>

        {/* Admin Authentication Box */}
        <div className="space-y-4">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Yetkili Yönetici Giriş Kapısı
          </div>

          {errorMsg && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
              {errorMsg}
            </div>
          )}

          <div className="space-y-3">
            <div>
              <label className="text-[11px] text-slate-400 font-medium block mb-1">
                Yönetici E-Posta
              </label>
              <input
                type="email"
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                className="w-full bg-[#0d0e12] border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-red-500/60"
              />
            </div>

            <div>
              <label className="text-[11px] text-slate-400 font-medium block mb-1">
                Güvenlik Anahtarı / PIN
              </label>
              <input
                type="password"
                value={adminKey}
                onChange={(e) => setAdminKey(e.target.value)}
                placeholder="••••••••••••"
                className="w-full bg-[#0d0e12] border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-red-500/60 font-mono"
              />
            </div>

            {/* Quick Demo Authentication Buttons */}
            <div className="pt-2 space-y-2">
              <button
                type="button"
                onClick={() => handleAdminLogin("ADMIN")}
                disabled={isPending}
                className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20"
              >
                <UserCheck className="h-4 w-4" />
                <span>
                  {isPending ? "Doğrulanıyor..." : "Demir Yıldız (Süper Admin) Olarak Konsola Gir"}
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleAdminLogin("SECURITY_ADMIN")}
                disabled={isPending}
                className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-xs transition-colors flex items-center justify-center gap-2"
              >
                <Shield className="h-4 w-4 text-red-400" />
                <span>Güvenlik Sorumlusu (Security Admin) Olarak Konsola Gir</span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer Navigation */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-800 text-xs">
          <Link
            href="/tr"
            className="text-slate-400 hover:text-white flex items-center gap-1.5 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Ana Sayfaya Dön</span>
          </Link>

          <Link
            href="/tr/panel/ilanlarim"
            className="text-blue-400 hover:text-blue-300 font-medium transition-colors"
          >
            Kullanıcı Çalışma Alanı
          </Link>
        </div>
      </div>
    </div>
  );
}
