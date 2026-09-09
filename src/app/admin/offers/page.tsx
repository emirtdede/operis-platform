import type { Metadata } from "next";
import { AdminService } from "@/src/modules/admin/service";
import { OffersTableClient } from "@/src/components/admin/offers-table-client";
import { Send } from "lucide-react";

export const metadata: Metadata = {
  title: "Teklif & Yanıt Denetimi | Operis Admin",
  description: "Kullanıcıların yaptığı tüm teklifler, bütçeler ve alınan yanıtların denetim kayıtları.",
};

export const dynamic = "force-dynamic";

export default async function AdminOffersPage() {
  const result = await AdminService.getOffersPaginated({ limit: 50 });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <Send className="h-5 w-5 text-purple-400" />
            <span>Teklif & Yanıt Kayıtları (Audit Trail)</span>
            <span className="text-xs font-mono font-normal px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20">
              {result.total} Teklif
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Her kullanıcının verdiği tekliflerin, kabul/ret durumlarının ve yanıt gerekçelerinin merkezi denetimi.
          </p>
        </div>
      </div>

      <OffersTableClient initialOffers={result.items} total={result.total} />
    </div>
  );
}
