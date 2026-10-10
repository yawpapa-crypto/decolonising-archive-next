# Explore and primary-source fixes

- Catalogue recommendation hydration now uses the actual HTTP museum source URL when supplied; records without one open within the redesigned Explore detail view.
- Cleveland accession 1962.244 now points directly to https://www.clevelandart.org/art/1962.244.
- Similar results fall through to live providers when the disabled local catalogue returns no candidates. For local museum objects, the fallback stays with images and objects rather than unrelated books or clinical papers. Search uses the first two meaningful title terms. Genuine empty results retain the existing empty message and stop requesting pages.
- Selected cards use SafeImg and the existing server image cache rather than CSS background URLs. Decorative local fallback photographs cover missing/failed slots.
- Numbered Commons campaign design exports share a discovery series identity. Distinct same-title museum objects retain separate identities. Feed cache versions were advanced to discard stale boards.

Validation: TypeScript and focused ESLint passed. Seven Europeana/identity tests passed. Live similar API returned related gold-weight objects. Browser verified visible Selected card images loaded, the museum object image loaded, related results populated, and Open at source points to the exact museum URL. Explore headings occur once.

The supplied openaccess ZIP contains Git LFS pointers for data.json/data.csv, not the museum dataset; no pointer data was imported.
