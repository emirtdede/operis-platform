import { NextResponse } from "next/server";
import { FeedService } from "@/src/modules/listings/feed/service";
import { inMemoryListings } from "@/src/modules/listings/service";
import { getSession } from "@/src/modules/auth/session";
import {
  checkRateLimit,
  getClientIp,
  rateLimitExceededResponse,
} from "@/src/lib/security/rate-limit";

export async function GET(req: Request) {
  const ip = getClientIp(req);
  const limitCheck = checkRateLimit(`listing:search:${ip}`, 60, 60 * 1000);
  const { searchParams } = new URL(req.url);
  const locale = (searchParams.get("locale") || "tr") as "tr" | "en";
  const isEn = locale === "en";

  if (!limitCheck.success) {
    return rateLimitExceededResponse(
      limitCheck.reset,
      isEn ? "Too many searches. Please wait a moment." : "Çok fazla arama yapıldı. Lütfen bekleyin."
    );
  }

  try {
    const q = (searchParams.get("q") || "").trim().toLowerCase();

    if (!q) {
      return NextResponse.json({ items: [] });
    }

    try {
      const session = await getSession().catch(() => null);
      const feed = await FeedService.getFeedListings({
        mode: "all",
        search: q,
        limit: 6,
        locale,
        userId: session?.userId,
      });

      return NextResponse.json({
        items: feed.items.map((item) => ({
          id: item.id,
          title: item.title,
          slug: item.slug,
          categoryName: item.categoryName,
          tags: item.tags,
          budgetMode: item.budgetMode,
          budgetMin: item.budgetMin,
          budgetMax: item.budgetMax,
          budgetCurrency: item.budgetCurrency,
        })),
      });
    } catch {
      if (process.env.NODE_ENV === "production") {
        return NextResponse.json({ items: [] });
      }

      // In-memory fallback
      const now = new Date();
      const matches = inMemoryListings
        .filter(
          (l) =>
            l.status === "ACTIVE" &&
            Boolean(l.activeUntil && new Date(l.activeUntil) > now) &&
            (l.title.toLowerCase().includes(q) ||
              l.summary.toLowerCase().includes(q) ||
              l.tags.some((t) => t.toLowerCase().includes(q)))
        )
        .slice(0, 6)
        .map((l) => ({
          id: l.id,
          title: l.title,
          slug: l.slug,
          categoryName:
            isEn
              ? l.categoryId === "cat_mobile_dev"
                ? "Mobile Development"
                : l.categoryId === "cat_backend_dev"
                  ? "Backend Development"
                  : "Web Development"
              : l.categoryId === "cat_mobile_dev"
                ? "Mobil Uygulama"
                : l.categoryId === "cat_backend_dev"
                  ? "Backend & API"
                  : "Web Geliştirme",
          tags: l.tags,
          budgetMode: l.budgetMode,
          budgetMin: l.budgetMin,
          budgetMax: l.budgetMax,
          budgetCurrency: l.budgetCurrency,
        }));

      return NextResponse.json({ items: matches });
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : isEn ? "Search failed" : "Arama başarısız oldu";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
