import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isProd = process.env.NODE_ENV === "production";

const csp = [
  "default-src 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://va.vercel-scripts.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data: https://fonts.gstatic.com",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://vitals.vercel-insights.com https://fonts.googleapis.com https://fonts.gstatic.com",
  "media-src 'self' blob: https:",
].join("; ");

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=()",
  },
  { key: "Content-Security-Policy", value: csp },
  ...(isProd
    ? [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" }]
    : []),
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  devIndicators: false,
  turbopack: {
    root: __dirname,
  },
  // Met cache + catalogue JSON are read at runtime via fs — include in server traces on Vercel.
  outputFileTracingIncludes: {
    "/api/catalogue/records": ["./data/catalogue/**/*"],
    "/api/catalogue/records/[id]": ["./data/catalogue/**/*"],
    "/api/catalogue/record-image": ["./data/catalogue/**/*"],
    "/api/catalogue/stats": ["./data/catalogue/**/*"],
    "/collections/ghana-graphic-design/[id]": ["./data/catalogue/**/*"],
    "/api/visual/resolve": ["./data/catalogue/cache/**/*"],
    "/api/v1/heritage": ["./data/unesco/world-heritage.json"],
    // Featured reads the catalogue at runtime (daily selection + Discover more + admin health).
    "/api/discovery/[action]": ["./data/catalogue/catalogue-records.json", "./data/catalogue/catalogue-taxonomy.json"],
    "/api/admin/featured": ["./data/catalogue/catalogue-records.json"],
  },
  // Runtime fs reads with dynamic paths (lib/visual/resolve-server.ts) make the tracer include the
  // whole project; never ship build output, scratch or documentation folders with functions.
  outputFileTracingExcludes: {
    "*": [".next/lock", ".next/cache/**", ".next/trace", ".next/trace-build", "tmp/**", "artifacts/**", "docs/**", "archive/**", "lab/**", "infra/**"],
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.resolve = config.resolve ?? {};
      config.resolve.alias = {
        ...(config.resolve.alias ?? {}),
        fontkit: path.join(__dirname, "node_modules/fontkit/dist/main.cjs"),
      };
    }
    return config;
  },
  async redirects() {
    return [
      { source: "/home", destination: "/", permanent: true },
      // ared.design opens on the current public home. Temporary (307) so it can change without cached redirects.
      { source: "/", destination: "/home-next", permanent: false },
      { source: "/discover", destination: "/home-next/for-you", permanent: false },
      { source: "/for-you", destination: "/home-next/for-you", permanent: false },
      // The old collection pages are retired. Everything public now lives under /home-next.
      { source: "/collections", destination: "/home-next/following", permanent: false },
      { source: "/collections/:slug", destination: "/home-next/c/:slug", permanent: false },
      { source: "/curated-collections/:id", destination: "/home-next/c/:id", permanent: false },
      // Retired pages.
      { source: "/knowledge-graph", destination: "/home-next/explore", permanent: false },
      { source: "/knowledge-graph/:path*", destination: "/home-next/explore", permanent: false },
      { source: "/source/r-s-rattray-ashanti-1923-via-internet-archive", destination: "/home-next/explore", permanent: false },
      { source: "/home-next/community", destination: "https://www.instagram.com/afr_rd_/", permanent: false },
    ];
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
