/**
 * ARED Master Catalogue Taxonomy
 *
 * Organising spine for Visual Communication in Ghana. Graphic design is
 * understood as systems of visual communication, authority, memory, identity
 * and public instruction — not as the arrival of the professional studio.
 *
 * Historical periods operate as overlapping filters, not sealed rooms.
 * Visual systems preserve the difference between objects that share visual
 * form but emerge from different authorities, production and use.
 */

// ── Historical periods (overlapping filters) ────────────────────────────────

export type HistoricalPeriodSlug =
  | "visual-systems-before-colonial"
  | "coastal-contact-transcultural"
  | "colonial-print-institutional"
  | "anticolonial-independence"
  | "post-independence-popular"
  | "democratic-digital-diasporic";

export type HistoricalPeriod = {
  slug: HistoricalPeriodSlug;
  label: string;
  indicativePeriod: string;
  centralQuestion: string;
  startYear?: number;
  endYear?: number;
  /** Periods overlap; practices rarely stop when a new political period begins */
  filterMode: "overlapping";
};

export const HISTORICAL_PERIODS: HistoricalPeriod[] = [
  {
    slug: "visual-systems-before-colonial",
    label: "Visual systems before colonial rule",
    indicativePeriod: "Before c. 1471",
    centralQuestion:
      "How were identity, authority, memory, trade, spirituality and law communicated visually?",
    endYear: 1471,
    filterMode: "overlapping",
  },
  {
    slug: "coastal-contact-transcultural",
    label: "Coastal contact and transcultural exchange",
    indicativePeriod: "c. 1471–1874",
    centralQuestion:
      "How did existing Ghanaian visual systems absorb, refuse and transform European, Islamic and Atlantic forms?",
    startYear: 1471,
    endYear: 1874,
    filterMode: "overlapping",
  },
  {
    slug: "colonial-print-institutional",
    label: "Colonial print and institutional design",
    indicativePeriod: "1874–1945",
    centralQuestion:
      "How did missions, schools, government, newspapers and commerce reorganise visual communication?",
    startYear: 1874,
    endYear: 1945,
    filterMode: "overlapping",
  },
  {
    slug: "anticolonial-independence",
    label: "Anticolonial and independence visual culture",
    indicativePeriod: "1945–1966",
    centralQuestion: "How was a new Ghana visually imagined?",
    startYear: 1945,
    endYear: 1966,
    filterMode: "overlapping",
  },
  {
    slug: "post-independence-popular",
    label: "Post-independence public and popular graphics",
    indicativePeriod: "1966–1992",
    centralQuestion:
      "How did visual culture operate through military rule, religion, music, cinema, markets and state institutions?",
    startYear: 1966,
    endYear: 1992,
    filterMode: "overlapping",
  },
  {
    slug: "democratic-digital-diasporic",
    label: "Democratic, digital and diasporic design",
    indicativePeriod: "1992–present",
    centralQuestion:
      "How have software, social media, global brands, informal studios and diaspora networks changed Ghanaian visual communication?",
    startYear: 1992,
    filterMode: "overlapping",
  },
];

export const HISTORICAL_PERIOD_LABELS: Record<HistoricalPeriodSlug, string> =
  Object.fromEntries(
    HISTORICAL_PERIODS.map((p) => [p.slug, p.label])
  ) as Record<HistoricalPeriodSlug, string>;

// ── Visual system spine (cultural-historical map) ───────────────────────────

export type VisualSystemSlug =
  | "land-cosmology-authority"
  | "memory-proverb-performance"
  | "cloth-pattern-social-identity"
  | "print-colonial-public-culture"
  | "independence-state-visual-identity"
  | "popular-everyday-graphics"
  | "digital-diasporic-contemporary";

export type VisualSystemBranch = {
  slug: VisualSystemSlug;
  label: string;
  definition: string;
  children: VisualSystemConcept[];
  /** Initial target count for branch-level collection fields */
  targetCount?: number;
};

export type VisualSystemConcept = {
  slug: string;
  label: string;
  definition?: string;
  /** Metadata fields ARED should catalogue for this concept */
  catalogueFields?: string[];
  /** Initial target count for first catalogue version */
  targetCount?: number;
};

