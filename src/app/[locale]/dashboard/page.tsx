import { redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { getLocalizedRoute } from "@/src/lib/i18n/routes";

export const dynamic = "force-dynamic";

export default async function DashboardRootPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const targetPath = getLocalizedRoute("dashboardListings", locale);
  redirect(targetPath);
}
