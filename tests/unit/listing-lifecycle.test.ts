import { describe, it, expect } from "vitest";
import { generateSlug, SEVEN_DAYS_MS } from "@/src/modules/listings/service";

describe("Listing Lifecycle & State Invariants", () => {
  describe("Slug Generation", () => {
    it("converts Turkish characters to ASCII and produces lowercase hyphenated slugs", () => {
      const slug = generateSlug("Örnek Türkçe Başlık ve Şahane Yazılım Çözümü");
      expect(slug).toMatch(/^[a-z0-9-]+$/);
      expect(slug).toContain("ornek-turkce-baslik-ve-sahane-yazilim-cozumu-");
    });

    it("appends unique hex suffix to prevent URL collisions", () => {
      const slug1 = generateSlug("Aynı Başlık");
      const slug2 = generateSlug("Aynı Başlık");

      expect(slug1).not.toBe(slug2);
      expect(slug1.length).toBeGreaterThan(10);
    });
  });

  describe("Seven-Day Activation Window", () => {
    it("verifies 7-day duration in milliseconds equals exactly 604,800,000 ms", () => {
      const expectedMs = 7 * 24 * 60 * 60 * 1000;
      expect(SEVEN_DAYS_MS).toBe(expectedMs);
      expect(SEVEN_DAYS_MS).toBe(604800000);
    });

    it("verifies active_until calculation from a base publication timestamp", () => {
      const publicationTime = new Date("2026-09-06T12:00:00Z");
      const activeUntil = new Date(publicationTime.getTime() + SEVEN_DAYS_MS);

      expect(activeUntil.toISOString()).toBe("2026-09-13T12:00:00.000Z");
    });

    it("validates expiration condition boundary (active_until <= referenceTime)", () => {
      const publicationTime = new Date("2026-09-06T12:00:00Z");
      const activeUntil = new Date(publicationTime.getTime() + SEVEN_DAYS_MS);

      // Before 7 days -> still active
      const sixDaysLater = new Date("2026-09-12T12:00:00Z");
      expect(activeUntil.getTime() <= sixDaysLater.getTime()).toBe(false);

      // Exactly at 7 days -> expired
      const exactlySevenDays = new Date("2026-09-13T12:00:00Z");
      expect(activeUntil.getTime() <= exactlySevenDays.getTime()).toBe(true);

      // After 7 days -> expired
      const eightDaysLater = new Date("2026-09-14T12:00:00Z");
      expect(activeUntil.getTime() <= eightDaysLater.getTime()).toBe(true);
    });
  });
});
