import type { Metadata } from "next";
import { AdminService } from "@/src/modules/admin/service";
import { AbuseManagementClient } from "@/src/components/admin/abuse-management-client";
import { AlertTriangle } from "lucide-react";

export const metadata: Metadata = {
  title: "Kullanıcı İhlalleri & Şikayet Yönetimi | Operis Admin",
  description:
    "Kullanıcıların uygunsuz davranışları, küfür/hakaret filtre bildirimleri ve şikayet denetim motoru.",
};

export const dynamic = "force-dynamic";

export default async function AdminAbuseModerationPage() {
  const abuseItems = await AdminService.getAbuseIncidents({ status: "ALL" });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-400" />
            <span>Kullanıcı İhlal & Davranış Denetim Motoru</span>
            <span className="text-xs font-mono font-normal px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
              Kanal 1 • Proaktif Moderasyon
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Kullanıcıların küfür/hakaret, spam ve uygunsuz davranış ihlallerini anlık inceleyin,
            uyarın veya hesapları tek tıkla askıya alın.
          </p>
        </div>
      </div>

      <AbuseManagementClient initialAbuseItems={abuseItems} />
    </div>
  );
}
