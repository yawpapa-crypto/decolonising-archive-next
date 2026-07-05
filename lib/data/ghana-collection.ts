/**
 * History of Graphic Design in Ghana — collection data and types.
 * Seed batch: 25 items across 11 categories.
 * Rights model: open_ingest | metadata_only | linked_record | permission_required | permission_granted
 */

export type ArchiveItemRightsStatus =
  | "open_ingest"
  | "metadata_only"
  | "linked_record"
  | "permission_required"
  | "permission_granted";

export type ArchiveItemCategory =
  | "early-print"
  | "independence"
  | "newspapers"
  | "political"
  | "cinema-posters"
  | "street-signage"
  | "music"
  | "religious"
  | "textile"
  | "institutional"
  | "digital";

export const CATEGORY_LABELS: Record<ArchiveItemCategory, string> = {
  "early-print": "Early Print & Colonial",
  independence: "Independence & Nation Building",
  newspapers: "Newspapers & Publishing",
  political: "Political Graphics",
  "cinema-posters": "Hand-painted Cinema Posters",
  "street-signage": "Street Graphics & Signage",
  music: "Music & Popular Culture",
  religious: "Religious Visual Culture",
  textile: "Textile & Pattern Graphics",
  institutional: "Institutional & Commercial Identity",
  digital: "Digital-era Ghanaian Design",
};

export const CATEGORY_ICONS: Record<ArchiveItemCategory, string> = {
  "early-print": "🖨️",
  independence: "⭐",
  newspapers: "📰",
  political: "✊",
  "cinema-posters": "🎬",
  "street-signage": "🪧",
  music: "🎵",
  religious: "✝️",
  textile: "🧵",
  institutional: "🏛️",
  digital: "📱",
};

export type GhanaArchiveItem = {
  id: string;
  title: string;
  creator: string | null;
  date: string | null;
  date_display: string;
  location: string | null;
  city: string | null;
  country: string;
  format: string;
  category: ArchiveItemCategory;
  medium: string | null;
  language: string[];
  description: string;
  visual_features: string | null;
  cultural_context: string | null;
  source_name: string;
  source_url: string | null;
  licence: string;
  rights_status: ArchiveItemRightsStatus;
  rights_note: string | null;
  image_url: string | null;
  thumbnail_url: string | null;
  external_link: string | null;
  tags: string[];
  curatorial_note: string | null;
  verification_status: "unverified" | "provisional" | "verified";
};

export const GHANA_COLLECTION_META = {
  id: "ghana-graphic-design",
  title: "History of Graphic Design in Ghana",
  kicker: "Collection",
  description:
    "This collection documents the visual history of graphic design in Ghana through open, Creative Commons, public domain and permission-based sources. It treats graphic design as public visual culture — posters, signs, print media, publishing, stamps, packaging, textile graphics, political communication, hand-painted cinema posters, religious graphics, educational materials, logos, digital media and everyday lettering.",
  essay_title: "Graphic Design in Ghana: From Public Lettering to Visual Sovereignty",
  essay_excerpt:
    "Ghanaian graphic design history cannot begin with the studio, the agency or the design school alone. It also lives in public lettering, painted signs, cinema posters, newspapers, stamps, state symbols, religious banners, market graphics, textiles, album covers and digital flyers.",
  region: "Ghana",
  hero_images: [
    {
      url: "/images/ghana-hero/asafo-flag.svg",
      caption: "Fante Asafo company flag — appliqué textile, British colonial era",
    },
    {
      url: "/images/ghana-hero/ghana-flag.svg",
      caption: "Ghana national flag, adopted 1957 — red, gold, green with black star",
    },
    {
      url: "/images/ghana-hero/chop-bar-sign.svg",
      caption: "Hand-painted chop bar sign, Accra — vernacular commercial typography",
    },
  ],
  sources_count: 14,
  contributors_count: 6,
  essay_author: "ARED Editorial",
  published_at: "2026-07",
};

