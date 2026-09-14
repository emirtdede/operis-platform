import { AuthenticateWithRedirectCallback } from "@clerk/nextjs";

export const dynamic = "force-dynamic";

export default async function SSOCallbackPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const isTr = locale === "tr";
  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center space-y-4 px-4 text-center">
      <div className="h-10 w-10 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
      <p className="text-sm font-medium text-slate-300">
        {isTr
          ? "Yetkilendirme tamamlanıyor, lütfen bekleyin..."
          : "Completing authentication, please wait..."}
      </p>
      {publishableKey ? <AuthenticateWithRedirectCallback /> : null}
    </div>
  );
}
