import { NextRequest, NextResponse } from "next/server";
import createMiddleware from "next-intl/middleware";
import { locales } from "./lib/i18n/config";

const intlMiddleware = createMiddleware({
  locales,
  defaultLocale: "en",
  localePrefix: "always",
  localeDetection: false, // Handled explicitly below for 100% deterministic user requirement
});

/**
 * Parses Accept-Language header according to RFC 9110 quality values (q-factor).
 * Returns true only if Turkish (tr) is the user's primary/highest preference.
 */
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

const TR_EXACT_REDIRECTS: Record<string, string> = {
  "/tr/categories": "/tr/kategoriler",
  "/tr/feed": "/tr/akis",
  "/tr/listings": "/tr/ilanlar",
  "/tr/listings/new": "/tr/ilanlar/yeni",
  "/tr/login": "/tr/giris",
  "/tr/register": "/tr/kayit",
  "/tr/dashboard/listings": "/tr/panel/ilanlarim",
  "/tr/dashboard/offers/received": "/tr/panel/teklifler/gelen",
  "/tr/dashboard/offers/sent": "/tr/panel/teklifler/gonderilen",
  "/tr/legal/terms": "/tr/yasal/kullanim-kosullari",
  "/tr/legal/privacy": "/tr/yasal/gizlilik-ve-kvkk",
  "/tr/legal/matching-disclaimer": "/tr/yasal/eslestirme-ve-sorumluluk-reddi",
  "/tr/legal/acceptable-use": "/tr/yasal/kabul-edilebilir-kullanim",
  "/tr/legal/cookies": "/tr/yasal/cerez-politikasi",
  "/tr/legal/contact": "/tr/yasal/iletisim",
};

export default function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Root route: Intelligent Locale Detection & Preference Persistence
  if (pathname === "/" || pathname === "") {
    // Check saved cookie preferences first
    const cookieLocale =
      request.cookies.get("NEXT_LOCALE")?.value ||
      request.cookies.get("fp_locale")?.value;

    let targetLocale: "tr" | "en";

    if (cookieLocale === "tr" || cookieLocale === "en") {
      targetLocale = cookieLocale;
    } else {
      // First-time visit: inspect Accept-Language header
      const acceptLanguage = request.headers.get("accept-language");
      if (isTurkishPreferred(acceptLanguage)) {
        targetLocale = "tr";
      } else {
        // Different language or undetected: ALWAYS default to English
        targetLocale = "en";
      }
    }

    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = `/${targetLocale}`;
    return NextResponse.redirect(redirectUrl, 302);
  }

  // 2. 301 Permanent Redirects for legacy English paths requested under /tr
  const exactRedirect = TR_EXACT_REDIRECTS[pathname];
  if (exactRedirect) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = exactRedirect;
    return NextResponse.redirect(redirectUrl, 301);
  }

  // Dynamic legacy redirects under /tr
  if (pathname.startsWith("/tr/u/")) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = pathname.replace("/tr/u/", "/tr/profil/");
    return NextResponse.redirect(redirectUrl, 301);
  }

  if (pathname.startsWith("/tr/work/")) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = pathname.replace("/tr/work/", "/tr/calisma-alani/");
    return NextResponse.redirect(redirectUrl, 301);
  }

  if (pathname.startsWith("/admin")) {
    return NextResponse.next();
  }

  // 3. Process localized request with next-intl
  return intlMiddleware(request);
}

export const config = {
  // Match internationalized pathnames, excluding api, admin, static files, and assets
  matcher: ["/", "/(tr|en)/:path*", "/((?!api|admin|_next|_vercel|.*\\..*).*)"],
};
