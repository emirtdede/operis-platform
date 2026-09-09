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

  useEffect(() => {
    console.error("Global critical error captured:", error.message);
  }, [error]);

  const referenceCode = error.digest || "OPR-CRIT-SYS";

  const handleCopyCode = () => {
    if (referenceCode) {
      navigator.clipboard.writeText(referenceCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <html lang="tr" dir="ltr" suppressHydrationWarning>
      <head>
        <title>Sistem Hatası | Operis</title>
        <meta name="robots" content="noindex, nofollow" />
      </head>
      <body className="relative min-h-screen bg-[#07090e] text-[#f1f5f9] flex items-center justify-center p-4 antialiased selection:bg-rose-500/20 selection:text-rose-400">
        <main
          role="alert"
          className="w-full flex items-center justify-center py-12"
        >
          <ErrorCard
            code="500"
            badgeText="CRITICAL ERROR"
            badgeColor="rose"
            statusLabel="Operis Emergency Recovery"
            subtitle="Kritik Sistem Hatası / Critical Error"
            title="Uygulama Başlatılamadı"
            description="Kök katmanda beklenmeyen kritik bir sorun algılandı. Lütfen uygulamayı yeniden başlatmayı veya tarayıcıyı tazelemeyi deneyin."
            icon={<AlertTriangle className="h-8 w-8" aria-hidden="true" />}
          >
            {/* Reference Code Pill */}
            <div className="flex items-center justify-center gap-2.5 p-3 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm">
              <span className="text-xs font-mono text-slate-400">
                Referans / Code:
              </span>
              <span className="text-xs font-mono font-bold text-white tracking-wider">
                {referenceCode}
              </span>
              <button
                type="button"
                onClick={handleCopyCode}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-all"
                aria-label="Kodu kopyala"
                title="Kodu kopyala"
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
                <span>Uygulamayı Yenile</span>
              </Button>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  window.location.href = "/tr";
                }}
                className="gap-2"
              >
                <Home className="h-4 w-4" aria-hidden="true" />
                <span>Ana Sayfa</span>
              </Button>
            </div>
          </ErrorCard>
        </main>
      </body>
    </html>
  );
}
