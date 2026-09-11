"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, RefreshCw, Home, Copy, Check } from "lucide-react";
import { Button } from "@/src/components/ui/button";
import { ErrorCard } from "@/src/components/ui/error-card";
import "@/src/styles/tokens.css";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const [isEn, setIsEn] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && window.location.pathname.startsWith("/en")) {
      setIsEn(true);
    }
    console.error("Global critical error captured:", error.message);
  }, [error]);

  const isTr = !isEn;
  const homePath = isEn ? "/en" : "/tr";
  const referenceCode = error.digest || "OPR-CRIT-SYS";

  const handleCopyCode = () => {
    if (referenceCode) {
      navigator.clipboard.writeText(referenceCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <html lang={isEn ? "en" : "tr"} dir="ltr" suppressHydrationWarning>
      <head>
        <title>{isTr ? "Sistem Hatası | Operis" : "System Error | Operis"}</title>
        <meta name="robots" content="noindex, nofollow" />
      </head>
      <body className="relative min-h-screen bg-[#07090e] text-[#f1f5f9] flex items-center justify-center p-4 antialiased selection:bg-rose-500/20 selection:text-rose-400">
        <main role="alert" className="w-full flex items-center justify-center py-12">
          <ErrorCard
            code="500"
            badgeText="CRITICAL ERROR"
            badgeColor="rose"
            statusLabel={
              isTr
                ? "Operis Acil Durum Kurtarma: Sistem Aktif"
                : "Operis Emergency Recovery: Systems Active"
            }
            subtitle={isTr ? "Kritik Sistem Hatası (500)" : "Critical System Error (500)"}
            title={isTr ? "Uygulama Başlatılamadı" : "Application Failed to Initialize"}
            description={
              isTr
                ? "Kök katmanda beklenmeyen kritik bir sorun algılandı. Lütfen uygulamayı yeniden başlatmayı veya tarayıcıyı tazelemeyi deneyin."
                : "An unexpected critical issue occurred at the root layer. Please try refreshing or reopening the application."
            }
            icon={<AlertTriangle className="h-8 w-8" aria-hidden="true" />}
          >
            {/* Reference Code Pill */}
            <div className="flex items-center justify-center gap-2.5 p-3 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm">
              <span className="text-xs font-mono text-slate-400">
                {isTr ? "Referans:" : "Reference:"}
              </span>
              <span className="text-xs font-mono font-bold text-white tracking-wider">
                {referenceCode}
              </span>
              <button
                type="button"
                onClick={handleCopyCode}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-all"
                aria-label={isTr ? "Kodu kopyala" : "Copy reference code"}
                title={isTr ? "Kodu kopyala" : "Copy reference code"}
              >
                {copied ? (
                  <Check className="h-4 w-4 text-emerald-400" aria-hidden="true" />
                ) : (
                  <Copy className="h-4 w-4" aria-hidden="true" />
                )}
              </button>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center justify-center gap-3 pt-3 border-t border-white/10">
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={() => reset()}
                className="gap-2"
              >
                <RefreshCw className="h-4 w-4" aria-hidden="true" />
                <span>{isTr ? "Uygulamayı Yenile" : "Reload Application"}</span>
              </Button>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  window.location.href = homePath;
                }}
                className="gap-2"
              >
                <Home className="h-4 w-4" aria-hidden="true" />
                <span>{isTr ? "Ana Sayfa" : "Home Page"}</span>
              </Button>
            </div>
          </ErrorCard>
        </main>
      </body>
    </html>
  );
}
