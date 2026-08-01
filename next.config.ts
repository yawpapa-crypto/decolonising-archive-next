import type { NextConfig } from "next";
import { withSecurityHeaders } from "@/src/lib/security/headers";

const nextConfig: NextConfig = {
  // OneDrive / cloud-synced folders break native file watchers; polling keeps dev responsive.
  webpack: (config, { dev }) => {
    if (dev) {
      config.watchOptions = {
        poll: 1000,
        aggregateTimeout: 300,
        ignored: ["**/node_modules/**", "**/.git/**", "**/.next/**"],
      };
    }
    return config;
  },
  async headers() {
    return [
      {
        source: "/assets/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
      {
        source: "/api/kgo/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=1800, s-maxage=3600" },
          { key: "Access-Control-Allow-Origin", value: "*" },
        ],
      },
    ];
  },
};

export default withSecurityHeaders(nextConfig);
