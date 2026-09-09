import { NextResponse } from "next/server";
import { DEFAULT_USER } from "@/src/modules/auth/demo-user";
import { createSessionToken, SESSION_COOKIE_NAME } from "@/src/modules/auth/session";

export async function POST() {
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

    // Set secure session cookie (30 days)
    response.cookies.set(SESSION_COOKIE_NAME, sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 30 * 24 * 60 * 60,
    });

    return response;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Quick login failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
