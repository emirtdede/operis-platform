import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const securityHeaders = [
  {
    key: "X-DNS-Prefetch-Control",
    value: "on",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "X-Frame-Options",
    value: "DENY",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
  },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-eval' 'unsafe-inline'", // Next.js hydration scripts
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "font-src 'self'",
      "connect-src 'self'",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "object-src 'none'",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
  async rewrites() {
    return [
      // 100% Turkish Slugs -> Internal App Router handlers
      { source: "/tr/kategoriler", destination: "/tr/categories" },
      { source: "/tr/akis", destination: "/tr/feed" },
      { source: "/tr/ilanlar", destination: "/tr/listings" },
      { source: "/tr/ilanlar/yeni", destination: "/tr/listings/new" },
      { source: "/tr/ilanlar/:slug/duzenle", destination: "/tr/listings/:slug/edit" },
      { source: "/tr/ilanlar/:slug", destination: "/tr/listings/:slug" },
      { source: "/tr/giris", destination: "/tr/login" },
      { source: "/tr/kayit", destination: "/tr/register" },
      { source: "/tr/sifremi-unuttum", destination: "/tr/forgot-password" },
      { source: "/tr/sifre-sifirla", destination: "/tr/reset-password" },
      { source: "/tr/profil/:handle", destination: "/tr/u/:handle" },
      { source: "/tr/panel/ilanlarim", destination: "/tr/dashboard/listings" },
      { source: "/tr/panel/ilanlar", destination: "/tr/dashboard/listings" },
      { source: "/tr/panel/teklifler/gelen", destination: "/tr/dashboard/offers/received" },
      { source: "/tr/panel/teklifler/gonderilen", destination: "/tr/dashboard/offers/sent" },
      { source: "/tr/panel/teklifler/giden", destination: "/tr/dashboard/offers/sent" },
      { source: "/tr/panel/ayarlar", destination: "/tr/dashboard/settings" },
      { source: "/tr/panel/guvenlik", destination: "/tr/dashboard/security" },
      { source: "/tr/panel/bildirimler", destination: "/tr/dashboard/notifications" },
      { source: "/tr/panel/kategorilerim", destination: "/tr/dashboard/categories" },
      { source: "/tr/calisma-alani/:id", destination: "/tr/work/:id" },
      { source: "/tr/yasal", destination: "/tr/legal" },
      { source: "/tr/yasal/:slug", destination: "/tr/legal/:slug" },
      { source: "/tr/marka", destination: "/tr/brand" },
      { source: "/tr/yardim", destination: "/tr/help" },
      { source: "/tr/hakkimizda", destination: "/tr/about" },
      { source: "/tr/iletisim", destination: "/tr/contact" },
      { source: "/tr/sikayet-bildir", destination: "/tr/report" },
      { source: "/tr/yetkisiz", destination: "/tr/unauthorized" },

      // 100% English Slug Aliases -> Internal App Router handlers
      { source: "/en/profile/:handle", destination: "/en/u/:handle" },
      { source: "/en/workspace/:id", destination: "/en/work/:id" },
      { source: "/en/settings", destination: "/en/dashboard/settings" },
      { source: "/en/security", destination: "/en/dashboard/security" },
      { source: "/en/notifications", destination: "/en/dashboard/notifications" },
    ];
  },
};

export default withNextIntl(nextConfig);
