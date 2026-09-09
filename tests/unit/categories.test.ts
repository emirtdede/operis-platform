import { describe, it, expect } from "vitest";
import { SEED_CATEGORIES } from "@/db/seeds/categories";

describe("Category Service & Privacy Invariants", () => {
  it("ensures all seed categories have defined stable keys and sort orders", () => {
    const keys = new Set<string>();
    SEED_CATEGORIES.forEach((cat) => {
      expect(cat.key).toMatch(/^[a-z0-9-]+$/);
      expect(keys.has(cat.key)).toBe(false);
      keys.add(cat.key);
      expect(cat.sortOrder).toBeGreaterThanOrEqual(1);
    });
  });

  it("verifies localized translation integrity for categories", () => {
    for (const cat of SEED_CATEGORIES) {
      expect(cat.translations.tr.name.length).toBeGreaterThan(2);
      expect(cat.translations.en.name.length).toBeGreaterThan(2);
      expect(cat.translations.tr.description.length).toBeGreaterThan(5);
      expect(cat.translations.en.description.length).toBeGreaterThan(5);
    }
  });
});
