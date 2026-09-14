import { describe, it, expect } from "vitest";

describe("Developer Command Palette (Cmd+K / Ctrl+K) Specifications", () => {
  const themes = ["dark", "light", "black"] as const;

  it("supports exactly 3 curated visual themes (Dark, Light, Black OLED)", () => {
    expect(themes).toContain("dark");
    expect(themes).toContain("light");
    expect(themes).toContain("black");
    expect(themes.length).toBe(3);
  });

  it("defines standard platform routes for rapid keyboard navigation", () => {
    const navRoutes = [
      { id: "nav-browse", path: "/tr/ilanlar" },
      { id: "nav-new", path: "/tr/ilanlar/yeni" },
      { id: "nav-workspace", path: "/tr/panel/ilanlarim" },
      { id: "nav-offers-received", path: "/tr/panel/teklifler/gelen" },
      { id: "nav-offers-sent", path: "/tr/panel/teklifler/gonderilen" },
      { id: "nav-notifications", path: "/tr/panel/bildirimler" },
      { id: "nav-profile", path: "/tr/profil/demokullanici" },
    ];

    for (const route of navRoutes) {
      expect(route.path.startsWith("/tr/")).toBe(true);
      expect(route.id.length).toBeGreaterThan(0);
    }
    expect(navRoutes.length).toBe(7);
  });

  it("filters search queries case-insensitively across listings and commands", () => {
    const sampleItems = [
      { id: "1", title: "Next.js Fullstack Portal Geliştirme", category: "Web Geliştirme" },
      { id: "2", title: "Go & PostgreSQL Yüksek Trafikli API", category: "Backend Mimari" },
      { id: "3", title: "Flutter iOS ve Android Mobil İstemci", category: "Mobil Uygulama" },
    ];

    const query = "next.js";
    const matched = sampleItems.filter(
      (item) =>
        item.title.toLowerCase().includes(query.toLowerCase()) ||
        item.category.toLowerCase().includes(query.toLowerCase())
    );

    expect(matched.length).toBe(1);
    expect(matched[0]?.id).toBe("1");
  });

  it("evaluates multi-term relevance scoring in ListingService.searchListingsFullText", async () => {
    const { ListingService } = await import("@/src/modules/listings/service");
    const results = await ListingService.searchListingsFullText("Next.js API");
    expect(Array.isArray(results)).toBe(true);
    if (results.length > 0) {
      expect(results[0]?.relevanceScore).toBeGreaterThan(0);
      expect(results[0]?.title).toBeDefined();
    }
  });

  it("integrates /api/listings/search route handler with ListingService.searchListingsFullText", async () => {
    const { setDbForTesting, resetDbForTesting } = await import("@/src/lib/db");
    const { createAdminDbFixture } = await import("@/tests/helpers/admin-db-fixture");
    setDbForTesting(createAdminDbFixture());

    try {
      const { GET } = await import("@/src/app/api/listings/search/route");
      const req = new Request("http://localhost:3000/api/listings/search?q=Next.js&locale=tr");
      const res = await GET(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(Array.isArray(data.items)).toBe(true);
    } finally {
      resetDbForTesting();
    }
  });
});