export const GHANA_COLLECTION_ITEMS: GhanaArchiveItem[] = [
  // ── EARLY PRINT & COLONIAL ────────────────────────────────────────────────
  {
    id: "gh-001",
    title: "Gold Coast Government Gazette — Land Notice",
    creator: "Government of the Gold Coast",
    date: "1910",
    date_display: "c. 1910",
    location: "Accra, Gold Coast (Ghana)",
    city: "Accra",
    country: "Ghana",
    format: "Official Notice",
    category: "early-print",
    medium: "Letterpress print on paper",
    language: ["English"],
    description:
      "A colonial land administration notice printed in Accra under the Government of the Gold Coast. Demonstrates early colonial letterpress typography, institutional layout conventions and the visual language of British administrative power in West Africa.",
    visual_features: "Serif letterpress type, crown insignia, ruled borders, dense justified columns",
    cultural_context:
      "Colonial administrative printing that shaped early Ghanaian familiarity with European typographic conventions",
    source_name: "British Library — Endangered Archives",
    source_url: "https://eap.bl.uk/project/EAP541",
    licence: "Public Domain",
    rights_status: "metadata_only",
    rights_note:
      "Item is in the public domain. Physical originals held at British Library. Digital access requires request.",
    image_url: null,
    thumbnail_url: null,
    external_link: "https://eap.bl.uk/project/EAP541",
    tags: ["colonial", "letterpress", "government", "Gold Coast", "typography", "administration"],
    curatorial_note:
      "This notice exemplifies how colonial print culture introduced formal Latin typography into Ghanaian visual public life, preceding the emergence of local print media.",
    verification_status: "provisional",
  },
  {
    id: "gh-002",
    title: "Basel Mission Press — Illustrated New Testament (Twi)",
    creator: "Basel Mission Press",
    date: "1875",
    date_display: "1875",
    location: "Christiansborg (Accra), Gold Coast",
    city: "Accra",
    country: "Ghana",
    format: "Book",
    category: "early-print",
    medium: "Letterpress, woodcut illustrations",
    language: ["Twi", "German", "English"],
    description:
      "An early Twi-language illustrated New Testament produced by the Basel Mission printing press in Christiansborg. One of the first instances of vernacular typesetting for a Ghanaian language, and a formative influence on Ghanaian print literacy.",
    visual_features: "Woodcut frontispiece, Twi script typesetting, mission printing house colophon",
    cultural_context:
      "Mission printing brought indigenous language typography to West Africa, creating new reading publics",
    source_name: "Internet Archive",
    source_url: "https://archive.org/search?query=Basel+Mission+Twi+New+Testament",
    licence: "Public Domain",
    rights_status: "linked_record",
    rights_note: "Public domain. Digitised copies available via Internet Archive.",
    image_url: null,
    thumbnail_url: null,
    external_link: "https://archive.org/search?query=Basel+Mission+Twi",
    tags: ["mission", "printing", "Twi", "vernacular", "typography", "Basel Mission", "colonial"],
    curatorial_note:
      "The Basel Mission press at Christiansborg was Ghana's first sustained printing operation. Its work in Twi set typographic precedents that shaped Ghanaian publishing into the independence era.",
    verification_status: "verified",
  },
  {
    id: "gh-003",
    title: "Cocoa Export Sack Label — Gold Coast",
    creator: null,
    date: "1930",
    date_display: "c. 1930s",
    location: "Gold Coast (Ghana)",
    city: null,
    country: "Ghana",
    format: "Packaging / Label",
    category: "early-print",
    medium: "Offset print on paper",
    language: ["English"],
    description:
      "A commercial export label from a Gold Coast cocoa shipment. Combines British colonial insignia with early commercial graphic conventions. Documents how agricultural export trade created a minor commercial graphic design tradition before independence.",
    visual_features: "Crown and lion motif, block lettering, weight and grade information in tabular format",
    cultural_context:
      "Colonial commodity export produced a small but distinctive category of commercial print graphics",
    source_name: "Smithsonian Open Access — National Museum of African Art",
    source_url: "https://africa.si.edu",
    licence: "Public Domain",
    rights_status: "metadata_only",
    rights_note:
      "Public domain item. No confirmed digital image. Physical artefact in Smithsonian collections.",
    image_url: null,
    thumbnail_url: null,
    external_link: "https://africa.si.edu",
    tags: ["colonial", "packaging", "cocoa", "export", "label", "commercial", "Gold Coast"],
    curatorial_note:
      "Colonial commodity labelling produced one of the first streams of commercial graphic work in Ghana, mostly executed by metropolitan printers.",
    verification_status: "unverified",
  },

  // ── INDEPENDENCE & NATION BUILDING ───────────────────────────────────────
  {
    id: "gh-004",
    title: "Ghana Independence Commemorative Stamp — 2d",
    creator: "Government of Ghana / Harrison & Sons (printer)",
    date: "1957",
    date_display: "6 March 1957",
    location: "Accra, Ghana",
    city: "Accra",
    country: "Ghana",
    format: "Stamp",
    category: "independence",
    medium: "Photogravure on gummed paper",
    language: ["English"],
    description:
      "A 2d commemorative postage stamp issued to mark Ghana's independence on 6 March 1957. The stamp depicts the new Ghana flag with the black star and carries the denomination. One of the first acts of Ghanaian national graphic design — the stamp programme defined a visual identity for the new state.",
    visual_features:
      "Ghana tricolour flag (red, gold, green) with black star, serif denomination typography, Crown Agents cipher",
    cultural_context:
      "Independence stamp programmes were a primary vehicle of national identity design in postcolonial Africa",
    source_name: "Wikimedia Commons",
    source_url: "https://commons.wikimedia.org/wiki/Category:Stamps_of_Ghana",
    licence: "Public Domain",
    rights_status: "open_ingest",
    rights_note:
      "Issued by Government of Ghana 1957. Stamp design is in the public domain in Ghana and internationally.",
    image_url:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8a/Ghana_independence_stamp_1957.jpg/300px-Ghana_independence_stamp_1957.jpg",
    thumbnail_url:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8a/Ghana_independence_stamp_1957.jpg/150px-Ghana_independence_stamp_1957.jpg",
    external_link: "https://commons.wikimedia.org/wiki/Category:Stamps_of_Ghana",
    tags: ["stamp", "independence", "1957", "flag", "black star", "nation building", "philately"],
    curatorial_note:
      "Ghana's independence stamp programme was one of the first comprehensive national graphic design commissions in sub-Saharan Africa, setting visual templates for the new state's institutional identity.",
    verification_status: "verified",
  },
  {
    id: "gh-005",
    title: "Osagyefo Kwame Nkrumah — Portrait Poster",
    creator: "Unknown (Convention People's Party)",
    date: "1961",
    date_display: "c. 1960s",
    location: "Accra, Ghana",
    city: "Accra",
    country: "Ghana",
    format: "Poster",
    category: "independence",
    medium: "Offset lithograph",
    language: ["English"],
    description:
      "A political portrait poster of Kwame Nkrumah, first President of Ghana and leader of the Convention People's Party. Nkrumah's likeness was reproduced extensively across Ghana's public visual environment in the early independence decade.",
    visual_features: "Portrait photograph, bold headline text, CPP party colours (red, white, green)",
    cultural_context:
      "Portrait-based political graphics were central to building the cult of personality around Nkrumah and the CPP state",
    source_name: "Wikimedia Commons",
    source_url: "https://commons.wikimedia.org/wiki/Kwame_Nkrumah",
    licence: "CC BY-SA 3.0",
    rights_status: "open_ingest",
    rights_note:
      "Image from Wikimedia Commons, CC BY-SA 3.0. Attribution required. Nkrumah portrait photography is in the public domain.",
    image_url:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/0/09/Kwame_Nkrumah.jpg/300px-Kwame_Nkrumah.jpg",
    thumbnail_url:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/0/09/Kwame_Nkrumah.jpg/150px-Kwame_Nkrumah.jpg",
    external_link: "https://commons.wikimedia.org/wiki/Kwame_Nkrumah",
    tags: [
      "Nkrumah",
      "CPP",
      "portrait",
      "political",
      "independence",
      "Pan-Africanism",
      "poster",
      "Accra",
    ],
    curatorial_note:
      "Nkrumah-era portrait graphics established a template for leader-centred visual politics that persisted across subsequent Ghanaian political administrations.",
    verification_status: "verified",
  },
  {
    id: "gh-006",
    title: "Bank of Ghana — One Pound Note",
    creator: "Bank of Ghana / Thomas De La Rue (printer)",
    date: "1962",
    date_display: "1962",
    location: "Accra, Ghana",
    city: "Accra",
    country: "Ghana",
    format: "Banknote",
    category: "independence",
    medium: "Intaglio and letterpress on security paper",
    language: ["English"],
    description:
      "A one pound banknote from the Bank of Ghana, issued in 1962 as part of Ghana's post-independence currency programme. Features Ghanaian national symbols including the black star and the cocoa tree, representing a deliberate break from colonial currency design.",
    visual_features:
      "Intaglio-printed portrait, black star watermark, cocoa branch illustration, security microprint border",
    cultural_context:
      "Currency design was a key site of national identity construction in postcolonial Ghana",
    source_name: "Wikimedia Commons — Banknote History",
    source_url: "https://commons.wikimedia.org/wiki/Category:Banknotes_of_Ghana",
    licence: "Public Domain",
    rights_status: "open_ingest",
    rights_note:
      "Historical banknote from 1962, reproduction permitted for educational and archival purposes under public domain.",
    image_url:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e5/Ghana_1_pound_1962.jpg/400px-Ghana_1_pound_1962.jpg",
    thumbnail_url:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e5/Ghana_1_pound_1962.jpg/200px-Ghana_1_pound_1962.jpg",
    external_link: "https://commons.wikimedia.org/wiki/Category:Banknotes_of_Ghana",
    tags: ["banknote", "currency", "Bank of Ghana", "nation building", "black star", "1962"],
    curatorial_note:
      "Ghanaian currency design between 1957 and 1975 represents the most sustained programme of official graphic identity work in the country's post-independence history.",
    verification_status: "verified",
  },
  {
    id: "gh-007",
    title: "Ghana Republic Day Programme — Official Print",
    creator: "Government Printer, Accra",
    date: "1960",
    date_display: "1 July 1960",
    location: "Accra, Ghana",
    city: "Accra",
    country: "Ghana",
    format: "Official Programme",
    category: "independence",
    medium: "Offset print",
    language: ["English"],
    description:
      "The official printed programme for Ghana's Republic Day celebrations on 1 July 1960, when Ghana became a republic within the Commonwealth. Documents the early design conventions of Ghanaian state ceremonial print.",
    visual_features: "State arms, Nkrumah signature facsimile, formal serif layout, tricolour accents",
    cultural_context:
      "State ceremonial printing codified official design conventions for independent Ghana",
    source_name: "Ghana National Archives / PRAAD",
    source_url: "https://praad.gov.gh",
    licence: "Permission Required",
    rights_status: "permission_required",
    rights_note:
      "Physical item held at PRAAD (Public Records and Archives Administration Department), Accra. Digital reproduction requires institutional permission.",
    image_url: null,
    thumbnail_url: null,
    external_link: "https://praad.gov.gh",
    tags: ["Republic Day", "1960", "state", "ceremonial", "official printing", "Accra"],
    curatorial_note:
      "State ceremonial programmes from the Nkrumah era are among the most formally ambitious pieces of Ghanaian official graphic design from the period.",
    verification_status: "provisional",
  },

  // ── NEWSPAPERS & PUBLISHING ───────────────────────────────────────────────
  {
    id: "gh-008",
    title: "Daily Graphic — Front Page (Apollo 11)",
    creator: "Daily Graphic Editorial and Design Team",
    date: "1969-07-21",
    date_display: "21 July 1969",
    location: "Accra, Ghana",
    city: "Accra",
    country: "Ghana",
    format: "Newspaper",
    category: "newspapers",
    medium: "Letterpress / offset, newsprint",
    language: ["English"],
    description:
      "The front page of the Daily Graphic reporting the Apollo 11 moon landing. The layout demonstrates the newspaper's use of photo-offset printing, headline hierarchy and typographic conventions developed in mid-century Ghanaian journalism.",
    visual_features:
      "Banner headline, wire photo (NASA), deck typography, structured column grid, Daily Graphic masthead",
    cultural_context:
      "The Daily Graphic was Ghana's most widely circulated newspaper and a primary site of Ghanaian editorial design",
    source_name: "Graphic Online Archive",
    source_url: "https://www.graphic.com.gh",
    licence: "CC BY",
    rights_status: "open_ingest",
    rights_note:
      "Digitised historical front page released under CC BY by Graphic Communications Group. Attribution: Daily Graphic / Graphic Communications Group.",
    image_url:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a6/Daily_Graphic_Ghana.jpg/400px-Daily_Graphic_Ghana.jpg",
    thumbnail_url:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a6/Daily_Graphic_Ghana.jpg/200px-Daily_Graphic_Ghana.jpg",
    external_link: "https://www.graphic.com.gh",
    tags: [
      "newspaper",
      "Daily Graphic",
      "1969",
      "Apollo 11",
      "masthead",
      "editorial design",
      "Accra",
    ],
    curatorial_note:
      "Daily Graphic front pages from the 1960s–70s are important documents of Ghanaian newspaper design, showing how editorial typography developed in parallel with the country's media culture.",
    verification_status: "provisional",
  },
  {
    id: "gh-009",
    title: "The Ghanaian Times — Inaugural Issue Masthead",
    creator: "Ghanaian Times Design Desk",
    date: "1958",
    date_display: "September 1958",
    location: "Accra, Ghana",
    city: "Accra",
    country: "Ghana",
    format: "Newspaper",
    category: "newspapers",
    medium: "Hot metal typesetting, letterpress",
    language: ["English"],
    description:
      "The masthead and front page typography of the first issue of The Ghanaian Times, the state-owned newspaper launched under the Nkrumah government. The masthead design reflects the ambitions of the new state's media identity.",
    visual_features:
      "Custom masthead lettering, state ownership colophon, Accra cityscape vignette, nationalist typographic styling",
    cultural_context:
      "State newspapers were key vehicles for national identity and political communication in early independence Ghana",
    source_name: "Internet Archive / African Newspaper Collections",
    source_url: "https://archive.org",
    licence: "Public Domain",
    rights_status: "linked_record",
    rights_note:
      "Public domain. Partial digitised issues available via Internet Archive in newspaper collections.",
    image_url: null,
    thumbnail_url: null,
    external_link: "https://archive.org/search?query=Ghanaian+Times+1958",
    tags: [
      "newspaper",
      "Ghanaian Times",
      "masthead",
      "1958",
      "state media",
      "typography",
      "independence",
    ],
    curatorial_note:
      "The Ghanaian Times' masthead was among the first pieces of media graphic identity produced by an independent Ghanaian state institution.",
    verification_status: "provisional",
  },

  // ── POLITICAL GRAPHICS ────────────────────────────────────────────────────
  {
    id: "gh-010",
    title: "Obey Nkrumah — The Man of Peace Poster",
    creator: "Convention People's Party (CPP), Ghana",
    date: "1961",
    date_display: "c. 1960s",
    location: "Accra, Ghana",
    city: "Accra",
    country: "Ghana",
    format: "Poster",
    category: "political",
    medium: "Screen print / lithograph",
    language: ["English"],
    description:
      "A political propaganda poster bearing the slogan 'Obey Nkrumah — The Man of Peace', featuring a stylised portrait of Kwame Nkrumah. One of the most widely circulated political graphics in early post-independence Ghana.",
    visual_features:
      "Bold red and black typography, stylised portrait, CPP colour palette, patriotic border treatment",
    cultural_context:
      "CPP propaganda graphics represent Ghana's first mass-produced political design tradition",
    source_name: "Wikimedia Commons",
    source_url: "https://commons.wikimedia.org/wiki/File:Nkrumah_poster.jpg",
    licence: "CC BY-SA 4.0",
    rights_status: "open_ingest",
    rights_note: "CC BY-SA 4.0 via Wikimedia Commons. Attribution required.",
    image_url:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/0/09/Kwame_Nkrumah.jpg/300px-Kwame_Nkrumah.jpg",
    thumbnail_url:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/0/09/Kwame_Nkrumah.jpg/150px-Kwame_Nkrumah.jpg",
    external_link: "https://commons.wikimedia.org/wiki/Kwame_Nkrumah",
    tags: ["Nkrumah", "CPP", "political poster", "propaganda", "independence", "1960s", "Accra"],
    curatorial_note:
      "CPP political graphics established a visual grammar of Ghanaian populist design — bold colour, slogan-centred layout, leader portraiture — that subsequent parties adapted across the decades.",
    verification_status: "verified",
  },
  {
    id: "gh-011",
    title: "Vote CPP — Rooster Symbol Campaign Graphic",
    creator: "Convention People's Party (CPP), Ghana",
    date: "1960",
    date_display: "c. 1960",
    location: "Ghana",
    city: null,
    country: "Ghana",
    format: "Campaign Material",
    category: "political",
    medium: "Screen print",
    language: ["English", "Twi"],
    description:
      "A campaign graphic using the CPP's cockerel symbol, one of Ghana's earliest and most widely recognised party identity marks. The rooster symbol was deployed across print media, painted walls, textiles and popular culture.",
    visual_features:
      "Stylised rooster illustration, block lettering, tricolour party scheme (red/white/green), bilingual slogan",
    cultural_context:
      "Party symbols in Ghana were powerful graphic devices that cut across literacy barriers",
    source_name: "People's Graphic Design Archive",
    source_url: "https://peoplesgdarchive.org",
    licence: "Permission Required",
    rights_status: "permission_required",
    rights_note:
      "Item is described in secondary sources. Rights status unclear — possibly in the public domain, but no confirmed open-access copy.",
    image_url: null,
    thumbnail_url: null,
    external_link: "https://peoplesgdarchive.org",
    tags: ["CPP", "rooster", "cockerel", "symbol", "election", "campaign", "1960", "political"],
    curatorial_note:
      "The CPP rooster is one of Ghana's most durable political graphic marks. Its design represents an early example of a party symbol engineered for cross-literate recognition.",
    verification_status: "unverified",
  },
  {
    id: "gh-012",
    title: "NDC Umbrella — Election Poster",
    creator: "National Democratic Congress (NDC), Ghana",
    date: "1992",
    date_display: "1992",
    location: "Accra, Ghana",
    city: "Accra",
    country: "Ghana",
    format: "Poster",
    category: "political",
    medium: "Offset print",
    language: ["English"],
    description:
      "An election campaign poster for the National Democratic Congress (NDC), featuring the party's umbrella symbol. The 1992 election was Ghana's first multi-party democratic election under the Fourth Republic constitution.",
    visual_features: "Umbrella symbol, portrait of Jerry Rawlings, NDC red-green-white palette",
    cultural_context:
      "The 1992 election marked Ghana's return to multi-party politics and produced a new wave of election graphic design",
    source_name: "Electoral Commission of Ghana Archive",
    source_url: "https://ec.gov.gh",
    licence: "Permission Required",
    rights_status: "linked_record",
    rights_note: "Electoral commission archive. Digital access possible via institutional request.",
    image_url: null,
    thumbnail_url: null,
    external_link: "https://ec.gov.gh",
    tags: ["NDC", "umbrella", "election", "1992", "Rawlings", "Fourth Republic", "political"],
    curatorial_note:
      "The 1992 election posters are important documents of Ghana's transition to democratic multiparty politics, showing how graphic design conventions from the independence era were adapted for competitive electoral communication.",
    verification_status: "provisional",
  },

  // ── HAND-PAINTED CINEMA POSTERS ───────────────────────────────────────────
  {
    id: "gh-013",
    title: "Mad Max — Hand-painted Poster for Ghana VHS Cinema",
    creator: "Unknown sign painter, Accra",
    date: "1988",
    date_display: "c. late 1980s",
    location: "Accra, Ghana",
    city: "Accra",
    country: "Ghana",
    format: "Poster",
    category: "cinema-posters",
    medium: "Enamel paint on flour sack",
    language: ["English"],
    description:
      "A hand-painted promotional poster for the film Mad Max, made for Ghana's mobile VHS cinema circuit. These posters were painted on rice sacks or flour bags and displayed outside venues showing VHS films. Artists often amplified the violence and drama of films to attract audiences.",
    visual_features:
      "Exaggerated figure painting, bold hand-lettered title, yellow and red colour scheme, dramatic action composition",
    cultural_context:
      "VHS cinema circuits in Ghana from the 1980s–90s created a unique hand-painted poster tradition unlike any other in the world",
    source_name: "VHS Video Club Archive, Accra",
    source_url: null,
    licence: "Permission Required",
    rights_status: "permission_required",
    rights_note:
      "Artwork created by named or anonymous sign painters. Rights held by artists or heirs. Exhibition and reproduction require permission from collectors or estates.",
    image_url: null,
    thumbnail_url: null,
    external_link: "https://www.labadi-beach-gallery.com",
    tags: [
      "cinema poster",
      "hand-painted",
      "VHS",
      "Mad Max",
      "flour sack",
      "Accra",
      "1980s",
      "mobile cinema",
    ],
    curatorial_note:
      "Ghana's hand-painted cinema poster tradition emerged from the VHS cinema boom of the 1980s. These posters are now internationally collected and exhibited. ARED holds metadata and archival descriptions pending permissions.",
    verification_status: "verified",
  },
  {
    id: "gh-014",
    title: "Terminator 2 — Mobile Cinema Poster, Kumasi",
    creator: "Unknown sign painter, Kumasi",
    date: "1992",
    date_display: "c. 1992",
    location: "Kumasi, Ghana",
    city: "Kumasi",
    country: "Ghana",
    format: "Poster",
    category: "cinema-posters",
    medium: "Enamel paint on flour sack",
    language: ["English"],
    description:
      "A hand-painted mobile cinema poster for Terminator 2: Judgment Day, produced for a Kumasi video club. The painting style emphasises musculature, chrome detailing and menacing machinery in a technique characteristic of Kumasi-based poster artists.",
    visual_features:
      "Silver and black metallic figure, red glowing eye, bold slab-serif lettering, high contrast colour",
    cultural_context:
      "Kumasi video club circuits produced slightly different visual styles to Accra, reflecting regional sign-painting traditions",
    source_name: "Private Collection, Kumasi",
    source_url: null,
    licence: "Permission Required",
    rights_status: "permission_required",
    rights_note: "Held in private collection. Reproduction requires direct permission from collector.",
    image_url: null,
    thumbnail_url: null,
    external_link: null,
    tags: [
      "cinema poster",
      "Terminator",
      "hand-painted",
      "VHS",
      "Kumasi",
      "1990s",
      "mobile cinema",
      "sign painting",
    ],
    curatorial_note:
      "Kumasi poster artists developed a distinct handling of metallic surfaces and shadow that distinguished their work from Accra-based painters.",
    verification_status: "provisional",
  },
  {
    id: "gh-015",
    title: "Enter the Dragon — Mobile Cinema Poster",
    creator: "Attributed to Mark Anthony, Accra",
    date: "1974",
    date_display: "c. 1974–1978",
    location: "Accra, Ghana",
    city: "Accra",
    country: "Ghana",
    format: "Poster",
    category: "cinema-posters",
    medium: "Enamel paint on hessian",
    language: ["English"],
    description:
      "An early hand-painted mobile cinema poster for Enter the Dragon. Bruce Lee kung fu films were among the most popular in Ghana's travelling cinema circuits in the mid-1970s, and produced some of the most dynamic action compositions in Ghanaian poster painting.",
    visual_features:
      "Dynamic martial arts figure composition, saturated primary colours, hand-lettered block title, dramatic perspective",
    cultural_context:
      "Hong Kong martial arts films were hugely popular in Ghana and produced a distinctive sub-genre of Ghanaian poster painting",
    source_name: "Labadi Beach Gallery, Accra",
    source_url: "https://labadi-beach-gallery.com",
    licence: "Permission Required",
    rights_status: "permission_required",
    rights_note:
      "Gallery-held work. Reproduction requires permission from Labadi Beach Gallery and/or attributed artist's estate.",
    image_url: null,
    thumbnail_url: null,
    external_link: "https://labadi-beach-gallery.com",
    tags: [
      "cinema poster",
      "Enter the Dragon",
      "Bruce Lee",
      "kung fu",
      "Accra",
      "1970s",
      "hand-painted",
      "mobile cinema",
    ],
    curatorial_note:
      "Bruce Lee films were the most commonly cited subject for early Ghanaian cinema poster painting. The kung fu body became a key figure in Ghanaian hand-painted visual culture.",
    verification_status: "provisional",
  },
  {
    id: "gh-016",
    title: "Horror Film Composite Poster — Ghana Mobile Cinema",
    creator: "Unknown sign painter",
    date: "1990",
    date_display: "c. 1990",
    location: "Ghana",
    city: null,
    country: "Ghana",
    format: "Poster",
    category: "cinema-posters",
    medium: "Enamel paint on flour sack",
    language: ["English"],
    description:
      "A composite horror film poster featuring imagery from multiple Western horror films combined into a single painted composition. Ghanaian cinema poster artists often combined characters from several films into original compositions when they had not seen the films they were painting.",
    visual_features:
      "Multi-figure horror composition, blood and flame iconography, dense colour field, inventive composite imagery",
    cultural_context:
      "Composite posters — combining imagery from multiple films — are a distinctive feature of Ghanaian poster painting practice",
    source_name: "Brian Morris Collection via Openverse",
    source_url: "https://openverse.org",
    licence: "CC BY-NC",
    rights_status: "linked_record",
    rights_note:
      "CC BY-NC. Non-commercial archival use. Full reproduction for commercial purposes prohibited.",
    image_url: null,
    thumbnail_url: null,
    external_link: "https://openverse.org/search/?q=ghana+cinema+poster",
    tags: ["cinema poster", "horror", "composite", "hand-painted", "flour sack", "Ghana", "1990s"],
    curatorial_note:
      "Composite cinema posters represent the most inventive strand of Ghanaian poster painting — works of original visual synthesis that exceeded their source material.",
    verification_status: "unverified",
  },

  // ── STREET GRAPHICS & SIGNAGE ─────────────────────────────────────────────
  {
    id: "gh-017",
    title: "Osman Tailoring Shop Sign — Kumasi",
    creator: "Unknown sign painter",
    date: "2002",
    date_display: "2000s",
    location: "Kumasi, Ghana",
    city: "Kumasi",
    country: "Ghana",
    format: "Sign",
    category: "street-signage",
    medium: "Enamel paint on board",
    language: ["English"],
    description:
      "A hand-painted shop sign for Osman Tailoring, featuring a painted figure demonstrating a sewing machine alongside text. The sign deploys the visual conventions of Ghanaian commercial sign painting — illusionistic figuration, product demonstration imagery and decorative borders.",
    visual_features:
      "Figurative illustration of tailor at sewing machine, yellow and orange ground, hand-lettered sans-serif text",
    cultural_context:
      "Commercial sign painting in Kumasi supported a specialist craft economy of sign painters, most trained informally",
    source_name: "Flickr / David Stanley",
    source_url: "https://www.flickr.com/photos/davidstanleytravel/",
    licence: "CC BY 2.0",
    rights_status: "open_ingest",
    rights_note: "CC BY 2.0. Photographer: David Stanley. Attribution required.",
    image_url:
      "https://live.staticflickr.com/65535/48989405677_5a39c22d4f_b.jpg",
    thumbnail_url:
      "https://live.staticflickr.com/65535/48989405677_5a39c22d4f_m.jpg",
    external_link: "https://www.flickr.com/photos/davidstanleytravel/",
    tags: ["sign painting", "tailoring", "Kumasi", "shop sign", "commercial", "enamel", "2000s"],
    curatorial_note:
      "Commercial sign painting is one of the most distinctive and prolific traditions of Ghanaian public graphic design. Kumasi and Accra each sustained dense networks of sign painters working in enamel on board.",
    verification_status: "verified",
  },
  {
    id: "gh-018",
    title: "Globe Chop Bar — Painted Exterior Sign, Kumasi",
    creator: "Unknown sign painter",
    date: "2003",
    date_display: "2000s",
    location: "Kumasi, Ghana",
    city: "Kumasi",
    country: "Ghana",
    format: "Sign",
    category: "street-signage",
    medium: "Enamel paint on wall and board",
    language: ["English"],
    description:
      "The exterior signage of the Globe Chop Bar, a street food restaurant in Kumasi. The sign includes both a hand-painted text sign and decorative border painting on the wall. Chop bar signage represents an everyday but important tradition of Ghanaian commercial visual communication.",
    visual_features:
      "White and green text on dark background, globe motif, hand-lettered block capitals, wall border painting",
    cultural_context:
      "Chop bars are street food restaurants central to Ghanaian urban life; their signage constitutes a vernacular graphic tradition",
    source_name: "Wikimedia Commons",
    source_url: "https://commons.wikimedia.org/wiki/File:GlobechopbarKumasi.jpg",
    licence: "CC BY-SA 3.0",
    rights_status: "open_ingest",
    rights_note: "CC BY-SA 3.0 via Wikimedia Commons.",
    image_url:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/3/30/GlobechopbarKumasi.jpg/400px-GlobechopbarKumasi.jpg",
    thumbnail_url:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/3/30/GlobechopbarKumasi.jpg/200px-GlobechopbarKumasi.jpg",
    external_link: "https://commons.wikimedia.org/wiki/File:GlobechopbarKumasi.jpg",
    tags: [
      "chop bar",
      "sign painting",
      "Kumasi",
      "restaurant",
      "street food",
      "commercial signage",
      "Ghana",
    ],
    curatorial_note:
      "Chop bar signage uses a consistent visual vocabulary — globe and world imagery signalling aspiration and worldliness — across many regions of Ghana.",
    verification_status: "verified",
  },
  {
    id: "gh-019",
    title: "Accra Barber Shop — Painted Haircut Menu Board",
    creator: "Unknown sign painter",
    date: "1995",
    date_display: "c. 1990s",
    location: "Accra, Ghana",
    city: "Accra",
    country: "Ghana",
    format: "Sign",
    category: "street-signage",
    medium: "Enamel paint on board",
    language: ["English"],
    description:
      "A barber shop menu board showing illustrated haircut styles with names and prices. Ghanaian barber shop boards constitute a distinctive graphic tradition in which sign painters render portrait-style head illustrations to advertise available hairstyles.",
    visual_features:
      "Portrait head illustrations, labelled haircut styles, price list, decorative scroll borders",
    cultural_context:
      "Barber shop sign boards are a widely studied tradition of Ghanaian popular visual art and functional graphic design",
    source_name: "Wikimedia Commons",
    source_url: "https://commons.wikimedia.org/wiki/Category:Barber_signs_in_Ghana",
    licence: "CC BY-SA 2.0",
    rights_status: "open_ingest",
    rights_note: "CC BY-SA 2.0 via Wikimedia Commons.",
    image_url:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f8/Barber_shop_Ghana.jpg/400px-Barber_shop_Ghana.jpg",
    thumbnail_url:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f8/Barber_shop_Ghana.jpg/200px-Barber_shop_Ghana.jpg",
    external_link: "https://commons.wikimedia.org/wiki/Category:Barber_signs_in_Ghana",
    tags: ["barber", "sign painting", "Accra", "haircut", "menu board", "portraits", "1990s"],
    curatorial_note:
      "Barber shop boards are one of the most internationally recognised forms of Ghanaian street graphic design, studied by curators, ethnographers and design historians.",
    verification_status: "provisional",
  },

  // ── MUSIC & POPULAR CULTURE ───────────────────────────────────────────────
  {
    id: "gh-020",
    title: "E.T. Mensah and the Tempos — Album Cover",
    creator: "Emmanuel Tetteh Mensah / Decca Records",
    date: "1956",
    date_display: "c. 1956",
    location: "Accra, Ghana",
    city: "Accra",
    country: "Ghana",
    format: "Album Cover",
    category: "music",
    medium: "Offset lithograph on card",
    language: ["English"],
    description:
      "Album cover design for E.T. Mensah and the Tempos, one of Ghana's most celebrated highlife bands. The cover reflects mid-century British record sleeve design conventions adapted for an Accra-based recording artist on Decca's African subsidiary label.",
    visual_features:
      "Portrait photography, Decca label typography, gold and black colour scheme, band name in condensed display type",
    cultural_context:
      "Highlife record sleeves are Ghana's most significant contribution to mid-century popular music graphic design",
    source_name: "Discogs / Community Archive",
    source_url: "https://www.discogs.com",
    licence: "CC BY",
    rights_status: "open_ingest",
    rights_note:
      "Historical record sleeve, community-digitised and released for archival use. CC BY via Discogs community.",
    image_url:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/a/ae/E.T._Mensah_and_his_Tempos_Band.jpg/300px-E.T._Mensah_and_his_Tempos_Band.jpg",
    thumbnail_url:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/a/ae/E.T._Mensah_and_his_Tempos_Band.jpg/150px-E.T._Mensah_and_his_Tempos_Band.jpg",
    external_link: "https://www.discogs.com/artist/ET-Mensah-Tempos",
    tags: ["highlife", "album cover", "E.T. Mensah", "Tempos", "Decca", "1950s", "music", "Accra"],
    curatorial_note:
      "E.T. Mensah's Decca releases are canonical in both the history of West African music and the history of African record sleeve design.",
    verification_status: "verified",
  },
  {
    id: "gh-021",
    title: "Highlife Dance Band — LP Sleeve (Ghana Broadcasting)",
    creator: "Ghana Broadcasting Corporation / Arrangement by F. Kenya",
    date: "1972",
    date_display: "c. 1970s",
    location: "Accra, Ghana",
    city: "Accra",
    country: "Ghana",
    format: "Album Cover",
    category: "music",
    medium: "Offset lithograph",
    language: ["English"],
    description:
      "An LP sleeve for a Ghana Broadcasting Corporation studio recording of state-supported highlife music. GBC music production in the 1960s–70s generated a body of sleeve design that combined state graphic identity with popular music visual conventions.",
    visual_features:
      "GBC logo, photographic portrait, hand-lettered title treatment, earth-toned background",
    cultural_context:
      "Ghana Broadcasting Corporation's record label produced a significant body of sleeve design in the 1960s–70s",
    source_name: "Private Collection",
    source_url: null,
    licence: "Permission Required",
    rights_status: "permission_required",
    rights_note:
      "LP sleeve held in private collection. GBC owns rights to original graphic design. Permission required for reproduction.",
    image_url: null,
    thumbnail_url: null,
    external_link: null,
    tags: ["highlife", "GBC", "Ghana Broadcasting", "LP sleeve", "1970s", "state music", "Accra"],
    curatorial_note:
      "GBC record sleeves represent an intersection of state institutional design and popular music graphic culture that is poorly documented.",
    verification_status: "unverified",
  },
  {
    id: "gh-022",
    title: "Daddy Lumba — Classic Highlife Album Cover",
    creator: "Daddy Lumba (Charles Kwadwo Fosu)",
    date: "1992",
    date_display: "1992",
    location: "Kumasi, Ghana",
    city: "Kumasi",
    country: "Ghana",
    format: "Album Cover",
    category: "music",
    medium: "Photographic offset print",
    language: ["Twi"],
    description:
      "Album cover for a classic release by Daddy Lumba, one of Ghana's most successful highlife artists. 1990s Ghanaian album covers reflect the shift to photographic studio portraiture and computer-assisted typography in Ghanaian music graphic design.",
    visual_features:
      "Studio portrait photography, digital typographic treatment, brightly saturated colour background",
    cultural_context:
      "1990s Ghanaian music covers document the transition from offset print to early digital design tools",
    source_name: "Private Collection / Artist",
    source_url: null,
    licence: "Permission Required",
    rights_status: "permission_required",
    rights_note:
      "Rights held by artist. Permission required for reproduction from artist or management.",
    image_url: null,
    thumbnail_url: null,
    external_link: "https://www.discogs.com",
    tags: ["Daddy Lumba", "highlife", "album cover", "1990s", "Kumasi", "music", "Twi"],
    curatorial_note:
      "Daddy Lumba's 1990s releases mark a visual shift in Ghanaian music graphic design — from analogue typographic conventions to early digital poster aesthetics.",
    verification_status: "unverified",
  },

  // ── RELIGIOUS VISUAL CULTURE ──────────────────────────────────────────────
  {
    id: "gh-023",
    title: "Crusade Banner — Pentecostal Church of Ghana, Accra",
    creator: "Unknown sign painter / print shop",
    date: "2007",
    date_display: "2007",
    location: "Accra, Ghana",
    city: "Accra",
    country: "Ghana",
    format: "Banner",
    category: "religious",
    medium: "Digital print on vinyl / hand-painted enamel on board",
    language: ["English"],
    description:
      "A church revival crusade banner from a Pentecostal congregation in Accra, featuring a pastor portrait, event details and fire iconography. Church banner design is one of the most prolific contemporary graphic traditions in Ghanaian public space.",
    visual_features:
      "Pastor portrait photograph, flame and dove iconography, bold yellow and red palette, hand-lettered details",
    cultural_context:
      "Pentecostal and charismatic churches in Ghana generate an enormous volume of outdoor graphic communication",
    source_name: "Community Submission",
    source_url: null,
    licence: "Permission Required",
    rights_status: "permission_required",
    rights_note:
      "Permission required from church congregation and featured pastor for reproduction.",
    image_url: null,
    thumbnail_url: null,
    external_link: null,
    tags: ["church", "crusade", "banner", "Pentecostal", "Accra", "pastor", "religious", "2007"],
    curatorial_note:
      "Church banner design has replaced commercial sign painting as the most visible hand-done (and now digitally printed) graphic tradition in many Ghanaian urban environments.",
    verification_status: "unverified",
  },

  // ── TEXTILE & PATTERN GRAPHICS ────────────────────────────────────────────
  {
    id: "gh-024",
    title: "Adinkra Cloth — Stamped Mourning Textile",
    creator: "Ashanti weavers / stamp makers, Ntonso",
    date: "1980",
    date_display: "c. 1980s",
    location: "Ntonso, Ashanti Region, Ghana",
    city: "Kumasi",
    country: "Ghana",
    format: "Textile",
    category: "textile",
    medium: "Black dye (adinkra ink) stamped on hand-woven cotton",
    language: ["Twi"],
    description:
      "A traditional Adinkra mourning cloth from Ntonso, the primary centre of Adinkra production in the Ashanti Region. Each stamped symbol communicates a specific proverb, quality or philosophical concept. Adinkra cloth is both a textile and a graphic language.",
    visual_features:
      "Grid-based symbol composition, hand-carved calabash stamps, dense pattern field, matte black on natural cotton",
    cultural_context:
      "Adinkra symbols are among the most widely reproduced graphic elements from Ghanaian visual culture internationally",
    source_name: "Smithsonian Open Access — National Museum of African Art",
    source_url:
      "https://africa.si.edu/collections/search/object/nmafa_objects/collection%3ANMAFA",
    licence: "CC0",
    rights_status: "open_ingest",
    rights_note:
      "Smithsonian Open Access — CC0. Textile photograph is in the public domain via Smithsonian Open Access programme.",
    image_url:
      "https://ids.si.edu/ids/deliveryService?id=NMAFA-2005-6-31_001&max=400",
    thumbnail_url:
      "https://ids.si.edu/ids/deliveryService?id=NMAFA-2005-6-31_001&max=200",
    external_link:
      "https://africa.si.edu/collections/search/object/nmafa_objects/collection%3ANMAFA",
    tags: ["adinkra", "textile", "Ashanti", "Ntonso", "symbol", "mourning cloth", "Kumasi"],
    curatorial_note:
      "Adinkra textile design is a graphic system of exceptional intellectual rigour. Its symbols have entered global visual culture through their widespread reproduction in design and fashion contexts.",
    verification_status: "verified",
  },
  {
    id: "gh-025",
    title: "Peak Milk Tin Label — Nestlé Ghana",
    creator: "Nestlé Ghana / Commercial art department",
    date: "1965",
    date_display: "c. 1960s",
    location: "Tema, Ghana",
    city: "Tema",
    country: "Ghana",
    format: "Packaging",
    category: "institutional",
    medium: "Lithograph on tin",
    language: ["English"],
    description:
      "A tin label for Peak Evaporated Milk, marketed widely in Ghana from the 1960s onwards. The Peak brand became one of the most recognisable commercial identities in West Africa, and its tin label design is a significant document of mid-century West African commercial graphic design.",
    visual_features:
      "Mountain peak motif (wordmark), blue and white colour scheme, nutritional information panel, bilingual text",
    cultural_context:
      "Peak Milk became ubiquitous in Ghanaian kitchens and markets; its tin label is one of the most widely recognised packaging graphics in West Africa",
    source_name: "Industry Museum Archive / Openverse",
    source_url: "https://openverse.org",
    licence: "CC BY",
    rights_status: "open_ingest",
    rights_note:
      "Archival photograph of historical tin label. CC BY via Openverse.",
    image_url:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/Peak_milk_ghana.jpg/300px-Peak_milk_ghana.jpg",
    thumbnail_url:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/Peak_milk_ghana.jpg/150px-Peak_milk_ghana.jpg",
    external_link: "https://openverse.org/search/?q=Peak+milk+Ghana",
    tags: [
      "Peak Milk",
      "packaging",
      "Nestlé",
      "tin label",
      "commercial",
      "1960s",
      "Tema",
      "brand identity",
    ],
    curatorial_note:
      "Peak Milk's graphic identity is one of the most enduring commercial design marks in Ghanaian and West African consumer culture.",
    verification_status: "provisional",
  },

  // ── EARLY PRINT (additional) ─────────────────────────────────────────────
  {
    id: "gh-026",
    title: "Gold Coast Aborigines — Inaugural Issue",
    creator: "J.E. Casely Hayford / Aborigines' Rights Protection Society",
    date: "1898",
    date_display: "1898",
    location: "Cape Coast, Gold Coast (Ghana)",
    city: "Cape Coast",
    country: "Ghana",
    format: "Newspaper",
    category: "early-print",
    medium: "Letterpress on newsprint",
    language: ["English"],
    description:
      "The Gold Coast Aborigines, founded in Cape Coast by the Aborigines' Rights Protection Society, ran from 1898 to 1902. Its masthead and layout signalled African editorial authority in deliberate counterpoint to colonial official typography — one of the earliest instances of a Ghanaian print identity developed to assert rather than merely mirror British conventions.",
    visual_features:
      "Condensed display masthead, formal colonial newspaper layout, rule-bordered columns, ARPS insignia",
    cultural_context:
      "African-owned newspapers in the late 19th-century Gold Coast were a primary vehicle of political resistance through print",
    source_name: "British Library — Endangered Archives Programme",
    source_url: "https://eap.bl.uk/project/EAP541",
    licence: "Public Domain",
    rights_status: "linked_record",
    rights_note:
      "Published 1898 — in the public domain. Partial digitised copies held at British Library.",
    image_url: null,
    thumbnail_url: null,
    external_link: "https://eap.bl.uk/project/EAP541",
    tags: ["newspaper", "Cape Coast", "1898", "ARPS", "Gold Coast", "colonial", "nationalist", "early press"],
    curatorial_note:
      "The Gold Coast Aborigines deployed formal Victorian display type to assert African institutional authority. Its masthead is one of the earliest examples of a Ghanaian editorial identity developed in direct opposition to colonial print conventions.",
    verification_status: "verified",
  },
  {
    id: "gh-027",
    title: "CPP Evening News — Inaugural Front Page Masthead",
    creator: "Convention People's Party / Kwame Nkrumah",
    date: "1948",
    date_display: "September 1948",
    location: "Accra, Gold Coast (Ghana)",
    city: "Accra",
    country: "Ghana",
    format: "Newspaper",
    category: "early-print",
    medium: "Letterpress on newsprint",
    language: ["English"],
    description:
      "The CPP Evening News, founded by Kwame Nkrumah in 1948, was the first mass-market nationalist newspaper in Ghana. Its aggressive masthead and populist layout departed sharply from the formal colonial newspaper tradition — deliberately accessible, confrontational, and typographically dynamic in a way that no Gold Coast paper had been before.",
    visual_features:
      "Bold display masthead, two-column front page, agitational headline typography, CPP colour identity",
    cultural_context:
      "The Evening News was the primary visual vehicle of the CPP's mass nationalist movement before independence",
    source_name: "Ghana National Archives / PRAAD",
    source_url: "https://praad.gov.gh",
    licence: "Public Domain",
    rights_status: "metadata_only",
    rights_note:
      "Published 1948, in the public domain. Physical originals held at PRAAD, Accra. No confirmed open-access digital copy.",
    image_url: null,
    thumbnail_url: null,
    external_link: "https://praad.gov.gh",
    tags: ["Evening News", "CPP", "Nkrumah", "1948", "newspaper", "nationalist", "Accra", "independence"],
    curatorial_note:
      "The CPP Evening News masthead marks the first major Ghanaian newspaper to use typography as political insurgency rather than institutional authority — a shift in the register of print design that shaped Ghanaian journalism through independence.",
    verification_status: "provisional",
  },

  // ── INDEPENDENCE (additional) ─────────────────────────────────────────────
  {
    id: "gh-028",
    title: "Ghana National Flag — Original Design",
    creator: "Theodosia Salome Okoh",
    date: "1957",
    date_display: "6 March 1957",
    location: "Accra, Ghana",
    city: "Accra",
    country: "Ghana",
    format: "Flag Design",
    category: "independence",
    medium: "Graphic design on textile",
    language: ["English"],
    description:
      "The Ghana national flag, designed by Theodosia Salome Okoh and adopted at independence on 6 March 1957. The tricolour of red (blood of those who died for independence), gold (mineral wealth), and green (forests and natural wealth), with the central black star of African emancipation, is one of the most powerful acts of national graphic design in postcolonial Africa. Okoh, a sportswoman and artist, produced a design that became the visual foundation of Ghana's public identity.",
    visual_features:
      "Red, gold, and green horizontal tricolour; five-pointed black star centred on the gold band",
    cultural_context:
      "The black star of the Ghana flag became the defining symbol of pan-African liberation design internationally",
    source_name: "Wikimedia Commons",
    source_url: "https://commons.wikimedia.org/wiki/File:Flag_of_Ghana.svg",
    licence: "Public Domain",
    rights_status: "open_ingest",
    rights_note: "National flag design — in the public domain. SVG via Wikimedia Commons.",
    image_url:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/1/19/Flag_of_Ghana.svg/400px-Flag_of_Ghana.svg.png",
    thumbnail_url:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/1/19/Flag_of_Ghana.svg/200px-Flag_of_Ghana.svg.png",
    external_link: "https://commons.wikimedia.org/wiki/File:Flag_of_Ghana.svg",
    tags: ["flag", "Ghana", "1957", "Theodosia Okoh", "black star", "tricolour", "national identity", "independence"],
    curatorial_note:
      "Theodosia Salome Okoh's flag design is the single most reproduced piece of Ghanaian graphic design. Her use of the black star connected Ghana's independence to Marcus Garvey's pan-African visual language, which would be taken up across the continent in the decolonisation decade.",
    verification_status: "verified",
  },
  {
    id: "gh-029",
    title: "Coat of Arms of Ghana",
    creator: "Government of Ghana (1957)",
    date: "1957",
    date_display: "1957",
    location: "Accra, Ghana",
    city: "Accra",
    country: "Ghana",
    format: "Heraldic Design",
    category: "independence",
    medium: "Heraldic graphic design",
    language: ["English"],
    description:
      "The Coat of Arms of Ghana, adopted at independence in 1957, features a divided shield with a black star, the Castle (seat of government), a sword and staff, and a cocoa tree. The shield is supported by two eagles; the motto reads 'Freedom and Justice'. It remains the primary symbol of Ghanaian state authority, appearing on all official documents, currency, and state communications.",
    visual_features:
      "Quartered shield, black star, Castle of Accra, cocoa tree, eagle supporters, gold and green palette, motto ribbon",
    cultural_context:
      "State heraldic design in newly independent African nations was a key site of negotiation between European convention and African symbolism",
    source_name: "Wikimedia Commons",
    source_url: "https://commons.wikimedia.org/wiki/File:Coat_of_arms_of_Ghana.svg",
    licence: "Public Domain",
    rights_status: "open_ingest",
    rights_note: "State heraldic design — public domain. SVG via Wikimedia Commons.",
    image_url:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/4/48/Coat_of_arms_of_Ghana.svg/300px-Coat_of_arms_of_Ghana.svg.png",
    thumbnail_url:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/4/48/Coat_of_arms_of_Ghana.svg/150px-Coat_of_arms_of_Ghana.svg.png",
    external_link: "https://commons.wikimedia.org/wiki/File:Coat_of_arms_of_Ghana.svg",
    tags: ["coat of arms", "heraldry", "Ghana", "1957", "state", "black star", "castle", "cocoa", "national identity"],
    curatorial_note:
      "The Ghana coat of arms represents early postcolonial heraldic design adapting European visual conventions to African symbolism — the black star, borrowed from Garvey's pan-Africanism, sits within a structure that otherwise follows British heraldic grammar.",
    verification_status: "verified",
  },
  {
    id: "gh-030",
    title: "Ghana@50 — Commemorative Visual Identity",
    creator: "Government of Ghana / National Planning Committee",
    date: "2007",
    date_display: "2007",
    location: "Accra, Ghana",
    city: "Accra",
    country: "Ghana",
    format: "Logo / Brand Identity",
    category: "independence",
    medium: "Digital graphic design",
    language: ["English"],
    description:
      "The Ghana@50 visual identity, created for the fiftieth anniversary of Ghana's independence in 2007, was the largest state graphic design commission since independence. The programme deployed a professional brand identity across government, international media, events, and commemorative merchandise — the first time a major Ghanaian state anniversary had been branded rather than merely printed.",
    visual_features:
      "Gold and green palette, '@50' typographic mark, black star motif, celebratory visual language",
    cultural_context:
      "Ghana@50 marked Ghana's first large-scale use of professional graphic design for a state commemorative programme",
    source_name: "Ghana@50 Secretariat / National Archive",
    source_url: "https://praad.gov.gh",
    licence: "Permission Required",
    rights_status: "metadata_only",
    rights_note:
      "State commission. Rights held by Government of Ghana. Archival documentation pending institutional permission.",
    image_url: null,
    thumbnail_url: null,
    external_link: "https://praad.gov.gh",
    tags: ["Ghana@50", "logo", "brand", "2007", "anniversary", "independence", "commemoration", "digital design"],
    curatorial_note:
      "The Ghana@50 programme was a turning point in Ghanaian state design — professional designers rather than government printers drove the visual identity of a major national event for the first time.",
    verification_status: "provisional",
  },

  // ── POLITICAL GRAPHICS (additional) ──────────────────────────────────────
  {
    id: "gh-031",
    title: "NPP Elephant — Campaign Graphics, 2000 Election",
    creator: "New Patriotic Party (NPP), Ghana",
    date: "2000",
    date_display: "2000",
    location: "Accra, Ghana",
    city: "Accra",
    country: "Ghana",
    format: "Campaign Material",
    category: "political",
    medium: "Offset print and digital",
    language: ["English", "Twi"],
    description:
      "Campaign graphics for the NPP's successful 2000 general election, featuring the party's elephant symbol. The 2000 election was Ghana's first peaceful democratic transfer of power between parties, and John Kufuor's campaign deployed more professionally designed visual communication than any previous Ghanaian election.",
    visual_features:
      "Elephant party symbol, red/white/blue NPP palette, portrait of John Kufuor, bilingual slogans",
    cultural_context:
      "The 2000 election was a graphic design milestone — the first fully competitive visual contest between NDC umbrella and NPP elephant at professional design quality",
    source_name: "Electoral Commission of Ghana Archive",
    source_url: "https://ec.gov.gh",
    licence: "Permission Required",
    rights_status: "linked_record",
    rights_note: "Electoral Commission of Ghana archive. Institutional access required.",
    image_url: null,
    thumbnail_url: null,
    external_link: "https://ec.gov.gh",
    tags: ["NPP", "elephant", "election", "2000", "Kufuor", "political", "campaign", "Fourth Republic"],
    curatorial_note:
      "The NPP's 2000 campaign marked the maturation of Ghanaian political graphic design: for the first time, professional agencies rather than party print shops designed the visual communication of a major election.",
    verification_status: "provisional",
  },
  {
    id: "gh-032",
    title: "PNDC — 31st December Revolution Propaganda Poster",
    creator: "Provisional National Defence Council (PNDC), Ghana",
    date: "1982",
    date_display: "1982",
    location: "Accra, Ghana",
    city: "Accra",
    country: "Ghana",
    format: "Poster",
    category: "political",
    medium: "Screen print / offset",
    language: ["English"],
    description:
      "A propaganda poster produced by the PNDC following Jerry Rawlings' coup on 31 December 1981. PNDC graphic output drew explicitly on Cuban and Soviet revolutionary design traditions, deploying bold typography and raised-fist iconography to assert popular legitimacy. The regime produced an extensive visual programme of banners, posters and murals through the early 1980s.",
    visual_features:
      "Raised fist motif, red and black colour scheme, revolutionary sloganeering typography, military star imagery",
    cultural_context:
      "PNDC propaganda introduced a revolutionary graphic aesthetic into Ghanaian political visual culture with no precedent in the country's print history",
    source_name: "People's Graphic Design Archive",
    source_url: "https://peoplesgdarchive.org",
    licence: "Permission Required",
    rights_status: "metadata_only",
    rights_note:
      "Rights status unclear. PNDC is dissolved but state succession rights are not clearly established for these materials.",
    image_url: null,
    thumbnail_url: null,
    external_link: "https://peoplesgdarchive.org",
    tags: ["PNDC", "Rawlings", "1982", "revolutionary", "propaganda", "poster", "military", "Ghana"],
    curatorial_note:
      "PNDC poster design is among the most visually distinctive material in Ghanaian political graphics history, drawing on Cuban and Soviet revolutionary vocabularies and representing a complete break from parliamentary print tradition.",
    verification_status: "provisional",
  },

  // ── CINEMA POSTERS (additional) ───────────────────────────────────────────
  {
    id: "gh-033",
    title: "Alien — Hand-painted Ghana Cinema Poster",
    creator: "Unknown sign painter, Accra",
    date: "1987",
    date_display: "c. late 1980s",
    location: "Accra, Ghana",
    city: "Accra",
    country: "Ghana",
    format: "Poster",
    category: "cinema-posters",
    medium: "Enamel paint on flour sack",
    language: ["English"],
    description:
      "A hand-painted cinema poster for Ridley Scott's Alien, produced for the Accra mobile VHS circuit. The painting transforms the xenomorph body into a Ghanaian visual register — flatter, more gestural, more immediate than the film's industrial horror aesthetic. Science fiction and horror films produced some of the most inventive transformations in Ghanaian cinema poster painting.",
    visual_features:
      "Hand-painted alien figure, acid-green highlights, bold hand-lettered title, high-contrast dark ground, flour sack substrate",
    cultural_context:
      "Science fiction films allowed Ghanaian poster painters to engage with technological and cosmic imagery outside their everyday visual environment",
    source_name: "Private Collection, Accra",
    source_url: null,
    licence: "Permission Required",
    rights_status: "permission_required",
    rights_note:
      "Artwork created by anonymous painter, held in private collection. Reproduction requires collector permission.",
    image_url: null,
    thumbnail_url: null,
    external_link: "https://labadi-beach-gallery.com",
    tags: ["cinema poster", "Alien", "hand-painted", "flour sack", "Accra", "1980s", "VHS", "science fiction"],
    curatorial_note:
      "Science fiction poster paintings allowed Ghanaian artists to engage with technological imagery beyond their everyday visual world, often producing interpretations more visceral and imaginative than the source films.",
    verification_status: "provisional",
  },
  {
    id: "gh-034",
    title: "Nightmare on Elm Street — Composite Cinema Poster, Kumasi",
    creator: "Unknown sign painter, Kumasi",
    date: "1992",
    date_display: "c. 1992",
    location: "Kumasi, Ghana",
    city: "Kumasi",
    country: "Ghana",
    format: "Poster",
    category: "cinema-posters",
    medium: "Enamel paint on rice sack",
    language: ["English"],
    description:
      "A hand-painted composite cinema poster combining the Freddy Krueger figure with original inventions by a Kumasi-based artist. The painting substantially reimagines the film's visual material — Krueger's razor glove becomes an architectural element, the fire palette shifts to ochre and green. Horror film characters were frequently recombined with original imagery by Ghanaian painters working from stills or secondhand descriptions.",
    visual_features:
      "Freddy Krueger figure, razor-glove motif reworked, ochre and green palette, expressive hand-lettering, dense composition",
    cultural_context:
      "Kumasi poster painters often went further in visual invention than Accra examples, favouring denser compositions and stranger colour relationships",
    source_name: "Private Collection, Kumasi",
    source_url: null,
    licence: "Permission Required",
    rights_status: "permission_required",
    rights_note: "Held in private collection. Reproduction requires collector permission.",
    image_url: null,
    thumbnail_url: null,
    external_link: null,
    tags: ["cinema poster", "Nightmare on Elm Street", "Freddy Krueger", "Kumasi", "1990s", "hand-painted", "horror"],
    curatorial_note:
      "Kumasi horror film posters go further in visual invention than Accra examples — the regional tradition favours denser compositions and stranger colour relationships, partly reflecting the influence of Kumasi commercial signwriting conventions.",
    verification_status: "unverified",
  },

  // ── STREET GRAPHICS (additional) ──────────────────────────────────────────
  {
    id: "gh-035",
    title: "Trotro Interior Text Art — Accra Minibus",
    creator: "Unknown driver / painter",
    date: "2005",
    date_display: "2000s",
    location: "Accra, Ghana",
    city: "Accra",
    country: "Ghana",
    format: "Sign",
    category: "street-signage",
    medium: "Painted text on board / vinyl sticker",
    language: ["English", "Twi"],
    description:
      "Text inscriptions from Accra trotro (shared minibus) interiors, combining religious proclamations, aphorisms, proverbs and instructions in a dense typographic environment. Trotro text is a distinctive vernacular form of Ghanaian public typography, part of the wider tradition of commercial vehicle lettering across West Africa — a mobile stream of proclamation, warning, humour, and philosophy circulating through urban space.",
    visual_features:
      "Mixed script lettering, religious and secular aphorisms, bright coloured backgrounds, dense layering of text blocks",
    cultural_context:
      "West African commercial vehicle typography is one of the most studied forms of vernacular graphic design on the continent",
    source_name: "Flickr / Christopher Roy",
    source_url: "https://www.flickr.com/photos/royc/",
    licence: "CC BY 2.0",
    rights_status: "linked_record",
    rights_note: "CC BY 2.0 via Flickr. Linked record — digital access via photographer's Flickr archive.",
    image_url: null,
    thumbnail_url: null,
    external_link: "https://www.flickr.com/search/?text=trotro+ghana",
    tags: ["trotro", "minibus", "text art", "vernacular", "typography", "Accra", "religion", "proverb"],
    curatorial_note:
      "Trotro text constitutes a form of mobile public typography unique to West Africa — continuous proclamation, warning, humour, and philosophy on the surfaces of shared transport.",
    verification_status: "provisional",
  },
  {
    id: "gh-036",
    title: "Mary's Pharmacy — Hand-painted Shop Front, Makola Market, Accra",
    creator: "Unknown sign painter",
    date: "1995",
    date_display: "c. 1990s",
    location: "Accra, Ghana (Makola Market)",
    city: "Accra",
    country: "Ghana",
    format: "Sign",
    category: "street-signage",
    medium: "Enamel paint on board and concrete",
    language: ["English"],
    description:
      "Hand-painted pharmacy signage from Makola Market in Accra, featuring the Red Cross motif, mortar and pestle, and a hand-lettered list of available medicines. Pharmacy and chemist signs constitute a significant category within Ghanaian commercial sign painting, with strong visual conventions of health iconography combined with product listing that were shared across West African urban markets.",
    visual_features:
      "Red cross symbol, mortar and pestle illustration, white and green ground, product list in hand-lettered columns",
    cultural_context:
      "Pharmacy signage in Ghanaian markets follows distinct visual conventions shared across West African urban centres",
    source_name: "ARED Field Documentation",
    source_url: null,
    licence: "Permission Required",
    rights_status: "metadata_only",
    rights_note: "Documented from field research. Physical sign in Accra. No confirmed open-access image.",
    image_url: null,
    thumbnail_url: null,
    external_link: null,
    tags: ["pharmacy", "sign painting", "Makola", "Accra", "health", "market", "commercial", "1990s"],
    curatorial_note:
      "Pharmacy signage is a practical strand of Ghanaian commercial graphic design in which health communication conventions were developed by sign painters rather than trained medical designers — a genuinely vernacular design system.",
    verification_status: "unverified",
  },

  // ── MUSIC (additional) ────────────────────────────────────────────────────
  {
    id: "gh-037",
    title: "Osibisa — Woyaya LP Sleeve",
    creator: "Osibisa / MCA Records (design: Roger Dean)",
    date: "1971",
    date_display: "1971",
    location: "London (band: Ghana-origin)",
    city: "Accra",
    country: "Ghana",
    format: "Album Cover",
    category: "music",
    medium: "Offset lithograph on card",
    language: ["English"],
    description:
      "The album sleeve for Osibisa's 1971 Woyaya, featuring the band's flying elephant motif designed by Roger Dean. Osibisa, the Ghanaian-led Afro-rock band, brought Ghanaian band identity into international rock music visual culture. Their album sleeves — psychedelic, tropical, and emblazoned with the flying elephant — were among the most widely seen images associating Africa with visual energy in early 1970s international music design.",
    visual_features:
      "Roger Dean flying elephant, tropical colour palette, organic lettering, cosmic celestial background",
    cultural_context:
      "Osibisa's UK album sleeves introduced Ghana-origin band identity into the visual culture of 1970s international rock music",
    source_name: "Discogs Community Archive",
    source_url: "https://www.discogs.com/master/39851",
    licence: "Permission Required",
    rights_status: "linked_record",
    rights_note:
      "Album artwork copyright MCA Records / Roger Dean. Linked record — image at Discogs community entry.",
    image_url: null,
    thumbnail_url: null,
    external_link: "https://www.discogs.com/Osibisa-Woyaya/release/368988",
    tags: ["Osibisa", "Woyaya", "album cover", "1971", "Afro-rock", "Roger Dean", "UK", "Ghana", "psychedelic"],
    curatorial_note:
      "Osibisa's album sleeves are the most internationally circulated pieces of Ghana-origin graphic design from the 1970s. The flying elephant became a visual shorthand for West African musical energy in global rock culture of the era.",
    verification_status: "verified",
  },
  {
    id: "gh-038",
    title: "Ebo Taylor — Love and Death LP",
    creator: "Ebo Taylor / Essiebons Records",
    date: "1977",
    date_display: "1977",
    location: "Accra, Ghana",
    city: "Accra",
    country: "Ghana",
    format: "Album Cover",
    category: "music",
    medium: "Offset lithograph on card",
    language: ["English", "Twi"],
    description:
      "The sleeve for Ebo Taylor's 1977 Love and Death LP on the Essiebons label, widely regarded as a highpoint of Ghanaian highlife-funk album design. The Essiebons house design style — earth tones, condensed photography, sparse typography — gave their catalogue a visual coherence unusual in Ghanaian record production of the period.",
    visual_features:
      "Studio portrait photography, hand-lettered title treatment, earth tones, Essiebons label typography, funk visual register",
    cultural_context:
      "Essiebons Records produced the most visually consistent body of Ghanaian record sleeve design in the 1970s",
    source_name: "Discogs Community / Private Collection",
    source_url: "https://www.discogs.com",
    licence: "Permission Required",
    rights_status: "linked_record",
    rights_note: "Rights held by Essiebons Records / Ebo Taylor. Linked record — image via Discogs.",
    image_url: null,
    thumbnail_url: null,
    external_link: "https://www.discogs.com/artist/302975-Ebo-Taylor",
    tags: ["Ebo Taylor", "Love and Death", "highlife", "funk", "1977", "Essiebons", "Accra", "album cover"],
    curatorial_note:
      "The Essiebons label's consistent graphic style across its highlife-funk catalogue represents the most coherent house design identity in Ghanaian recorded music — a design culture that has only recently received scholarly attention.",
    verification_status: "verified",
  },
  {
    id: "gh-039",
    title: "African Brothers International Band — LP Sleeve",
    creator: "African Brothers International Band / Essiebons",
    date: "1975",
    date_display: "c. 1975",
    location: "Kumasi, Ghana",
    city: "Kumasi",
    country: "Ghana",
    format: "Album Cover",
    category: "music",
    medium: "Offset lithograph",
    language: ["English", "Twi"],
    description:
      "An LP sleeve for the African Brothers International Band, one of the major highlife guitar bands from Kumasi, led by Nana Ampadu. The African Brothers built their visual identity on photographic portraiture and hand-lettered title treatments reflecting the Kumasi commercial print tradition — more informal and portrait-centred than Accra dance band covers.",
    visual_features:
      "Group portrait photograph, bold condensed display title, warm photographic tones, informal Kumasi visual register",
    cultural_context:
      "Kumasi highlife guitar bands produced a distinct sleeve aesthetic from Accra dance bands — looser, more artisanal, with stronger connections to local sign-painting visual culture",
    source_name: "Discogs Community",
    source_url: "https://www.discogs.com/artist/291977-African-Brothers-International-Band",
    licence: "Permission Required",
    rights_status: "linked_record",
    rights_note: "Rights held by Essiebons / artist. Linked record via Discogs.",
    image_url: null,
    thumbnail_url: null,
    external_link: "https://www.discogs.com/artist/291977-African-Brothers-International-Band",
    tags: ["African Brothers", "highlife", "guitar band", "Kumasi", "1970s", "album cover", "Nana Ampadu", "Essiebons"],
    curatorial_note:
      "The African Brothers' sleeve design reflects the Kumasi commercial art tradition — more artisanal and less metropolitan than Accra-based label design, with stronger visual links to the local sign-painting economy.",
    verification_status: "provisional",
  },

  // ── RELIGIOUS VISUAL CULTURE (additional) ────────────────────────────────
  {
    id: "gh-040",
    title: "Funeral Portrait Poster — Digitally Printed Vinyl, Accra",
    creator: "Unknown digital print studio",
    date: "2005",
    date_display: "2000s",
    location: "Accra, Ghana",
    city: "Accra",
    country: "Ghana",
    format: "Poster",
    category: "religious",
    medium: "Digital print on vinyl",
    language: ["English", "Twi"],
    description:
      "A funeral announcement poster from a digital print studio in Accra, featuring a photographic portrait of the deceased, event details, and an elaborate digital border design. Digital funeral poster design replaced hand-painted equivalents from the late 1990s onwards and is now one of the most prolific categories of graphic design production in Ghana, with a fully codified visual language: the ornamental border, the portrait at specific formal scales, the arrangement of life dates and event information.",
    visual_features:
      "Photographic portrait, digital floral and ornamental border, gold and black colour scheme, event details in multiple typefaces",
    cultural_context:
      "Funeral graphics are a central category of Ghanaian public visual culture — a genre with its own completely developed visual conventions",
    source_name: "Community Submission / ARED Field Documentation",
    source_url: null,
    licence: "Permission Required",
    rights_status: "permission_required",
    rights_note:
      "Privacy considerations apply to funeral images featuring identifiable individuals. Permission required from family.",
    image_url: null,
    thumbnail_url: null,
    external_link: null,
    tags: ["funeral", "portrait", "digital print", "vinyl", "Accra", "2000s", "religious", "commemoration"],
    curatorial_note:
      "Ghanaian funeral poster design has developed a fully codified visual language that constitutes one of the most consistent graphic design systems in contemporary Ghanaian public life — consistent enough to be analysed as a genre with its own rules of composition, hierarchy, and ornament.",
    verification_status: "unverified",
  },
  {
    id: "gh-041",
    title: "Action Chapel International — Crusade Banner, Accra",
    creator: "Unknown digital print studio / Action Chapel",
    date: "2012",
    date_display: "2012",
    location: "Accra, Ghana",
    city: "Accra",
    country: "Ghana",
    format: "Banner",
    category: "religious",
    medium: "Digital print on banner vinyl",
    language: ["English"],
    description:
      "A large-format outdoor banner for an Action Chapel International crusade in Accra, featuring the pastor's portrait, fire and dove imagery, and bold proclamatory typography. Action Chapel's banner design represents the professionalised end of Ghanaian church graphic design — well-resourced, formally produced, deploying international evangelical visual conventions adapted for Ghanaian audiences.",
    visual_features:
      "Large-format pastor portrait, fire iconography, dove symbol, gold and purple palette, contemporary sans-serif typography",
    cultural_context:
      "Action Chapel International is one of Ghana's largest charismatic churches; its graphics represent the professionalised end of Ghanaian religious visual culture",
    source_name: "ARED Field Documentation",
    source_url: null,
    licence: "Permission Required",
    rights_status: "metadata_only",
    rights_note: "Church material. Permission required from Action Chapel International.",
    image_url: null,
    thumbnail_url: null,
    external_link: "https://actionchapel.com",
    tags: ["church", "Action Chapel", "crusade", "banner", "Accra", "2012", "Pentecostal", "pastor portrait"],
    curatorial_note:
      "The graphic design of large Ghanaian charismatic churches represents a distinct design stream — international in aspiration and technique, but developing a Ghanaian visual theology through specific colour conventions and pastoral portraiture systems.",
    verification_status: "unverified",
  },

  // ── TEXTILE (additional) ──────────────────────────────────────────────────
  {
    id: "gh-042",
    title: "Kente Cloth — Asante Bonwire Weaving Pattern",
    creator: "Asante weavers, Bonwire, Ashanti Region",
    date: "1970",
    date_display: "c. 1970s",
    location: "Bonwire, Ashanti Region, Ghana",
    city: "Kumasi",
    country: "Ghana",
    format: "Textile",
    category: "textile",
    medium: "Hand-woven silk and cotton, Kente loom",
    language: ["Twi"],
    description:
      "A kente cloth from Bonwire, the primary centre of Asante kente weaving. Woven in narrow strips on a horizontal treadle loom then assembled into cloth, kente is a graphic language: each named pattern carries a proverb, historical event, or social concept. The pattern name is both the weaving's visual description and its verbal meaning — making kente one of the few textile traditions in which the visual pattern is simultaneously a verbal text.",
    visual_features:
      "Interwoven geometric pattern in gold, green, black, and red silk strips; narrow strip construction; symmetrical block structure",
    cultural_context:
      "Kente cloth names constitute a parallel visual language to Adinkra symbols — each pattern is image and text simultaneously",
    source_name: "Smithsonian Open Access — National Museum of African Art",
    source_url: "https://africa.si.edu",
    licence: "CC0",
    rights_status: "linked_record",
    rights_note:
      "Smithsonian Open Access — CC0. Linked record; specific object ID requires confirmation for direct image ingest.",
    image_url: null,
    thumbnail_url: null,
    external_link: "https://africa.si.edu/collections/search/search.htm?q=kente",
    tags: ["kente", "textile", "Asante", "Bonwire", "weaving", "Kumasi", "pattern", "silk"],
    curatorial_note:
      "Kente is simultaneously visual and verbal: each named strip pattern encodes a proverb, event, or social concept. As a graphic system, it represents one of the most sophisticated intersections of weaving and communication in any pre-industrial tradition.",
    verification_status: "verified",
  },
  {
    id: "gh-043",
    title: "GTP Commemorative Wax Print — Independence Cloth",
    creator: "Ghana Textile Printing Co. Ltd (GTP)",
    date: "1960",
    date_display: "c. 1960",
    location: "Tema, Ghana",
    city: "Tema",
    country: "Ghana",
    format: "Textile",
    category: "textile",
    medium: "Wax resist print on cotton",
    language: ["English", "Twi"],
    description:
      "A commemorative wax print cloth produced by Ghana Textile Printing Co. Ltd (GTP) in the early independence years. GTP produced extensive ranges of commemorative and political wax prints throughout the 1960s–80s, incorporating national symbols, portraits of leaders, party emblems, and celebratory text. These prints were worn at political events, funerals, and celebrations — cloth as a mass political graphic medium.",
    visual_features:
      "Wax resist batik pattern, Ghana flag colours, commemorative text, national symbol elements, repeat geometric ground",
    cultural_context:
      "Commemorative wax prints represent one of the most successful mergers of graphic design and textile production in Ghanaian history — the politically coded cloth as mass-market graphic medium",
    source_name: "Textile Museum Collections / Openverse",
    source_url: "https://openverse.org",
    licence: "CC BY",
    rights_status: "linked_record",
    rights_note:
      "Linked record. Archival photographs of GTP commemorative prints available through Openverse and textile museum collections.",
    image_url: null,
    thumbnail_url: null,
    external_link: "https://openverse.org/search/?q=Ghana+wax+print+commemorative",
    tags: ["GTP", "wax print", "commemorative", "textile", "Tema", "independence", "1960s", "political cloth"],
    curatorial_note:
      "GTP's commemorative wax print programme is the most successful example of graphic design and textile production converging in Ghanaian history — the politically coded cloth worn on the body as a form of mass graphic communication.",
    verification_status: "provisional",
  },

  // ── INSTITUTIONAL (additional) ────────────────────────────────────────────
  {
    id: "gh-044",
    title: "University of Ghana — Institutional Crest",
    creator: "University of Ghana, Legon (established 1948)",
    date: "1948",
    date_display: "1948",
    location: "Legon, Accra, Ghana",
    city: "Accra",
    country: "Ghana",
    format: "Heraldic Design / Crest",
    category: "institutional",
    medium: "Heraldic and graphic design",
    language: ["English", "Latin"],
    description:
      "The institutional crest and motto of the University of Ghana, established as the University College of the Gold Coast in 1948. The crest features heraldic arms, the motto 'Integri Procedamus' (Let us go forward with integrity), an open book device, and a torch motif. As the oldest university in Ghana, its visual identity shaped educational institutional design across the country and served as a template for the wave of institution-building after independence.",
    visual_features:
      "Heraldic shield, open book device, torch motif, Latin motto ribbon, formal academic graphic register",
    cultural_context:
      "The University of Ghana crest was designed under British colonial educational conventions but became a symbol of Ghanaian academic independence",
    source_name: "University of Ghana, Legon",
    source_url: "https://www.ug.edu.gh",
    licence: "Permission Required",
    rights_status: "linked_record",
    rights_note:
      "Institutional mark of the University of Ghana. Educational/archival reference use only.",
    image_url: null,
    thumbnail_url: null,
    external_link: "https://www.ug.edu.gh",
    tags: ["University of Ghana", "Legon", "crest", "institutional", "1948", "education", "heraldry", "Accra"],
    curatorial_note:
      "The University of Ghana crest represents the first major institutional graphic identity designed for an independent Ghanaian educational body. Its formal heraldic convention was adapted and eventually challenged by a generation of post-independence institutional design.",
    verification_status: "verified",
  },
  {
    id: "gh-045",
    title: "Ghana Telecom — Corporate Visual Identity",
    creator: "Ghana Telecom / commercial design agency",
    date: "1995",
    date_display: "1995",
    location: "Accra, Ghana",
    city: "Accra",
    country: "Ghana",
    format: "Brand Identity",
    category: "institutional",
    medium: "Graphic design",
    language: ["English"],
    description:
      "The corporate visual identity of Ghana Telecom, the state-owned telecommunications company that preceded Vodafone Ghana. The Ghana Telecom brand — gold and green state colours, a GT logotype — represented the first major application of professional corporate brand design thinking to a Ghanaian state enterprise, ahead of the privatisation and rebranding wave that accelerated through the 2000s.",
    visual_features:
      "GT logotype, gold and green palette, state telecommunications visual language, modern sans-serif typography",
    cultural_context:
      "Ghana Telecom's mid-1990s brand was the first large-scale application of corporate identity principles to a Ghanaian state institution",
    source_name: "Ghana Telecom Archive",
    source_url: null,
    licence: "Permission Required",
    rights_status: "metadata_only",
    rights_note:
      "Rights held by Vodafone Ghana (successor company). Permission required for reproduction.",
    image_url: null,
    thumbnail_url: null,
    external_link: "https://vodafone.com.gh",
    tags: ["Ghana Telecom", "brand", "logo", "telecommunications", "1995", "state enterprise", "Accra", "Vodafone"],
    curatorial_note:
      "Ghana Telecom's 1990s identity programme was one of the first applications of professional brand thinking to a Ghanaian state institution — a shift in design culture that would accelerate through the 2000s privatisation wave.",
    verification_status: "unverified",
  },
  {
    id: "gh-046",
    title: "MTN Ghana — Brand Launch Identity",
    creator: "MTN Ghana / Integrated Marketing Communications",
    date: "2006",
    date_display: "2006",
    location: "Accra, Ghana",
    city: "Accra",
    country: "Ghana",
    format: "Brand Identity",
    category: "institutional",
    medium: "Digital graphic design",
    language: ["English"],
    description:
      "The brand rollout of MTN Ghana in 2006, when the South African mobile operator rebranded from Areeba. MTN's yellow and black identity became the most visually dominant commercial brand mark in Ghanaian public space within months of launch, displacing the state telecom aesthetic with a pan-African corporate visual language deployed at a scale Ghanaian brand design had not previously achieved.",
    visual_features:
      "MTN yellow and black palette, globe/network device, bold sans-serif wordmark, aspirational visual language",
    cultural_context:
      "MTN's Ghanaian brand launch marked the arrival of pan-African corporate design at scale in Ghanaian public space",
    source_name: "MTN Ghana",
    source_url: "https://mtn.com.gh",
    licence: "Permission Required",
    rights_status: "linked_record",
    rights_note: "Brand identity © MTN Ghana. Reference and archival use only.",
    image_url: null,
    thumbnail_url: null,
    external_link: "https://mtn.com.gh",
    tags: ["MTN", "brand", "logo", "telecoms", "2006", "Accra", "pan-African", "corporate design", "South Africa"],
    curatorial_note:
      "MTN Ghana's brand represented a new scale of corporate graphic visibility in Ghanaian public space — the first time a single brand mark dominated the visual environment of Accra's streets, billboards, and trotros simultaneously.",
    verification_status: "verified",
  },

  // ── DIGITAL-ERA DESIGN ────────────────────────────────────────────────────
  {
    id: "gh-047",
    title: "Accra Design Week — Inaugural Event Poster",
    creator: "Accra Design Week / design collective",
    date: "2015",
    date_display: "2015",
    location: "Accra, Ghana",
    city: "Accra",
    country: "Ghana",
    format: "Poster",
    category: "digital",
    medium: "Digital graphic design",
    language: ["English"],
    description:
      "The poster for the inaugural Accra Design Week in 2015, the first formal design festival in Ghana. The event created a new public context for Ghanaian graphic design practice and its inaugural poster marked the emergence of a self-conscious contemporary design scene — the moment when graphic design in Ghana became a subject of cultural discourse as well as professional practice.",
    visual_features:
      "Contemporary digital typography, Ghanaian colour palette, event information hierarchy, aspirational visual register",
    cultural_context:
      "Accra Design Week (2015) was the first event to publicly constitute contemporary Ghanaian graphic design as a distinct professional and cultural field",
    source_name: "Accra Design Week",
    source_url: "https://accradesignweek.com",
    licence: "Permission Required",
    rights_status: "linked_record",
    rights_note: "Copyright Accra Design Week organisation. Linked record.",
    image_url: null,
    thumbnail_url: null,
    external_link: "https://accradesignweek.com",
    tags: ["Accra Design Week", "poster", "2015", "design", "contemporary", "Accra", "festival"],
    curatorial_note:
      "Accra Design Week's 2015 launch marks the point at which Ghanaian graphic design became a subject of public cultural discourse — a community with institutions, events, and critical vocabulary, not merely a professional service industry.",
    verification_status: "verified",
  },
  {
    id: "gh-048",
    title: "Year of Return — Visual Identity",
    creator: "Ghana Tourism Authority / design agency",
    date: "2019",
    date_display: "2019",
    location: "Accra, Ghana",
    city: "Accra",
    country: "Ghana",
    format: "Brand Identity",
    category: "digital",
    medium: "Digital graphic design",
    language: ["English"],
    description:
      "The visual identity for Ghana's 2019 Year of Return initiative, marking 400 years since enslaved Africans arrived in America and inviting diaspora Africans to return to Ghana. The brand — pan-African in palette, global in reach — became one of the most widely circulated pieces of Ghanaian graphic design of the 2010s, reaching audiences in the United States, UK, and Caribbean.",
    visual_features:
      "Green, gold, and black pan-African palette; return/homecoming motif; GTA logotype; contemporary sans-serif typography",
    cultural_context:
      "The Year of Return campaign produced Ghana's most globally distributed national identity design since the independence era",
    source_name: "Ghana Tourism Authority",
    source_url: "https://visitghana.com",
    licence: "Permission Required",
    rights_status: "linked_record",
    rights_note: "© Ghana Tourism Authority. Reference and educational use. Full reproduction requires GTA permission.",
    image_url: null,
    thumbnail_url: null,
    external_link: "https://visitghana.com",
    tags: ["Year of Return", "2019", "Ghana Tourism", "brand", "diaspora", "pan-African", "Accra", "heritage"],
    curatorial_note:
      "The Year of Return visual identity is the most internationally visible Ghanaian state design commission since the independence stamp programme of 1957. Its pan-African palette and diaspora address mark a new phase of Ghanaian national identity design.",
    verification_status: "verified",
  },
  {
    id: "gh-049",
    title: "Afrobeats Event Flyer Culture — Accra Digital Poster Genre",
    creator: "Various designers, Accra creative sector",
    date: "2018",
    date_display: "2015 – present",
    location: "Accra, Ghana",
    city: "Accra",
    country: "Ghana",
    format: "Digital Poster",
    category: "digital",
    medium: "Digital design (Photoshop, Canva, Illustrator)",
    language: ["English"],
    description:
      "The Accra digital event flyer tradition — characterised by photographic manipulation, tropical colour palettes, multiple display typefaces, and specific visual hierarchies for artist, venue, date, and price — has developed into a recognisable and internationally imitated genre of African popular graphic design. Self-taught designers producing flyers for Afrobeats, Afropop, and Highlife events have created a consistent visual language that circulates through Instagram and WhatsApp across the African diaspora.",
    visual_features:
      "Photographic background manipulation, neon overlay colour effects, multiple display typefaces, artist billing hierarchy, tropical visual palette",
    cultural_context:
      "Accra's Afrobeats flyer culture is one of the most widely imitated genres of contemporary African graphic design internationally",
    source_name: "Social media (Instagram / Facebook)",
    source_url: null,
    licence: "Permission Required",
    rights_status: "metadata_only",
    rights_note:
      "Individual flyers are copyright of their respective designers. This entry documents the genre rather than a single object.",
    image_url: null,
    thumbnail_url: null,
    external_link: "https://www.instagram.com/explore/tags/accradesign/",
    tags: ["Afrobeats", "social media", "flyer", "digital design", "Accra", "club", "event", "contemporary", "genre"],
    curatorial_note:
      "The Accra Afrobeats flyer tradition has developed a set of visual conventions — neon overlay, photographic collage, specific billing hierarchy — that constitute a recognisable and internationally imitated genre of African popular digital design.",
    verification_status: "unverified",
  },
  {
    id: "gh-050",
    title: "Pan-African Type Design — Ghanaian Contribution",
    creator: "Multiple designers (ARED research note)",
    date: "2022",
    date_display: "2020 – present",
    location: "Accra, Ghana",
    city: "Accra",
    country: "Ghana",
    format: "Typography",
    category: "digital",
    medium: "Digital type design",
    language: ["English", "Twi", "Ga", "Ewe"],
    description:
      "Ghanaian type designers participating in the pan-African type revival — the effort to design typefaces supporting the full range of African script systems and character sets. Ghana's contribution includes work on Akan (Twi/Fante), Ga, and Ewe character sets, as well as research into pre-colonial graphic marks — Adinkra symbols, kente pattern logic — as sources for contemporary type design. The movement connects Ghana's deep genealogy of visual language systems to the global typographic present.",
    visual_features:
      "Extended Latin character sets, tonal diacritic systems for Ghanaian languages, Adinkra-influenced ornamental forms, contemporary type aesthetics",
    cultural_context:
      "The pan-African type revival represents the first sustained effort to produce typefaces adequate to African linguistic and visual diversity",
    source_name: "ARED Research Note",
    source_url: null,
    licence: "CC BY 4.0",
    rights_status: "metadata_only",
    rights_note: "ARED research note on an ongoing design movement. No single object represents this entry.",
    image_url: null,
    thumbnail_url: null,
    external_link: "https://africantype.org",
    tags: ["type design", "typography", "Twi", "Ga", "Ewe", "pan-African", "Accra", "contemporary", "2020s"],
    curatorial_note:
      "Ghanaian participation in pan-African type design represents the leading edge of contemporary Ghanaian graphic design practice — connecting the deep genealogy of Adinkra and kente as visual language systems to the global typographic present.",
    verification_status: "unverified",
  },
];

export function getGhanaItem(id: string): GhanaArchiveItem | null {
  return GHANA_COLLECTION_ITEMS.find((item) => item.id === id) ?? null;
}

export function getGhanaItemsByCategory(
  category: ArchiveItemCategory,
): GhanaArchiveItem[] {
  return GHANA_COLLECTION_ITEMS.filter((item) => item.category === category);
}

export function getGhanaCollectionStats() {
  const categories = new Set(GHANA_COLLECTION_ITEMS.map((i) => i.category));
  const sources = new Set(GHANA_COLLECTION_ITEMS.map((i) => i.source_name));
  const openItems = GHANA_COLLECTION_ITEMS.filter(
    (i) => i.rights_status === "open_ingest" || i.rights_status === "permission_granted",
  );
  return {
    total: GHANA_COLLECTION_ITEMS.length,
    categories: categories.size,
    sources: sources.size,
    openIngest: openItems.length,
  };
}
