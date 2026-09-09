import { describe, it, expect } from "vitest";
import { formatCurrency, formatDate, formatRelativeTime } from "@/src/lib/i18n/formatters";
import fs from "node:fs";
import path from "node:path";

describe("i18n Foundation & Catalogs", () => {
  it("formats currency correctly for TR and EN", () => {
    const formattedTr = formatCurrency(15000, "TRY", "tr");
    expect(formattedTr).toContain("15.000");

    const formattedEn = formatCurrency(5000, "USD", "en");
    expect(formattedEn).toContain("5,000");
  });

  it("formats dates consistently across locales", () => {
    const fixedDate = new Date("2026-09-06T12:00:00Z");
    const trDate = formatDate(fixedDate, "tr");
    const enDate = formatDate(fixedDate, "en");

    expect(trDate).toContain("2026");
    expect(enDate).toContain("2026");
  });

  it("calculates relative time correctly", () => {
    const now = Date.now();
    const threeDaysLater = new Date(now + 3 * 24 * 60 * 60 * 1000);
    const relTr = formatRelativeTime(threeDaysLater, "tr");
    const relEn = formatRelativeTime(threeDaysLater, "en");

    expect(relTr.toLowerCase()).toContain("gün");
    expect(relEn.toLowerCase()).toContain("day");
  });

  it("guarantees 100% exact key parity between messages/tr.json and messages/en.json", () => {
    const tr = JSON.parse(
      fs.readFileSync(path.resolve(process.cwd(), "messages/tr.json"), "utf-8")
    );
    const en = JSON.parse(
      fs.readFileSync(path.resolve(process.cwd(), "messages/en.json"), "utf-8")
    );

    function getKeys(obj: Record<string, unknown>, prefix = ""): string[] {
      let result: string[] = [];
      for (const [k, v] of Object.entries(obj)) {
        const full = prefix ? `${prefix}.${k}` : k;
        if (v && typeof v === "object" && !Array.isArray(v)) {
          result = result.concat(getKeys(v as Record<string, unknown>, full));
        } else {
          result.push(full);
        }
      }
      return result;
    }

    const trKeys = getKeys(tr).sort();
    const enKeys = getKeys(en).sort();

    expect(trKeys).toEqual(enKeys);
  });
});