export const VISUAL_SYSTEM_SPINE: VisualSystemBranch[] = [
  {
    slug: "land-cosmology-authority",
    label: "Land, cosmology and authority",
    definition:
      "Visual systems of authority, belonging and cosmological order — not decorative motifs.",
    children: [
      {
        slug: "adinkra-system",
        label: "Adinkra",
        definition:
          "Carved stamps, dye preparation, cloth layout, funerary and prestige use, named motifs, proverbs, grids and institutional appropriation.",
        catalogueFields: [
          "symbol",
          "stamp",
          "cloth",
          "maker",
          "proverb",
          "context_of_wearing",
          "colour_and_dye",
          "regional_variation",
          "modern_corporate_reuse",
          "educational_simplification",
          "incorrect_online_meanings",
          "multiple_interpretations",
        ],
        targetCount: 300,
      },
      {
        slug: "goldweights",
        label: "Goldweights",
        definition:
          "Akan brass goldweights as measuring instruments and visual signs — geometric and figurative forms tied to commerce, language, memory and moral instruction.",
        catalogueFields: [
          "geometric_or_figurative",
          "associated_proverb",
          "local_name",
          "casting_workshop",
          "trade_and_measurement_use",
          "collection_history",
          "colonial_acquisition_history",
          "contemporary_symbol_reuse",
        ],
        targetCount: 300,
      },
      {
        slug: "stools-staffs-swords-umbrellas",
        label: "Stools, staffs, swords and umbrellas",
        catalogueFields: [
          "object_type",
          "state_or_community",
          "heraldic_motif",
          "oral_history",
          "processional_use",
        ],
      },
      {
        slug: "shrines-ritual-signs",
        label: "Shrines and ritual signs",
      },
      {
        slug: "architecture-wall-painting-body-graphics",
        label: "Architecture, wall painting and body graphics",
        catalogueFields: [
          "building_or_site",
          "maker_tradition",
          "geometric_system",
          "community",
        ],
      },
    ],
  },
  {
    slug: "memory-proverb-performance",
    label: "Memory, proverb and performance",
    definition:
      "Visual communication activated through oral explanation, procession and public occasion.",
    children: [
      {
        slug: "asafo-flags",
        label: "Fante Asafo flags (frankaa)",
        definition:
          "Performed objects combining image, proverb, satire, military identity, company rivalry and colonial encounter.",
        catalogueFields: [
          "company_and_town",
          "flag_name",
          "maker",
          "commissioner",
          "proverb",
          "verbal_interpretation",
          "visual_motifs",
          "colonial_or_ghanaian_canton",
          "performance_use",
          "date_or_estimated_date",
          "repair_history",
          "original_ownership",
          "acquisition_history",
          "current_custodial_status",
          "community_restrictions",
          "made_for_asafo_use_or_art_market",
        ],
        targetCount: 300,
      },
      {
        slug: "oral-interpretation",
        label: "Oral interpretation",
      },
      {
        slug: "processions-festivals",
        label: "Processions and festivals",
      },
      {
        slug: "drum-musical-communication",
        label: "Drum and musical communication",
      },
      {
        slug: "funerary-graphics",
        label: "Funerary graphics",
        catalogueFields: [
          "poster",
          "banner",
          "programme",
          "cloth",
          "digital_announcement",
          "kinship",
          "status",
          "religion",
        ],
        targetCount: 200,
      },
    ],
  },
  {
    slug: "cloth-pattern-social-identity",
    label: "Cloth, pattern and social identity",
    definition:
      "Woven and stamped cloth as visual communication — not a single national style.",
    children: [
      {
        slug: "asante-kente",
        label: "Asante kente",
        catalogueFields: [
          "cloth_name",
          "weaving_centre",
          "weaver",
          "warp_weft_structure",
          "strip_organisation",
          "colour_meanings",
          "patron_and_occasion",
          "gendered_wearing_system",
          "proverb_or_event",
          "national_commercial_reuse",
        ],
      },
      {
        slug: "ewe-kente",
        label: "Ewe kente",
        catalogueFields: [
          "cloth_name",
          "weaving_centre",
          "weaver",
          "ethnic_linguistic_context",
          "structure",
          "patron_and_occasion",
        ],
      },
      {
        slug: "adinkra-cloth",
        label: "Adinkra cloth",
      },
      {
        slug: "smocks-woven-systems",
        label: "Smocks and woven systems",
      },
      {
        slug: "commemorative-political-cloth",
        label: "Commemorative and political cloth",
      },
    ],
    targetCount: 200,
  },
  {
    slug: "print-colonial-public-culture",
    label: "Print, colonial rule and public culture",
    definition:
      "Collision, appropriation and translation — never a story of European printing in a visual vacuum.",
    children: [
      {
        slug: "mission-printing",
        label: "Mission printing",
      },
      {
        slug: "newspapers-editorial-cartoons",
        label: "Newspapers and editorial cartoons",
        catalogueFields: [
          "masthead",
          "front_page",
          "editorial_cartoon",
          "advertisement",
          "typeface",
          "printer_mark",
          "ownership",
          "language",
          "printing_press",
          "circulation_route",
          "censorship_history",
          "political_affiliation",
        ],
        targetCount: 300,
      },
      {
        slug: "colonial-maps-photography",
        label: "Colonial maps and photography",
        catalogueFields: [
          "photographer",
          "publisher",
          "colonial_caption",
          "location",
          "people_depicted",
          "posed_or_documentary",
          "circulation",
          "intended_audience",
          "later_reuse",
          "corrective_community_description",
        ],
      },
      {
        slug: "stamps-currency-gov-documents",
        label: "Stamps, currency and government documents",
      },
      {
        slug: "packaging-advertising",
        label: "Packaging and advertising",
      },
    ],
  },
  {
    slug: "independence-state-visual-identity",
    label: "Independence and state visual identity",
    definition:
      "Core ARED collection — national formation through flags, emblems, currency and public monuments.",
    children: [
      {
        slug: "theodosia-okoh",
        label: "Theodosia Salome Okoh",
        definition: "Designer of Ghana's national flag, first raised 6 March 1957.",
        catalogueFields: [
          "sketches",
          "interviews",
          "family_archives",
          "official_specifications",
          "later_changes",
        ],
      },
      {
        slug: "amon-kotei",
        label: "Nii Amon Kotei",
        definition: "Designer of Ghana's coat of arms.",
        catalogueFields: [
          "preparatory_work",
          "official_commissioning",
          "heraldic_sources",
          "indigenous_symbols",
          "institutional_use",
          "adaptation_over_time",
        ],
      },
      {
        slug: "kofi-antubam",
        label: "Kofi Antubam",
        definition:
          "Designer of state visual culture — furniture, symbolic forms, public art, national institution integration.",
        catalogueFields: [
          "presidential_seat",
          "parliamentary_mace",
          "state_architecture",
          "murals_mosaics",
          "public_commissions",
          "educational_writing",
          "achimota_networks",
        ],
      },
      {
        slug: "cpp-pan-african-graphics",
        label: "CPP and Pan-African graphics",
      },
      {
        slug: "flags-emblems-currency-monuments",
        label: "Flags, emblems, currency and public monuments",
      },
    ],
    targetCount: 250,
  },
  {
    slug: "popular-everyday-graphics",
    label: "Popular and everyday graphics",
    definition:
      "Sign painting, cinema posters, music covers and public lettering — rarely attributed but central to Ghanaian visual history.",
    children: [
      {
        slug: "sign-painting",
        label: "Sign painting and public lettering",
        catalogueFields: [
          "sign_writer",
          "workshop",
          "location",
          "trade_type",
          "support_material",
          "lettering_style",
        ],
        targetCount: 300,
      },
      {
        slug: "cinema-posters",
        label: "Hand-painted cinema posters",
        catalogueFields: [
          "artist",
          "video_club",
          "film",
          "location",
          "support",
          "repainting",
          "local_exhibition_history",
          "export_collector_history",
          "made_for_cinema_or_tourist_sale",
        ],
      },
      {
        slug: "music-covers",
        label: "Music covers and concert graphics",
        catalogueFields: [
          "musician",
          "designer",
          "photographer",
          "printer",
          "record_label",
          "distributor",
        ],
        targetCount: 300,
      },
      {
        slug: "vehicle-canoe-lettering",
        label: "Vehicle and canoe lettering",
      },
      {
        slug: "church-mosque-funeral-graphics",
        label: "Church, mosque and funeral graphics",
      },
      {
        slug: "market-packaging",
        label: "Market packaging",
      },
    ],
  },
  {
    slug: "digital-diasporic-contemporary",
    label: "Digital, diasporic and contemporary design",
    definition:
      "Software, social media, global brands, informal studios and diaspora networks reshaping Ghanaian visual communication.",
    children: [
      {
        slug: "branding-advertising",
        label: "Branding and advertising",
      },
      {
        slug: "social-media-flyers",
        label: "Social media flyers",
      },
      {
        slug: "motion-broadcast-graphics",
        label: "Motion and broadcast graphics",
      },
      {
        slug: "interface-design",
        label: "Interface design",
      },
      {
        slug: "memes-political-graphics",
        label: "Memes and political graphics",
      },
      {
        slug: "ghanaian-diasporic-design",
        label: "Ghanaian diasporic design",
      },
    ],
    targetCount: 250,
  },
];

