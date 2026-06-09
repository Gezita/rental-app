import type { NextConfig } from "next";

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
        {
          key: "Permissions-Policy",
          value: "camera=(), microphone=(), geolocation=()",
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
