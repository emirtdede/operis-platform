import type { Metadata } from "next";
import { AdminService } from "@/src/modules/admin/service";
import { AdminDisputesClient } from "@/src/components/admin/admin-disputes-client";
import { Scale } from "lucide-react";

export const metadata: Metadata = {
  title: "Uyuşmazlık Hakemliği & Eşleşmeler | Operis Admin",
  description:
    "Eşleşen tarafların tamamlama itirazlarını, proje durumunu ve idari hakemlik kararlarını yönetin.",
};

export const dynamic = "force-dynamic";

export default async function AdminEngagementsPage(props: {
  searchParams?: Promise<{
    page?: string;
    limit?: string;
    search?: string;
    status?: string;
  }>;
}) {
  const sp = await props.searchParams;
  const page = sp?.page ? parseInt(sp.page, 10) : 1;
  const limit = sp?.limit ? parseInt(sp.limit, 10) : 25;
  const search = sp?.search || undefined;
  const status = sp?.status || "DISPUTED";

  const result = await AdminService.getDisputedEngagements({
    page: isNaN(page) ? 1 : page,
    limit: isNaN(limit) ? 25 : limit,
    search,
    status,
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <Scale className="h-5 w-5 text-red-400" />
            <span>Uyuşmazlık Hakemliği & Eşleşmeler</span>
            <span className="text-xs font-mono font-normal px-2 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20">
              {result.total} Kayıt
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            İşveren ve uzman arasındaki tamamlama itirazlarını inceleyin, resmi hakemlik kararını
            uygulayarak projeyi karara bağlayın.
          </p>
        </div>
      </div>

      <AdminDisputesClient
        initialDisputes={result.items}
        total={result.total}
        currentPage={result.page}
        totalPages={result.totalPages}
      />
    </div>
  );
}
