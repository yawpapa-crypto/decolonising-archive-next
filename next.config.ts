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
};

export default withSecurityHeaders(nextConfig);
