import { NextResponse } from "next/server";
import { SESSION_COOKIE_NAME } from "@/src/modules/auth/session";

export async function POST() {
  const response = NextResponse.json({ success: true }, { status: 200 });

  // Clear session cookie
  response.cookies.set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });

  // Clear Clerk session cookies
  response.cookies.set("__session", "", {
    path: "/",
    maxAge: 0,
  });
  response.cookies.set("__client_uat", "", {
    path: "/",
    maxAge: 0,
  });

  return response;
}