export const VISUAL_SYSTEM_LABELS: Record<VisualSystemSlug, string> =
  Object.fromEntries(
    VISUAL_SYSTEM_SPINE.map((b) => [b.slug, b.label])
  ) as Record<VisualSystemSlug, string>;

// ── Regional strands (Ghana beyond Akan-centred archive) ────────────────────

export type RegionalStrandSlug =
  | "akan-central"
  | "northern-ghana"
  | "ewe"
  | "ga-dangme"
  | "nzema-ahanta-western-coast"
  | "guan"
  | "gonja"
  | "dagomba"
  | "mamprusi"
  | "dagaaba"
  | "kassena"
  | "talensi"
  | "multi-regional"
  | "diaspora";

export type RegionalStrand = {
  slug: RegionalStrandSlug;
  label: string;
  researchFields: string[];
  note?: string;
};

export const REGIONAL_STRANDS: RegionalStrand[] = [
  {
    slug: "akan-central",
    label: "Akan / Central",
    researchFields: [
      "Adinkra",
      "goldweights",
      "Asante kente",
      "stools and regalia",
      "state visual systems",
    ],
    note: "Major corpus but must not dominate the national map.",
  },
  {
    slug: "northern-ghana",
    label: "Northern Ghana",
    researchFields: [
      "Sirigu and women's wall-painting traditions",
      "compound decoration",
      "geometric mural systems",
      "painted pottery",
      "leatherwork",
      "calabash incision",
      "woven smocks and pattern systems",
      "mosque decoration",
      "Qur'anic manuscripts and Arabic calligraphy",
      "talismanic and amuletic graphic forms",
      "market and transport graphics",
    ],
  },
  {
    slug: "ewe",
    label: "Ewe visual systems",
    researchFields: [
      "Ewe kente",
      "shrine and religious imagery",
      "stools and regalia",
      "funeral and festival graphics",
      "music and performance communication",
      "borderland circulation between Ghana and Togo",
    ],
  },
  {
    slug: "ga-dangme",
    label: "Ga-Dangme visual systems",
    researchFields: [
      "Homowo festival graphics",
      "Ga stools and royal emblems",
      "fishing-boat inscriptions",
      "coastal shrine imagery",
      "fantasy coffins",
      "urban Accra signage",
      "political and commercial wall painting",
    ],
  },
  {
    slug: "nzema-ahanta-western-coast",
    label: "Nzema, Ahanta and Western coastal traditions",
    researchFields: [
      "Kundum festival visual culture",
      "royal and community regalia",
      "fishing canoe graphics",
      "sign painting",
      "music posters",
      "mining and labour graphics",
      "cross-border visual exchange with Côte d'Ivoire",
    ],
  },
  {
    slug: "guan",
    label: "Guan visual traditions",
    researchFields: ["regional visual systems", "festival graphics", "craft and ritual objects"],
  },
  {
    slug: "gonja",
    label: "Gonja visual traditions",
    researchFields: ["regional visual systems", "Islamic graphic forms", "market graphics"],
  },
  {
    slug: "dagomba",
    label: "Dagomba visual traditions",
    researchFields: ["regional visual systems", "regalia", "festival and performance graphics"],
  },
  {
    slug: "mamprusi",
    label: "Mamprusi visual traditions",
    researchFields: ["regional visual systems", "architecture and wall painting", "regalia"],
  },
  {
    slug: "dagaaba",
    label: "Dagaaba visual traditions",
    researchFields: ["regional visual systems", "craft and ritual objects"],
  },
  {
    slug: "kassena",
    label: "Kassena visual traditions",
    researchFields: ["Sirigu-related traditions", "compound decoration", "pottery"],
  },
  {
    slug: "talensi",
    label: "Talensi visual traditions",
    researchFields: ["regional visual systems", "ritual and shrine imagery"],
  },
  {
    slug: "multi-regional",
    label: "Multi-regional / national",
    researchFields: ["state symbols", "national newspapers", "pan-Ghanaian campaigns"],
  },
  {
    slug: "diaspora",
    label: "Ghanaian diaspora",
    researchFields: ["diasporic design networks", "transnational visual exchange"],
  },
];

