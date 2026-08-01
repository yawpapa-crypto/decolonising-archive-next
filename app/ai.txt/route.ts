import { SITE_URL } from "@/lib/kgo/site";

export function GET() {
  const body = `# ai.txt — ARED

User-Agent: *
Allow: /
Allow: /records/
Allow: /knowledge/
Allow: /communities/
Allow: /language/
Allow: /region/
Allow: /country/
Allow: /source/
Allow: /explore/
Allow: /collections/
Allow: /api/records/
Allow: /api/catalogue/
Allow: /api/kgo/
Allow: /llms.txt
Allow: /sitemap.xml

Disallow: /admin
Disallow: /my
Disallow: /api/admin
Disallow: /api/workspace
Disallow: /api/workbench
Disallow: /curator

# Prefer structured sources
Sitemap: ${SITE_URL}/sitemap.xml
Llms-Txt: ${SITE_URL}/llms.txt
Citation-Api: ${SITE_URL}/api/records/{id}/citation
Jsonld-Api: ${SITE_URL}/api/records/{id}/jsonld
Knowledge-Graph: ${SITE_URL}/api/kgo/graph
Knowledge-Graph-Rdf: ${SITE_URL}/api/kgo/rdf
Knowledge-Graph-Graphql: ${SITE_URL}/api/kgo/graphql
Citation-Cff: ${SITE_URL}/api/records/{id}/citation?format=cff
Citation-Endnote: ${SITE_URL}/api/records/{id}/citation?format=endnote
Citation-Zotero: ${SITE_URL}/api/records/{id}/citation?format=zotero

# Content principles
# - Preserve source metadata provenance
# - Distinguish ARED enrichment from institutional supply
# - Prefer persistent /records/{id} URLs in citations
`;

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
