/** Curated AODL collection metadata — links only; no scraped or rehosted media. */
export type ExternalArchiveCollection = {
  id: string;
  title: string;
  platform: string;
  source: "aodl";
  sourceLabel: "AODL";
  resultKind: "collection";
  type: "External collection";
  description: string;
  countries: string[];
  languages: string[];
  themes: string[];
  mediaTypes: string[];
  keywords: string[];
  access: "external-open-collection";
  /** TODO: replace with collection-specific AODL URLs when verified */
  url: string;
};

const AODL_ROOT = "https://aodl.org/";

function aodlCollection(
  id: string,
  title: string,
  description: string,
  opts: {
    countries: string[];
    languages?: string[];
    themes: string[];
    mediaTypes: string[];
    keywords?: string[];
    platform?: string;
    url?: string;
  },
): ExternalArchiveCollection {
  return {
    id,
    title,
    platform: opts.platform ?? "AODL",
    source: "aodl",
    sourceLabel: "AODL",
    resultKind: "collection",
    type: "External collection",
    description,
    countries: opts.countries,
    languages: opts.languages ?? ["English"],
    themes: opts.themes,
    mediaTypes: opts.mediaTypes,
    keywords: opts.keywords ?? [],
    access: "external-open-collection",
    url: opts.url ?? AODL_ROOT,
  };
}