export const REGIONAL_STRAND_LABELS: Record<RegionalStrandSlug, string> =
  Object.fromEntries(
    REGIONAL_STRANDS.map((r) => [r.slug, r.label])
  ) as Record<RegionalStrandSlug, string>;

// ── Object types ─────────────────────────────────────────────────────────────

export const OBJECT_TYPES = [
  "Adinkra cloth",
  "Adinkra stamp",
  "Adinkra symbol record",
  "Architecture / mural",
  "Asafo flag",
  "Banknote / currency",
  "Body adornment",
  "Book / publication",
  "Calabash engraving",
  "Cinema poster",
  "Coat of arms / heraldic design",
  "Commemorative cloth",
  "Concert poster / flyer",
  "Editorial cartoon",
  "Flag / emblem",
  "Funeral graphic",
  "Goldweight",
  "Institutional logo / identity",
  "Kente cloth",
  "Lettering / inscription",
  "Manuscript / calligraphy",
  "Map",
  "Music album cover",
  "Newspaper / periodical",
  "Oral history record",
  "Packaging / label",
  "Person authority record",
  "Photograph / postcard",
  "Political poster",
  "Pottery mark / painted pottery",
  "Record sleeve",
  "Regalia / ritual object",
  "Religious banner / poster",
  "Sign painting",
  "Smock / woven textile",
  "Stamp / postal design",
  "Studio / workshop record",
  "Textile pattern system",
  "Transport graphics",
  "Digital graphic / social media",
  "Website / interface",
  "Other / needs classification",
] as const;

