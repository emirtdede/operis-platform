import type { Metadata } from "next";
import { AdminService } from "@/src/modules/admin/service";
import { ThreatsConsoleClient } from "@/src/components/admin/threats-console-client";
import { ShieldAlert } from "lucide-react";

export const metadata: Metadata = {
  title: "Siber Tehditler & Saldırı İzleme | Operis Admin",
  description: "Brute-force saldırıları, SQL enjeksiyon taramaları, DDoS dalgaları ve IP kara liste yönetimi.",
};

export const dynamic = "force-dynamic";

export default async function AdminSecurityThreatsPage() {
  const threats = await AdminService.getSecurityThreats({ status: "ALL", severity: "ALL" });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-red-500" />
            <span>Siber Tehditler & Saldırı İzleme Konsolu</span>
            <span className="text-xs font-mono font-normal px-2 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20">
              Kanal 2 • Sıfır Tolerans WAF
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Brute-force, SQL/NoSQL enjeksiyonu ve DDoS denemelerini anlık analiz edin. Saldırgan IP adreslerini tek tıkla kara listeye alın.
          </p>
        </div>
      </div>

      <ThreatsConsoleClient initialThreats={threats} />
    </div>
  );
}