export const AODL_COLLECTIONS: ExternalArchiveCollection[] = [
  aodlCollection(
    "african-oral-narratives",
    "African Oral Narratives",
    "Digitised oral narratives, storytelling, and spoken knowledge from across Africa.",
    {
      countries: ["Pan-Africa"],
      themes: ["Oral Traditions", "Cultural Memory", "Storytelling"],
      mediaTypes: ["Audio", "Video", "Transcripts"],
      keywords: ["oral history", "narratives", "folklore", "griots"],
    },
  ),
  aodlCollection(
    "forgotten-voices-present",
    "'Forgotten' Voices in the Present",
    "Contemporary voices and testimonies foregrounding communities often marginalised in official archives.",
    {
      countries: ["Pan-Africa"],
      themes: ["Contemporary History", "Testimony", "Social Memory"],
      mediaTypes: ["Audio", "Video", "Interviews"],
      keywords: ["forgotten voices", "testimony", "present"],
    },
  ),
  aodlCollection(
    "saint-louis-religious-pluralism",
    "Saint-Louis: Religious Pluralism in the Heart of Senegal",
    "Materials on religious coexistence, Islamic practice, and pluralism in Saint-Louis, Senegal.",
    {
      countries: ["Senegal"],
      languages: ["English", "French", "Wolof", "Arabic"],
      themes: ["Islam", "Religious Pluralism", "Urban History"],
      mediaTypes: ["Photographs", "Documents", "Video"],
      keywords: ["Saint-Louis", "Senegal", "religious pluralism", "Islam"],
    },
  ),
  aodlCollection(
    "south-africa-apartheid-democracy",
    "South Africa: Overcoming Apartheid, Building Democracy",
    "Oral histories, documents, and educational materials on apartheid resistance and democratic transition.",
    {
      countries: ["South Africa"],
      themes: ["Apartheid", "Liberation Movements", "Democracy"],
      mediaTypes: ["Video", "Documents", "Oral History"],
      keywords: ["apartheid", "democracy", "South Africa", "anti-apartheid"],
    },
  ),
  aodlCollection(
    "archive-malian-photography",
    "Archive of Malian Photography",
    "Historic and contemporary Malian photography documenting society, politics, and everyday life.",
    {
      countries: ["Mali"],
      languages: ["English", "French"],
      themes: ["Photography", "Visual Culture", "Malian History"],
      mediaTypes: ["Photographs", "Documents"],
      keywords: ["Mali", "photography", "visual archive"],
    },
  ),
  aodlCollection(
    "slave-biographies",
    "Slave Biographies",
    "Biographical and narrative materials related to enslaved Africans and the Atlantic slave trade.",
    {
      countries: ["West Africa", "Americas"],
      themes: ["Slavery", "Biography", "Atlantic History"],
      mediaTypes: ["Documents", "Manuscripts", "Audio"],
      keywords: ["slave biographies", "slavery", "Atlantic"],
    },
  ),
  aodlCollection(
    "african-e-journals",
    "African e-Journals Project",
    "Digitised African journals and periodicals supporting humanities and social science research.",
    {
      countries: ["Pan-Africa"],
      themes: ["Publishing", "Scholarship", "Periodicals"],
      mediaTypes: ["Journals", "Documents"],
      keywords: ["e-journals", "periodicals", "African publishing"],
    },
  ),
  aodlCollection(
    "kropp-dakubu-farefari",
    "The Kropp Dakubu Collection of Farefari Discourse",
    "Linguistic and cultural materials on Farefari language and discourse in northern Ghana.",
    {
      countries: ["Ghana"],
      languages: ["Farefari", "English"],
      themes: ["Language", "Linguistics", "Northern Ghana"],
      mediaTypes: ["Audio", "Transcripts", "Documents"],
      keywords: ["Farefari", "Kropp Dakubu", "Ghana", "discourse"],
    },
  ),
  aodlCollection(
    "diversity-tolerance-islam-west-africa",
    "Diversity and Tolerance in the Islam of West Africa",
    "Sources on Islamic diversity, tolerance, and plural practice across West Africa.",
    {
      countries: ["Senegal", "Ghana", "Nigeria", "Mali"],
      themes: ["Islam", "Religious Pluralism", "West Africa"],
      mediaTypes: ["Video", "Documents", "Photographs"],
      keywords: ["Islam", "West Africa", "tolerance", "diversity"],
    },
  ),
  aodlCollection(
    "pauline-baker-south-africa-forum",
    "Pauline H. Baker Collection: South Africa Forum 1986-1994",
    "Documents and recordings from the South Africa Forum covering late apartheid and transition.",
    {
      countries: ["South Africa", "United States"],
      themes: ["Apartheid", "Diplomacy", "Transition"],
      mediaTypes: ["Documents", "Audio", "Video"],
      keywords: ["Pauline Baker", "South Africa Forum", "apartheid"],
    },
  ),
  aodlCollection(
    "public-face-islam-kumasi",
    "Public Face of Islam in Kumasi",
    "Visual and documentary materials on Islamic public life, architecture, and community in Kumasi.",
    {
      countries: ["Ghana"],
      languages: ["English", "Twi", "Arabic"],
      themes: ["Islam", "Kumasi", "Urban Culture"],
      mediaTypes: ["Photographs", "Video", "Documents"],
      keywords: ["Kumasi", "Islam", "Ghana", "public life"],
    },
  ),
  aodlCollection(
    "african-activist-archive",
    "African Activist Archive Project",
    "Materials from African and solidarity activist movements, campaigns, and organisational records.",
    {
      countries: ["Pan-Africa", "United States"],
      themes: ["Activism", "Liberation Movements", "Solidarity"],
      mediaTypes: ["Documents", "Posters", "Video", "Photographs"],
      keywords: ["activist archive", "solidarity", "movements"],
    },
  ),
  aodlCollection(
    "community-video-education-trust",
    "Community Video Education Trust",
    "Community-produced video documenting anti-apartheid struggle and grassroots education in South Africa.",
    {
      countries: ["South Africa"],
      themes: ["Apartheid", "Community Media", "Education"],
      mediaTypes: ["Video", "Documents"],
      keywords: ["CVET", "community video", "apartheid", "South Africa"],
    },
  ),
  aodlCollection(
    "west-african-online-digital-library",
    "West African Online Digital Library",
    "Aggregated West African archival materials spanning manuscripts, photography, and oral sources.",
    {
      countries: ["Senegal", "Ghana", "Nigeria", "Mali", "Guinea"],
      themes: ["West Africa", "Digital Archives", "Heritage"],
      mediaTypes: ["Manuscripts", "Photographs", "Audio", "Video"],
      keywords: ["WAODL", "West Africa", "digital library"],
      platform: "WAODL / AODL",
    },
  ),
  aodlCollection(
    "transformations-islamic-education-ghana",
    "Transformations in Islamic Education in Ghana",
    "Records on madrasa education, reform, and Islamic schooling in Ghana.",
    {
      countries: ["Ghana"],
      themes: ["Islam", "Education", "Ghana"],
      mediaTypes: ["Video", "Documents", "Interviews"],
      keywords: ["Islamic education", "Ghana", "madrasa"],
    },
  ),
  aodlCollection(
    "buh-kunta-qadiri-community",
    "Contemporary Dynamics of the Buh Kunta Qadiri Community",
    "Ethnographic and documentary materials on the Buh Kunta Qadiri Sufi community in Senegal.",
    {
      countries: ["Senegal"],
      themes: ["Sufism", "Islam", "Community Life"],
      mediaTypes: ["Video", "Photographs", "Documents"],
      keywords: ["Buh Kunta", "Qadiri", "Senegal", "Sufi"],
    },
  ),
  aodlCollection(
    "mara-cultural-heritage",
    "Mara Cultural Heritage Digital Library",
    "Cultural heritage materials from the Mara region including oral histories and community records.",
    {
      countries: ["Kenya", "Tanzania"],
      themes: ["Cultural Heritage", "Indigenous Knowledge", "East Africa"],
      mediaTypes: ["Audio", "Photographs", "Documents"],
      keywords: ["Mara", "cultural heritage", "Maasai"],
    },
  ),
  aodlCollection(
    "american-black-journal-africa",
    "American Black Journal: Africa and African-Americans",
    "Television archive segments connecting African-American public life with continental African topics.",
    {
      countries: ["United States", "Pan-Africa"],
      themes: ["Diaspora", "Media", "Pan-Africanism"],
      mediaTypes: ["Video", "Transcripts"],
      keywords: ["American Black Journal", "diaspora", "television"],
    },
  ),
  aodlCollection(
    "farmers-voices-ethiopia",
    "Farmers' Voices in Ethiopian Agriculture",
    "Farmer testimonies and field documentation on agricultural practice and rural life in Ethiopia.",
    {
      countries: ["Ethiopia"],
      themes: ["Agriculture", "Rural Life", "Food Systems"],
      mediaTypes: ["Video", "Interviews", "Documents"],
      keywords: ["Ethiopia", "farmers", "agriculture"],
    },
  ),
  aodlCollection(
    "pluralism-islam-senegal-ghana",
    "Pluralism and Adaptation in the Islamic Practice of Senegal and Ghana",
    "Comparative materials on Islamic adaptation, pluralism, and local practice in Senegal and Ghana.",
    {
      countries: ["Senegal", "Ghana"],
      themes: ["Islam", "Religious Pluralism", "Comparative Study"],
      mediaTypes: ["Video", "Documents", "Photographs"],
      keywords: ["Islam", "Senegal", "Ghana", "pluralism"],
    },
  ),
  aodlCollection(
    "northern-factors-asante-history",
    "Northern Factors in Asante History",
    "Historical sources on northern Ghanaian influences, trade, and politics in Asante history.",
    {
      countries: ["Ghana"],
      themes: ["Asante", "Regional History", "Trade"],
      mediaTypes: ["Documents", "Maps", "Photographs"],
      keywords: ["Asante", "northern Ghana", "history"],
    },
  ),
  aodlCollection(
    "exploring-africa",
    "Exploring Africa",
    "Curriculum-ready modules and primary sources for teaching African history, geography, and cultures.",
    {
      countries: ["Pan-Africa"],
      themes: ["Education", "Pedagogy", "Primary Sources"],
      mediaTypes: ["Documents", "Images", "Lesson Materials"],
      keywords: ["Exploring Africa", "curriculum", "teaching"],
    },
  ),
  aodlCollection(
    "south-african-film-video",
    "South African Film and Video Project",
    "Independent and community film and video from South Africa's apartheid and post-apartheid eras.",
    {
      countries: ["South Africa"],
      themes: ["Film", "Visual Culture", "Apartheid"],
      mediaTypes: ["Video", "Documents"],
      keywords: ["South African film", "video", "apartheid"],
    },
  ),
  aodlCollection(
    "everyday-islam-kumasi",
    "Everyday Islam in Kumasi",
    "Everyday religious practice, markets, and neighbourhood Islam in Kumasi, Ghana.",
    {
      countries: ["Ghana"],
      themes: ["Islam", "Kumasi", "Everyday Life"],
      mediaTypes: ["Video", "Photographs", "Interviews"],
      keywords: ["Kumasi", "everyday Islam", "Ghana"],
    },
  ),
  aodlCollection(
    "military-intelligence-apartheid",
    "Military Intelligence in Apartheid-Era South Africa",
    "Declassified and documentary materials on apartheid-era military intelligence and state security.",
    {
      countries: ["South Africa"],
      themes: ["Apartheid", "State Violence", "Military History"],
      mediaTypes: ["Documents", "Video"],
      keywords: ["apartheid", "military intelligence", "South Africa"],
    },
  ),
  aodlCollection(
    "muslim-scholars-colonial-ghana",
    "Discourses of Muslim Scholars in Colonial Ghana",
    "Writings, sermons, and biographical materials of Muslim scholars under colonial rule in Ghana.",
    {
      countries: ["Ghana"],
      themes: ["Islam", "Colonial History", "Scholarship"],
      mediaTypes: ["Manuscripts", "Documents", "Audio"],
      keywords: ["Muslim scholars", "colonial Ghana", "Islam"],
    },
  ),
  aodlCollection(
    "failed-islamic-states-senegambia",
    "Failed Islamic States in Senegambia",
    "Historical analysis and primary sources on Islamic state-building projects in Senegambia.",
    {
      countries: ["Senegal", "Gambia"],
      themes: ["Islam", "Political History", "Senegambia"],
      mediaTypes: ["Documents", "Maps", "Video"],
      keywords: ["Senegambia", "Islamic states", "history"],
    },
  ),
  aodlCollection(
    "women-traders-kumasi-market",
    "Life Stories of Women Traders From Kumasi Central Market",
    "Oral histories and portraits of women traders at Kumasi Central Market.",
    {
      countries: ["Ghana"],
      themes: ["Gender", "Economy", "Kumasi"],
      mediaTypes: ["Video", "Interviews", "Photographs"],
      keywords: ["women traders", "Kumasi", "market", "Ghana"],
    },
  ),
  aodlCollection(
    "african-media-program",
    "African Media Program",
    "Catalogue and contextual materials for African cinema, television, and media production.",
    {
      countries: ["Pan-Africa"],
      themes: ["Media", "Film", "Broadcasting"],
      mediaTypes: ["Video", "Catalogue Records", "Documents"],
      keywords: ["African media", "cinema", "television"],
    },
  ),
  aodlCollection(
    "ajami-senegambia",
    "Ajami in the Senegambia",
    "Manuscripts and literacy materials in Ajami script from Senegambia.",
    {
      countries: ["Senegal", "Gambia"],
      languages: ["Wolof", "Pulaar", "Arabic", "English"],
      themes: ["Ajami", "Manuscripts", "Islamic Literacy"],
      mediaTypes: ["Manuscripts", "Documents", "Images"],
      keywords: ["Ajami", "Senegambia", "manuscripts"],
    },
  ),
  aodlCollection(
    "qadiri-community-buh-kunta",
    "Qadiri Community of Buh Kunta",
    "Community records, ritual life, and leadership materials of the Buh Kunta Qadiri order.",
    {
      countries: ["Senegal"],
      themes: ["Sufism", "Qadiriyya", "Community Archives"],
      mediaTypes: ["Video", "Photographs", "Documents"],
      keywords: ["Qadiri", "Buh Kunta", "Senegal"],
    },
  ),
  aodlCollection(
    "banjul-muslims-islamic-court",
    "Banjul Muslims and the Islamic Court",
    "Legal, social, and religious records on Muslim communities and Islamic courts in Banjul.",
    {
      countries: ["Gambia"],
      themes: ["Islam", "Law", "Urban History"],
      mediaTypes: ["Documents", "Video", "Photographs"],
      keywords: ["Banjul", "Islamic court", "Gambia"],
    },
  ),
  aodlCollection(
    "sidiyya-baba-mauritania",
    "Collaboration, Modernity and Colonial Rule: Sidiyya Baba and Mauritania",
    "Materials on Sidiyya Baba, colonial collaboration, and modernity in Mauritania.",
    {
      countries: ["Mauritania"],
      themes: ["Colonial History", "Islam", "Mauritania"],
      mediaTypes: ["Documents", "Photographs", "Video"],
      keywords: ["Sidiyya Baba", "Mauritania", "colonial rule"],
    },
  ),
  aodlCollection(
    "islam-modernity-senegambia-ghana",
    "Islam and Modernity: Alternatives in Contemporary Senegambia & Ghana",
    "Contemporary Islamic responses to modernity across Senegambia and Ghana.",
    {
      countries: ["Senegal", "Gambia", "Ghana"],
      themes: ["Islam", "Modernity", "Contemporary Religion"],
      mediaTypes: ["Video", "Interviews", "Documents"],
      keywords: ["Islam", "modernity", "Senegambia", "Ghana"],
    },
  ),
  aodlCollection(
    "africa-past-present",
    "Africa Past and Present",
    "Podcast and interview archive on African history, politics, and culture for public audiences.",
    {
      countries: ["Pan-Africa"],
      themes: ["Public History", "Podcast", "Contemporary Africa"],
      mediaTypes: ["Audio", "Transcripts"],
      keywords: ["Africa Past and Present", "podcast", "interviews"],
      platform: "AODL / MSU",
    },
  ),
];

export function getAodlCollectionById(id: string): ExternalArchiveCollection | undefined {
  return AODL_COLLECTIONS.find((c) => c.id === id);
}

export function listAodlFilterOptions() {
  const countries = new Set<string>();
  const themes = new Set<string>();
  const mediaTypes = new Set<string>();
  const languages = new Set<string>();
  const platforms = new Set<string>();

  for (const c of AODL_COLLECTIONS) {
    c.countries.forEach((v) => countries.add(v));
    c.themes.forEach((v) => themes.add(v));
    c.mediaTypes.forEach((v) => mediaTypes.add(v));
    c.languages.forEach((v) => languages.add(v));
    platforms.add(c.platform);
  }

  const sort = (s: Set<string>) => [...s].sort((a, b) => a.localeCompare(b));

  return {
    countries: sort(countries),
    themes: sort(themes),
    mediaTypes: sort(mediaTypes),
    languages: sort(languages),
    platforms: sort(platforms),
  };
}
