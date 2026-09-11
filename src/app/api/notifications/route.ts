import { NextResponse } from "next/server";
import { eq, desc, and, isNull, sql } from "drizzle-orm";
import { getSession } from "@/src/modules/auth/session";
import { getDb, schema } from "@/src/lib/db";
import {
  checkRateLimit,
  getClientIp,
  rateLimitExceededResponse,
} from "@/src/lib/security/rate-limit";

import { inMemoryFallbackNotifications } from "@/src/modules/notifications/in-memory";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const isEn = req.headers.get("x-locale") === "en" || searchParams.get("locale") === "en";

  try {
    const session = await getSession();
    if (!session?.userId) {
      return NextResponse.json(
        { error: isEn ? "Unauthorized. Please sign in." : "Oturum açmanız gerekmektedir." },
        { status: 401 }
      );
    }

    const limit = Math.min(Math.max(parseInt(searchParams.get("limit") || "50", 10), 1), 50);
    const offset = Math.max(parseInt(searchParams.get("offset") || "0", 10), 0);
    const unreadOnly = searchParams.get("unread") === "true";

    try {
      const db = getDb();
      const whereConditions = [eq(schema.notifications.userId, session.userId)];
      if (unreadOnly) {
        whereConditions.push(isNull(schema.notifications.readAt));
      }

      // Accurate unread count for the authenticated user
      const unreadResults = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(schema.notifications)
        .where(
          and(
            eq(schema.notifications.userId, session.userId),
            isNull(schema.notifications.readAt)
          )
        );
      const unreadCount = Number(unreadResults[0]?.count ?? 0);

      // Total matching items
      const totalResults = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(schema.notifications)
        .where(and(...whereConditions));
      const totalCount = Number(totalResults[0]?.count ?? 0);

      // Paginated rows directly from DB
      const rows = await db
        .select()
        .from(schema.notifications)
        .where(and(...whereConditions))
        .orderBy(desc(schema.notifications.createdAt))
        .limit(limit)
        .offset(offset);

      return NextResponse.json(
        {
          notifications: rows,
          totalCount,
          unreadCount,
          hasMore: offset + rows.length < totalCount,
        },
        { status: 200 }
      );
    } catch {
      if (process.env.NODE_ENV === "production") {
        return NextResponse.json(
          {
            notifications: [],
            totalCount: 0,
            unreadCount: 0,
            hasMore: false,
          },
          { status: 200 }
        );
      }
    }

    // In-memory fallback for local dev / preview when DB is offline
    let fallbackFiltered = inMemoryFallbackNotifications;
    if (unreadOnly) {
      fallbackFiltered = fallbackFiltered.filter((r) => !r.readAt);
    }

    if (isEn) {
      fallbackFiltered = fallbackFiltered.map((n) => {
        const trTitle = String(n.payloadJson?.title || "");
        let enTitle = trTitle;
        let enMessage = String(n.payloadJson?.message || "");
        let enUrl = String(n.payloadJson?.actionUrl || "");

        if (trTitle.includes("Yeni Teklif Alındı")) {
          enTitle = "New Offer Received";
          enMessage = "A new proposal of 45,000 TL was submitted for your Next.js Enterprise project.";
          enUrl = "/en/dashboard/offers/received";
        } else if (trTitle.includes("Kabul Edildi")) {
          enTitle = "Your Offer Has Been Accepted!";
          enMessage = "Your proposal for Mobile Marketplace has been approved by the listing owner.";
          enUrl = "/en/dashboard/offers/sent";
        } else if (trTitle.includes("Kategori Radarı")) {
          enTitle = "Category Radar: New Project";
          enMessage = "A new technology project has been posted in your followed category 'Mobile Application'.";
          enUrl = "/en/listings";
        } else if (trTitle.includes("Güvenlik Bildirimi")) {
          enTitle = "Security Alert";
          enMessage = "Your account was successfully accessed from a new browser session.";
          enUrl = "/en/dashboard/settings";
        } else if (trTitle.includes("Teklif Revizesi")) {
          enTitle = "Proposal Revised";
          enMessage = "Proposal parameters for SaaS Dashboard project were revised by the freelancer.";
          enUrl = "/en/dashboard/offers/received";
        } else if (trTitle.includes("Proje Başarıyla Tamamlandı")) {
          enTitle = "Project Successfully Completed";
          enMessage = "Delivery of API Integration project was confirmed by the client and archived.";
          enUrl = "/en/dashboard/listings";
        } else if (trTitle.includes("Canlılık Uyarısı")) {
          enTitle = "Freshness Alert (24 Hours Remaining)";
          enMessage = "Your project listing freshness window expires tomorrow. You can renew it with one click.";
          enUrl = "/en/dashboard/listings";
        } else if (trTitle.includes("Kalite Onayı")) {
          enTitle = "Listing Approved";
          enMessage = "Your newly published listing successfully passed Operis spam and content moderation.";
          enUrl = "/en/listings";
        } else if (trTitle.includes("Yeni Proje Eşleşmesi")) {
          enTitle = "New Project Match";
          enMessage = "A new project 'AI & LLM Integration' matching your stack radar is now live.";
          enUrl = "/en/listings";
        } else if (enUrl.startsWith("/tr/")) {
          enUrl = enUrl
            .replace("/tr/panel/teklifler/gelen", "/en/dashboard/offers/received")
            .replace("/tr/panel/teklifler/gonderilen", "/en/dashboard/offers/sent")
            .replace("/tr/panel/ilanlarim", "/en/dashboard/listings")
            .replace("/tr/panel/ayarlar", "/en/dashboard/settings")
            .replace("/tr/ilanlar", "/en/listings");
        }

        return {
          ...n,
          payloadJson: {
            ...n.payloadJson,
            title: enTitle,
            message: enMessage,
            actionUrl: enUrl,
          },
        };
      });
    }

    const pagedFallback = fallbackFiltered.slice(offset, offset + limit);
    const fallbackUnreadCount = inMemoryFallbackNotifications.filter((r) => !r.readAt).length;

    return NextResponse.json(
      {
        notifications: pagedFallback,
        totalCount: fallbackFiltered.length,
        unreadCount: fallbackUnreadCount,
        hasMore: offset + pagedFallback.length < fallbackFiltered.length,
      },
      { status: 200 }
    );
  } catch (err: unknown) {
    const message =
      err instanceof Error
        ? err.message
        : isEn ? "Failed to fetch notifications." : "Bildirimler alınamadı.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const ip = getClientIp(req);
  const headerLocale = req.headers.get("x-locale");
  const isEnHeader = headerLocale === "en";

  const limitCheck = checkRateLimit(`notif:action:${ip}`, 60, 60 * 1000);
  if (!limitCheck.success) {
    return rateLimitExceededResponse(
      limitCheck.reset,
      isEnHeader
        ? "Too many notification actions. Please wait a moment."
        : "Çok fazla işlem yapıldı. Lütfen biraz bekleyiniz."
    );
  }

  let isEn = isEnHeader;
  try {
    const session = await getSession();
    if (!session?.userId) {
      return NextResponse.json(
        { error: isEnHeader ? "Unauthorized. Please sign in." : "Oturum açmanız gerekmektedir." },
        { status: 401 }
      );
    }

    const body = await req.json();
    if (body?.locale === "en") isEn = true;

    try {
      const db = getDb();

      if (body.action === "markAllRead") {
        await db
          .update(schema.notifications)
          .set({ readAt: new Date() })
          .where(
            and(
              eq(schema.notifications.userId, session.userId),
              isNull(schema.notifications.readAt)
            )
          );
      } else if (body.notificationId && typeof body.notificationId === "string") {
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          body.notificationId
        );
        if (isUuid) {
          await db
            .update(schema.notifications)
            .set({ readAt: new Date() })
            .where(
              and(
                eq(schema.notifications.id, body.notificationId),
                eq(schema.notifications.userId, session.userId)
              )
            );
        }
      }
    } catch (err) {
      if (process.env.NODE_ENV === "production") {
        throw err;
      }
      // DB error in dev, update in-memory
      const nowIso = new Date().toISOString();
      if (body.action === "markAllRead") {
        for (const n of inMemoryFallbackNotifications) {
          if (!n.readAt) {
            n.readAt = nowIso;
          }
        }
      } else if (body.notificationId) {
        const found = inMemoryFallbackNotifications.find((n) => n.id === body.notificationId);
        if (found) {
          found.readAt = nowIso;
        }
      }
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err: unknown) {
    const message =
      err instanceof Error
        ? err.message
        : isEn ? "Failed to update notification." : "Bildirim güncellenemedi.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
