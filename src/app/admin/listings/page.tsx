import type { Metadata } from "next";
import { AdminService } from "@/src/modules/admin/service";
import { ListingsTableClient } from "@/src/components/admin/listings-table-client";
import { Layers } from "lucide-react";

export const metadata: Metadata = {
  title: "İlan Yönetimi | Operis Admin",
  description: "Canlı ilanlar, 7 günlük tazelik radarı döngüleri ve içerik moderasyonu.",
};

export const dynamic = "force-dynamic";

export default async function AdminListingsPage() {
  const result = await AdminService.getListingsPaginated({ limit: 50 });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <Layers className="h-5 w-5 text-emerald-400" />
            <span>İlan Yönetimi & Moderasyon</span>
            <span className="text-xs font-mono font-normal px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              {result.total} İlan
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Platformdaki tüm aktif, süresi dolmuş veya moderasyonla gizlenmiş teknoloji projelerini
            denetleyin.
          </p>
        </div>
      </div>

      <ListingsTableClient initialListings={result.items} total={result.total} />
    </div>
  );
}