export type ObjectType = (typeof OBJECT_TYPES)[number];

// ── Authority / people roles ──────────────────────────────────────────────────

export const PERSON_ROLES = [
  "Designer",
  "Maker / craftsperson",
  "Sign writer",
  "Asafo flag maker",
  "Weaver",
  "Adinkra stamp carver",
  "Goldweight caster",
  "Printer",
  "Illustrator",
  "Photographer",
  "Publisher",
  "Commissioner",
  "Musician",
  "Researcher / scholar",
  "Collector",
  "Institution",
  "Community authority",
  "Unknown / under research",
] as const;

export type PersonRole = (typeof PERSON_ROLES)[number];

// ── Key authority records (seed list for research catalogue) ─────────────────

export type AuthorityRecordSeed = {
  name: string;
  roles: PersonRole[];
  visualSystems: string[];
  periods: HistoricalPeriodSlug[];
  researchPriority: "high" | "medium" | "low";
  verificationNote?: string;
};

export const KEY_AUTHORITY_RECORDS: AuthorityRecordSeed[] = [
  {
    name: "Theodosia Salome Okoh",
    roles: ["Designer"],
    visualSystems: ["theodosia-okoh", "flags-emblems-currency-monuments"],
    periods: ["anticolonial-independence", "post-independence-popular"],
    researchPriority: "high",
  },
  {
    name: "Nii Amon Kotei",
    roles: ["Designer"],
    visualSystems: ["amon-kotei", "flags-emblems-currency-monuments"],
    periods: ["anticolonial-independence"],
    researchPriority: "high",
  },
  {
    name: "Kofi Antubam",
    roles: ["Designer"],
    visualSystems: ["kofi-antubam"],
    periods: ["anticolonial-independence", "post-independence-popular"],
    researchPriority: "high",
  },
  {
    name: "Kobina Badowah",
    roles: ["Asafo flag maker", "Maker / craftsperson"],
    visualSystems: ["asafo-flags"],
    periods: ["colonial-print-institutional", "post-independence-popular"],
    researchPriority: "high",
  },
  {
    name: "Kweku Kakanu",
    roles: ["Asafo flag maker"],
    visualSystems: ["asafo-flags"],
    periods: ["post-independence-popular"],
    researchPriority: "high",
    verificationNote:
      "Verify through museum catalogues and local oral histories before full authority record.",
  },
  {
    name: "Doran H. Ross",
    roles: ["Researcher / scholar"],
    visualSystems: ["asafo-flags"],
    periods: ["post-independence-popular", "democratic-digital-diasporic"],
    researchPriority: "medium",
  },
  {
    name: "Silvia Forni",
    roles: ["Researcher / scholar"],
    visualSystems: ["asafo-flags"],
    periods: ["post-independence-popular", "democratic-digital-diasporic"],
    researchPriority: "medium",
  },
  {
    name: "George Nelson Preston",
    roles: ["Researcher / scholar", "Collector"],
    visualSystems: ["asafo-flags"],
    periods: ["post-independence-popular"],
    researchPriority: "medium",
  },
  {
    name: "Michelle Gilbert",
    roles: ["Researcher / scholar"],
    visualSystems: ["asafo-flags"],
    periods: ["post-independence-popular"],
    researchPriority: "medium",
  },
];

