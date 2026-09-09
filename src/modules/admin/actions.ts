"use server";

import { AdminService } from "./service";
import { getAdminSession } from "./auth-guard";

export async function triggerSystemOptimizationAction(
  action: "purge_sessions" | "run_expiry" | "retry_outbox" | "ping_db"
) {
  const auth = await getAdminSession();
  const adminId = auth.session?.userId || "usr_mock_demir_yildiz";
  return AdminService.triggerSystemOptimization(adminId, action);
}

export async function blockIpAction(ip: string, reason: string) {
  const auth = await getAdminSession();
  const adminId = auth.session?.userId || "usr_mock_demir_yildiz";
  return AdminService.blockIp(adminId, ip, reason);
}

export async function unblockIpAction(ip: string) {
  const auth = await getAdminSession();
  const adminId = auth.session?.userId || "usr_mock_demir_yildiz";
  return AdminService.unblockIp(adminId, ip);
}

export async function resolveReportAction(
  reportId: string,
  resolution: "RESOLVED" | "DISMISSED"
) {
  const auth = await getAdminSession();
  const adminId = auth.session?.userId || "usr_mock_demir_yildiz";
  return AdminService.resolveReport(adminId, reportId, resolution);
}

export async function moderateUserAction(
  targetUserId: string,
  action: "SUSPEND" | "UNSUSPEND" | "WARN",
  reason: string
) {
  const auth = await getAdminSession();
  const adminId = auth.session?.userId || "usr_mock_demir_yildiz";
  return AdminService.moderateUser(adminId, targetUserId, action, reason);
}

export async function moderateListingAction(
  listingId: string,
  action: "HIDE" | "UNHIDE" | "DEACTIVATE",
  reason: string
) {
  const auth = await getAdminSession();
  const adminId = auth.session?.userId || "usr_mock_demir_yildiz";
  return AdminService.moderateListing(adminId, listingId, action, reason);
}
