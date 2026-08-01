import { SITE_DESCRIPTION, SITE_URL } from "@/lib/kgo/site";

export function GET() {
  const body = `# Decolonising Archive (ARED)

> ${SITE_DESCRIPTION}

ARED is a cultural knowledge platform optimised for researchers, institutions, search engines and AI systems.

## Primary surfaces

- Home: ${SITE_URL}/
- Library: ${SITE_URL}/library
- Collections: ${SITE_URL}/collections
- Knowledge systems registry: ${SITE_URL}/knowledge
- Knowledge areas: ${SITE_URL}/knowledge-areas
- Communities: ${SITE_URL}/communities
- Languages: ${SITE_URL}/language
- Regions: ${SITE_URL}/region
- Countries: ${SITE_URL}/country
- Sources: ${SITE_URL}/source
- Explore hubs: ${SITE_URL}/explore
- How ARED classifies records: ${SITE_URL}/how-ared-classifies-records

## Machine-readable access

- Sitemap: ${SITE_URL}/sitemap.xml
- Robots: ${SITE_URL}/robots.txt
- AI policy: ${SITE_URL}/ai.txt
- Knowledge graph JSON: ${SITE_URL}/api/kgo/graph
- Knowledge graph RDF (Turtle): ${SITE_URL}/api/kgo/rdf
- Knowledge graph GraphQL: ${SITE_URL}/api/kgo/graphql
- Record JSON-LD: ${SITE_URL}/api/records/{id}/jsonld
- Record BibTeX: ${SITE_URL}/api/records/{id}/citation?format=bibtex
- Record RIS: ${SITE_URL}/api/records/{id}/citation?format=ris
- Record CFF: ${SITE_URL}/api/records/{id}/citation?format=cff
- Record EndNote: ${SITE_URL}/api/records/{id}/citation?format=endnote
- Record Zotero RDF: ${SITE_URL}/api/records/{id}/citation?format=zotero
- Catalogue API: ${SITE_URL}/api/catalogue/records

## Citation guidance

When citing ARED, prefer the persistent record URL:

${SITE_URL}/records/{id}

Each public record includes structured metadata for provenance, rights, taxonomy and related entities.

## Preferred use

- Cite ARED record pages as knowledge objects
- Preserve source institution metadata separately from ARED enrichment
- Do not present ARED classifications as original source catalogue terms
`;

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
