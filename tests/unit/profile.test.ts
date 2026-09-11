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

describe("Avatar Picture URL Security & Management", () => {
  it("accepts valid public HTTPS image URLs", () => {
    expect(isValidExternalUrl("https://images.unsplash.com/photo-1534528741775-53994a69daeb")).toBe(
      true
    );
    expect(isValidExternalUrl("https://avatars.githubusercontent.com/u/583231")).toBe(true);
    expect(
      isValidExternalUrl("https://secure.gravatar.com/avatar/205e460b479e2e5b48aec07710c08d50")
    ).toBe(true);
  });

  it("blocks dangerous protocols, data URIs, and loopback addresses for avatar URLs", () => {
    expect(isValidExternalUrl("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA")).toBe(false);
    expect(isValidExternalUrl("javascript:evil()")).toBe(false);
    expect(isValidExternalUrl("https://127.0.0.1/avatar.png")).toBe(false);
    expect(isValidExternalUrl("https://169.254.169.254/latest/meta-data")).toBe(false);
    expect(isValidExternalUrl("https://10.0.0.1/avatar.png")).toBe(false);
  });

  it("updates and retrieves avatarUrl via ProfileService for demo user", async () => {
    const { ProfileService } = await import("@/src/modules/profiles/service");
    const { DEFAULT_USER } = await import("@/src/modules/auth/demo-user");

    // Set avatar URL
    await ProfileService.updateProfile(DEFAULT_USER.id, {
      avatarUrl: "https://images.unsplash.com/photo-test-avatar.jpg",
    });

    const profile = await ProfileService.getProfileByUserId(DEFAULT_USER.id);
    expect(profile?.avatarUrl).toBe("https://images.unsplash.com/photo-test-avatar.jpg");

    const publicProfile = await ProfileService.getPublicProfileByHandle(
      DEFAULT_USER.profile.handle
    );
    expect(publicProfile?.avatarUrl).toBe("https://images.unsplash.com/photo-test-avatar.jpg");

    // Clear avatar URL
    await ProfileService.updateProfile(DEFAULT_USER.id, {
      avatarUrl: "",
    });

    const clearedProfile = await ProfileService.getProfileByUserId(DEFAULT_USER.id);
    expect(clearedProfile?.avatarUrl).toBeNull();
  });
});