// ── Source institutions ───────────────────────────────────────────────────────

export type SourceInstitution = {
  slug: string;
  name: string;
  contribution: string;
  caution: string;
};

export const SOURCE_INSTITUTIONS: SourceInstitution[] = [
  {
    slug: "ghana-museums-monuments",
    name: "Ghana Museums and Monuments Board",
    contribution: "National collections and object records",
    caution: "Digital access may be limited",
  },
  {
    slug: "national-archives-ghana",
    name: "National Archives of Ghana",
    contribution: "Government print, maps, photographs, colonial records",
    caution: "Permissions and incomplete digitisation",
  },
  {
    slug: "praad",
    name: "Public Records and Archives Administration Department",
    contribution: "State documents and institutional histories",
    caution: "Catalogue access may require local research",
  },
  {
    slug: "ghana-library-authority",
    name: "Ghana Library Authority",
    contribution: "Newspapers, books, periodicals",
    caution: "Condition and scanning rights",
  },
  {
    slug: "graphic-communications-group",
    name: "Graphic Communications Group",
    contribution: "Daily Graphic and associated titles",
    caution: "Corporate permissions",
  },
  {
    slug: "ghana-post",
    name: "Ghana Post",
    contribution: "Stamps and postal design",
    caution: "Designer attribution may be incomplete",
  },
  {
    slug: "bank-of-ghana",
    name: "Bank of Ghana",
    contribution: "Currency and banknote design",
    caution: "Restricted reproduction conditions",
  },
  {
    slug: "knust",
    name: "KNUST and university repositories",
    contribution: "Theses, curricula, staff histories, student work",
    caution: "Copyright remains with authors",
  },
  {
    slug: "asafo-companies",
    name: "Asafo companies and traditional councils",
    contribution: "Flag meanings, makers, ownership and performance",
    caution: "Community authority must govern access",
  },
  {
    slug: "local-artists-workshops",
    name: "Local artists and workshops",
    contribution: "Oral histories, sketches and attribution",
    caution: "Consent and compensation",
  },
  {
    slug: "fowler-rom",
    name: "Fowler Museum and Royal Ontario Museum",
    contribution: "Major Asafo collections and scholarship",
    caution: "Colonial acquisition and overseas custody",
  },
  {
    slug: "british-museum",
    name: "British Museum",
    contribution: "Goldweights, Adinkra, textiles and metadata",
    caution: "Colonial collecting histories must remain visible",
  },
  {
    slug: "metropolitan-museum",
    name: "Metropolitan Museum of Art",
    contribution: "Adinkra cloths, stamps, historic Akan heraldic imagery",
    caution: "Colonial collecting histories must remain visible",
  },
  {
    slug: "studio-museum-harlem",
    name: "Studio Museum in Harlem",
    contribution: "Named makers such as Kobina Badowah",
    caution: "Reproduction rights",
  },
  {
    slug: "family-archives",
    name: "Family archives",
    contribution: "Designers, printers, photographers, musicians",
    caution: "Fragile and uncatalogued materials",
  },
  {
    slug: "markets-churches-printers",
    name: "Markets, churches, printers and sign shops",
    contribution: "Everyday living design",
    caution: "Rapid disappearance and weak documentation",
  },
];

// ── Research and verification status ──────────────────────────────────────────

export const RESEARCH_STATUSES = [
  "not_started",
  "literature_review",
  "museum_metadata",
  "field_research_planned",
  "field_research_complete",
  "community_review",
  "ready_for_catalogue",
  "on_hold",
] as const;

export type ResearchStatus = (typeof RESEARCH_STATUSES)[number];

export const RESEARCH_STATUS_LABELS: Record<ResearchStatus, string> = {
  not_started: "Not started",
  literature_review: "Literature review",
  museum_metadata: "Museum metadata gathered",
  field_research_planned: "Field research planned",
  field_research_complete: "Field research complete",
  community_review: "Community review",
  ready_for_catalogue: "Ready for catalogue",
  on_hold: "On hold",
};

export const VERIFICATION_LEVELS = [
  "unverified",
  "provisional",
  "museum_confirmed",
  "community_confirmed",
  "verified",
] as const;

export type VerificationLevel = (typeof VERIFICATION_LEVELS)[number];

