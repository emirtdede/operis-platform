import { NextResponse } from "next/server";
import { AuthService } from "@/src/modules/auth/service";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const result = await AuthService.login(body);

    const response = NextResponse.json(
      {
        success: true,
        user: result.user,
      },
      { status: 200 }
    );

    // Set secure HTTP-only session cookie
    response.cookies.set("fp_session", result.sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 30 * 24 * 60 * 60, // 30 days
    });

    return response;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Login failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
