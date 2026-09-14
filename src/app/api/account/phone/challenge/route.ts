import { NextResponse } from "next/server";
import { getSession } from "@/src/modules/auth/session";
import {
  getActivePhoneChallengeAsync,
  PhoneVerificationError,
  type OtpPurpose,
} from "@/src/modules/auth/verification";

export async function GET(req: Request) {
  const session = await getSession();
  if (!session?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const purposeParam = searchParams.get("purpose");
  const purpose: OtpPurpose =
    purposeParam === "PHONE_CHANGE" ? "PHONE_CHANGE" : "INITIAL_VERIFICATION";

  try {
    const challenge = await getActivePhoneChallengeAsync(session.userId, purpose);
    if (!challenge) {
      return NextResponse.json({ success: false, active: false }, { status: 200 });
    }

    return NextResponse.json({
      success: true,
      active: true,
      challengeId: challenge.challengeId,
      secondsRemaining: challenge.secondsRemaining,
      expiresAt: challenge.expiresAt.toISOString(),
    });
  } catch (err: unknown) {
    if (err instanceof PhoneVerificationError && err.code === "DB_UNAVAILABLE") {
      return NextResponse.json(
        { error: "Database service temporarily unavailable.", active: false },
        { status: 503 }
      );
    }
    return NextResponse.json(
      { error: "Failed to query active verification challenge.", active: false },
      { status: 500 }
    );
  }
}
