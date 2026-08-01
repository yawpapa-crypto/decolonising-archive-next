import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/kgo/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/admin/", "/my", "/my/", "/curator", "/api/admin", "/api/workspace", "/api/workbench"],
      },
      {
        userAgent: "GPTBot",
        allow: ["/", "/records/", "/knowledge/", "/knowledge-areas/", "/communities/", "/language/", "/region/", "/country/", "/source/", "/explore/", "/collections/", "/llms.txt", "/ai.txt", "/api/records/", "/api/catalogue/", "/api/kgo/", "/api/kgo/graphql"],
        disallow: ["/admin", "/my", "/curator", "/api/admin", "/api/workspace", "/api/workbench"],
      },
      {
        userAgent: "ClaudeBot",
        allow: ["/", "/records/", "/knowledge/", "/knowledge-areas/", "/communities/", "/language/", "/region/", "/country/", "/source/", "/explore/", "/collections/", "/llms.txt", "/ai.txt", "/api/records/", "/api/catalogue/", "/api/kgo/", "/api/kgo/graphql"],
        disallow: ["/admin", "/my", "/curator", "/api/admin", "/api/workspace", "/api/workbench"],
      },
      {
        userAgent: "Google-Extended",
        allow: ["/", "/records/", "/knowledge/", "/knowledge-areas/", "/communities/", "/language/", "/region/", "/country/", "/source/", "/explore/", "/collections/", "/llms.txt", "/ai.txt", "/api/kgo/"],
        disallow: ["/admin", "/my", "/curator"],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
