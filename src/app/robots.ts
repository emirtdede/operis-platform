import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://operis.pro";

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/dashboard/",
          "/*/dashboard/",
          "/panel/",
          "/*/panel/",
          "/work/",
          "/*/work/",
          "/workspace/",
          "/*/workspace/",
          "/calisma-alani/",
          "/*/calisma-alani/",
          "/settings/",
          "/*/settings/",
          "/admin/",
          "/api/",
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
