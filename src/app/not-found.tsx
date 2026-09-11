"use client";

import { useEffect } from "react";
import Link from "next/link";
import { FileQuestion, Home, Compass } from "lucide-react";
import { Button } from "@/src/components/ui/button";
import { ErrorCard } from "@/src/components/ui/error-card";

export default function RootNotFound() {
  useEffect(() => {
    document.title = "404 — Sayfa Bulunamadı | Operis";
  }, []);

  return (
    <main
      role="main"
      className="min-h-[80vh] flex items-center justify-center px-4 py-16 sm:px-6 lg:px-8"
    >
      <ErrorCard
        code="404"
        badgeText="404 NOT FOUND"
        badgeColor="blue"
        statusLabel="Operis Systems: Operational"
        subtitle="Sayfa Bulunamadı / Page Not Found"
        title="Aradığınız Sayfa Mevcut Değil"
        description="Ulaşmaya çalıştığınız sayfa taşınmış, silinmiş veya geçersiz olabilir. / The page you are looking for may have been moved or mistyped."
        icon={<FileQuestion className="h-8 w-8" aria-hidden="true" />}
      >
        <div className="flex flex-wrap items-center justify-center gap-3 pt-4 border-t border-[var(--color-border-subtle)]/60">
          <Link href="/tr">
            <Button type="button" variant="primary" size="sm" className="gap-2">
              <Home className="h-4 w-4" aria-hidden="true" />
              <span>Ana Sayfa (TR)</span>
            </Button>
          </Link>

          <Link href="/en">
            <Button type="button" variant="outline" size="sm" className="gap-2">
              <Home className="h-4 w-4" aria-hidden="true" />
              <span>Home (EN)</span>
            </Button>
          </Link>

          <Link href="/tr/akis">
            <Button type="button" variant="secondary" size="sm" className="gap-2">
              <Compass className="h-4 w-4" aria-hidden="true" />
              <span>Projeleri Keşfet (TR)</span>
            </Button>
          </Link>

          <Link href="/en/feed">
            <Button type="button" variant="secondary" size="sm" className="gap-2">
              <Compass className="h-4 w-4" aria-hidden="true" />
              <span>Browse Projects (EN)</span>
            </Button>
          </Link>
        </div>
      </ErrorCard>
    </main>
  );
}
