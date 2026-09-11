"use server";

import { AdminService } from "./service";
import { requireAdminSession } from "./auth-guard";

export async function triggerSystemOptimizationAction(
  action: "purge_sessions" | "run_expiry" | "retry_outbox" | "ping_db"
) {
  const session = await requireAdminSession();
  return AdminService.triggerSystemOptimization(session.userId, action);
}

export async function blockIpAction(ip: string, reason: string) {
  const session = await requireAdminSession();
  return AdminService.blockIp(session.userId, ip, reason);
}

export async function unblockIpAction(ip: string) {
  const session = await requireAdminSession();
  return AdminService.unblockIp(session.userId, ip);
}

export async function resolveReportAction(reportId: string, resolution: "RESOLVED" | "DISMISSED") {
  const session = await requireAdminSession();
  return AdminService.resolveReport(session.userId, reportId, resolution);
}

export async function moderateUserAction(
  targetUserId: string,
  action: "SUSPEND" | "UNSUSPEND" | "WARN",
  reason: string
) {
  const session = await requireAdminSession();
  return AdminService.moderateUser(session.userId, targetUserId, action, reason);
}

export async function moderateListingAction(
  listingId: string,
  action: "HIDE" | "UNHIDE" | "DEACTIVATE",
  reason: string
) {
  const session = await requireAdminSession();
  return AdminService.moderateListing(session.userId, listingId, action, reason);
}
