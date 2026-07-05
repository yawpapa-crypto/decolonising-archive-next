/** Public-facing collection hub entries */

export type PublicCollection = {
  id: string;
  slug: string;
  title: string;
  kicker: string;
  description: string;
  href: string;
  recordCount?: string;
  imageUrl: string;
  imageCaption: string;
  accent: string;
  featured?: boolean;
};

export const PUBLIC_COLLECTIONS: PublicCollection[] = [
  {
    id: "ghana-graphic-design",
    slug: "ghana-graphic-design",
    title: "History of Graphic Design in Ghana",
    kicker: "Featured collection",
    description:
      "Verified museum objects and documented historical entries — adinkra, kente, independence symbols, photography, advertising and contemporary street culture.",
    href: "/collections/ghana-graphic-design",
    recordCount: "138 public records",
    imageUrl: "/images/ghana-hero/asafo-flag.svg",
    imageCaption: "Fante Asafo company flag — appliqué textile",
    accent: "#b91c1c",
    featured: true,
  },
  {
    id: "african-archives",
    slug: "african-archives",
    title: "African & Global Archive Collections",
    kicker: "External gateway",
    description:
      "Curated links to African and global open cultural collections — AODL, Smithsonian Open Access and partner repositories.",
    href: "/collections/african-archives",
    recordCount: "Multi-source browse",
    imageUrl: "/images/ghana-hero/ghana-flag.svg",
    imageCaption: "Open-access cultural heritage",
    accent: "#0369a1",
  },
];
