import { redirect } from "next/navigation";
import { getAdminSession } from "@/src/modules/admin/auth-guard";
import { AdminAccessDeniedClient } from "@/src/components/admin/admin-access-denied-client";

export const dynamic = "force-dynamic";

export default async function AdminLoginPage() {
  const auth = await getAdminSession();
  if (auth.isAdmin) {
    redirect("/admin");
  }

  return (
    <AdminAccessDeniedClient
      currentRole={auth.session?.role || "GİRİŞ YAPILMADI"}
      errorReason="Yönetim konsoluna erişmek için lütfen yetkili kimlik bilgilerinizle giriş yapın."
    />
  );
}
