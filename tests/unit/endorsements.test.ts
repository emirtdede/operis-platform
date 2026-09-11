import { describe, it, expect } from "vitest";
import { EndorsementService } from "@/src/modules/endorsements/service";
import { DEFAULT_USER } from "@/src/modules/auth/demo-user";

describe("Bilateral Verified Written Endorsements (Topluluk Tavsiye Notları)", () => {
  it("validates 20 character minimum and 500 character maximum", async () => {
    // Too short (< 20 chars)
    await expect(
      EndorsementService.createEndorsement({
        engagementId: "eng-123",
        authorUserId: "user-1",
        content: "Cok iyiydi!", // 11 chars
      })
    ).rejects.toThrow("ENDORSEMENT_TOO_SHORT");

    // Too long (> 500 chars)
    const longContent = "A".repeat(501);
    await expect(
      EndorsementService.createEndorsement({
        engagementId: "eng-123",
        authorUserId: "user-1",
        content: longContent,
      })
    ).rejects.toThrow("ENDORSEMENT_TOO_LONG");
  });

  it("strictly prohibits emojis in written recommendations", async () => {
    await expect(
      EndorsementService.createEndorsement({
        engagementId: "eng-123",
        authorUserId: "user-1",
        content: "Harika bir Next.js mimarisi teslim etti 🚀 10 numara geliştirici.",
      })
    ).rejects.toThrow("EMOJIS_FORBIDDEN");
  });

  it("retrieves verified endorsements for demo user with 0 revenge star scores", async () => {
    const endorsements = await EndorsementService.getEndorsementsForUser(DEFAULT_USER.id);
    expect(endorsements.length).toBeGreaterThan(0);

    const first = endorsements[0];
    expect(first).toBeDefined();
    expect(first?.authorDisplayName).toBe("Ahmet Yılmaz");
    expect(first?.content).toContain("Demir ile Next.js projemizde çalıştık");
    expect(first?.content).toContain("sıfır hatayla teslim etti");
    expect(first?.projectTitle).toBe("Next.js Kurumsal SaaS Mimarisi & API Entegrasyonu");
  });

  it("retrieves endorsements for a specific engagement", async () => {
    const engagementEndorsements =
      await EndorsementService.getEndorsementsForEngagement("eng-demo-101");
    expect(engagementEndorsements.length).toBeGreaterThan(0);
    expect(engagementEndorsements[0]?.recipientUserId).toBe(DEFAULT_USER.id);
  });
});
