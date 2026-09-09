import { describe, it, expect } from "vitest";
import { getInitials } from "@/src/components/ui/avatar-initials";
import fs from "node:fs";
import path from "node:path";

describe("Design System & UI Primitives", () => {
  describe("AvatarInitials logic", () => {
    it("extracts correct two-letter initials from two names", () => {
      expect(getInitials("Emir Dede")).toBe("ED");
      expect(getInitials("Ada Lovelace")).toBe("AL");
    });

    it("extracts first two letters from single name", () => {
      expect(getInitials("Satoshi")).toBe("SA");
    });

    it("handles multiple words by taking first and last initials", () => {
      expect(getInitials("Mustafa Kemal Ataturk")).toBe("MA");
    });

    it("handles edge cases gracefully", () => {
      expect(getInitials("")).toBe("??");
      expect(getInitials("   ")).toBe("??");
    });
  });

  describe("Theme Tokens & CSS variables", () => {
    it("ensures Light, Dark, and True Black theme rules exist in tokens.css", () => {
      const tokensPath = path.resolve(process.cwd(), "src/styles/tokens.css");
      const tokensContent = fs.readFileSync(tokensPath, "utf-8");

      expect(tokensContent).toContain('[data-theme="light"]');
      expect(tokensContent).toContain('[data-theme="dark"]');
      expect(tokensContent).toContain('[data-theme="black"]');

      // True Black must use true #000000 OLED canvas
      expect(tokensContent).toContain("--bg-canvas: #000000;");
    });
  });
});
