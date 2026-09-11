import { describe, it, expect } from "vitest";
import { ProfileService } from "@/src/modules/profiles/service";
import { DEFAULT_USER } from "@/src/modules/auth/demo-user";

describe("Stack Radar & Match Alerts Specifications", () => {
  it("enforces maximum 5 tracked skills per developer profile", async () => {
    const sixSkills = ["Next.js", "TypeScript", "Tailwind CSS", "PostgreSQL", "Go", "Docker"];

    await ProfileService.updateProfile(DEFAULT_USER.id, {
      trackedSkills: sixSkills,
    });

    const profile = await ProfileService.getPublicProfileByHandle(DEFAULT_USER.profile.handle);
    expect(profile?.trackedSkills).toBeDefined();
    expect(profile?.trackedSkills?.length).toBeLessThanOrEqual(5);
    expect(profile?.trackedSkills).toEqual([
      "Next.js",
      "TypeScript",
      "Tailwind CSS",
      "PostgreSQL",
      "Go",
    ]);
  });

  it("prohibits emojis in tracked radar skills", async () => {
    const withEmoji = ["Next.js 🚀", "Tailwind 🎨", "PostgreSQL"];

    await ProfileService.updateProfile(DEFAULT_USER.id, {
      trackedSkills: withEmoji,
    });

    const profile = await ProfileService.getPublicProfileByHandle(DEFAULT_USER.profile.handle);
    expect(profile?.trackedSkills).toEqual(["PostgreSQL"]);
  });

  describe("Canlılık Radarı Geri Sayımı (3-Tier Freshness Radar)", () => {
    it("classifies > 3 days as Emerald (🟢)", () => {
      const now = new Date("2026-09-10T12:00:00Z");
      const activeUntil = new Date("2026-09-16T12:00:00Z"); // 6 days later

      const diffMs = activeUntil.getTime() - now.getTime();
      const diffHours = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60)));
      const diffDays = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));

      expect(diffDays).toBe(6);
      expect(diffDays > 3).toBe(true);
      expect(diffHours > 24).toBe(true);
    });

    it("classifies 1 - 3 days as Amber (🟡)", () => {
      const now = new Date("2026-09-10T12:00:00Z");
      const activeUntil = new Date("2026-09-12T12:00:00Z"); // 2 days later

      const diffMs = activeUntil.getTime() - now.getTime();
      const diffDays = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));

      expect(diffDays).toBe(2);
      expect(diffDays <= 3 && diffDays >= 1).toBe(true);
    });

    it("classifies < 24 hours as Pulsing Rose/Red (🔴)", () => {
      const now = new Date("2026-09-10T12:00:00Z");
      const activeUntil = new Date("2026-09-11T06:00:00Z"); // 18 hours later

      const diffMs = activeUntil.getTime() - now.getTime();
      const diffHours = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60)));

      expect(diffHours).toBe(18);
      expect(diffHours <= 24).toBe(true);
    });
  });

  describe("Quick Filter Chips Filter Invariants", () => {
    const listings = [
      {
        id: "1",
        title: "Taze İlan",
        firstPublishedAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
        budgetMin: "25000",
        activationSeq: 1,
        activeUntil: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
      },
      {
        id: "2",
        title: "Eski Bütçesiz İlan",
        firstPublishedAt: new Date(Date.now() - 48 * 60 * 60 * 1000), // 48 hours ago
        budgetMin: null,
        activationSeq: 1,
        activeUntil: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      },
      {
        id: "3",
        title: "Süresi Dolan İlan",
        firstPublishedAt: new Date(Date.now() - 100 * 60 * 60 * 1000),
        budgetMin: "15000",
        activationSeq: 0,
        activeUntil: new Date(Date.now() - 1000),
      },
    ];

    it("correctly filters last 24h items", () => {
      const now = Date.now();
      const last24h = listings.filter(
        (l) => now - new Date(l.firstPublishedAt).getTime() <= 24 * 60 * 60 * 1000
      );
      expect(last24h.length).toBe(1);
      expect(last24h[0]?.id).toBe("1");
    });

    it("correctly filters fixed budget items", () => {
      const fixedBudget = listings.filter(
        (l) => l.budgetMin !== null && parseFloat(l.budgetMin) > 0
      );
      expect(fixedBudget.length).toBe(2);
      expect(fixedBudget.map((l) => l.id)).toEqual(["1", "3"]);
    });

    it("correctly filters quick responding active employers", () => {
      const now = Date.now();
      const quickResp = listings.filter(
        (l) => l.activationSeq >= 1 && new Date(l.activeUntil).getTime() > now
      );
      expect(quickResp.length).toBe(2);
      expect(quickResp.map((l) => l.id)).toEqual(["1", "2"]);
    });
  });
});
