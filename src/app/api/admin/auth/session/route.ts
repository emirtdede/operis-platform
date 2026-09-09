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
    const requestedRole = body.role || "ADMIN";
    const email = body.email || "admin@operis.pro";
    const displayName = body.displayName || "Demir Yıldız (Yönetici)";

    const validRoles = ["ADMIN", "SECURITY_ADMIN", "MODERATOR", "USER"];
    const role = validRoles.includes(requestedRole) ? requestedRole : "ADMIN";

    const sessionToken = createSessionToken({
      id: "usr_mock_demir_yildiz",
      email,
      role,
      status: "ACTIVE",
    });

    const response = NextResponse.json({
      success: true,
      message: `Admin oturumu başarıyla oluşturuldu (${role}).`,
      role,
      user: {
        id: "usr_mock_demir_yildiz",
        email,
        displayName,
        role,
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

  // Revert to normal USER role
  const normalToken = createSessionToken({
    id: "usr_mock_demir_yildiz",
    email: "kullanici@operis.pro",
    role: "USER",
    status: "ACTIVE",
  });

  response.cookies.set(SESSION_COOKIE_NAME, normalToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 7 * 24 * 60 * 60,
  });

  return response;
}
