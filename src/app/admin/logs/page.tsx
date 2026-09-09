import type { Metadata } from "next";
import { AdminService } from "@/src/modules/admin/service";
import { LogsConsoleClient } from "@/src/components/admin/logs-console-client";
import { ScrollText } from "lucide-react";

export const metadata: Metadata = {
  title: "Çok Kategorili Log Konsolu | Operis Admin",
  description: "Kimlik doğrulama, iş mantığı, yönetici denetim izi ve sistem olaylarının detaylı logları.",
};

export const dynamic = "force-dynamic";

export default async function AdminLogsPage() {
  const result = await AdminService.getCategorizedLogs({ limit: 100 });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <ScrollText className="h-5 w-5 text-blue-400" />
            <span>Çok Kategorili Gelişmiş Log Sistemi</span>
            <span className="text-xs font-mono font-normal px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
              Gerçek Zamanlı
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Kimlik doğrulama, iş mantığı hareketleri, denetim izi ve sistem hatalarını 4 ayrı kategoride analiz edin.
          </p>
        </div>
      </div>

      <LogsConsoleClient initialLogs={result.items} total={result.total} />
    </div>
  );
}
