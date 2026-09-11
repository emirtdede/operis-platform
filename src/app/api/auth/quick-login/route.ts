import { NextResponse } from "next/server";
import { DEFAULT_USER } from "@/src/modules/auth/demo-user";
import {
  createSessionToken,
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE_SECONDS,
} from "@/src/modules/auth/session";

export async function POST(req: Request) {
  const isEn = req.headers.get("x-locale") === "en";
  const allowQuickLogin =
    (process.env.ALLOW_DEMO_CREDENTIALS === "true" ||
      process.env.ENABLE_DEMO_LOGIN === "true" ||
      process.env.VITEST !== undefined ||
      process.env.NODE_ENV === "development" ||
      process.env.NODE_ENV === "test") &&
    process.env.NODE_ENV !== "production";

  if (!allowQuickLogin) {
    return NextResponse.json(
      {
        error: isEn
          ? "Quick demo login is disabled."
          : "Hızlı demo girişi bu ortamda devre dışıdır.",
      },
      { status: 403 }
    );
  }

  try {
    const sessionToken = createSessionToken({
      id: DEFAULT_USER.id,
      email: DEFAULT_USER.email,
      role: DEFAULT_USER.role,
      status: DEFAULT_USER.status,
    });

    const response = NextResponse.json(
      {
        success: true,
        user: {
          id: DEFAULT_USER.id,
          email: DEFAULT_USER.email,
          emailVerified: DEFAULT_USER.emailVerified,
          phoneVerified: DEFAULT_USER.phoneVerified,
          role: DEFAULT_USER.role,
          status: DEFAULT_USER.status,
          profile: DEFAULT_USER.profile,
        },
      },
      { status: 200 }
    );

    // Set secure session cookie (7 days matching token expiration)
    response.cookies.set(SESSION_COOKIE_NAME, sessionToken, {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_MAX_AGE_SECONDS,
    });

    return response;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Quick login failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
