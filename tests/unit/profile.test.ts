import { describe, it, expect } from "vitest";
import { isValidExternalUrl, profileLinkSchema } from "@/src/modules/profiles/links";

describe("Profile Links & Security Rules", () => {
  it("accepts valid public HTTPS URLs", () => {
    expect(isValidExternalUrl("https://github.com/torvalds")).toBe(true);
    expect(isValidExternalUrl("https://linkedin.com/in/satya-nadella")).toBe(true);
    expect(isValidExternalUrl("https://example.com/portfolio")).toBe(true);
  });

  it("rejects malicious schemes and private network URLs (SSRF mitigation)", () => {
    // Malicious schemes
    expect(isValidExternalUrl("javascript:alert(1)")).toBe(false);
    expect(isValidExternalUrl("data:text/html,<script>alert(1)</script>")).toBe(false);
    expect(isValidExternalUrl("ftp://files.example.com")).toBe(false);

    // Private network / internal IP addresses
    expect(isValidExternalUrl("https://127.0.0.1:8080")).toBe(false);
    expect(isValidExternalUrl("https://192.168.1.1")).toBe(false);
    expect(isValidExternalUrl("https://10.0.0.1")).toBe(false);
    expect(isValidExternalUrl("https://169.254.169.254/latest/meta-data")).toBe(false);
    expect(isValidExternalUrl("https://internal.service.local")).toBe(false);
  });

  it("validates profile link schema and rejects emojis in label", () => {
    const valid = {
      type: "github" as const,
      label: "GitHub Profile",
      url: "https://github.com/octocat",
    };
    expect(profileLinkSchema.safeParse(valid).success).toBe(true);

    const withEmoji = {
      type: "github" as const,
      label: "GitHub 🐙",
      url: "https://github.com/octocat",
    };
    expect(profileLinkSchema.safeParse(withEmoji).success).toBe(false);
  });
});
