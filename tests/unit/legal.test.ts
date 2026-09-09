import { describe, it, expect } from "vitest";
import { LegalService } from "@/src/modules/legal/service";
import { containsEmoji } from "@/scripts/check-emojis";

describe("Legal Document Management & Compliance", () => {
  const docKeys = [
    "terms",
    "privacy",
    "matching-disclaimer",
    "acceptable-use",
    "cookies",
    "contact",
  ];

  it("loads all required legal documents in Turkish and English with valid hashes", () => {
    for (const key of docKeys) {
      const trDoc = LegalService.getDocument(key, "tr");
      expect(trDoc.content).toBeDefined();
      expect(trDoc.hash).toMatch(/^[a-f0-9]{64}$/);
      expect(containsEmoji(trDoc.content)).toBe(false);

      const enDoc = LegalService.getDocument(key, "en");
      expect(enDoc.content).toBeDefined();
      expect(enDoc.hash).toMatch(/^[a-f0-9]{64}$/);
      expect(containsEmoji(enDoc.content)).toBe(false);
    }
  });

  it("strictly complies with Master Spec §0.2 limitation-of-liability wording rule", () => {
    const trTerms = LegalService.getDocument("terms", "tr");
    const enTerms = LegalService.getDocument("terms", "en");

    expect(trTerms.content).toContain("Yürürlükteki mevzuatın izin verdiği azami ölçüde");
    expect(enTerms.content).toContain("To the maximum extent permitted by applicable law");
  });

  it("confirms matching disclaimer contains the four mandatory platform non-goal assertions", () => {
    const trDisclaimer = LegalService.getDocument("matching-disclaimer", "tr");
    expect(trDisclaimer.content).toContain("Ödeme Almaz ve Tutmaz");
    expect(trDisclaimer.content).toContain("Hizmet Sözleşmesinin Tarafı Değildir");
    expect(trDisclaimer.content).toContain("Ticari Uyuşmazlık Çözümü Sağlamaz");

    const enDisclaimer = LegalService.getDocument("matching-disclaimer", "en");
    expect(enDisclaimer.content).toContain("Does Not Receive or Hold Funds");
    expect(enDisclaimer.content).toContain("Is Not Party to Service Contracts");
    expect(enDisclaimer.content).toContain("Does Not Adjudicate Commercial Disputes");
  });
});
