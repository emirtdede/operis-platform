import { describe, it, expect } from "vitest";
import { AdminService } from "@/src/modules/admin/service";

describe("AdminService Enterprise Operations", () => {
  it("fetches dashboard metrics with deadLetter and user count", async () => {
    const metrics = await AdminService.getDashboardMetrics();
    expect(metrics.totalUsers).toBeGreaterThanOrEqual(10000);
    expect(metrics.activeListings).toBeGreaterThan(0);
    expect(metrics.deadLetters).toBe(0);
    expect(typeof metrics.openReports).toBe("number");
    expect(typeof metrics.activeThreats).toBe("number");
  });

  it("handles paginated user queries with search and status filtering", async () => {
    const resAll = await AdminService.getUsersPaginated({ page: 1, limit: 10 });
    expect(resAll.items.length).toBeGreaterThan(0);
    expect(resAll.total).toBeGreaterThan(0);

    const resSearch = await AdminService.getUsersPaginated({ search: "Demir" });
    expect(resSearch.items.some((u) => u.displayName.includes("Demir"))).toBe(true);

    const resFilter = await AdminService.getUsersPaginated({ status: "SUSPENDED" });
    expect(resFilter.items.every((u) => u.status === "SUSPENDED")).toBe(true);
  });

  it("handles paginated listings queries and moderation", async () => {
    const listings = await AdminService.getListingsPaginated({ page: 1, limit: 10 });
    expect(listings.items.length).toBeGreaterThan(0);

    const moderated = await AdminService.moderateListing(
      "admin_123",
      "list_sample_01",
      "HIDE",
      "Uygunsuz ilan içeriği sebebiyle gizlendi."
    );
    expect(moderated?.status).toBe("HIDDEN_MODERATION");
  });

  it("records offers and response audit trail", async () => {
    const offers = await AdminService.getOffersPaginated({ status: "ALL" });
    expect(offers.items.length).toBeGreaterThan(0);
    expect(offers.items[0]).toHaveProperty("budgetFormatted");
    expect(offers.items[0]).toHaveProperty("senderDisplayName");
  });

  it("categorizes logs across auth, business, audit and system", async () => {
    const authLogs = await AdminService.getCategorizedLogs({ category: "auth" });
    expect(authLogs.items.every((l) => l.category === "auth")).toBe(true);

    const sysLogs = await AdminService.getCategorizedLogs({ category: "system" });
    expect(sysLogs.items.every((l) => l.category === "system")).toBe(true);
  });

  it("manages abuse incidents and resolution", async () => {
    const incidents = await AdminService.getAbuseIncidents({ status: "ALL" });
    expect(incidents.length).toBeGreaterThan(0);

    const resolved = await AdminService.resolveReport("admin_123", "abuse_001", "RESOLVED");
    expect(resolved).toBe(true);
  });

  it("manages security threats and IP blacklisting", async () => {
    const threats = await AdminService.getSecurityThreats({ status: "ALL" });
    expect(threats.length).toBeGreaterThan(0);

    const blocked = await AdminService.blockIp(
      "admin_123",
      "203.0.113.19",
      "Brute-force saldırısı"
    );
    expect(blocked).toBe(true);

    const unblocked = await AdminService.unblockIp("admin_123", "203.0.113.19");
    expect(unblocked).toBe(true);
  });

  it("triggers system optimization routines safely", async () => {
    const purge = await AdminService.triggerSystemOptimization("admin_123", "purge_sessions");
    expect(purge.success).toBe(true);

    const expiry = await AdminService.triggerSystemOptimization("admin_123", "run_expiry");
    expect(expiry.success).toBe(true);
  });
});
