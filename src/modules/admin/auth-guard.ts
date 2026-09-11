import {
  getSession,
  SessionPayload,
} from "@/src/modules/auth/session";

export const ADMIN_ROLES = ["ADMIN", "SECURITY_ADMIN", "MODERATOR"] as const;
export type AdminRole = (typeof ADMIN_ROLES)[number];

export interface AdminAuthResult {
  isAuthenticated: boolean;
  isAdmin: boolean;
  session: SessionPayload | null;
  error?: string;
}

/**
 * Validates whether the currently requesting user has active administrative privileges.
 */
export async function getAdminSession(
  allowedRoles: readonly string[] = ADMIN_ROLES
): Promise<AdminAuthResult> {
  try {
    const session = await getSession();

    if (!session) {
      return {
        isAuthenticated: false,
        isAdmin: false,
        session: null,
        error: "No active session found or invalid session",
      };
    }

    if (session.status !== "ACTIVE") {
      return {
        isAuthenticated: true,
        isAdmin: false,
        session,
        error: "Account is suspended or deactivated",
      };
    }

    const hasRole = allowedRoles.includes(session.role);
    if (!hasRole) {
      return {
        isAuthenticated: true,
        isAdmin: false,
        session,
        error: "Insufficient permissions for administrative console",
      };
    }

    return {
      isAuthenticated: true,
      isAdmin: true,
      session,
    };
  } catch (err) {
    return {
      isAuthenticated: false,
      isAdmin: false,
      session: null,
      error: err instanceof Error ? err.message : "Authentication error",
    };
  }
}

/**
 * Strict server-side assertion for admin endpoints.
 * Throws an Error if current user is not authorized.
 */
export async function requireAdminSession(
  allowedRoles: readonly string[] = ADMIN_ROLES
): Promise<SessionPayload> {
  const result = await getAdminSession(allowedRoles);
  if (!result.isAdmin || !result.session) {
    throw new Error(result.error || "Unauthorized administrative access");
  }
  return result.session;
}
