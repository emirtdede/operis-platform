import type { Metadata } from "next";
import { AdminService } from "@/src/modules/admin/service";
import { UsersTableClient } from "@/src/components/admin/users-table-client";
import { Users } from "lucide-react";

export const metadata: Metadata = {
  title: "Kullanıcı Yönetimi (+10.000) | Operis Admin",
  description: "+10.000 kullanıcı dizini, arama, filtreleme, rol ve askıya alma yönetimi.",
};

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const result = await AdminService.getUsersPaginated({ limit: 50 });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <Users className="h-5 w-5 text-blue-400" />
            <span>Kullanıcı Yönetimi</span>
            <span className="text-xs font-mono font-normal px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
              +{result.total.toLocaleString()} Kayıtlı
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Platformdaki tüm bağımsız yazılımcı ve işveren hesaplarını denetleyin, rol atayın veya
            askıya alın.
          </p>
        </div>
      </div>

      {/* Users Table */}
      <UsersTableClient initialUsers={result.items} total={result.total} />
    </div>
  );
}
