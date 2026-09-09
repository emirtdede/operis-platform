import { redirect } from "next/navigation";
import { headers, cookies } from "next/headers";

function isTurkishPreferred(acceptLanguage: string | null): boolean {
  if (!acceptLanguage || acceptLanguage.trim().length === 0) {
    return false;
  }

  const preferences = acceptLanguage
    .split(",")
    .map((part) => {
      const [lang, qPart] = part.trim().split(";");
      const q = qPart ? parseFloat(qPart.replace("q=", "")) : 1.0;
      return {
        lang: (lang || "").trim().toLowerCase(),
        q: isNaN(q) ? 1.0 : q,
      };
    })
    .filter((item) => item.lang.length > 0)
    .sort((a, b) => b.q - a.q);

  if (preferences.length === 0) {
    return false;
  }

  const top = preferences[0];
  return Boolean(top && top.lang.startsWith("tr"));
}

export const dynamic = "force-dynamic";

export default async function RootPage() {
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get("NEXT_LOCALE")?.value || cookieStore.get("fp_locale")?.value;

  if (cookieLocale === "tr" || cookieLocale === "en") {
    redirect(`/${cookieLocale}`);
  }

  const headerStore = await headers();
  const acceptLanguage = headerStore.get("accept-language");

  if (isTurkishPreferred(acceptLanguage)) {
    redirect("/tr");
  }

  redirect("/en");
}

