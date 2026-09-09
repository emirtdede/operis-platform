import type { Metadata } from "next";
import { MonitoringClient } from "@/src/components/admin/monitoring-client";
import { Activity } from "lucide-react";

export const metadata: Metadata = {
  title: "Sistem Durumu & Performans İzleme | Operis Admin",
  description: "Veritabanı bağlantı havuzu, sorgu gecikmesi, heap bellek kullanımı ve sistem optimizasyon araçları.",
};

export const dynamic = "force-dynamic";

export default function AdminMonitoringPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <Activity className="h-5 w-5 text-emerald-400" />
            <span>Sistem Durumu & Performans İzleme Konsolu</span>
            <span className="text-xs font-mono font-normal px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Canlı Metrikler
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            PostgreSQL bağlantı havuzu, 7 günlük otomatik yaşam döngüsü worker&apos;ı, gecikme süreleri ve 1-tıkla anlık optimizasyon araçları.
          </p>
        </div>
      </div>

      <MonitoringClient />
    </div>
  );
}
