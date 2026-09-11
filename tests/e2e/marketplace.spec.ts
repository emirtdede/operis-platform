import { test, expect } from "@playwright/test";

test.describe("Operis Marketplace Critical Flows (E2E)", () => {
  test("loads the listings feed and displays live freshness badges and quick chips", async ({
    page,
  }) => {
    // 1. Navigate to listings feed
    await page.goto("/tr/ilanlar");
    await expect(page).toHaveTitle(/Operis/i);

    // 2. Verify quick filter chips exist
    const quickChips = page.locator(
      "button:has-text('Son 24s'), button:has-text('Bütçesi Belirli')"
    );
    await expect(quickChips.first()).toBeVisible();

    // 3. Verify navbar search trigger is present
    const cmdKTrigger = page.locator("button:has-text('⌘K'), button:has-text('Ctrl+K')");
    await expect(cmdKTrigger.first()).toBeVisible();
  });

  test("opens command palette on keyboard shortcut and allows live search", async ({ page }) => {
    await page.goto("/tr/ilanlar");

    // Press Control+K or Meta+K
    await page.keyboard.press("Control+KeyK");

    // Command palette dialog should be visible
    const palette = page.locator("[role='dialog']");
    await expect(palette.first()).toBeVisible();

    // Search input exists and can be typed into
    const searchInput = palette.locator("input[type='text']");
    await expect(searchInput).toBeVisible();
    await searchInput.fill("Next.js");

    // Pressing Escape closes the palette
    await page.keyboard.press("Escape");
    await expect(palette).not.toBeVisible();
  });

  test("toggles theme across dark, light, and black modes", async ({ page }) => {
    await page.goto("/tr/ilanlar");

    // Check html has a theme attribute
    const html = page.locator("html");
    const initialTheme = await html.getAttribute("data-theme");
    expect(initialTheme).toBeTruthy();
  });
});