export const VERIFICATION_LEVEL_LABELS: Record<VerificationLevel, string> = {
  unverified: "Unverified",
  provisional: "Provisional",
  museum_confirmed: "Museum confirmed",
  community_confirmed: "Community confirmed",
  verified: "Verified",
};

export const RIGHTS_STATUSES = [
  "open_ingest",
  "metadata_only",
  "linked_record",
  "permission_required",
  "permission_granted",
] as const;

export type RightsStatus = (typeof RIGHTS_STATUSES)[number];

export const INGESTION_ROUTES = [
  "open_collection",
  "metadata_record",
  "field_research",
] as const;

export type IngestionRoute = (typeof INGESTION_ROUTES)[number];

export const INGESTION_ROUTE_LABELS: Record<IngestionRoute, string> = {
  open_collection: "Open collection (licence permits ingestion)",
  metadata_record: "Metadata record (document without copying image)",
  field_research: "Ghana-based field research (community-controlled)",
};

// ── Collection targets (first catalogue version) ────────────────────────────────

export type CollectionTarget = {
  field: string;
  slug: string;
  initialTarget: number;
  visualSystem?: VisualSystemSlug;
};

export const COLLECTION_TARGETS: CollectionTarget[] = [
  { field: "Asafo flags and related records", slug: "asafo-flags", initialTarget: 300, visualSystem: "memory-proverb-performance" },
  { field: "Adinkra cloths, stamps and symbol records", slug: "adinkra-system", initialTarget: 300, visualSystem: "land-cosmology-authority" },
  { field: "Goldweights and proverbial objects", slug: "goldweights", initialTarget: 300, visualSystem: "land-cosmology-authority" },
  { field: "Kente and woven visual systems", slug: "cloth-pattern-social-identity", initialTarget: 200, visualSystem: "cloth-pattern-social-identity" },
  { field: "Colonial newspapers, maps and print", slug: "newspapers-editorial-cartoons", initialTarget: 300, visualSystem: "print-colonial-public-culture" },
  { field: "Independence and state graphics", slug: "independence-state-visual-identity", initialTarget: 250, visualSystem: "independence-state-visual-identity" },
  { field: "Music, cinema and popular graphics", slug: "music-covers", initialTarget: 300, visualSystem: "popular-everyday-graphics" },
  { field: "Sign painting and public lettering", slug: "sign-painting", initialTarget: 300, visualSystem: "popular-everyday-graphics" },
  { field: "Religious and funeral graphics", slug: "funerary-graphics", initialTarget: 200, visualSystem: "memory-proverb-performance" },
  { field: "Digital and contemporary design", slug: "digital-diasporic-contemporary", initialTarget: 250, visualSystem: "digital-diasporic-contemporary" },
  { field: "Oral histories and maker profiles", slug: "oral-interpretation", initialTarget: 150, visualSystem: "memory-proverb-performance" },
];

export const TOTAL_CATALOGUE_TARGET = COLLECTION_TARGETS.reduce(
  (sum, t) => sum + t.initialTarget,
  0
);

// ── Archive refusal principles ─────────────────────────────────────────────────

export const ARCHIVE_REFUSALS = [
  "A timeline that begins with European printing",
  '"Tribal art" as a catch-all category',
  '"Anonymous African maker" where attribution can still be researched',
  "Treating all Akan symbols as fixed universal icons",
  "Presenting all kente as Asante",
  "Removing Asafo flags from their companies and proverbs",
  "Using museum metadata without recording colonial acquisition",
  "Collecting community knowledge without consent",
  "Confusing online availability with reuse permission",
  "Treating everyday design as inferior to professional studio design",
] as const;

// ── Research catalogue record (spreadsheet row shape) ─────────────────────────

