import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { createSessionToken, SESSION_COOKIE_NAME, getSession } from "@/src/modules/auth/session";

export async function GET() {
  const session = await getSession();
  return NextResponse.json({
    authenticated: Boolean(session),
    session,
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const {
      adminKey,
      role: requestedRole,
      email: requestedEmail,
      displayName: requestedName,
    } = body;

    const configuredKey =
      process.env.ADMIN_MASTER_KEY ||
      (process.env.NODE_ENV === "development" || process.env.VITEST
        ? "operis-admin-secret-key-2026"
        : null);

    if (!configuredKey) {
      return NextResponse.json(
        { error: "Yönetici oturum anahtarı sistemde tanımlanmamış." },
        { status: 500 }
      );
    }

    if (!adminKey || typeof adminKey !== "string") {
      return NextResponse.json(
        { error: "Lütfen yönetici güvenlik anahtarını (PIN) giriniz." },
        { status: 401 }
      );
    }

    const keyBuf = Buffer.from(adminKey.trim());
    const expectedBuf = Buffer.from(configuredKey.trim());

    if (keyBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(keyBuf, expectedBuf)) {
      return NextResponse.json(
        { error: "Geçersiz yönetici güvenlik anahtarı (PIN)." },
        { status: 401 }
      );
    }

    // Determine target admin email
    const email = (requestedEmail || "admin@operis.pro").trim().toLowerCase();
    const validRoles = ["ADMIN", "SECURITY_ADMIN", "MODERATOR"] as const;
    let targetRole: (typeof validRoles)[number] = validRoles.includes(requestedRole)
      ? requestedRole
      : "ADMIN";
    let userId = "usr_admin_authorized";

    // Re-verify against database users if available
    try {
      const { getDb, schema } = await import("@/src/lib/db");
      const { eq } = await import("drizzle-orm");
      const db = getDb();
      const [existingUser] = await db
        .select({
          id: schema.users.id,
          role: schema.users.role,
          status: schema.users.status,
        })
        .from(schema.users)
        .where(eq(schema.users.email, email))
        .limit(1);

      if (existingUser) {
        if (existingUser.status !== "ACTIVE") {
          return NextResponse.json(
            { error: "Yönetici hesabı askıya alınmış veya silinmiş." },
            { status: 403 }
          );
        }
        userId = existingUser.id;
        if (validRoles.includes(existingUser.role as (typeof validRoles)[number])) {
          targetRole = existingUser.role as (typeof validRoles)[number];
        }
      }
    } catch {
      // In offline / fallback mode, retain default admin assignment
    }

    const displayName =
      requestedName || (targetRole === "ADMIN" ? "Demir Yıldız (Yönetici)" : "Güvenlik Sorumlusu");

    const sessionToken = createSessionToken({
      id: userId,
      email,
      role: targetRole,
      status: "ACTIVE",
    });

    const response = NextResponse.json({
      success: true,
      message: `Admin oturumu başarıyla oluşturuldu (${targetRole}).`,
      role: targetRole,
      user: {
        id: userId,
        email,
        displayName,
        role: targetRole,
      },
    });

    response.cookies.set(SESSION_COOKIE_NAME, sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 7 * 24 * 60 * 60,
    });

    return response;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Session error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE() {
  const response = NextResponse.json({
    success: true,
    message: "Admin oturumu sonlandırıldı.",
  });

  response.cookies.delete(SESSION_COOKIE_NAME);

  return response;
}
