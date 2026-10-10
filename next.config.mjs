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
  // Public site: clean addresses (ared.design/, /explore, /for-you, …). The pages live in app/home-next;
  // these rewrites serve them at the root and take precedence over the retired top-level pages.
  async rewrites() {
    const sections = ["c", "contribute", "elements", "explore", "fieldnotes", "following", "for-you", "help", "onboarding", "preferences", "profile", "settings"];
    return {
      beforeFiles: [
        { source: "/", destination: "/home-next" },
        ...sections.flatMap((s) => [
          { source: `/${s}`, destination: `/home-next/${s}` },
          { source: `/${s}/:path*`, destination: `/home-next/${s}/:path*` },
        ]),
        // Personal library collections (reading-list UUIDs). Other /collections/<slug> go to curated collections.
        { source: "/collections/:id([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})", destination: "/home-next/collections/:id" },
      ],
    };
  },
  async redirects() {
    return [
      { source: "/home", destination: "/", permanent: true },
      // Old /home-next addresses → clean addresses (temporary for now; make permanent once settled).
      { source: "/home-next", destination: "/", permanent: false },
      { source: "/home-next/community", destination: "https://www.instagram.com/afr_rd_/", permanent: false },
      { source: "/home-next/:path*", destination: "/:path*", permanent: false },
      { source: "/community", destination: "https://www.instagram.com/afr_rd_/", permanent: false },
      { source: "/discover", destination: "/for-you", permanent: false },
      // The old collection pages are retired.
      { source: "/collections", destination: "/following", permanent: false },
      { source: "/collections/:slug((?![0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$).*)", destination: "/c/:slug", permanent: false },
      { source: "/curated-collections/:id", destination: "/c/:id", permanent: false },
      // Retired pages.
      { source: "/knowledge-graph", destination: "/explore", permanent: false },
      { source: "/knowledge-graph/:path*", destination: "/explore", permanent: false },
      { source: "/source/r-s-rattray-ashanti-1923-via-internet-archive", destination: "/explore", permanent: false },
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