export type ResearchCatalogueRecord = {
  /** Unique research row ID, e.g. rc-001 */
  record_id: string;
  /** Proposed archive item ID when promoted to catalogue */
  archive_item_id: string | null;
  /** Working title */
  title: string;
  /** One or more period slugs, pipe-separated in CSV */
  historical_periods: HistoricalPeriodSlug[];
  /** Regional strand slug */
  region: RegionalStrandSlug;
  /** City or locality */
  locality: string | null;
  /** Visual system branch slug */
  visual_system: VisualSystemSlug;
  /** Visual system concept slug (child) */
  visual_system_concept: string;
  /** Object type from controlled list */
  object_type: ObjectType;
  /** Creator, maker or subject person */
  person: string | null;
  /** Person role */
  person_role: PersonRole | null;
  /** Estimated or documented date */
  date_display: string | null;
  /** Source institution slug */
  source_institution: string | null;
  /** Source catalogue or accession reference */
  source_reference: string | null;
  /** Rights status for ingestion */
  rights_status: RightsStatus;
  /** Ingestion route */
  ingestion_route: IngestionRoute;
  /** Research workflow status */
  research_status: ResearchStatus;
  /** Verification level */
  verification_level: VerificationLevel;
  /** Researcher assigned */
  researcher: string | null;
  /** Free-text research notes */
  research_notes: string | null;
  /** Community consent / restriction notes */
  community_notes: string | null;
  /** Colonial acquisition note (required when applicable) */
  colonial_acquisition_note: string | null;
  /** Target collection field slug */
  collection_field: string | null;
  /** Priority for first catalogue build */
  priority: "critical" | "high" | "medium" | "low";
};

/** Column headers for the research catalogue CSV */
export const RESEARCH_CATALOGUE_COLUMNS = [
  "record_id",
  "archive_item_id",
  "title",
  "historical_periods",
  "region",
  "locality",
  "visual_system",
  "visual_system_concept",
  "object_type",
  "person",
  "person_role",
  "date_display",
  "source_institution",
  "source_reference",
  "rights_status",
  "ingestion_route",
  "research_status",
  "verification_level",
  "researcher",
  "research_notes",
  "community_notes",
  "colonial_acquisition_note",
  "collection_field",
  "priority",
] as const;

/** Flat taxonomy rows for master-taxonomy.csv export */
export type TaxonomyRow = {
  scheme: string;
  slug: string;
  label: string;
  broader: string | null;
  definition: string | null;
  central_question: string | null;
  indicative_period: string | null;
  target_count: number | null;
  catalogue_fields: string | null;
  related_terms: string | null;
};

export function flattenTaxonomyForExport(): TaxonomyRow[] {
  const rows: TaxonomyRow[] = [];

  for (const period of HISTORICAL_PERIODS) {
    rows.push({
      scheme: "historical_period",
      slug: period.slug,
      label: period.label,
      broader: "visual-communication-ghana",
      definition: null,
      central_question: period.centralQuestion,
      indicative_period: period.indicativePeriod,
      target_count: null,
      catalogue_fields: null,
      related_terms: "overlapping_filter",
    });
  }

  for (const branch of VISUAL_SYSTEM_SPINE) {
    rows.push({
      scheme: "visual_system",
      slug: branch.slug,
      label: branch.label,
      broader: "visual-communication-ghana",
      definition: branch.definition ?? null,
      central_question: null,
      indicative_period: null,
      target_count: branch.targetCount ?? null,
      catalogue_fields: null,
      related_terms: null,
    });
    for (const child of branch.children) {
      rows.push({
        scheme: "visual_system_concept",
        slug: child.slug,
        label: child.label,
        broader: branch.slug,
        definition: child.definition ?? null,
        central_question: null,
        indicative_period: null,
        target_count: child.targetCount ?? null,
        catalogue_fields: child.catalogueFields?.join("|") ?? null,
        related_terms: null,
      });
    }
  }

  for (const region of REGIONAL_STRANDS) {
    rows.push({
      scheme: "regional_strand",
      slug: region.slug,
      label: region.label,
      broader: "ghana-regions",
      definition: region.note ?? null,
      central_question: null,
      indicative_period: null,
      target_count: null,
      catalogue_fields: region.researchFields.join("|"),
      related_terms: null,
    });
  }

  for (const obj of OBJECT_TYPES) {
    rows.push({
      scheme: "object_type",
      slug: obj.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      label: obj,
      broader: null,
      definition: null,
      central_question: null,
      indicative_period: null,
      target_count: null,
      catalogue_fields: null,
      related_terms: null,
    });
  }

  for (const source of SOURCE_INSTITUTIONS) {
    rows.push({
      scheme: "source_institution",
      slug: source.slug,
      label: source.name,
      broader: null,
      definition: source.contribution,
      central_question: null,
      indicative_period: null,
      target_count: null,
      catalogue_fields: source.caution,
      related_terms: null,
    });
  }

  for (const target of COLLECTION_TARGETS) {
    rows.push({
      scheme: "collection_target",
      slug: target.slug,
      label: target.field,
      broader: target.visualSystem ?? null,
      definition: null,
      central_question: null,
      indicative_period: null,
      target_count: target.initialTarget,
      catalogue_fields: null,
      related_terms: null,
    });
  }

  return rows;
}
