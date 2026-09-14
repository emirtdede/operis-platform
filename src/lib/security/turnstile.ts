import { getEnv } from "@/src/config/env";

export interface TurnstileVerifyResult {
  success: boolean;
  error?: string;
}

/**
 * Verifies a Cloudflare Turnstile token server-side using the siteverify API.
 * Implements a fail-open architecture so a Cloudflare outage does not lock out legitimate users.
 */
export async function verifyTurnstileToken(
  token?: string | null,
  ip?: string
): Promise<TurnstileVerifyResult> {
  const secretKey =
    process.env.TURNSTILE_SECRET_KEY ||
    (() => {
      try {
        return getEnv().TURNSTILE_SECRET_KEY;
      } catch {
        return undefined;
      }
    })();

  // Gracefully bypass if Turnstile is not configured (e.g. local dev / testing)
  if (!secretKey) {
    return { success: true };
  }

  if (!token) {
    return { success: false, error: "Missing bot verification token" };
  }

  try {
    const formData = new URLSearchParams();
    formData.append("secret", secretKey);
    formData.append("response", token);
    if (ip) {
      formData.append("remoteip", ip);
    }

    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body: formData,
      headers: {
        "content-type": "application/x-www-form-urlencoded",
      },
      signal: AbortSignal.timeout(3500),
    });

    const data = (await res.json()) as { success: boolean; "error-codes"?: string[] };

    if (!data.success) {
      return {
        success: false,
        error: data["error-codes"]?.[0] || "Bot verification failed. Please try again.",
      };
    }

    return { success: true };
  } catch (err) {
    // Fail-open resilience: log error but do not block user during 3rd party API outages
    console.error("Cloudflare Turnstile verification network error:", err);
    return { success: true };
  }
}
