import type { NextConfig } from "next";

// webpack eval-source-map (used in dev) requires unsafe-eval; production bundles do not.
const scriptSrc =
  process.env.NODE_ENV === "production"
    ? "script-src 'self' 'unsafe-inline'"
    : "script-src 'self' 'unsafe-inline' 'unsafe-eval'";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  async redirects() {
    return [
      { source: "/statements", destination: "/billing/statements", permanent: false },
      { source: "/statements/:path*", destination: "/billing/statements/:path*", permanent: false },
      { source: "/utility-bills", destination: "/billing/utility-bills", permanent: false },
      { source: "/reports/tax", destination: "/billing/tax-reports", permanent: false },
      { source: "/notices", destination: "/documents/notices", permanent: false },
      { source: "/notices/:path*", destination: "/documents/notices/:path*", permanent: false },
      { source: "/profile", destination: "/settings/profile", permanent: false },
      { source: "/integrations", destination: "/settings/integrations", permanent: false },
    ];
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
    optimizePackageImports: ["lucide-react", "date-fns"],
  },
  headers: async () => [
    {
      source: "/(.*)",
      headers: [
        { key: "X-Frame-Options", value: "DENY" },
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        {
          key: "Strict-Transport-Security",
          value: "max-age=63072000; includeSubDomains; preload",
        },
        {
          key: "Content-Security-Policy",
          value: [
            "default-src 'self'",
            scriptSrc,
            "style-src 'self' 'unsafe-inline'",
            "img-src 'self' data: blob:",
            "font-src 'self'",
            "connect-src 'self' https://api.stripe.com",
            "frame-src https://js.stripe.com",
            "object-src 'none'",
            "base-uri 'self'",
          ].join("; "),
        },
      ],
    },
    {
      source: "/sw.js",
      headers: [
        {
          key: "Cache-Control",
          value: "no-cache, no-store, must-revalidate",
        },
        {
          key: "Service-Worker-Allowed",
          value: "/",
        },
      ],
    },
  ],
};

export default nextConfig;
