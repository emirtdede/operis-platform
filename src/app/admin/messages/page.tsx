import type { Metadata } from "next";
import { AdminService } from "@/src/modules/admin/service";
import { ContactMessagesClient } from "@/src/components/admin/contact-messages-client";
import { Mail } from "lucide-react";

export const metadata: Metadata = {
  title: "İletişim & Destek Mesajları | Operis Admin",
  description: "Ziyaretçi ve kullanıcı iletişim formu taleplerinin yönetimi.",
};

export const dynamic = "force-dynamic";

export default async function AdminMessagesPage(props: {
  searchParams?: Promise<{ page?: string; limit?: string; status?: string; search?: string }>;
}) {
  const sp = await props.searchParams;
  const page = sp?.page ? parseInt(sp.page, 10) : 1;
  const limit = sp?.limit ? parseInt(sp.limit, 10) : 50;
  const status = sp?.status || undefined;
  const search = sp?.search || undefined;

  const result = await AdminService.getContactMessagesPaginated({
    page: isNaN(page) ? 1 : page,
    limit: isNaN(limit) ? 50 : limit,
    status,
    search,
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <Mail className="h-5 w-5 text-blue-400" />
            <span>İletişim & Destek Talepleri</span>
            <span className="text-xs font-mono font-normal px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
              {result.total} Toplam Mesaj
            </span>
            {result.newCount > 0 && (
              <span className="text-xs font-mono font-normal px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse">
                {result.newCount} Yeni
              </span>
            )}
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Web sitesi iletişim formundan iletilen soruları, destek taleplerini ve kullanıcı
            bildirimlerini inceleyin.
          </p>
        </div>
      </div>

      <ContactMessagesClient
        initialMessages={result.items}
        total={result.total}
        newCount={result.newCount}
        currentPage={result.page}
        totalPages={result.totalPages}
      />
    </div>
  );
}
