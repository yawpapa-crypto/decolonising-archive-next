let coreTotalHits = 0;
let coreOffset = 10;
let coreLimit = 10;
let coreLoadingMore = false;
let mobileFiltersOpen = false;
const COLLECTIONS = [
  {id:"c001",title:"West African Oral Traditions",icon:"◎",count:847,region:"West Africa",desc:"Oral histories, praise poetry, and spoken knowledge systems — Ifa corpus, griots, and community testimony."},
  {id:"c002",title:"Decolonial Theory Canon",icon:"◈",count:1203,region:"Global",desc:"Foundational texts by Fanon, Cabral, Nkrumah, Wiredu, Gyekye, Mbembe, Santos, Escobar, and beyond."},
  {id:"c003",title:"African Material Culture",icon:"▣",count:3421,region:"Pan-Africa",desc:"Textiles, artefacts, ceramics, metals, and objects as knowledge carriers — including documentation of looted and repatriated works."},
  {id:"c004",title:"Liberation Movement Graphics",icon:"▤",count:912,region:"Southern Africa",desc:"Posters, pamphlets, and visual materials from African independence and liberation movements, 1950s–1990s."},
  {id:"c005",title:"Manuscripts & Precolonial Texts",icon:"▦",count:2100,region:"West / North Africa",desc:"Manuscripts in Arabic, Ajami, Ge'ez, and other writing systems documenting precolonial African scholarship."},
  {id:"c006",title:"Architecture Beyond Colonialism",icon:"▧",count:654,region:"Pan-Africa",desc:"Precolonial, vernacular, and Indigenous African architectural traditions from Great Zimbabwe to the Swahili coast."},
  {id:"c007",title:"African Philosophy Working Library",icon:"◬",count:0,region:"Africa / Global",desc:"Expanded local shelf of African philosophy, political thought, music, literature, religion, and adjacent working-library texts imported for static search."}
];

const THEMES = ["Decolonising Knowledges","Decolonial Theory","Visual Sovereignty","Cultural Memory","Archival Recovery","Indigenous Epistemologies","Oral Traditions","Liberation Movements","Precolonial Knowledge","Diaspora","Pan-Africanism","Reparative History","Material Culture","Design & Making","Language & Script","Repatriation","African Philosophy","Ubuntu","Sankofa","Black Consciousness","Political Thought","Religion & Cosmology","Gender Studies","Music & Performance"];

const SOURCES = [
  {id:"s001",name:"PRAAD",region:"Ghana / West Africa",type:"African-Priority",access:"linked",desc:"Public Records and Archives Administration Department. Colonial and postcolonial Ghanaian state records.",url:"https://praad.gov.gh"},
  {id:"s002",name:"sourceAFRICA",region:"Pan-Africa",type:"African-Priority",access:"linked",desc:"Open-source investigative documents from African newsrooms and civic archives.",url:"https://sourceafrica.net"},
  {id:"s003",name:"AODL — African Online Digital Library",region:"Pan-Africa",type:"African-Priority",access:"linked",desc:"Michigan State University aggregation of digitised African archives and collections.",url:"https://aodl.org"},
  {id:"s004",name:"Open Restitution Africa",region:"Pan-Africa",type:"African-Priority",access:"linked",desc:"Database of African cultural objects held in European and North American collections.",url:"https://openrestitution.africa"},
  {id:"s005",name:"SAHO — South African History Online",region:"Southern Africa",type:"African-Priority",access:"linked",desc:"South African history resource with images, oral testimonies, and documents.",url:"https://sahistory.org.za"},
  {id:"s006",name:"SAHA — South African History Archive",region:"Southern Africa",type:"African-Priority",access:"linked",desc:"Human rights and justice archive with apartheid-era records and community collections.",url:"https://saha.org.za"},
  {id:"s007",name:"SAHRIS — South African Heritage Resources",region:"Southern Africa",type:"African-Priority",access:"linked",desc:"National heritage resources information system with registered sites and archaeological records.",url:"https://sahris.sahra.org.za"},
  {id:"s008",name:"NARSSA",region:"Southern Africa",type:"African-Priority",access:"partner",desc:"National Archives and Records Service of South Africa. State records from colonial and apartheid eras.",url:"https://www.nationalarchives.gov.za"},
  {id:"s009",name:"Ahmed Baba Institute",region:"West Africa / Sahel",type:"African-Priority",access:"partner",desc:"Repository of the Timbuktu manuscripts and related Sahelian documentary traditions.",url:"https://www.ahmed-baba.ml"},
  {id:"s010",name:"WIReDSpace",region:"Southern Africa",type:"African-Priority",access:"linked",desc:"Wits institutional repository with African research and decolonial scholarship.",url:"https://wiredspace.wits.ac.za"},
  {id:"s011",name:"OpenUCT",region:"Southern Africa",type:"African-Priority",access:"linked",desc:"University of Cape Town open access repository for African studies and social research.",url:"https://open.uct.ac.za"},
  {id:"s012",name:"Ghana Digital Archives (ISSER)",region:"West Africa",type:"African-Priority",access:"partner",desc:"Historical surveys and social data from the Institute of Statistical, Social and Economic Research.",url:"https://www.isser.edu.gh"},
  {id:"s013",name:"KNUST Repository",region:"West Africa",type:"African-Priority",access:"linked",desc:"Kwame Nkrumah University of Science and Technology institutional repository.",url:"https://ir.knust.edu.gh"},
  {id:"s014",name:"Kenya National Archives",region:"East Africa",type:"African-Priority",access:"partner",desc:"State records including colonial-era documents, Mau Mau files, and early independence records.",url:"https://www.kenyaarchives.go.ke"},
  {id:"s015",name:"Endangered Archives Programme (EAP)",region:"Pan-Africa / Global South",type:"African-Priority",access:"linked",desc:"Digitised endangered archives from across Africa and the Global South.",url:"https://eap.bl.uk"},
  {id:"s016",name:"Digital Innovation South Africa (DISA)",region:"Southern Africa",type:"African-Priority",access:"linked",desc:"Digitised liberation-era South African newspapers, pamphlets, and movement papers.",url:"https://disa.ukzn.ac.za"},
  {id:"s017",name:"AfricArXiv",region:"Pan-Africa",type:"African-Priority",access:"linked",desc:"Preprint server for African research across sciences, humanities, and design.",url:"https://africaarxiv.org"},
  {id:"s018",name:"CODESRIA Publications",region:"Pan-Africa",type:"African-Priority",access:"linked",desc:"Open access monographs and journals from the Council for the Development of Social Science Research in Africa.",url:"https://www.codesria.org/publications"},
  {id:"s019",name:"Pan-African Music Archive (PAMA)",region:"Pan-Africa",type:"African-Priority",access:"partner",desc:"Oral tradition recordings, griot lineages, and field recordings from across the continent.",url:""},
  {id:"s020",name:"Internet Archive",region:"Global",type:"Search-Ready",access:"search",desc:"Extensive digitised African texts, periodicals, posters, and archival documents.",url:"https://archive.org",searchTemplate:"https://archive.org/search?query="},
  {id:"s021",name:"Open Library",region:"Global",type:"Search-Ready",access:"search",desc:"Book discovery interface with strong African and diaspora literature coverage.",url:"https://openlibrary.org",searchTemplate:"https://openlibrary.org/search?q="},
  {id:"s022",name:"V&A Collections",region:"Global",type:"Search-Ready",access:"search",desc:"Material culture, textiles, ceramics, and object records.",url:"https://collections.vam.ac.uk",searchTemplate:"https://collections.vam.ac.uk/search/?q="},
  {id:"s023",name:"The Metropolitan Museum of Art",region:"Global",type:"Search-Ready",access:"search",desc:"Open collection search including African art and global material culture.",url:"https://www.metmuseum.org/art/collection",searchTemplate:"https://www.metmuseum.org/art/collection/search?q="},
  {id:"s024",name:"Art Institute of Chicago",region:"Global",type:"Search-Ready",access:"search",desc:"Search-ready public collection including African and diaspora works.",url:"https://www.artic.edu/collection",searchTemplate:"https://www.artic.edu/search?q="},
  {id:"s025",name:"Wellcome Collection",region:"Global",type:"Search-Ready",access:"search",desc:"Health, science, and culture records, including African ethnographic photographs and archives.",url:"https://wellcomecollection.org",searchTemplate:"https://wellcomecollection.org/search/works?query="},
  {id:"s026",name:"Gallica — BnF",region:"Global",type:"Search-Ready",access:"search",desc:"French colonial-era Africa documentation, photographs, newspapers, and books.",url:"https://gallica.bnf.fr",searchTemplate:"https://gallica.bnf.fr/services/engine/search/sru?operation=searchRetrieve&query="},
  {id:"s027",name:"Library of Congress",region:"Global",type:"Search-Ready",access:"search",desc:"Photograph collections, maps, and diaspora research materials.",url:"https://www.loc.gov",searchTemplate:"https://www.loc.gov/search/?q="},
  {id:"s028",name:"Europeana",region:"Global / Europe",type:"Search-Ready",access:"search",desc:"Aggregated museum and library records from Europe with African holdings.",url:"https://www.europeana.eu",searchTemplate:"https://www.europeana.eu/en/search?query="},
  {id:"s029",name:"DPLA — Digital Public Library of America",region:"Americas",type:"Search-Ready",access:"search",desc:"African American collections, diaspora archives, and US-held African cultural materials.",url:"https://dp.la",searchTemplate:"https://dp.la/search?q="},
  {id:"s030",name:"Smithsonian — NMAFA",region:"Americas",type:"Search-Ready",access:"search",desc:"National Museum of African Art holdings and related Smithsonian collections.",url:"https://africa.si.edu",searchTemplate:"https://www.si.edu/search?edan_q="},
  {id:"s031",name:"British Museum Collection",region:"Global",type:"Search-Ready",access:"search",desc:"African object records including Benin, West African, and East African holdings.",url:"https://www.britishmuseum.org/collection",searchTemplate:"https://www.britishmuseum.org/collection/search?keyword="},
  {id:"s032",name:"Wikimedia Commons (Africa)",region:"Global",type:"Search-Ready",access:"search",desc:"Open image and media discovery pathway for African cultural content.",url:"https://commons.wikimedia.org",searchTemplate:"https://commons.wikimedia.org/w/index.php?search="},
  {id:"s033",name:"OpenAlex",region:"Global",type:"Search-Ready",access:"search",desc:"Open scholarly graph for African and decolonial academic literature.",url:"https://openalex.org",searchTemplate:"https://openalex.org/works?search="},
  {id:"s034",name:"BASE — Bielefeld Academic Search Engine",region:"Global",type:"Search-Ready",access:"search",desc:"Academic document discovery with strong repository coverage.",url:"https://www.base-search.net",searchTemplate:"https://www.base-search.net/Search/Results?lookfor="},
  {id:"s035",name:"DOAJ — Directory of Open Access Journals",region:"Global",type:"Search-Ready",access:"search",desc:"Open access journal discovery for African studies and decolonial theory.",url:"https://doaj.org",searchTemplate:"https://doaj.org/search/articles/"},
  {id:"s036",name:"JSTOR Global Plants",region:"Global",type:"Search-Ready",access:"search",desc:"Specimen records and ethnobotanical documentation from African plant knowledge traditions.",url:"https://plants.jstor.org",searchTemplate:"https://plants.jstor.org/?q="},
  {id:"s037",name:"Anansi API (Custom)",region:"Pan-Africa",type:"Search-Ready",access:"partner",desc:"Experimental aggregation layer for African digital archives.",url:""},
  {id:"s038",name:"CrossRef — African Publishers",region:"Global",type:"Search-Ready",access:"search",desc:"DOI and publisher metadata for African research outputs.",url:"https://search.crossref.org",searchTemplate:"https://search.crossref.org/?q="},
  {id:"s039",name:"Google Books",region:"Global",type:"Search-Ready",access:"search",desc:"Broad book discovery layer that is useful when a title exists in multiple editions or scans.",url:"https://books.google.com",searchTemplate:"https://books.google.com/books?q="},
  {id:"s040",name:"Google Scholar",region:"Global",type:"Search-Ready",access:"search",desc:"Scholarly discovery pathway for citations, articles, chapters, and book references.",url:"https://scholar.google.com",searchTemplate:"https://scholar.google.com/scholar?q="},
  {id:"s041",name:"JSTOR",region:"Global",type:"Search-Ready",access:"search",desc:"Search-ready scholarly archive for journals, books, and primary sources.",url:"https://www.jstor.org",searchTemplate:"https://www.jstor.org/action/doBasicSearch?Query="},
  {id:"s042",name:"HathiTrust",region:"Global",type:"Search-Ready",access:"search",desc:"Large-scale library discovery for scanned books and catalogue records.",url:"https://catalog.hathitrust.org",searchTemplate:"https://catalog.hathitrust.org/Search/Home?lookfor="},
  {id:"s043",name:"WorldCat",region:"Global",type:"Search-Ready",access:"search",desc:"Union catalogue useful for locating editions, holdings, and bibliographic variants.",url:"https://search.worldcat.org",searchTemplate:"https://search.worldcat.org/search?q="},
  {id:"s044",name:"Semantic Scholar",region:"Global",type:"Search-Ready",access:"search",desc:"Research discovery pathway for scholarly works and citation networks.",url:"https://www.semanticscholar.org",searchTemplate:"https://www.semanticscholar.org/search?q="},
  {id:"s045",name:"Project MUSE",region:"Global",type:"Search-Ready",access:"search",desc:"Books and journals in the humanities and social sciences, useful for African studies and philosophy.",url:"https://muse.jhu.edu",searchTemplate:"https://muse.jhu.edu/search?action=search&query="}
];

const BASE_RECORDS = [
  {id:"l001",title:"Kente Cloth and the Architecture of Akan Identity",type:"Textile",creator:"Asante Weavers, Bonwire",region:"West Africa",country:"Ghana",community:"Akan / Ashanti",period:"18th–21st c.",concepts:["visual sovereignty","cultural memory","indigenous epistemologies"],summary:"Kente is not merely decorative cloth. Each named pattern encodes cosmology, genealogy, and social ethics — a visual text within the Akan world.",tags:["kente","Ashanti","Ghana","textile","Akan"],rights:"Community Custodianship",provenance:"Bonwire, Ashanti Region, Ghana.",source:"Local Bank",cat:"Material Culture"},
  {id:"l002",title:"The Wretched of the Earth",type:"Book",creator:"Frantz Fanon",region:"North Africa / Diaspora",country:"Algeria / Martinique",community:"Algerian independence movement",period:"1961",concepts:["decolonisation","anti-colonial theory","liberation"],summary:"Fanon's foundational text on the psychology and politics of colonialism and decolonisation. Indispensable to decolonial thought.",tags:["Fanon","Algeria","decolonisation","political theory"],rights:"Rights Reserved",provenance:"Francois Maspero, Paris, 1961.",source:"Local Bank",cat:"Books & Texts"},
  {id:"l003",title:"Decolonising Design in Africa",type:"Book",creator:"Yaw Ofosu-Asare",region:"Africa / Global",country:"Ghana / Australia",community:"Design studies",period:"2024",concepts:["decolonial design","African design pedagogy","Sankofa methodology"],summary:"Maps the epistemological stakes of design education across the African continent through Sankofa methodology and decolonial critique.",tags:["design","Africa","decolonisation","pedagogy","Sankofa"],rights:"Rights Reserved",provenance:"Routledge, 2024.",source:"Local Bank",cat:"Books & Texts"},
  {id:"l004",title:"African Design Futures",type:"Book",creator:"Yaw Ofosu-Asare",region:"Africa / Global",country:"Ghana / Australia",community:"Design studies",period:"2024",concepts:["African design futures","decolonial pedagogy","spatial practice"],summary:"A programmatic framework for reimagining African design practice, pedagogy, and spatial production beyond colonial inheritance.",tags:["design","Africa","futures","pedagogy","spatial justice"],rights:"Rights Reserved",provenance:"Palgrave Macmillan, 2024.",source:"Local Bank",cat:"Books & Texts"},
  {id:"l005",title:"Yoruba Ifa Oral Corpus",type:"Oral History",creator:"Yoruba Babalawo tradition",region:"West Africa",country:"Nigeria / Benin / Cuba / Brazil",community:"Yoruba",period:"Pre-colonial — present",concepts:["indigenous epistemologies","oral knowledge systems","diasporic knowledge"],summary:"One of the world's most extensive oral knowledge archives — a comprehensive cosmological, philosophical, and ethical system transmitted through Babalawo lineages.",tags:["Yoruba","Nigeria","oral history","Ifa","indigenous knowledge"],rights:"Community Custodianship",provenance:"UNESCO Intangible Cultural Heritage.",source:"Local Bank",cat:"Oral Histories"},
  {id:"l006",title:"Benin Bronzes: A Documentation Record",type:"Artefact",creator:"Edo craftspeople, Benin City",region:"West Africa",country:"Nigeria",community:"Edo / Benin Kingdom",period:"13th–19th c.",concepts:["visual sovereignty","cultural memory","repatriation","archival recovery"],summary:"Among the most technically sophisticated metal artworks ever produced. Looted by British forces in 1897, thousands remain scattered across European and North American institutions.",tags:["Benin","Nigeria","bronze","repatriation","colonial plunder","Edo"],rights:"Community Custodianship — held externally",provenance:"Looted by British Punitive Expedition, 1897. British Museum (900+), Ethnologisches Museum Berlin, and others.",source:"Local Bank",cat:"Artefacts"},
  {id:"l007",title:"Great Zimbabwe: Architectural Documentation",type:"Architecture",creator:"Shona builders (Kingdom of Zimbabwe)",region:"Southern Africa",country:"Zimbabwe",community:"Shona",period:"11th–15th c.",concepts:["precolonial urbanism","indigenous epistemologies","architectural sovereignty"],summary:"The largest precolonial stone structure in sub-Saharan Africa. Colonial authorities suppressed its African origin. Its recovery as a symbol of African civilisation is central to Zimbabwean identity.",tags:["Zimbabwe","architecture","precolonial","Shona","urbanism"],rights:"UNESCO — open record",provenance:"Masvingo Province, Zimbabwe.",source:"Local Bank",cat:"Architecture"},
  {id:"l008",title:"Consciencism: Philosophy and Ideology for De-colonization",type:"Book",creator:"Kwame Nkrumah",region:"West Africa",country:"Ghana",community:"Pan-African political movement",period:"1964",concepts:["African socialism","pan-Africanism","philosophical decolonisation"],summary:"Nkrumah's philosophical framework synthesising African communalist tradition, Islam, and Euro-Christian inheritance into a foundation for African socialist politics.",tags:["Nkrumah","Ghana","pan-Africanism","philosophy","socialism"],rights:"Rights Reserved",provenance:"Heinemann, London, 1964.",source:"Local Bank",cat:"Books & Texts"},
  {id:"l009",title:"Mau Mau Testimonies: Oral Archive",type:"Oral History",creator:"Kenya Human Rights Commission / Kenya National Archives",region:"East Africa",country:"Kenya",community:"Gikuyu / Embu / Meru",period:"1952–1960",concepts:["archival recovery","reparative history","colonial violence"],summary:"Testimonies from survivors of British colonial detention camps during the Mau Mau uprising — accounts documentary records were designed to erase.",tags:["Kenya","Mau Mau","oral history","colonial violence","East Africa"],rights:"Archival — conditional access",provenance:"Kenya National Archives / KHRC oral testimony collections.",source:"Local Bank",cat:"Oral Histories"},
  {id:"l010",title:"Anti-Apartheid Movement Poster Archive",type:"Poster",creator:"ANC, PAC, UDF, COSATU",region:"Southern Africa",country:"South Africa",community:"Anti-apartheid movement",period:"1960–1990",concepts:["visual sovereignty","political graphics","cultural memory"],summary:"Political posters produced by South African liberation movements — a significant archive of decolonial visual culture produced under censorship.",tags:["South Africa","apartheid","posters","liberation","visual culture"],rights:"Mixed — movement organisations",provenance:"South African National Gallery, SOAS Digital Collections, and community archives.",source:"Local Bank",cat:"Visual Culture"},
  {id:"l011",title:"Timbuktu Manuscripts: West African Islamic Scholarship",type:"Archival Document",creator:"Various Malian and West African scholars",region:"West Africa / Sahel",country:"Mali",community:"Timbuktu scholars / Songhai / Tuareg",period:"13th–17th c.",concepts:["indigenous epistemologies","Islamic scholarship","archival recovery"],summary:"Approximately 400,000 manuscripts document West African mathematics, astronomy, medicine, jurisprudence, and philosophy — a counter-archive to colonial narratives of a pre-literate Africa.",tags:["Mali","Timbuktu","manuscripts","Islam","precolonial","scholarship"],rights:"Community Custodianship",provenance:"Ahmed Baba Institute, Timbuktu. Some digitised via Hamburg University.",source:"Local Bank",cat:"Archival Documents"},
  {id:"l012",title:"Ndebele Wall Painting: Visual Knowledge Traditions",type:"Image",creator:"Ndebele women artists, Mpumalanga",region:"Southern Africa",country:"South Africa",community:"Ndebele",period:"19th c. — present",concepts:["visual sovereignty","indigenous design","women's knowledge"],summary:"A visual language developed and transmitted by women. Geometric patterns encode social status, identity, and cosmological knowledge — intensified as cultural resistance during apartheid.",tags:["Ndebele","South Africa","wall painting","women","geometric","design"],rights:"Community Custodianship",provenance:"Mpumalanga Province, South Africa.",source:"Local Bank",cat:"Visual Culture"},
  {id:"l013",title:"Return to the Source: Selected Speeches of Amilcar Cabral",type:"Archival Document",creator:"Amilcar Cabral",region:"West Africa",country:"Guinea-Bissau / Cape Verde",community:"PAIGC / African liberation movements",period:"1966–1972",concepts:["anti-colonial theory","cultural identity","decolonial epistemology"],summary:"Cabral's speeches articulate culture as a force of liberation — culture as the foundation of political freedom and the site of decolonisation.",tags:["Cabral","Guinea-Bissau","liberation","culture","political theory"],rights:"Rights Reserved",provenance:"Monthly Review Press, New York, 1973.",source:"Local Bank",cat:"Archival Documents"},
  {id:"l014",title:"Ubuntu Philosophy: A Communal Ethics",type:"Philosophy & Theory",creator:"Various African philosophy scholars",region:"Southern / Eastern Africa",country:"South Africa / Zimbabwe / Tanzania",community:"Nguni / Bantu language communities",period:"Pre-colonial — present",concepts:["African philosophy","communalism","indigenous epistemologies"],summary:"Ubuntu — 'I am because we are' — frames communal personhood, ethical reciprocity, and shared humanity across much of sub-Saharan African social thought.",tags:["Ubuntu","philosophy","ethics","South Africa","communalism","African humanism"],rights:"Open — community knowledge",provenance:"Living tradition.",source:"Local Bank",cat:"Philosophy & Theory"},
  {id:"l015",title:"Lamu Old Town: Swahili Coast Architecture",type:"Architecture",creator:"Swahili master builders",region:"East Africa",country:"Kenya",community:"Swahili",period:"14th–19th c.",concepts:["precolonial urbanism","Indian Ocean networks","architectural sovereignty"],summary:"The oldest and best-preserved Swahili settlement in East Africa demonstrates an urban tradition shaped through Indian Ocean trade networks long before European colonialism.",tags:["Lamu","Kenya","Swahili","architecture","Indian Ocean","heritage"],rights:"UNESCO — open record",provenance:"Lamu County, Kenya. UNESCO World Heritage Site since 2001.",source:"Local Bank",cat:"Architecture"},
  {id:"l016",title:"Sankofa Methodology in Design Education",type:"Philosophy & Theory",creator:"Yaw Ofosu-Asare",region:"Africa / Global",country:"Ghana / Australia",community:"Design pedagogy",period:"2020–2024",concepts:["Sankofa","decolonial pedagogy","African futures","design education"],summary:"Sankofa — 'it is not wrong to go back for what you forgot' — is used here as a methodological framework for recovering precolonial knowledge architectures as generative design tools.",tags:["Sankofa","Ghana","pedagogy","design","decolonisation","methodology"],rights:"Author",provenance:"Melbourne, Australia.",source:"Local Bank",cat:"Philosophy & Theory"},
  {id:"l017",title:"Dialogues of Liberation: Fanon, Cabral, and Nkrumah",type:"Journal Article",creator:"Yaw Ofosu-Asare",region:"Africa / Global",country:"Ghana / Australia",community:"African studies / Design research",period:"2025",concepts:["liberation theory","decolonial epistemology","African philosophy"],summary:"Comparative reading of Fanon, Cabral, and Nkrumah as a unified philosophical project — tracing convergences in their theories of culture, consciousness, and political transformation.",tags:["Fanon","Cabral","Nkrumah","liberation","African philosophy","decolonisation"],rights:"Author",provenance:"African Identities, 2025.",source:"Local Bank",cat:"Books & Texts"},
  {id:"l018",title:"PRAAD: Public Records and Archives Administration",type:"Institutional Record",creator:"Government of Ghana",region:"West Africa",country:"Ghana",community:"Ghanaian public institutions",period:"Colonial era — present",concepts:["archival recovery","institutional memory","colonial documentation"],summary:"The national repository for Ghana's public records includes colonial administrative documents, treaties, maps, photographs, and land records from the Gold Coast era onward.",tags:["Ghana","archives","PRAAD","colonial records","West Africa"],rights:"Archival — institutional access",provenance:"Public Records and Archives Administration Department, Accra, Ghana.",source:"PRAAD",cat:"Archival Documents"},
  {id:"l019",title:"Adinkra Symbols: A Visual Philosophy of the Akan",type:"Visual Culture",creator:"Akan artisans, Ashanti Region",region:"West Africa",country:"Ghana",community:"Akan",period:"Pre-colonial — present",concepts:["indigenous epistemologies","visual sovereignty","African philosophy"],summary:"Adinkra symbols encode proverbs, philosophical concepts, and historical events in visual form — a system of pictographic communication used in textiles, pottery, metalwork, and architecture.",tags:["Adinkra","Ghana","Akan","philosophy","visual culture","symbols"],rights:"Community Custodianship",provenance:"Ntonso and surrounding communities, Ashanti Region, Ghana.",source:"Local Bank",cat:"Visual Culture"},
  {id:"l020",title:"Steve Biko: I Write What I Like",type:"Book",creator:"Steve Biko",region:"Southern Africa",country:"South Africa",community:"Black Consciousness Movement",period:"1978",concepts:["Black Consciousness","anti-apartheid","decolonial epistemology"],summary:"Collected writings of Steve Biko — the foundational text of Black Consciousness philosophy in South Africa, arguing for psychological decolonisation as the precondition for liberation.",tags:["Biko","South Africa","Black Consciousness","liberation","philosophy","anti-apartheid"],rights:"Rights Reserved",provenance:"Bowerdean Press, London, 1978.",source:"Local Bank",cat:"Books & Texts"}
];

const RECORD_ENRICHMENTS = {
  l001:{
    alternateTitle:"Named Kente patterns as social text",
    abstract:"Kente functions as a textile archive of Akan political memory and moral philosophy. Pattern names, colour systems, and weaving sequences communicate rank, kinship, diplomacy, grief, and public ethics.",
    description:[
      "This entry treats Kente as both material culture and epistemic infrastructure. Rather than approaching the cloth as surface ornament, it frames weaving practice as a structured archive in which pattern names, ceremonial use, and transmission lineages store historical and social knowledge.",
      "The record foregrounds cloth as a living medium: produced, interpreted, and renewed through use in festivals, funerals, courts, and rites of passage. The archive value lies not only in surviving textiles but also in the vocabularies and relationships that keep those meanings legible."
    ],
    institution:"Bonwire weaving communities",
    collection:"African Material Culture",
    language:["Twi","English"],
    material:"Silk and cotton textile",
    medium:"Handwoven strip cloth",
    themes:["Visual Sovereignty","Material Culture"],
    keywords:["pattern names","Asante court culture","weaving knowledge"],
    notes:["Some knowledge is ceremonial or lineage-specific and should not be detached from community context.","Community custodianship takes priority over extractive image capture or reproduction."],
    archiveIdentifier:"DA-TEXTILE-001",
    recordIdentifier:"AKAN-KENTE-001"
  },
  l002:{
    alternateTitle:"Les Damnes de la Terre",
    abstract:"A foundational anti-colonial text analysing colonial violence, political subject formation, and the difficult psychic work of national liberation.",
    description:[
      "This record centres Fanon's argument that colonialism reorganises both institutions and interior life. The book remains central because it does not treat decolonisation as administrative transfer alone: it reads liberation as a struggle over political imagination, violence, class formation, and the remaking of social relations.",
      "Within the archive, the text operates as a major theoretical hinge linking liberation movements in Africa to broader decolonial discourse across the Global South and diaspora. It is frequently cited alongside Nkrumah, Cabral, and Biko."
    ],
    institution:"Open Library discovery pathway",
    sourceUrl:"https://openlibrary.org/search?q=The%20Wretched%20of%20the%20Earth",
    sourceActionLabel:"Open discovery page",
    collection:"Decolonial Theory Canon",
    language:["French","English"],
    keywords:["colonial violence","national culture","liberation struggle"],
    externalLinks:[{label:"Open Library search",url:"https://openlibrary.org/search?q=The%20Wretched%20of%20the%20Earth"}],
    notes:["Different editions and translations vary in apparatus, forewords, and pagination."],
    archiveIdentifier:"DA-BOOK-002",
    recordIdentifier:"FANON-WE-1961"
  },
  l003:{
    abstract:"A contemporary study of decolonial design education across Africa, using Sankofa as both analytic lens and design method.",
    description:[
      "This record documents a recent intervention in design studies that repositions African knowledge systems as generative rather than supplementary. It addresses curriculum, institutional structures, and the persistence of colonial design canons within contemporary education.",
      "The text is useful as both research source and programmatic framework. It links historical critique to pedagogical practice, making it especially relevant for design schools, archive workers, and cultural institutions rethinking methodological foundations."
    ],
    institution:"Routledge",
    sourceUrl:"https://www.routledge.com",
    sourceActionLabel:"Visit publisher",
    collection:"Decolonial Theory Canon",
    language:["English"],
    keywords:["design education","African methodologies","curriculum reform"],
    notes:["Useful companion record for Sankofa-focused entries and related design pedagogy material."],
    archiveIdentifier:"DA-BOOK-003",
    recordIdentifier:"YOA-DDA-2024"
  },
  l004:{
    abstract:"A speculative and strategic framework for African design futures beyond inherited colonial planning models.",
    description:[
      "This record expands the archive from critique into proposition. It asks what design practice can become when grounded in African social thought, public space, and material histories rather than imported development templates.",
      "Its archive value lies in bringing futures discourse into conversation with decolonial method, spatial justice, and institutional change. The text is especially useful when paired with entries on Sankofa methodology and African philosophy."
    ],
    institution:"Palgrave Macmillan",
    sourceUrl:"https://link.springer.com",
    sourceActionLabel:"Visit publisher",
    collection:"Decolonial Theory Canon",
    language:["English"],
    keywords:["African futures","spatial justice","design strategy"],
    archiveIdentifier:"DA-BOOK-004",
    recordIdentifier:"YOA-ADF-2024"
  },
  l005:{
    alternateTitle:"Corpus of Ifa divination verses",
    abstract:"A distributed oral archive of Yoruba cosmology, ethics, memory, and interpretive practice carried across priestly lineages and diasporic routes.",
    description:[
      "The Ifa corpus is treated here as a sophisticated knowledge system rather than as folklore or isolated ritual fragment. Verses, praise poetry, and interpretive protocols form a durable archival structure, even when transmission occurs orally rather than through a fixed manuscript repository.",
      "Because the corpus moves through ceremony, apprenticeship, migration, and translation, this entry also foregrounds questions of access and custodianship. Not all knowledge is meant for unrestricted circulation, and the record therefore emphasises responsible contextualisation over extraction."
    ],
    institution:"Yoruba Babalawo lineages",
    collection:"West African Oral Traditions",
    language:["Yoruba","English"],
    themes:["Oral Traditions","Indigenous Epistemologies"],
    keywords:["divination","oriki","diaspora transmission"],
    notes:["Open summary metadata is appropriate; restricted ritual knowledge should remain within community protocols."],
    archiveIdentifier:"DA-ORAL-005",
    recordIdentifier:"IFA-CORPUS-001"
  },
  l006:{
    abstract:"A documentation record for Benin bronze plaques, heads, and court objects as dispersed evidence of Edo political and artistic sovereignty.",
    description:[
      "This record emphasises two linked histories: the sophistication of Benin court metallurgy and the archival violence of their dispersal after the 1897 British punitive expedition. It therefore functions as both art-historical entry and provenance dossier.",
      "Rather than collapsing the bronzes into museum objecthood alone, the page treats them as evidence of court memory, diplomatic representation, and technical knowledge. The archive value extends to restitution debates, collection trails, and institutional accountability."
    ],
    institution:"Open Restitution Africa",
    sourceUrl:"https://openrestitution.africa",
    sourceActionLabel:"Visit restitution database",
    collection:"African Material Culture",
    material:"Brass and bronze",
    medium:"Cast plaques, heads, and court objects",
    themes:["Repatriation","Material Culture"],
    keywords:["provenance research","museum restitution","court art"],
    externalLinks:[{label:"Open Restitution Africa",url:"https://openrestitution.africa"}],
    notes:["Location data changes as restitution agreements and transfers continue.","Institutional catalogues often describe holdings differently; provenance fields should be read comparatively."],
    archiveIdentifier:"DA-ARTEFACT-006",
    recordIdentifier:"BENIN-DOC-1897"
  },
  l007:{
    abstract:"Architectural record of a major precolonial urban complex whose African authorship was long denied under colonial scholarship.",
    description:[
      "This entry frames Great Zimbabwe as architectural evidence of African urbanism, engineering, and state formation. Its importance in the archive lies not only in the monument itself but also in the history of how colonial interpretation sought to displace African authorship.",
      "The record is therefore both site documentation and historiographic correction. It is relevant for architecture, heritage studies, nation-building, and the politics of archaeological interpretation."
    ],
    institution:"UNESCO World Heritage pathway",
    sourceUrl:"https://whc.unesco.org",
    sourceActionLabel:"Visit heritage source",
    collection:"Architecture Beyond Colonialism",
    material:"Dry-stone masonry",
    medium:"Architectural complex",
    keywords:["heritage politics","dry stone architecture","archaeological interpretation"],
    archiveIdentifier:"DA-ARCH-007",
    recordIdentifier:"GZIM-SITE-001"
  },
  l008:{
    abstract:"Nkrumah's attempt to articulate a postcolonial philosophical basis for African socialism and political reconstruction.",
    description:[
      "This record is important because it treats philosophy as statecraft. Nkrumah asks how inherited religious, cultural, and colonial formations can be metabolised rather than merely denied in the making of a decolonised political order.",
      "Within the archive it is a core reference for readers tracing the relationship between pan-Africanism, socialism, and philosophical decolonisation across the mid-twentieth century."
    ],
    institution:"Open Library discovery pathway",
    sourceUrl:"https://openlibrary.org/search?q=Consciencism",
    sourceActionLabel:"Open discovery page",
    collection:"Decolonial Theory Canon",
    language:["English"],
    keywords:["African socialism","postcolonial state","pan-African philosophy"],
    archiveIdentifier:"DA-BOOK-008",
    recordIdentifier:"NKR-CONSC-1964"
  },
  l009:{
    abstract:"Oral testimony record for survivors of the Mau Mau emergency, foregrounding memory against colonial detention archives.",
    description:[
      "This entry positions testimony as archival repair. Where colonial documents often classified, silenced, or distorted detainee experience, survivor accounts restore agency, specificity, and embodied memory to the record.",
      "The page is designed for research continuity: testimony, institutional custody, and rights restrictions are presented together so users can understand both the value and the conditions of access."
    ],
    institution:"Kenya National Archives / Kenya Human Rights Commission",
    sourceUrl:"https://www.kenyaarchives.go.ke",
    sourceActionLabel:"Visit source institution",
    collection:"West African Oral Traditions",
    contributors:["Survivors and families","Oral historians","Archive staff"],
    language:["English","Gikuyu","Swahili"],
    themes:["Reparative History","Oral Traditions"],
    keywords:["detention camps","survivor testimony","state violence"],
    notes:["Access conditions may vary depending on testimony sensitivity and institutional policy."],
    archiveIdentifier:"DA-ORAL-009",
    recordIdentifier:"MAUMAU-TEST-001"
  },
  l010:{
    abstract:"Visual archive of political posters produced within South Africa's anti-apartheid struggle, preserved as evidence of graphic resistance.",
    description:[
      "The record captures posters as both campaign media and public pedagogy. Typography, symbol systems, and reproduction methods were inseparable from movement organising under censorship and surveillance.",
      "In archive terms, the posters matter as distributed, fragile, and often community-held objects. Documentation of provenance, reprint history, and holding institutions remains essential to interpreting them responsibly."
    ],
    institution:"DISA / community archives",
    sourceUrl:"https://disa.ukzn.ac.za",
    sourceActionLabel:"Visit source institution",
    collection:"Liberation Movement Graphics",
    material:"Paper and screen-printed ephemera",
    medium:"Poster archive",
    themes:["Visual Sovereignty","Liberation Movements"],
    keywords:["graphic protest","movement media","print culture"],
    archiveIdentifier:"DA-POSTER-010",
    recordIdentifier:"AAP-POST-001"
  },
  l011:{
    abstract:"A major manuscript archive documenting West African scholarship in science, law, philosophy, medicine, and theology.",
    description:[
      "This record rejects the colonial fiction of an intellectually undocumented precolonial Africa by foregrounding a dense manuscript tradition rooted in Timbuktu and the wider Sahel. The manuscripts testify to scholarly production, circulation, and preservation across centuries.",
      "The archive entry also acknowledges vulnerability: conflict, climate, dispersal, and rescue efforts shape how these manuscripts are now described, digitised, and accessed."
    ],
    institution:"Ahmed Baba Institute",
    sourceUrl:"https://www.ahmed-baba.ml",
    sourceActionLabel:"Visit source institution",
    collection:"Manuscripts & Precolonial Texts",
    language:["Arabic","Ajami","French","English"],
    medium:"Manuscript archive",
    themes:["Precolonial Knowledge","Language & Script"],
    keywords:["Ajami","Islamic scholarship","Sahel archives"],
    notes:["Descriptions often represent collection-level rather than item-level detail.","Digitisation status varies across holding institutions and rescue projects."],
    archiveIdentifier:"DA-MANUSCRIPT-011",
    recordIdentifier:"TIMB-MSS-001"
  },
  l012:{
    abstract:"Record of Ndebele wall painting as women's visual knowledge practice, social sign system, and resistant design tradition.",
    description:[
      "This entry reads painted domestic surfaces as archive. Pattern systems communicate affiliation, ceremony, labour, and continuity, while also documenting the adaptive visual strategies developed under apartheid pressure.",
      "The record therefore bridges design, anthropology, gendered knowledge, and architecture. It is particularly valuable for users tracing the relationship between everyday making and political endurance."
    ],
    institution:"Community custodianship",
    collection:"African Material Culture",
    material:"Pigment on plastered domestic surfaces",
    medium:"Wall painting",
    themes:["Visual Sovereignty","Design & Making"],
    keywords:["women's knowledge","domestic surfaces","pattern language"],
    archiveIdentifier:"DA-IMAGE-012",
    recordIdentifier:"NDEBELE-WALL-001"
  },
  l013:{
    abstract:"A selected record of Cabral's speeches on culture, liberation, and the ethical demands of anti-colonial struggle.",
    description:[
      "Cabral's speeches occupy a central place in the archive because they insist that culture is neither decorative nor secondary to politics. Instead, culture becomes a practical terrain through which domination and liberation are both organised.",
      "This entry is especially useful alongside Fanon, Nkrumah, and Biko records, where different but overlapping accounts of liberation consciousness can be traced."
    ],
    institution:"Open Library discovery pathway",
    sourceUrl:"https://openlibrary.org/search?q=Return%20to%20the%20Source%20Amilcar%20Cabral",
    sourceActionLabel:"Open discovery page",
    collection:"Decolonial Theory Canon",
    language:["English"],
    keywords:["national culture","PAIGC","revolutionary theory"],
    archiveIdentifier:"DA-DOCUMENT-013",
    recordIdentifier:"CABRAL-RTTS-1973"
  },
  l014:{
    abstract:"A synthetic archive entry for Ubuntu as ethical and social philosophy across multiple African contexts.",
    description:[
      "Ubuntu is presented here as a conceptual archive rather than a single authored text. The record gathers a living vocabulary of relation, reciprocity, and personhood that circulates through oral tradition, philosophy, public discourse, and jurisprudence.",
      "Because Ubuntu is frequently flattened into slogan form, the entry keeps emphasis on its depth, plurality, and community-grounded interpretation."
    ],
    institution:"Living tradition / secondary scholarship",
    collection:"Decolonial Theory Canon",
    language:["Zulu","Xhosa","Shona","English"],
    themes:["African Philosophy","Communal Ethics"],
    keywords:["personhood","reciprocity","communal ethics"],
    notes:["Terminology and emphasis vary across language communities and scholarly traditions."],
    archiveIdentifier:"DA-THEORY-014",
    recordIdentifier:"UBUNTU-CONCEPT-001"
  },
  l015:{
    abstract:"Architectural and urban heritage record for Lamu Old Town as a Swahili coastal knowledge environment.",
    description:[
      "Lamu is documented here as more than preserved built fabric. The entry highlights the town as a living archive of Indian Ocean trade, Islamic learning, craft labour, and Swahili urban form.",
      "Its archive significance lies in the continuity of spatial practice: streets, courtyards, carved timber, coral rag construction, and domestic arrangements all speak to a historically deep urban tradition beyond colonial planning frames."
    ],
    institution:"UNESCO World Heritage pathway",
    sourceUrl:"https://whc.unesco.org",
    sourceActionLabel:"Visit heritage source",
    collection:"Architecture Beyond Colonialism",
    material:"Coral stone, mangrove timber, lime plaster",
    medium:"Urban architectural fabric",
    keywords:["Swahili coast","Indian Ocean trade","urban heritage"],
    archiveIdentifier:"DA-ARCH-015",
    recordIdentifier:"LAMU-OLDTOWN-001"
  },
  l016:{
    abstract:"A methodological record for Sankofa as a way of returning to historical knowledge in order to design forward differently.",
    description:[
      "This entry treats Sankofa not as a slogan but as a disciplined method for historical retrieval. It is especially relevant to archive work because it frames return, recovery, and critical reuse as creative acts rather than nostalgic ones.",
      "The record is intended to support curriculum design, archival interpretation, and practice-led research grounded in African philosophical resources."
    ],
    institution:"Independent archive research",
    sourceUrl:"https://www.rmit.edu.au",
    sourceActionLabel:"Visit institution",
    collection:"Decolonial Theory Canon",
    language:["English"],
    keywords:["historical retrieval","design method","pedagogy"],
    archiveIdentifier:"DA-THEORY-016",
    recordIdentifier:"SANKOFA-METHOD-001"
  },
  l017:{
    abstract:"A comparative reading that stages Fanon, Cabral, and Nkrumah as a shared liberation conversation rather than isolated traditions.",
    description:[
      "This journal record is useful because it draws different strands of anti-colonial philosophy into deliberate contact. Rather than reading these thinkers as separate national canons, it traces a common concern with culture, consciousness, and political transformation.",
      "The entry is especially valuable for teaching and research because it helps users move laterally across the archive, connecting theory records through argument rather than chronology alone."
    ],
    institution:"African Identities",
    sourceUrl:"https://www.tandfonline.com",
    sourceActionLabel:"Visit journal publisher",
    collection:"Decolonial Theory Canon",
    language:["English"],
    keywords:["comparative philosophy","liberation discourse","African intellectual history"],
    archiveIdentifier:"DA-ARTICLE-017",
    recordIdentifier:"YOA-DOL-2025"
  },
  l018:{
    abstract:"Institutional record for Ghana's central public archive, documenting its role in preserving both colonial and postcolonial state documentation.",
    description:[
      "This page is intentionally infrastructural. It describes PRAAD not as a single collection item but as a key archival institution through which legal, administrative, and territorial memory is organised in Ghana.",
      "Including institutional records allows users to move from individual documents to the custody systems that shape access, description, and provenance."
    ],
    institution:"Public Records and Archives Administration Department",
    institutionUrl:"https://praad.gov.gh",
    sourceUrl:"https://praad.gov.gh",
    sourceActionLabel:"Visit source institution",
    collection:"Manuscripts & Precolonial Texts",
    language:["English"],
    keywords:["state archives","Gold Coast records","public memory"],
    notes:["Collection access policies may differ between reading-room use, digitised material, and restricted records."],
    archiveIdentifier:"DA-INSTITUTION-018",
    recordIdentifier:"PRAAD-ACCRA-001"
  },
  l019:{
    abstract:"Akan visual symbol system encoding proverb, ethics, and historical memory through repeatable graphic marks.",
    description:[
      "Adinkra is treated here as a visual philosophy rather than decorative motif bank. Symbols operate as compact carriers of historical reference, moral instruction, and social relation across cloth, architecture, print, and everyday making.",
      "The record is particularly useful for users interested in how visual systems preserve knowledge across media and across generations."
    ],
    institution:"Akan artisan communities",
    collection:"African Material Culture",
    material:"Stamped cloth, pottery, architecture, metalwork",
    medium:"Symbol system",
    themes:["Visual Sovereignty","African Philosophy"],
    keywords:["proverb system","graphic language","Akan knowledge"],
    archiveIdentifier:"DA-VISUAL-019",
    recordIdentifier:"ADINKRA-SYMBOL-001"
  },
  l020:{
    abstract:"Collected writings of Steve Biko, central to Black Consciousness and to theories of psychological decolonisation in South Africa.",
    description:[
      "This record matters because Biko locates liberation in the remaking of self-perception, not only in formal political transition. The book remains a key point of entry into Black Consciousness thought and its wider resonance for decolonial praxis.",
      "It is frequently used alongside Fanon and anti-apartheid movement records, especially when tracing the relationship between writing, student organising, and collective political identity."
    ],
    institution:"Open Library discovery pathway",
    sourceUrl:"https://openlibrary.org/search?q=I%20Write%20What%20I%20Like",
    sourceActionLabel:"Open discovery page",
    collection:"Decolonial Theory Canon",
    language:["English"],
    keywords:["psychological liberation","South African thought","student politics"],
    archiveIdentifier:"DA-BOOK-020",
    recordIdentifier:"BIKO-IWWIL-1978"
  }
};

const WORKING_LIBRARY_FILES = [
  "A Companion to African Philosophy - Kwasi Wiredu.pdf",
  "A Companion to Modern African Art - Gitti Salami.pdf",
  "A Companion to Philosophy of Religion - Charles Taliaferro & Paul Draper & Philip L. Quinn.pdf",
  "A Dance of Masks_ Senghor, Achebe, Soyinka - Jonathan Peters.pdf",
  "A Dying Colonialism - Frantz Fanon.pdf",
  "A Kì Í_ Yorùbá Proscriptive and Prescriptive Proverbs - Oyekan Owomoyela.pdf",
  "A Political Economy of Africa - Claude Ake.pdf",
  "A Primal Perspective on the Philosophy of Religion - Arvind Sharma.pdf",
  "A Roadmap for Understanding African Politics - Victor Oguejiofor Okafor.pdf",
  "A Short History of African Philosophy - Barry Hallen.pdf",
  "A Short History of African Philosophy, Second Edition - Barry Hallen.pdf",
  "A Study of Xenophobia in South and Africa and Nigeria - Unknown.pdf",
  "A Theory of Political Integration - Claude Ake.pdf",
  "Achieving Our Humanity_ The Idea of the Postracial Future - Emmanuel Chukwudi Eze.pdf",
  "Africa and the Fourth Industrial Revolution_ Curse or Cure_ - Everisto Benyera.pdf",
  "Africa, Human Rights, and the Global System_ The Political Econg World - Eileen Mccarthy-Arnolds & David Penna & Joy Sobrepena.pdf",
  "African American Female Mysticism_ Nineteenth-Century Religious Activism - Joy R. Bostic.pdf",
  "African Anarchism - Sam Mbah & I. E. Igariwey.epub",
  "African Biblical Studies_ Unmasking Embedded Racism and Colonialism in Biblical Studies - Andrew M. Mbuvi.pdf",
  "African Cinema_ Postcolonial and Feminist Readings - Kenneth W. Harrow.pdf",
  "African Communication Systems and the Digital Age - Eno Ime Akpabio.epub",
  "African Cosmology of the Bântu-Kôngo_ Tying the Spiritual KnotPrinciples of Life & Living - Kimbwandende Kia Bunseki Fu-Kiau.pdf",
  "African Culture and Global Politics_ Language, Philosophies, anre in Africa and the Diaspora - Toyin Falola & Danielle Sanchez.pdf",
  "African Culture and the Christian Church_ An Introduction to Social and Pastoral Anthropology - Aylward Shorter.pdf",
  "African Diaspora_ A Musical Perspective - Ingrid Monson.pdf",
  "African Education and Identity_ Proceedings of the 5th Session ernational Congress of Africanists (5th_ 1985_ Ibadan, Nigeria).pdf",
  "African Epistemology_ Essays on Being and Knowledge - Peter Aloysius Ikhane.pdf",
  "African Ethics and Death_ Moral Status and Human Dignity in Ubuntu Thinking - Motsamai Molefe & Elphus Muade.pdf",
  "African Feminism_ The Politics of Survival in Sub-Saharan Africa - Gwendolyn Mikell.pdf",
  "African Gender Studies_ A Reader - Oyèrónké Oyěwùmí.pdf",
  "African Gods_ Contemporary Rituals and Beliefs - Daniel Laine.pdf",
  "African Identities_ Race, Nation and Culture in Ethnography, Pan-Africanism and Black Literatures - Kadiatu Kanneh.pdf",
  "African Intellectuals_ Rethinking Politics, Language, Gender and Development - Thandika Mkandawire.pdf",
  "African Literature as Political Philosophy - Mary Stella Chika Okolo.pdf",
  "African Literature, Animism and Politics - Caroline Rooney.pdf",
  "African Music - Francis Bebey.epub",
  "African Music_ A People_s Art - Francis Bebey.pdf",
  "African Musical Aesthetics - John Murungi.pdf",
  "African Pasts, Presents, and Futures_ Generational Shifts in Afen_s Literature, Film, and Internet Discourse - Touria Khannous.pdf",
  "African Perspectives on Colonialism - A. Adu Boahen.pdf",
  "African Philosophy Essential Read - Tsenay Serequeberhan.pdf",
  "African Philosophy and Thought Systems_ A Search for a Culture  Philosophy of Belonging - Munyaradzi Mawere & Tapuwa R. Mubaya.pdf",
  "African Philosophy and the Epistemic Marginalization of Women - Jonathan O. Chimakonam & Louise du Toit.pdf",
  "African Philosophy in Search of Identity - D. A. Masolo.pdf",
  "African Philosophy_ A Classical Approach - Parker English.pdf",
  "African Philosophy_ A Historico-Hermeneutical Investigation of the Conditions of Its Possibility - Theophilus Okere.pdf",
  "African Philosophy_ Emancipation and Practice - Pascah Mungwini.pdf",
  "African Philosophy_ Myth and Reality - Paulin J. Hountondji.pdf",
  "African philosophies - Séverine Kodjo-Grandvaux.epub",
  "African philosophy _ an anthology - Emmanuel Chukwudi Eze.pdf",
  "Copy_A Companion to African Philosophy - Kwasi Wiredu copy.pdf",
  "The Wretched Of The Earth (1).pdf"
];

const COUNTRY_TERRITORIES = [
  "Algeria","Angola","Benin","Botswana","Burkina Faso","Burundi","Cabo Verde","Cameroon","Central African Republic","Chad","Comoros","Democratic Republic of the Congo","Republic of the Congo","Cote d'Ivoire","Djibouti","Egypt","Equatorial Guinea","Eritrea","Eswatini","Ethiopia","Gabon","Gambia","Ghana","Guinea","Guinea-Bissau","Kenya","Lesotho","Liberia","Libya","Madagascar","Malawi","Mali","Mauritania","Mauritius","Morocco","Mozambique","Namibia","Niger","Nigeria","Rwanda","Sao Tome and Principe","Senegal","Seychelles","Sierra Leone","Somalia","South Africa","South Sudan","Sudan","Tanzania","Togo","Tunisia","Uganda","Zambia","Zimbabwe",
  "Martinique","Guadeloupe","Haiti","Jamaica","Trinidad and Tobago","Barbados","Cuba","Dominican Republic","Puerto Rico","Bahamas","Belize","Brazil","Colombia","Suriname","Guyana","French Guiana","Venezuela","Panama","United States","Canada","United Kingdom","France","Portugal","Spain","Netherlands","Belgium","Germany","Italy","Denmark","Sweden","Norway","Ireland","Curacao","Aruba","Reunion","Mayotte","Canary Islands","Madeira","Azores","Zanzibar","Gold Coast","Rhodesia","Sahel","Horn of Africa","Indian Ocean","Atlantic World"
];

const LANGUAGE_INDEX = [
  "Akan","Amazigh","Amharic","Arabic","Bambara","Bemba","Berber languages","Chewa","Creole","Dinka","Duala","Dutch","English","Ewe","Fang","Fante","Fon","French","Fulfulde","Ga","Ge'ez","German","Gikuyu","Haitian Creole","Hausa","Herero","Igbo","isiNdebele","isiXhosa","isiZulu","Italian","Kabyle","Kikongo","Kinyarwanda","Kirundi","Kiswahili","Lingala","Luo","Luganda","Malagasy","Mandarin","Mandinka","Mende","Mossi","Ndebele","Neapolitan Arabic","Nguni languages","Nigerian Pidgin","Oromo","Pidgin English","Portuguese","Pulaar","Sango","Sesotho","Setswana","Shona","Somali","Spanish","Swati","Tamasheq","Tigrinya","Tshivenda","Twi","Wolof","Xhosa","Yoruba","Zulu","Ajami","Arabic script traditions","Creole French","Multilingual metadata"
];

const FEATURED_THEME_TERMS = ["African Philosophy","Decolonial Theory","Visual Sovereignty","Archival Recovery","Pan-Africanism","Sankofa","Ubuntu","Restitution","Political Thought","Sonic Archives","Language Politics","Indigenous Futurisms","Ritual Aesthetics","Design Pedagogy","Precolonial Urbanism","Reparative History","Gender Studies","Museum Critique"];

const FEATURED_COLLECTION_TITLES = [
  "West African Oral Traditions",
  "Decolonial Theory Canon",
  "African Material Culture",
  "Liberation Movement Graphics",
  "Manuscripts & Precolonial Texts",
  "Architecture Beyond Colonialism",
  "African Philosophy Working Library",
  "West Africa: Political Thought"
];

const FEATURED_QUERY_SUGGESTIONS = [
  "African philosophy",
  "Kwasi Wiredu",
  "Paulin Hountondji",
  "Claude Ake",
  "African epistemology",
  "Ubuntu ethics",
  "Pan-Africanism",
  "Ritual aesthetics",
  "Political graphics",
  "Museum restitution",
  "Sonic archives",
  "Indigenous futurisms"
];

const EXPANDED_THEME_GROUPS = {
  archive_practice:["community archiving","metadata repair","provenance tracing","custodial ethics","finding aid recovery","record restitution","repair logics","annotation politics","declassification","archival silences","counter-archiving","memory infrastructures","cataloguing justice","record migration"],
  design_pedagogy:["design justice","speculative repair","community-led making","graphic sovereignty","vernacular interfaces","embodied pedagogy","knowledge co-production","critical making","design historiography","studio reform","curriculum transformation","poster pedagogy","public design histories","pedagogies of repair"],
  philosophy:["African metaphysics","African ethics","African aesthetics","African humanism","communal personhood","epistemic plurality","decolonial phenomenology","postcolonial reason","philosophical translation","conceptual decolonisation","ontology and relation","indigenous logic","liberation philosophy","ethics of relation"],
  politics:["independence movements","socialist imaginaries","anti-imperial solidarity","radical federalism","state violence","border regimes","popular sovereignty","revolutionary education","movement strategy","decolonial governance","constitutional memory","anti-authoritarian practice","public dissent","grassroots political education"],
  material:["beadwork","ceramics","metalwork","print cultures","poster histories","carved forms","domestic objects","dress and adornment","craft lineages","makers archives","sacred objects","everyday infrastructures","textile repertoires","material memory"],
  architecture:["sacred architecture","coastal urbanism","courtyard systems","earth construction","stone settlements","climate-responsive building","settlement memory","housing resistance","land and territory","water infrastructures","vernacular planning","sacred landscapes","dwelling systems","infrastructural repair"],
  gender_care:["queer archives","care infrastructures","reproductive justice","women's knowledge systems","kinship politics","disability and care","intimate publics","embodied resistance","intergenerational care","healing justice","domestic labour histories","matrilineal memory","care pedagogies","feminist knowledge practice"],
  language:["multilingual archives","translation justice","Ajami traditions","Arabic script","Ge'ez manuscripts","oral transcription","naming systems","lexical sovereignty","language revival","transliteration","code-switching metadata","colonial lexicons","language families","script politics"],
  spirituality:["divination systems","ancestral memory","liturgy and resistance","shrine archives","sacred sound","pilgrimage routes","healing traditions","church histories","Islamic scholarship","indigenous religion","ceremonial design","ritual performance","sacred geographies","cosmological knowledge"],
  ecology:["more-than-human knowledge","river archives","seed sovereignty","forest memory","environmental justice","ecological repair","pastoral knowledge","agrarian histories","extractive modernity","mineral frontiers","oceanic worlds","climate adaptation","land stewardship","watershed memory"],
  media:["radio histories","film cultures","photography","broadcasting publics","community media","cassette circulations","print networks","newspapers","documentary practice","visual essays","digital humanities","interface criticism","media archaeology","sound circulation"],
  diaspora:["black Atlantic","Indian Ocean worlds","Afro-Caribbean thought","Afro-Latin archives","migration memory","return imaginaries","maroon histories","diaspora publishing","abolitionist lineages","transnational solidarities","oceanic routes","exile archives","creole worlds","diaspora pedagogy"],
  education:["school archives","university reform","student movements","public scholarship","textbook critique","teacher training","knowledge commons","community classrooms","workshop cultures","apprenticeship","literacy politics","radical libraries","study circles","learning infrastructures"],
  restitution:["collection violence","looting records","return negotiations","museum metadata","exhibition politics","display ethics","ethnographic collections","object biographies","holding institutions","restitution law","deaccession practices","repatriation ethics","collection custody","museum accountability"],
  economy_labour:["labour histories","cooperative economies","platform cooperativism","market women networks","labour migration","industrialisation","economic sovereignty","debt and development","trade routes","informal infrastructures","union cultures","resource extraction","value chains","commons governance"],
  identity:["self-representation","portraiture","racial formation","national culture","memory politics","public monuments","iconography","cultural citizenship","representational justice","visual self-fashioning","identity repair","nation and narration","symbolic power","diasporic self-fashioning"],
  health_body:["public health archives","medical anthropology","disability histories","healing ecologies","body politics","epidemic memory","psychiatric archives","reproductive health","embodiment","biopolitics","care work","therapeutic knowledge","hospital records","anatomy and colonialism"],
  futures:["emancipatory infrastructures","speculative governance","repair futures","post-extractivist transition","future archives","technology critique","platform sovereignty","infrastructural imagination","worldmaking","postcolonial space","collective dreaming","decolonial futures","indigenous futurisms","future literacy"],
  black_studies:["black studies","black feminist thought","black internationalism","racial capitalism","diasporic solidarity","abolitionist futures","black publics","black political imagination","black radical tradition","black print culture","diasporic aesthetics","transatlantic critique","self-determination","liberation media"]
};

THEMES.push(...uniqueValues(Object.values(EXPANDED_THEME_GROUPS).flat()));

const COLLECTION_REGION_SETS = ["West Africa","East Africa","Central Africa","Southern Africa","North Africa","Sahel","Horn of Africa","Indian Ocean","Diaspora","Atlantic World","Caribbean","Global South"];
const COLLECTION_TRACKS = [
  {title:"Oral Traditions",icon:"◎",desc:"Oral testimony, praise poetry, performance memory, and spoken knowledge systems across {region}.",terms:["oral traditions","testimony","praise poetry","memory"]},
  {title:"Political Thought",icon:"◈",desc:"Political philosophy, liberation theory, state critique, and movement strategy connected to {region}.",terms:["political thought","liberation","philosophy","state critique"]},
  {title:"Material Culture",icon:"▣",desc:"Textiles, objects, craft lineages, and material archives associated with {region}.",terms:["material culture","craft","objects","textiles"]},
  {title:"Liberation Graphics",icon:"▤",desc:"Posters, newspapers, pamphlets, and graphic publics shaped through {region}.",terms:["posters","graphics","newspapers","pamphlets"]},
  {title:"Architecture & Settlement",icon:"▧",desc:"Architectural knowledge, settlement memory, and spatial practices rooted in {region}.",terms:["architecture","urbanism","settlement","spatial"]},
  {title:"Manuscripts & Textual Worlds",icon:"▦",desc:"Books, manuscripts, script traditions, and textual histories linked to {region}.",terms:["manuscripts","books","script","textual"]},
  {title:"Music & Sonic Archives",icon:"◉",desc:"Radio, music, listening practices, and sonic memory recorded across {region}.",terms:["music","sonic archives","radio","listening"]},
  {title:"Pedagogy & Institutions",icon:"◇",desc:"Schools, universities, study circles, and knowledge institutions in {region}.",terms:["education","institutions","pedagogy","libraries"]},
  {title:"Restitution & Museum Histories",icon:"▨",desc:"Museum holdings, provenance disputes, and restitution pathways tied to {region}.",terms:["restitution","museum critique","provenance","collections"]},
  {title:"Language, Translation & Script",icon:"◬",desc:"Language politics, multilingual metadata, and script traditions circulating through {region}.",terms:["language politics","translation","script","multilingual"]}
];

function buildExpandedCollections() {
  return COLLECTION_REGION_SETS.flatMap((region, regionIndex) =>
    COLLECTION_TRACKS.map((track, trackIndex) => ({
      id:`cx${String(regionIndex + 1).padStart(2,"0")}${String(trackIndex + 1).padStart(2,"0")}`,
      title:`${region}: ${track.title}`,
      icon:track.icon,
      count:0,
      region,
      desc:track.desc.replace("{region}", region),
      searchTerms:[region, track.title, ...(track.terms || [])],
      featured:false
    }))
  );
}

COLLECTIONS.push(...buildExpandedCollections());

const EXTRA_SEARCH_READY_SOURCES = [
  {id:"s046",name:"CORE",region:"Global",type:"Search-Ready",access:"search",desc:"Aggregator of open access research papers and repository content across the world.",url:"https://core.ac.uk",searchTemplate:"https://core.ac.uk/search?q="},
  {id:"s047",name:"OAPEN",region:"Global",type:"Search-Ready",access:"search",desc:"Open access books platform with strong humanities and social science coverage.",url:"https://www.oapen.org",searchTemplate:"https://www.oapen.org/search?identifier="},
  {id:"s048",name:"DOAB",region:"Global",type:"Search-Ready",access:"search",desc:"Directory of Open Access Books for monographs, edited volumes, and scholarly books.",url:"https://www.doabooks.org",searchTemplate:"https://www.doabooks.org/en/search?query="},
  {id:"s049",name:"OpenAIRE Explore",region:"Global",type:"Search-Ready",access:"search",desc:"Pan-European open research discovery layer connecting papers, datasets, and projects.",url:"https://explore.openaire.eu",searchTemplate:"https://explore.openaire.eu/search/find?keyword="},
  {id:"s050",name:"Zenodo",region:"Global",type:"Search-Ready",access:"search",desc:"Open repository for papers, datasets, images, and cultural documentation.",url:"https://zenodo.org",searchTemplate:"https://zenodo.org/search?page=1&size=20&q="},
  {id:"s051",name:"arXiv",region:"Global",type:"Search-Ready",access:"search",desc:"Preprint repository useful for adjacent technical, media, and computational scholarship.",url:"https://arxiv.org",searchTemplate:"https://arxiv.org/search/?query="},
  {id:"s052",name:"SSRN",region:"Global",type:"Search-Ready",access:"search",desc:"Scholarly working papers and social science research discovery layer.",url:"https://www.ssrn.com",searchTemplate:"https://papers.ssrn.com/sol3/results.cfm?RequestTimeout=50000000&txtKey_Words="},
  {id:"s053",name:"PhilPapers",region:"Global",type:"Search-Ready",access:"search",desc:"Major philosophy index useful for African philosophy and related debates.",url:"https://philpapers.org",searchTemplate:"https://philpapers.org/s/"},
  {id:"s054",name:"PhilArchive",region:"Global",type:"Search-Ready",access:"search",desc:"Open archive for philosophy papers including decolonial and African thought.",url:"https://philarchive.org",searchTemplate:"https://philarchive.org/search?new=1&sqc=&q="},
  {id:"s055",name:"Trove",region:"Australia / Global",type:"Search-Ready",access:"search",desc:"Books, newspapers, images, and archives discovery platform with strong diaspora holdings.",url:"https://trove.nla.gov.au",searchTemplate:"https://trove.nla.gov.au/search?keyword="},
  {id:"s056",name:"Biodiversity Heritage Library",region:"Global",type:"Search-Ready",access:"search",desc:"Historical books and illustrations relevant to botanical and ecological knowledge systems.",url:"https://www.biodiversitylibrary.org",searchTemplate:"https://www.biodiversitylibrary.org/search?searchTerm="},
  {id:"s057",name:"Getty Research Portal",region:"Global",type:"Search-Ready",access:"search",desc:"Digitised art history books and visual culture publications.",url:"https://portal.getty.edu",searchTemplate:"https://portal.getty.edu/search?q="},
  {id:"s058",name:"UNESCO Digital Library",region:"Global",type:"Search-Ready",access:"search",desc:"Institutional reports, heritage documents, and policy materials.",url:"https://unesdoc.unesco.org",searchTemplate:"https://unesdoc.unesco.org/search/"},
  {id:"s059",name:"OpenEdition",region:"Global",type:"Search-Ready",access:"search",desc:"Books and journals in the humanities and social sciences, including African studies.",url:"https://www.openedition.org",searchTemplate:"https://search.openedition.org/?q="},
  {id:"s060",name:"HAL",region:"Global / Francophone",type:"Search-Ready",access:"search",desc:"Open archive for scholarly documents with strong Francophone coverage.",url:"https://hal.science",searchTemplate:"https://hal.science/search/index/?q="},
  {id:"s061",name:"ERIC",region:"Global",type:"Search-Ready",access:"search",desc:"Education research database useful for pedagogy and curriculum histories.",url:"https://eric.ed.gov",searchTemplate:"https://eric.ed.gov/?q="},
  {id:"s062",name:"UK National Archives Discovery",region:"United Kingdom / Global",type:"Search-Ready",access:"search",desc:"Colonial, diplomatic, and administrative records discovery platform.",url:"https://discovery.nationalarchives.gov.uk",searchTemplate:"https://discovery.nationalarchives.gov.uk/results/r?_q="},
  {id:"s063",name:"Calisphere",region:"Americas",type:"Search-Ready",access:"search",desc:"California-focused digital collections with diaspora and visual culture relevance.",url:"https://calisphere.org",searchTemplate:"https://calisphere.org/search/?q="},
  {id:"s064",name:"DigitalNZ",region:"Aotearoa / Pacific",type:"Search-Ready",access:"search",desc:"Digital collections aggregator with Indigenous and comparative colonial holdings.",url:"https://digitalnz.org",searchTemplate:"https://digitalnz.org/records?text="},
  {id:"s065",name:"Figshare",region:"Global",type:"Search-Ready",access:"search",desc:"Open repository for datasets, images, and supplementary research material.",url:"https://figshare.com",searchTemplate:"https://figshare.com/search?search="}
,

  {id:"s090",name:"British Museum Collection Online",region:"Global / Africa",type:"Search-Ready",access:"search",desc:"Searchable collection records including African objects, diaspora materials, and restitution-relevant holdings.",url:"https://www.britishmuseum.org/collection",searchTemplate:"https://www.britishmuseum.org/collection/search?keyword="},
  {id:"s091",name:"Unilever Archives",region:"Global / Africa",type:"Search-Ready",access:"search",desc:"Corporate archive with records, photographs, publicity, and historical documentation including African collections and UAC materials.",url:"https://archives-unilever.com",searchTemplate:"https://archives-unilever.com/discover/search?q="},
  {id:"s092",name:"United Africa Company Archive Pathway",region:"West Africa / Global",type:"Search-Ready",access:"search",desc:"Query-based pathway into United Africa Company and related records held in Unilever Archives and partner catalogues.",url:"https://archives-unilever.com/discover/resources/uac-united-africa-company/page/1/view_as/grid",searchTemplate:"https://archives-unilever.com/discover/search?q="},
  {id:"s093",name:"UK National Archives Discovery — UAC",region:"West Africa / UK",type:"Search-Ready",access:"search",desc:"Discovery pathway for United Africa Company records and related colonial commercial documentation.",url:"https://discovery.nationalarchives.gov.uk",searchTemplate:"https://discovery.nationalarchives.gov.uk/results/r?_q="}

,

  {id:"s094",name:"British Library",region:"Global / Africa / Asia",type:"Search-Ready",access:"search",theme:"Decolonising Knowledges",desc:"Searchable library holdings, manuscripts, maps, newspapers, sound, and archives with major colonial and African collections.",url:"https://www.bl.uk",searchTemplate:"https://explore.bl.uk/primo_library/libweb/action/search.do?fn=search&ct=search&vl(freeText0)="},
  {id:"s095",name:"Trove",region:"Australia / Global",type:"Search-Ready",access:"search",theme:"Decolonising Knowledges",desc:"National Library of Australia discovery platform for books, images, newspapers, archives, and digitised records.",url:"https://trove.nla.gov.au",searchTemplate:"https://trove.nla.gov.au/search?keyword="},
  {id:"s096",name:"Smithsonian Open Access / Collections Search",region:"Global / Africa / Diaspora",type:"Search-Ready",access:"search",theme:"Decolonising Knowledges",desc:"Searchable Smithsonian collections including art, history, science, photographs, and objects.",url:"https://www.si.edu",searchTemplate:"https://www.si.edu/search?edan_q="},
  {id:"s097",name:"Google Books",region:"Global",type:"Search-Ready",access:"search",theme:"Decolonising Knowledges",desc:"Searchable global book metadata and previews where available.",url:"https://books.google.com",searchTemplate:"https://books.google.com/books?q="},
  {id:"s098",name:"WorldCat",region:"Global",type:"Search-Ready",access:"search",theme:"Decolonising Knowledges",desc:"Global library union catalogue for books, theses, audiovisual works, and archival materials.",url:"https://search.worldcat.org",searchTemplate:"https://search.worldcat.org/search?q="},
  {id:"s099",name:"National Library of South Africa",region:"Southern Africa",type:"African-Priority",access:"search",theme:"Decolonising Knowledges",desc:"National documentary heritage, books, manuscripts, and special collections of South Africa.",url:"https://www.nlsa.ac.za",searchTemplate:"https://www.nlsa.ac.za/search/node/"},
  {id:"s100",name:"University of Fort Hare / ANC Archives",region:"Southern Africa",type:"African-Priority",access:"search",theme:"Decolonising Knowledges",desc:"Liberation struggle records and ANC-related archival holdings.",url:"https://www.ufh.ac.za",searchTemplate:"https://www.ufh.ac.za/search/node/"},
  {id:"s101",name:"National Archives of Nigeria Pathway",region:"West Africa",type:"African-Priority",access:"search",theme:"Decolonising Knowledges",desc:"Search pathway for Nigerian national archival records and related documentary holdings.",url:"https://nationalarchives.gov.ng",searchTemplate:"https://www.google.com/search?q=site%3Anationalarchives.gov.ng+"},
  {id:"s102",name:"National Archives of Zimbabwe Pathway",region:"Southern Africa",type:"African-Priority",access:"search",theme:"Decolonising Knowledges",desc:"Search pathway for Zimbabwean archival and documentary heritage records.",url:"https://www.archives.gov.zw",searchTemplate:"https://www.google.com/search?q=site%3Aarchives.gov.zw+"},
  {id:"s103",name:"Uganda National Archives Pathway",region:"East Africa",type:"African-Priority",access:"search",theme:"Decolonising Knowledges",desc:"Search pathway into Ugandan archival and documentary collections.",url:"https://www.nationalarchives.go.ug",searchTemplate:"https://www.google.com/search?q=site%3Anationalarchives.go.ug+"},
  {id:"s104",name:"Bodleian / Rhodes House African Studies Pathway",region:"Africa / UK",type:"Search-Ready",access:"search",theme:"Decolonising Knowledges",desc:"African studies archives, manuscripts, photographs, and colonial records held in Oxford collections.",url:"https://www.bodleian.ox.ac.uk",searchTemplate:"https://solo.bodleian.ox.ac.uk/discovery/search?query=any,contains,"}

];

const INTERNAL_ARCHITECTURE_PATHWAYS = [
  ["Local archive index","Static-hosted core search index for records bundled directly with the archive."],
  ["Internal enriched records","Record layer with expanded summaries, provenance, citations, and related-record linking."],
  ["Working-library filename import","Local shelf import used to widen book and philosophy discovery in a static environment."],
  ["Static metadata normalisation layer","Normalises heterogeneous fields into a consistent record model."],
  ["Rights and provenance enrichment","Adds rights, custodianship, and provenance context where available."],
  ["Related search expansion engine","Generates adjacent discovery routes from knowledge areas, places, languages, and source pathways."],
  ["Variant spelling resolver","Supports alternate spellings, transliteration differences, and naming variations."],
  ["Multilingual alias layer","Maps language, community, and regional variants into shared discovery pathways."],
  ["Collection pathway builder","Constructs editorial browse routes from regional, thematic, and format taxonomies."],
  ["Knowledge area registry","Maintains the expanded intellectual taxonomy that drives discovery and browse."],
  ["Historical geography mapper","Links current countries, territories, and historical geographies in search logic."],
  ["Language family registry","Supports language-aware discovery across multilingual metadata and script traditions."],
  ["Institution lookup cache","Stores source institution descriptors for outbound routing and context."],
  ["Citation enrichment layer","Builds portable citation text for local and imported records."],
  ["Related-record graph","Connects records by knowledge area, tag, concept, region, and collection."],
  ["Media fallback layer","Ensures missing images or media do not break the detail layout."],
  ["Static search index builder","Bundles search-friendly metadata directly into the shipped HTML."],
  ["Zero-result recovery layer","Uses related searches and source handoffs to recover from dead-end queries."],
  ["Source handoff router","Sends users to external institutions without blocking the local archive flow."],
  ["Manual curation pathway","Editorial intake route for hand-built records and curated summaries."],
  ["Archive quality review","Internal pathway for checking metadata consistency, duplication, and gaps."],
  ["Record link resolver","Coordinates internal record detail links and outbound source links."],
  ["Query expansion dictionary","Expands core archive terms into nearby intellectual and regional vocabularies."],
  ["Collection coverage estimator","Derives collection scale from record, theme, and source overlap."],
  ["Taxonomy maintenance pathway","Keeps knowledge areas, collections, countries, and languages aligned as the archive grows."]
].map((item, index) => ({
  id:`si${String(index + 1).padStart(3,"0")}`,
  name:item[0],
  region:"Internal architecture",
  type:"Internal Architecture",
  access:"internal",
  desc:item[1],
  url:""
}));

const PARTNER_SOURCE_PATHWAYS = [
  ["Community submission intake","Pathway for community-contributed metadata, contextual notes, and archival references."],
  ["Oral history deposit route","Partner route for testimony projects, interview collections, and listening archives."],
  ["Museum restitution dossier intake","Pathway for provenance files, restitution notes, and collection correspondence."],
  ["Archive classroom submissions","Route for teaching collections, student research clusters, and learning archives."],
  ["Regional repository partnership","Partner pathway for institution-to-institution metadata exchange."],
  ["Rights-limited reference layer","Stores references to sources that can be cited but not openly redistributed."],
  ["Private catalogue crosswalk","Partner route for matching local records with closed institutional catalogues."],
  ["Community review channel","Review path for custodial feedback on names, contexts, and restrictions."],
  ["Image reference registry","Partner pathway for image-led records where copies cannot be hosted locally."],
  ["Manuscript rescue network","Route for endangered manuscript documentation and custody tracing."],
  ["Broadcast archive partnership","Partner layer for radio, cassette, and television history material."],
  ["Liberation movement archive route","Connection path for movement documents held by NGOs and community archives."],
  ["Heritage inventory exchange","Partner route for site records, monument files, and heritage registers."],
  ["Diaspora memory network","Pathway linking diaspora archives, family history collections, and community projects."],
  ["Scholarly bibliography intake","Route for curated reference lists and citation clusters."],
  ["Exhibition dossier pathway","Partner route for exhibition histories, labels, and curatorial files."],
  ["Repatriation case tracker","Structured pathway for active repatriation and return case references."],
  ["Fieldwork notebook route","Partner path for notebooks, catalogues, and research documentation."],
  ["Institutional handoff queue","Route for deferred matching to external catalogues and repositories."],
  ["Regional translation pathway","Partner process for translating titles, tags, and summaries across languages."]
].map((item, index) => ({
  id:`sp${String(index + 1).padStart(3,"0")}`,
  name:item[0],
  region:"Partner and community pathways",
  type:"Partner & Community",
  access:"partner",
  desc:item[1],
  url:""
}));

SOURCES.push(...EXTRA_SEARCH_READY_SOURCES, ...INTERNAL_ARCHITECTURE_PATHWAYS, ...PARTNER_SOURCE_PATHWAYS);

const DISCOVERY_SOURCE_IDS = ["s021","s039","s043","s041","s040","s044","s045","s053","s054","s046","s047","s048","s049","s050","s059","s060","s061","s062","s020","s033","s035","s034","s042","s029","s030","s032","s027","s028","s038","s055","s057"];

let currentPage = "home";
let selectedRecordId = null;
let citationStyle = "apa";
let libraryQuery = "";
let localResults = [];
let metadataFilters = {};
let quickFilters = {
  openAccess:false,
  verified:false,
  hideSensitive:false,
  metadataOnly:false,
  needsReview:false
};
let sourceMode = true;
let externalDiscovery = [];
let debounceTimer = null;
let searchSuggestions = [];
let activeSuggestionIndex = -1;
let recentSearches = [];
let recordWorkspaceState = {};
let cardListComposerState = {};
let cardWorkbenchComposerState = {};
let cardDrawerOpenState = {};

function dispatchMemberNavUpdate(detail) {
  try {
    window.dispatchEvent(new CustomEvent("member-nav:update", { detail }));
  } catch (error) {
    console.warn("Could not update member nav counts", error);
  }
}

let memberWorkspaceState = {status:"idle", authenticated:null, data:null, message:""};
let locationSearchHydrated = false;

const SOURCE_MAP = new Map(SOURCES.map(source => [source.name, source]));

const METADATA_VOCABULARY = {
  recordType:["Architecture / Built Work","Archival Document","Artefact","Book","Book Chapter","Exhibition Record","Image","Institutional Record","Journal Article","Manuscript","Oral History","Performance / Sonic Record","Poster","Reference Volume","Teaching Resource","Textile","Website / Digital Resource","Dataset / Metadata Record"],
  knowledgeAreas:["African Philosophy","Architecture and Space","Craft and Making","Decolonial Theory","Design History","Education and Pedagogy","Environmental Knowledge","Epistemology","Food Systems","Gender and Feminist Thought","Governance and Civic Life","Indigenous Knowledge Systems","Informal Economies","Language and Writing Systems","Material Culture","Music and Performance","Oral Tradition","Political Thought","Spiritual Practice","Textile Knowledge","Visual Culture"],
  region:["Africa-wide / Pan-African","North Africa","West Africa","Central Africa","East Africa","Southern Africa","Sahel","African Diaspora","Global / Comparative"],
  language:["English","French","Arabic","Portuguese","Yoruba","Hausa","Swahili","Akan / Twi","Amharic","Other African Language","Multiple Languages","Unknown"],
  script:["Latin","Arabic","Ajami","Ge'ez","Nsibidi","Tifinagh","N'Ko","Vai","Other","Unknown"],
  period:["Precolonial","Colonial","Independence Era","Postcolonial","Contemporary","Unknown / Undated"],
  curatedCollections:["African Philosophy Working Library","Decolonial Theory Canon","African Material Culture","Architecture Beyond Colonialism","Manuscripts & Precolonial Texts","West African Oral Traditions","Liberation Movement Graphics"],
  rightsStatus:["Public Domain","Creative Commons","Open Access","In Copyright","Permission Granted","Metadata Only","Link Only","Rights Unknown","Restricted / Sensitive","Review Required","Check source"],
  licence:["CC0","CC BY","CC BY 4.0","CC BY-SA","CC BY-NC","CC BY-NC-SA","CC BY-ND","CC BY-NC-ND","Public Domain Mark","RightsStatements.org URI","All Rights Reserved","Check source","Unknown","Custom / Other"],
  accessType:["Full Text Available","Download Available","Read Online","Image Available","Thumbnail Only","External Link Only","Metadata Only","Restricted Access","Requires Permission","Community Review Required","Check Source"],
  reusePermission:["Reuse Allowed with Attribution","Non-Commercial Reuse Only","Educational Use Only","No Reuse Without Permission","Check Original Source","Unknown"],
  culturalSensitivity:["Public","Context Required","Sensitive","Community Review Needed","Restricted","Do Not Display Media","Takedown / Review Requested"],
  communityReviewStatus:["Not Required","Not Reviewed","Review Requested","Community Reviewed","Restricted by Community","Do Not Publish"],
  verificationStatus:["Verified","Source Checked","Rights Checked","External Source","Metadata Reviewed","AI-Assisted, Needs Review","Community Submitted","Unverified","Provisional","Needs Correction","Duplicate Suspected","Takedown Requested"],
  sourceType:["Museum / Gallery","Library Catalogue","Archive","Journal Database","University Repository","Book Publisher","Community Submission","Government Source","NGO / Cultural Organisation","Researcher Submitted","Web Resource","AI-Assisted Discovery"]
};

const METADATA_FILTER_GROUPS = [
  {key:"sourceOrigin", label:"Source Origin", options:["Archive","External Source"]},
  {key:"recordType", label:"Record Type", options:METADATA_VOCABULARY.recordType},
  {key:"knowledgeAreas", label:"Knowledge Area", options:METADATA_VOCABULARY.knowledgeAreas},
  {key:"region", label:"Region", options:METADATA_VOCABULARY.region},
  {key:"country", label:"Country", dynamic:true},
  {key:"communityOrCulturalGroup", label:"Community / Cultural Group", dynamic:true},
  {key:"language", label:"Language", options:METADATA_VOCABULARY.language},
  {key:"script", label:"Script / Writing System", options:METADATA_VOCABULARY.script},
  {key:"period", label:"Date / Period", options:METADATA_VOCABULARY.period},
  {key:"curatedCollections", label:"Curated Collection", options:METADATA_VOCABULARY.curatedCollections},
  {key:"rightsStatus", label:"Rights Status", options:METADATA_VOCABULARY.rightsStatus},
  {key:"licence", label:"Licence", options:METADATA_VOCABULARY.licence},
  {key:"accessType", label:"Access Type", options:METADATA_VOCABULARY.accessType},
  {key:"reusePermission", label:"Reuse Permission", options:METADATA_VOCABULARY.reusePermission},
  {key:"culturalSensitivity", label:"Cultural Sensitivity", options:METADATA_VOCABULARY.culturalSensitivity},
  {key:"communityReviewStatus", label:"Community Review Status", options:METADATA_VOCABULARY.communityReviewStatus},
  {key:"verificationStatus", label:"Verification Status", options:METADATA_VOCABULARY.verificationStatus},
  {key:"sourceType", label:"Source Type", options:METADATA_VOCABULARY.sourceType}
];

const RIGHTS_RISK_STATUSES = new Set(["Rights Unknown","In Copyright","Restricted / Sensitive","Review Required","Check source","Check Source"]);
const CULTURAL_MEDIA_BLOCKERS = new Set(["Restricted","Do Not Display Media","Community Review Needed","Takedown / Review Requested"]);

function slugMetadataTerm(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/['’]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
}

function canonicalMetadataTerm(value) {
  const raw = String(value || "").trim();
  const key = raw.toLowerCase();
  const map = {
    "african philosophy":"African Philosophy",
    "african philosophy working library":"African Philosophy Working Library",
    "political thought":"Political Thought",
    "music & performance":"Music and Performance",
    "music and performance":"Music and Performance",
    "oral traditions":"Oral Tradition",
    "oral history":"Oral History",
    "indigenous epistemologies":"Indigenous Knowledge Systems",
    "language & script":"Language and Writing Systems",
    "design & making":"Craft and Making",
    "visual sovereignty":"Visual Culture",
    "visual culture":"Visual Culture",
    "material culture":"Material Culture",
    "decolonisation":"Decolonial Theory",
    "decolonial theory":"Decolonial Theory",
    "philosophy & theory":"African Philosophy",
    "history & theory":"Decolonial Theory",
    "architecture":"Architecture / Built Work",
    "books & texts":"Book",
    "twi":"Akan / Twi",
    "akan/twi":"Akan / Twi",
    "rights reserved":"In Copyright",
    "author":"In Copyright",
    "open — community knowledge":"Open Access",
    "unesco — open record":"Open Access",
    "community custodianship":"Restricted / Sensitive",
    "community custodianship — held externally":"Restricted / Sensitive",
    "archival — conditional access":"Requires Permission"
  };
  return map[key] || raw;
}

function metadataList(value) {
  if (Array.isArray(value)) return value.map(item => String(item || "").trim()).filter(Boolean);
  const single = String(value || "").trim();
  if (!single) return [];
  return single.split(/\s*(?:,|;|\s\/\s)\s*/).map(item => item.trim()).filter(Boolean);
}

function uniqueMetadataValues(values) {
  const seen = new Set();
  const output = [];
  metadataList(values).forEach(value => {
    const canonical = canonicalMetadataTerm(value);
    const key = slugMetadataTerm(canonical);
    if (seen.has(key)) return;
    seen.add(key);
    output.push(canonical);
  });
  return output;
}

function normalizeRegionValues(values) {
  const raw = metadataList(values);
  const output = [];
  raw.forEach(value => {
    const lower = value.toLowerCase();
    if (lower.includes("west")) output.push("West Africa");
    if (lower.includes("north")) output.push("North Africa");
    if (lower.includes("east")) output.push("East Africa");
    if (lower.includes("southern") || lower.includes("south africa")) output.push("Southern Africa");
    if (lower.includes("central")) output.push("Central Africa");
    if (lower.includes("sahel")) output.push("Sahel");
    if (lower.includes("diaspora")) output.push("African Diaspora");
    if (lower.includes("global") || lower.includes("comparative")) output.push("Global / Comparative");
    if (lower.includes("pan-africa") || lower.includes("pan africa") || lower.includes("africa / global")) output.push("Africa-wide / Pan-African");
  });
  return uniqueMetadataValues(output.length ? output : raw);
}

function normalizePeriodValues(values) {
  const raw = metadataList(values);
  const output = [];
  raw.forEach(value => {
    const lower = String(value).toLowerCase();
    if (lower.includes("pre") || /1[0-7]\d{2}|[1-9]th/.test(lower)) output.push("Precolonial");
    if (lower.includes("colonial") || /18\d{2}|19[0-4]\d/.test(lower)) output.push("Colonial");
    if (lower.includes("independence") || /195\d|196\d|197\d/.test(lower)) output.push("Independence Era");
    if (lower.includes("postcolonial") || /198\d|199\d/.test(lower)) output.push("Postcolonial");
    if (lower.includes("contemporary") || /20\d{2}|202\d|present/.test(lower)) output.push("Contemporary");
    if (lower.includes("unknown") || lower.includes("undated")) output.push("Unknown / Undated");
  });
  return uniqueMetadataValues(output.length ? output : raw).filter(value => METADATA_VOCABULARY.period.includes(value));
}

function normalizeLanguageScript(record) {
  const scripts = metadataList(record.script);
  const languages = [];
  metadataList(record.language).forEach(value => {
    if (String(value).toLowerCase() === "ajami") scripts.push("Ajami");
    else languages.push(value);
  });
  return {
    language: uniqueMetadataValues(languages.length ? languages : ["Unknown"]),
    script: uniqueMetadataValues(scripts)
  };
}

function canDisplayMedia(record) {
  return !RIGHTS_RISK_STATUSES.has(record.rightsStatus) && !CULTURAL_MEDIA_BLOCKERS.has(record.culturalSensitivity);
}

function sourceOriginValue(recordOrMode) {
  const mode = typeof recordOrMode === "string" ? recordOrMode : getResultMode(recordOrMode);
  return mode === "local" || mode === "hybrid" ? "Archive" : "External Source";
}

function sourceOriginLabel(recordOrMode) {
  return sourceOriginValue(recordOrMode).toUpperCase();
}

function firstText(...values) {
  for (const value of values) {
    if (Array.isArray(value)) {
      const hit = value.map(item => firstText(item)).find(Boolean);
      if (hit) return hit;
      continue;
    }
    if (value && typeof value === "object") {
      const hit = firstText(value.url, value.URL, value.href, value.value, value.name, value.label, value.license, value.licence);
      if (hit) return hit;
      continue;
    }
    const text = String(value || "").trim();
    if (text) return text;
  }
  return "";
}

function truthySourceFlag(value) {
  if (value === true) return true;
  if (typeof value === "number") return value > 0;
  return /^(true|yes|open|oa|1)$/i.test(String(value || "").trim());
}

function collectRightsText(record) {
  const ext = record.extmetadata || record.externalMetadata || {};
  return [
    record.licence,
    record.license,
    record.licenceUrl,
    record.licence_url,
    record.licenseUrl,
    record.license_url,
    record.rights,
    record.rightsStatus,
    record.rightsStatement,
    record.rights_statement,
    record.rightsUri,
    record.rights_uri,
    record.copyright,
    record.oaStatus,
    record.oa_status,
    record.openAccess?.license,
    record.openAccess?.licenseUrl,
    record.openAccess?.oa_status,
    record.openAccess?.is_oa,
    record.open_access?.license,
    record.open_access?.license_url,
    record.open_access?.oa_status,
    record.open_access?.is_oa,
    record.primary_location?.license,
    record.primary_location?.license_url,
    record.best_oa_location?.license,
    record.best_oa_location?.license_url,
    ext.LicenseShortName?.value,
    ext.License?.value,
    ext.UsageTerms?.value,
    ext.Copyrighted?.value,
    ext.Restrictions?.value
  ].map(value => firstText(value)).filter(Boolean).join(" ");
}

function normalizeExternalLicence(record) {
  const text = collectRightsText(record).toLowerCase();
  if (!text) return "";
  if (/creativecommons\.org\/publicdomain\/zero|creativecommons\.org\/publicdomain\/zero\/1\.0|cc0\b/.test(text)) return "CC0";
  if (/creativecommons\.org\/publicdomain\/mark|public domain mark/.test(text)) return "Public Domain Mark";
  if (/creativecommons\.org\/licenses\/by-nc-nd|cc[- ]?by[- ]?nc[- ]?nd/.test(text)) return "CC BY-NC-ND";
  if (/creativecommons\.org\/licenses\/by-nc-sa|cc[- ]?by[- ]?nc[- ]?sa/.test(text)) return "CC BY-NC-SA";
  if (/creativecommons\.org\/licenses\/by-sa|cc[- ]?by[- ]?sa/.test(text)) return "CC BY-SA";
  if (/creativecommons\.org\/licenses\/by-nc|cc[- ]?by[- ]?nc/.test(text)) return "CC BY-NC";
  if (/creativecommons\.org\/licenses\/by-nd|cc[- ]?by[- ]?nd/.test(text)) return "CC BY-ND";
  if (/creativecommons\.org\/licenses\/by\/4\.0|cc[- ]?by[- ]?4\.0/.test(text)) return "CC BY 4.0";
  if (/creativecommons\.org\/licenses\/by|cc[- ]?by\b|creative commons attribution/.test(text)) return "CC BY";
  if (/rightsstatements\.org/.test(text)) return "RightsStatements.org URI";
  if (/all rights reserved/.test(text)) return "All Rights Reserved";
  if (/custom|other|publisher licence|publisher license/.test(text)) return "Custom / Other";
  return "";
}

function externalUrlBundle(record) {
  const sourceUrl = safeUrl(record.sourceUrl || record.source_url || record.sourceURL || record.url || record.URL || "");
  const pdfUrl = safeUrl(record.pdfUrl || record.pdf_url || record.downloadUrl || record.download_url || "");
  const fullTextUrl = safeUrl(record.fullTextUrl || record.full_text_url || record.fulltextUrl || firstText(record.fullTextUrls, record.source_fulltext_urls) || "");
  const htmlUrl = safeUrl(record.htmlUrl || record.html_url || record.landingPageUrl || record.landing_page_url || "");
  return {sourceUrl, pdfUrl, fullTextUrl, htmlUrl};
}

function normalizeExternalRightsMetadata(record) {
  const collectedRightsText = collectRightsText(record);
  const rightsText = /^(external source rights apply|check original source before reuse\.?)$/i.test(collectedRightsText.trim()) ? "" : collectedRightsText;
  const rightsLower = rightsText.toLowerCase();
  const licence = normalizeExternalLicence(record);
  const urls = externalUrlBundle(record);
  const hasRightsMetadata = Boolean(rightsText || licence);
  const openAccessFlag = truthySourceFlag(record.is_oa) ||
    truthySourceFlag(record.openAccess?.is_oa) ||
    truthySourceFlag(record.open_access?.is_oa) ||
    /(^|\W)(open access|gold|green|bronze|hybrid|oa)(\W|$)/i.test(firstText(record.oaStatus, record.oa_status, record.openAccess?.oa_status, record.open_access?.oa_status));
  const publicDomainFlag = truthySourceFlag(record.public_domain) ||
    truthySourceFlag(record.publicDomain) ||
    /public domain/.test(rightsLower);

  let rightsStatus = "Check source";
  if (licence.startsWith("CC ")) rightsStatus = "Creative Commons";
  else if (licence === "CC0" || licence === "Public Domain Mark" || publicDomainFlag) rightsStatus = "Public Domain";
  else if (/rightsstatements\.org\/(?:vocab|page)\/inc|\/inc\//.test(rightsLower) || /in copyright|copyrighted|all rights reserved/.test(rightsLower)) rightsStatus = "In Copyright";
  else if (openAccessFlag) rightsStatus = "Open Access";
  else if (canonicalMetadataTerm(record.rightsStatus) && !["Unknown","Rights Unknown"].includes(canonicalMetadataTerm(record.rightsStatus))) rightsStatus = canonicalMetadataTerm(record.rightsStatus);

  let accessType = "Metadata Only";
  const rawAccess = firstText(record.accessType, record.access_type);
  if (rawAccess && !/^unknown$/i.test(rawAccess)) accessType = canonicalMetadataTerm(rawAccess);
  else if (urls.pdfUrl) accessType = "Download Available";
  else if (urls.fullTextUrl) accessType = "Full Text Available";
  else if (urls.htmlUrl) accessType = "Read Online";
  else if (urls.sourceUrl) accessType = "External Link Only";

  let verificationStatus = "Unverified";
  if (licence === "CC0" || licence === "Public Domain Mark" || licence.startsWith("CC ")) verificationStatus = "Rights Checked";
  else if (hasRightsMetadata || openAccessFlag || publicDomainFlag) verificationStatus = "Source Checked";

  const displayLicence = licence || (rightsStatus === "Open Access" ? "Check source" : "");
  return {
    rightsStatus,
    licence: displayLicence,
    accessType,
    verificationStatus,
    sourceUrl: urls.sourceUrl || urls.htmlUrl || urls.fullTextUrl || urls.pdfUrl || "",
    pdfUrl: urls.pdfUrl,
    fullTextUrl: urls.fullTextUrl,
    htmlUrl: urls.htmlUrl,
    hasConfirmedReuseRights: rightsStatus === "Creative Commons" || rightsStatus === "Public Domain" || (rightsStatus === "Open Access" && Boolean(licence))
  };
}

function inferSourceType(value) {
  const text = String(value || "").toLowerCase();
  if (text.includes("museum") || text.includes("gallery")) return "Museum / Gallery";
  if (text.includes("library") || text.includes("worldcat") || text.includes("open library")) return "Library Catalogue";
  if (text.includes("archive") || text.includes("praad")) return "Archive";
  if (text.includes("journal") || text.includes("jstor") || text.includes("doaj")) return "Journal Database";
  if (text.includes("university") || text.includes("repository")) return "University Repository";
  if (text.includes("routledge") || text.includes("publisher") || text.includes("press")) return "Book Publisher";
  if (text.includes("community")) return "Community Submission";
  if (text.includes("government")) return "Government Source";
  if (text.includes("ngo") || text.includes("cultural")) return "NGO / Cultural Organisation";
  return "Web Resource";
}

function rightsWarning(record) {
  if (RIGHTS_RISK_STATUSES.has(record.rightsStatus)) return "Rights are unclear or restricted. Metadata and source links are shown instead of hosted full media.";
  if (CULTURAL_MEDIA_BLOCKERS.has(record.culturalSensitivity)) return "Cultural protocol restricts media display. Use the source link or review channel for context.";
  if (record.accessType === "Thumbnail Only") return "Thumbnail-only access. Do not reuse media without checking the original source.";
  return "";
}

function currentArchiveReturnPath() {
  return `${window.location.pathname}${window.location.search || ""}`;
}

function memberSignInUrl() {
  return `/auth/sign-in?next=${encodeURIComponent(currentArchiveReturnPath())}`;
}

function redirectToMemberSignIn() {
  window.location.href = memberSignInUrl();
}

async function fetchMemberWorkspaceState(force = false) {
  if (!force && (memberWorkspaceState.status === "loading" || memberWorkspaceState.status === "ready")) return;
  const previousMessage = memberWorkspaceState.message || "";
  memberWorkspaceState = {...memberWorkspaceState, status:"loading", message:""};
  try {
    const response = await fetch("/api/workspace/record-tools?mode=session", {
      headers: {Accept:"application/json"}
    });
    const data = await response.json();
    if (!data.ok) throw new Error(data.error || "Could not load member tools.");
    memberWorkspaceState = {
      status:"ready",
      authenticated:Boolean(data.authenticated),
      data,
      message:previousMessage
    };
  } catch (error) {
    memberWorkspaceState = {
      status:"error",
      authenticated:false,
      data:null,
      message:error.message || "Member tools failed to load."
    };
  }
  render();
}

function getRecordWorkspaceState(recordId) {
  return recordWorkspaceState[recordId] || {status:"idle", authenticated:null, data:null, message:""};
}

function setRecordWorkspaceState(recordId, patch) {
  recordWorkspaceState[recordId] = {...getRecordWorkspaceState(recordId), ...patch};
}

function getCardListComposerOpen(recordId) {
  return Boolean(cardListComposerState[recordId]);
}

function setCardListComposerOpen(recordId, isOpen) {
  cardListComposerState[recordId] = Boolean(isOpen);
}

function getCardWorkbenchComposerOpen(recordId) {
  return Boolean(cardWorkbenchComposerState[recordId]);
}

function setCardWorkbenchComposerOpen(recordId, isOpen) {
  cardWorkbenchComposerState[recordId] = Boolean(isOpen);
}

function getCardDrawerOpen(recordId) {
  return Boolean(cardDrawerOpenState[recordId]);
}

function setCardDrawerOpen(recordId, isOpen) {
  cardDrawerOpenState[recordId] = Boolean(isOpen);
}

async function fetchRecordWorkspaceState(record) {
  if (!record || !record.id) return;
  const state = getRecordWorkspaceState(record.id);
  if (state.status === "loading" || state.status === "ready") return;
  setRecordWorkspaceState(record.id, {status:"loading", message:""});
  try {
    const params = new URLSearchParams({
      recordId: record.id,
      recordUrl: record.sourceUrl || record.id
    });
    const response = await fetch(`/api/workspace/record-tools?${params.toString()}`, {
      headers: {Accept:"application/json"}
    });
    const data = await response.json();
    if (!data.ok) throw new Error(data.error || "Could not load workspace tools.");
    setRecordWorkspaceState(record.id, {
      status:"ready",
      authenticated: Boolean(data.authenticated),
      data,
      message:""
    });
  } catch (error) {
    setRecordWorkspaceState(record.id, {
      status:"error",
      authenticated:false,
      message:error.message || "Workspace tools failed to load."
    });
  }
  if (currentPage === "record" && selectedRecordId === record.id) render();
}

function buildWorkspaceRecordSnapshot(record) {
  if (!record || typeof record !== "object") return {};
  const sourceUrl = record.sourceUrl || record.source_url || record.url || record.href || "";
  const metadata = record.metadata && typeof record.metadata === "object" ? record.metadata : {};

  return {
    id: record.id,
    title: record.title || record.name || record.display_title || record.displayTitle || "",
    name: record.name || "",
    author: record.author || record.creator || record.contributor || "",
    creator: record.creator || "",
    contributor: record.contributor || "",
    source: record.source || record.source_name || record.publisher || record.archive || "",
    source_name: record.source_name || record.sourceName || "",
    publisher: record.publisher || "",
    archive: record.archive || "",
    collection: record.collection || "",
    type: record.type || record.record_type || record.kind || "",
    record_type: record.record_type || "",
    year: record.year || record.date || record.published_at || record.period || "",
    date: record.date || record.published_at || record.period || "",
    url: sourceUrl,
    source_url: sourceUrl,
    sourceUrl,
    recordUrl: sourceUrl,
    href: sourceUrl,
    metadata: {
      title: metadata.title || record.title || record.name || "",
      author: metadata.author || record.author || record.creator || "",
      creator: metadata.creator || record.creator || "",
      contributor: metadata.contributor || record.contributor || "",
      source: metadata.source || record.source || record.source_name || "",
      publisher: metadata.publisher || record.publisher || "",
      year: metadata.year || record.year || "",
      date: metadata.date || record.date || record.published_at || "",
      url: metadata.url || sourceUrl
    }
  };
}

async function postRecordWorkspaceAction(record, payload) {
  if (!record || !record.id) return;
  memberWorkspaceState = {
    ...memberWorkspaceState,
    status:"saving",
    message:""
  };
  setRecordWorkspaceState(record.id, {
    ...getRecordWorkspaceState(record.id),
    status:"saving",
    message:""
  });
  render();
  let shouldRefreshRecordState = true;
  let shouldRefreshMemberState = true;
  try {
    const response = await fetch("/api/workspace/record-tools", {
      method:"POST",
      headers: {"Content-Type":"application/json", Accept:"application/json"},
      body: JSON.stringify({
        recordId: record.id,
        recordTitle: record.title,
        recordUrl: record.sourceUrl || record.id,
        record: buildWorkspaceRecordSnapshot(record),
        ...payload
      })
    });
    const data = await response.json();
    if (response.status === 401) {
      // Defensive reset before navigation so the UI cannot remain frozen
      // if the redirect is delayed or blocked.
      memberWorkspaceState = {
        ...memberWorkspaceState,
        status:"ready",
        authenticated:false,
        message:""
      };
      setRecordWorkspaceState(record.id, {
        ...getRecordWorkspaceState(record.id),
        status:"ready",
        authenticated:false,
        message:""
      });
      render();
      redirectToMemberSignIn();
      return;
    }
    if (!response.ok || !data.ok) throw new Error(data.error || "Action failed.");
    const isBookmarkToggle = payload.action === "bookmark" && typeof data.bookmarked === "boolean";
    if (isBookmarkToggle) {
      dispatchMemberNavUpdate({ bookmarksDelta: data.bookmarked ? 1 : -1 });
      const existingData = memberWorkspaceState.data || {};
      const bookmarkRecordIds = Array.isArray(existingData.bookmarkRecordIds)
        ? existingData.bookmarkRecordIds
        : [];
      const nextBookmarkRecordIds = data.bookmarked
        ? Array.from(new Set([...bookmarkRecordIds, record.id]))
        : bookmarkRecordIds.filter(id => id !== record.id);
      memberWorkspaceState = {
        ...memberWorkspaceState,
        authenticated:true,
        data:{
          ...existingData,
          bookmarkRecordIds:nextBookmarkRecordIds
        },
        message:""
      };
      const existingRecordState = getRecordWorkspaceState(record.id);
      const existingRecordData = existingRecordState.data || {};
      setRecordWorkspaceState(record.id, {
        ...existingRecordState,
        authenticated:true,
        data:{
          ...existingRecordData,
          bookmark:data.bookmarked
            ? {...(existingRecordData.bookmark || {}), note: payload.note || null}
            : null
        },
        message:""
      });
      shouldRefreshRecordState = false;
      shouldRefreshMemberState = false;
    } else {
      memberWorkspaceState = {
        ...memberWorkspaceState,
        authenticated:true,
        message:""
      };
      setRecordWorkspaceState(record.id, {
        status:"idle",
        authenticated:true,
        data:null,
        message:""
      });
      if (payload.action === "create_reading_list") {
        setCardListComposerOpen(record.id, false);
      }
      if (payload.action === "workbench_add_record" || payload.action === "workbench_create_project") {
        setCardWorkbenchComposerOpen(record.id, false);
      }
    }
    if (shouldRefreshRecordState) await fetchRecordWorkspaceState(record);
    if (shouldRefreshMemberState) await fetchMemberWorkspaceState(true);
  } catch (error) {
    console.error("Record workspace action failed:", error);
    memberWorkspaceState = {
      ...memberWorkspaceState,
      message:error.message || "Action failed."
    };
    setRecordWorkspaceState(record.id, {
      ...getRecordWorkspaceState(record.id),
      message:error.message || "Action failed."
    });
  } finally {
    memberWorkspaceState = {
      ...memberWorkspaceState,
      status:"ready"
    };
    setRecordWorkspaceState(record.id, {
      ...getRecordWorkspaceState(record.id),
      status:"ready"
    });
    render();
  }
}

function getCurrentSearchFilters() {
  return {
    metadata: metadataFilters,
    quick: quickFilters,
    externalSources: Boolean(sourceMode)
  };
}

async function postSearchWorkspaceAction(payload) {
  memberWorkspaceState = {...memberWorkspaceState, status:"saving", message:""};
  render();
  try {
    const response = await fetch("/api/workspace/record-tools", {
      method:"POST",
      headers: {"Content-Type":"application/json", Accept:"application/json"},
      body: JSON.stringify(payload)
    });
    const data = await response.json();
    if (response.status === 401) {
      redirectToMemberSignIn();
      return;
    }
    if (!response.ok || !data.ok) throw new Error(data.error || "Action failed.");
    memberWorkspaceState = {
      ...memberWorkspaceState,
      status:"ready",
      authenticated:true,
      message:data.message || "Search saved."
    };
    await fetchMemberWorkspaceState(true);
  } catch (error) {
    memberWorkspaceState = {
      ...memberWorkspaceState,
      status:"ready",
      message:error.message || "Action failed."
    };
    render();
  }
}

function hydrateSearchFromLocation() {
  if (locationSearchHydrated) return;
  locationSearchHydrated = true;
  const params = new URLSearchParams(window.location.search || "");
  const query = (params.get("q") || "").trim();
  if (!query) return;
  libraryQuery = query;
  localResults = searchLocalRecords(getEffectiveSearchQuery() || libraryQuery);
  liveResults = [];
  externalDiscovery = [];
  liveStatus = {
    state:"idle",
    message:"Archive results loaded. External source discovery is available.",
    sources:[]
  };
  refreshBlendedDiscovery(true);
}

function uniqueValues(values) {
  return [...new Set((values || []).filter(Boolean).map(value => String(value).trim()).filter(Boolean))];
}

function listify(value) {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (!value) return [];
  return [value];
}

function foldText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g,"&amp;")
    .replace(/</g,"&lt;")
    .replace(/>/g,"&gt;")
    .replace(/"/g,"&quot;")
    .replace(/'/g,"&#39;");
}

function iconBookmarkOutline() {
  return `
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false">
      <path d="M6 3.5h12a1 1 0 0 1 1 1V21l-7-4-7 4V4.5a1 1 0 0 1 1-1Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" />
    </svg>
  `;
}

function iconBookmarkCheck() {
  return `
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false">
      <path d="M6 3.5h12a1 1 0 0 1 1 1V21l-7-4-7 4V4.5a1 1 0 0 1 1-1Z" fill="currentColor" />
      <path d="m9 12 2.2 2.2L15.5 10" fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
    </svg>
  `;
}

function iconListPlus() {
  return `
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false">
      <path d="M4 7.5h9M4 12h9M4 16.5h7" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
      <path d="M17 10v8M13 14h8" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
    </svg>
  `;
}

function iconWorkbenchLayers() {
  return `
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false">
      <path d="M4.5 8.5 12 5l7.5 3.5L12 12 4.5 8.5Z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" />
      <path d="m4.5 12 7.5 3.5L19.5 12" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" />
      <path d="m4.5 15.5 7.5 3.5 7.5-3.5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" />
    </svg>
  `;
}

function safeUrl(value) {
  const url = String(value || "").trim();
  if (!url) return "";
  if (/^https?:\/\//i.test(url)) return url;
  return "";
}

function openExternal(url) {
  const safe = safeUrl(url);
  if (!safe) return;
  const opened = window.open(safe, "_blank", "noopener,noreferrer");
  if (opened) opened.opener = null;
}

function compactSpaces(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function slugify(value) {
  return foldText(value).replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function normalizeComparable(value) {
  return foldText(value).replace(/[^a-z0-9]+/g, " ").trim();
}

function paragraphs(value) {
  if (Array.isArray(value)) return value.map(item => String(item).trim()).filter(Boolean);
  return String(value || "")
    .split(/\n\s*\n/)
    .map(item => item.trim())
    .filter(Boolean);
}

function humanList(values) {
  return listify(values).map(item => String(item).trim()).filter(Boolean).join(", ");
}

function dedupeLinks(links) {
  const seen = new Set();
  return (links || []).filter(link => {
    const url = safeUrl(link.url);
    if (!url || seen.has(url)) return false;
    seen.add(url);
    return true;
  }).map(link => ({label: link.label || "Open link", url: safeUrl(link.url), note: link.note || ""}));
}

function derivedCitation(record) {
  return [
    record.creator,
    record.title ? `"${record.title}."` : "",
    record.collection || record.institution || record.source,
    record.period || record.date || "",
    record.provenance || ""
  ].filter(Boolean).join(" ");
}

function restoreFilenameText(filename) {
  return compactSpaces(
    String(filename || "")
      .replace(/\.(pdf|epub)$/i, "")
      .replace(/^Copy[_\s-]*/i, "")
      .replace(/\s*\(\d+\)\s*$/i, "")
      .replace(/\s+copy$/i, "")
      .replace(/_/g, ": ")
      .replace(/:\s*:/g, ":")
  );
}

function splitImportedTitleAndCreator(filename) {
  const cleaned = restoreFilenameText(filename);
  const parts = cleaned.split(/\s+-\s+/);
  if (parts.length > 1) {
    const creator = compactSpaces(parts.pop());
    return {
      title: compactSpaces(parts.join(" - ")),
      creator: creator || "Unknown"
    };
  }

  return {title: cleaned, creator: "Unknown"};
}

function inferImportedType(title) {
  if (/anthology|reader|companion|proceedings/i.test(title)) return "Reference Volume";
  if (/history/i.test(title)) return "History & Theory";
  return "Book";
}

function inferImportedCategory(title) {
  if (/philosophy|epistemology|ethics|ubuntu|identity|religion|cosmology/i.test(title)) return "Philosophy & Theory";
  if (/music|aesthetics|art|cinema|literature|diaspora/i.test(title)) return "Visual Culture";
  return "Books & Texts";
}

function inferImportedConcepts(title) {
  const lower = foldText(title);
  const concepts = [];
  if (/philosophy|epistemology|ethics|ubuntu|identity/.test(lower)) concepts.push("African philosophy","epistemic inquiry");
  if (/politics|colonialism|human rights|anarchism|integration|xenophobia/.test(lower)) concepts.push("political thought","colonial critique");
  if (/music|aesthetics|art|cinema|literature/.test(lower)) concepts.push("cultural criticism","visual and sonic cultures");
  if (/women|feminism|gender/.test(lower)) concepts.push("gender studies","feminist thought");
  if (/religion|church|gods|biblical|cosmology/.test(lower)) concepts.push("religion","cosmology");
  if (!concepts.length) concepts.push("African studies");
  return uniqueValues(concepts);
}

function inferImportedThemes(title) {
  const lower = foldText(title);
  const themes = [];
  if (/philosophy|epistemology|ethics|ubuntu|identity/.test(lower)) themes.push("African Philosophy");
  if (/politics|human rights|colonialism|anarchism|integration|xenophobia/.test(lower)) themes.push("Political Thought");
  if (/religion|church|gods|biblical|cosmology/.test(lower)) themes.push("Religion & Cosmology");
  if (/women|feminism|gender/.test(lower)) themes.push("Gender Studies");
  if (/music|aesthetics|art|cinema|literature/.test(lower)) themes.push("Music & Performance");
  return uniqueValues(themes.length ? themes : ["African Philosophy"]);
}

function inferImportedTags(title, creator) {
  const rawWords = `${title} ${creator}`.replace(/[^A-Za-z0-9\s]/g, " ").split(/\s+/).filter(Boolean);
  const tags = rawWords.filter(word => word.length > 3).slice(0, 8);
  return uniqueValues(tags);
}

function inferImportedLanguages(title) {
  const lower = foldText(title);
  const languages = ["English"];
  if (/yoruba/.test(lower)) languages.push("Yoruba");
  if (/bantu|kongo/.test(lower)) languages.push("Kikongo");
  if (/ubuntu|xhosa|zulu/.test(lower)) languages.push("isiXhosa","isiZulu");
  if (/frantz fanon|colonialism|seneghor/.test(lower)) languages.push("French");
  if (/african philosophies|severine/.test(lower)) languages.push("French");
  if (/biblical|church|religion|cosmology/.test(lower)) languages.push("Arabic");
  return uniqueValues(languages);
}

function defaultSourcePathways(record) {
  const pathways = [record.source || "Local archive index"];
  if (record.source === "Local Bank") pathways.push("Local archive index","Internal enriched records","Manual curation pathway","Static metadata normalisation layer");
  if (record.source === "African Philosophy Working Library") pathways.push("Working-library filename import","Local archive index","Related search expansion engine","Source handoff router");
  if (record.source && record.source !== "Local Bank" && record.source !== "African Philosophy Working Library") pathways.push("Source handoff router","Rights and provenance enrichment");
  return uniqueValues(pathways);
}

function buildImportedExternalLinks(title) {
  const query = encodeURIComponent(title);
  return [
    {label:"Google Books",url:`https://books.google.com/books?q=${query}`},
    {label:"Open Library",url:`https://openlibrary.org/search?q=${query}`},
    {label:"WorldCat",url:`https://search.worldcat.org/search?q=${query}`},
    {label:"Google Scholar",url:`https://scholar.google.com/scholar?q=${query}`}
  ];
}

function buildWorkingLibraryRecord(filename, index) {
  const {title, creator} = splitImportedTitleAndCreator(filename);
  const concepts = inferImportedConcepts(title);
  const themes = inferImportedThemes(title);
  const category = inferImportedCategory(title);
  const type = inferImportedType(title);
  const focus = themes.join(", ").toLowerCase();

  return {
    id:`wl${String(index + 1).padStart(3, "0")}`,
    title,
    type,
    creator,
    region:"Africa / Global",
    country:"",
    community:"",
    period:"",
    concepts,
    themes,
    summary:`Imported from the African Philosophy Working Library to expand the local search index for ${focus}.`,
    abstract:`Supplementary working-library record for "${title}" by ${creator}.`,
    description:[
      `This entry extends the static archive dataset beyond the original curated records by indexing a title from the local African Philosophy Working Library. It is designed so searches for underrepresented topics such as African philosophy, politics, religion, literature, music, and gender studies return broader results on the hosted site.`,
      "The current detail view is built from filename-level metadata. It preserves the title, creator, inferred knowledge areas, and discovery links so the record remains useful now, while still allowing richer abstracts, cover images, and catalogue references to be added later."
    ],
    tags: inferImportedTags(title, creator),
    rights:"Private working-library reference",
    provenance:"Indexed from the local African Philosophical books folder for static-site search expansion.",
    source:"African Philosophy Working Library",
    cat:category,
    collection:"African Philosophy Working Library",
    institution:"African Philosophy Working Library",
    language: inferImportedLanguages(title),
    sourceUrl:`https://books.google.com/books?q=${encodeURIComponent(title)}`,
    sourceActionLabel:"Search title online",
    externalLinks: buildImportedExternalLinks(title),
    sourcePathways:["African Philosophy Working Library","Working-library filename import","Local archive index","Query expansion dictionary","Source handoff router"],
    notes:["Imported from a local working-library filename rather than a full public catalogue record.","Useful for discovery and routing now; enrich later if you publish or catalogue the underlying file."],
    archiveIdentifier:`DA-WL-${String(index + 1).padStart(3, "0")}`,
    recordIdentifier:slugify(`${title}-${creator}`) || `wl-${index + 1}`
  };
}

function buildWorkingLibraryRecords() {
  const seenTitles = new Set(BASE_RECORDS.map(record => normalizeComparable(record.title)));
  const seenRecords = new Set(BASE_RECORDS.map(record => normalizeComparable(`${record.title} ${record.creator}`)));

  return WORKING_LIBRARY_FILES
    .map((filename, index) => buildWorkingLibraryRecord(filename, index))
    .filter(record => {
      const titleKey = normalizeComparable(record.title);
      const recordKey = normalizeComparable(`${record.title} ${record.creator}`);
      if (seenTitles.has(titleKey) || seenRecords.has(recordKey)) return false;
      seenTitles.add(titleKey);
      seenRecords.add(recordKey);
      return true;
    });
}

function normalizeRecord(record) {
  const enrichment = RECORD_ENRICHMENTS[record.id] || {};
  const sourceMeta = SOURCE_MAP.get(record.source) || {};
  const merged = {...record, ...enrichment};
  const sourceUrl = safeUrl(merged.sourceUrl || merged.link || sourceMeta.url || "");
  const institutionUrl = safeUrl(merged.institutionUrl || sourceMeta.url || "");
  const description = paragraphs(merged.description);
  const abstract = String(merged.abstract || "").trim();
  const summary = String(merged.summary || "").trim();
  const keywords = uniqueValues([...(merged.keywords || []), ...(merged.tags || [])]);
  const concepts = uniqueValues(merged.concepts || []);
  const themes = uniqueValues(merged.themes || []);
  const languageScript = normalizeLanguageScript(merged);
  const recordType = uniqueMetadataValues(merged.recordType || merged.type || merged.cat).filter(value => METADATA_VOCABULARY.recordType.includes(value));
  const typeFallback = recordType.length ? recordType : [METADATA_VOCABULARY.recordType.includes(canonicalMetadataTerm(merged.type)) ? canonicalMetadataTerm(merged.type) : "Dataset / Metadata Record"];
  const knowledgeAreas = uniqueMetadataValues([...(merged.knowledgeAreas || []), ...themes, ...concepts, ...(merged.tags || []), merged.cat, merged.type]).filter(value => METADATA_VOCABULARY.knowledgeAreas.includes(value));
  const regions = normalizeRegionValues(merged.region);
  const rightsStatus = METADATA_VOCABULARY.rightsStatus.includes(canonicalMetadataTerm(merged.rightsStatus || merged.rights)) ? canonicalMetadataTerm(merged.rightsStatus || merged.rights) : "Rights Unknown";
  const accessType = METADATA_VOCABULARY.accessType.includes(canonicalMetadataTerm(merged.accessType)) ? canonicalMetadataTerm(merged.accessType) : (sourceUrl ? "External Link Only" : "Metadata Only");
  const culturalSensitivity = METADATA_VOCABULARY.culturalSensitivity.includes(canonicalMetadataTerm(merged.culturalSensitivity)) ? canonicalMetadataTerm(merged.culturalSensitivity) : "Public";
  const verificationStatus = METADATA_VOCABULARY.verificationStatus.includes(canonicalMetadataTerm(merged.verificationStatus)) ? canonicalMetadataTerm(merged.verificationStatus) : (merged.aiAssisted ? "AI-Assisted, Needs Review" : "Provisional");
  const externalLinks = dedupeLinks([
    ...(merged.externalLinks || []),
    institutionUrl && merged.institution ? {label:"Institution",url:institutionUrl} : null
  ].filter(Boolean));

  return {
    ...merged,
    sourceUrl,
    institutionUrl,
    abstract,
    summary,
    description,
    contributors: uniqueValues(merged.contributors || []),
    language: languageScript.language,
    script: languageScript.script,
    concepts,
    themes: knowledgeAreas,
    knowledgeAreas,
    recordType: typeFallback,
    type: typeFallback[0],
    tags: uniqueValues(merged.tags || []),
    keywords,
    images: canDisplayMedia({rightsStatus, culturalSensitivity}) ? (merged.images || []).filter(image => safeUrl(image.src || image.url)).map(image => ({
      src: safeUrl(image.src || image.url),
      alt: image.alt || merged.title,
      caption: image.caption || ""
    })) : [],
    externalLinks,
    region: regions[0] || "Global / Comparative",
    regions,
    country: metadataList(merged.country).join(", "),
    countries: uniqueMetadataValues([...(merged.countries || []), merged.country]),
    communityOrCulturalGroup: uniqueMetadataValues(merged.communityOrCulturalGroup || merged.community),
    community: metadataList(merged.communityOrCulturalGroup || merged.community).join(", "),
    collection: merged.collection || merged.cat || "",
    curatedCollections: uniqueMetadataValues(merged.curatedCollections || merged.collection).filter(value => METADATA_VOCABULARY.curatedCollections.includes(value)),
    period: METADATA_VOCABULARY.period.includes(canonicalMetadataTerm(merged.period)) ? canonicalMetadataTerm(merged.period) : (merged.period || ""),
    periods: normalizePeriodValues(merged.period),
    institution: merged.institution || (record.source === "Local Bank" ? "Decolonising Archive local index" : record.source || ""),
    citation: merged.citation || derivedCitation({...merged, description}),
    sourceName: merged.sourceName || merged.source || merged.institution || "Archive record",
    sourceType: canonicalMetadataTerm(merged.sourceType || inferSourceType(merged.source || merged.institution || "")),
    dateAccessed: merged.dateAccessed || "",
    rightsStatus,
    licence: canonicalMetadataTerm(merged.licence || ""),
    rightsStatementUri: merged.rightsStatementUri || "",
    rightsHolder: merged.rightsHolder || "",
    accessType,
    reusePermission: canonicalMetadataTerm(merged.reusePermission || "Check Original Source"),
    culturalSensitivity,
    culturalProtocolNote: merged.culturalProtocolNote || "",
    localContextsLabel: merged.localContextsLabel || "",
    localContextsNotice: merged.localContextsNotice || "",
    communityReviewStatus: canonicalMetadataTerm(merged.communityReviewStatus || "Not Required"),
    verificationStatus,
    aiAssisted: Boolean(merged.aiAssisted),
    archiveIdentifier: merged.archiveIdentifier || `DA-${record.id.toUpperCase()}`,
    recordIdentifier: merged.recordIdentifier || record.id.toUpperCase(),
    relatedRecords: uniqueValues(merged.relatedRecords || []),
    sourcePathways: uniqueValues(merged.sourcePathways || defaultSourcePathways(record)),
    sourceActionLabel: merged.sourceActionLabel || "View source",
    date: merged.date || merged.period || "",
    notes: uniqueValues(merged.notes || [])
  };
}

const WORKING_LIBRARY_RECORDS = buildWorkingLibraryRecords().map(normalizeRecord);
const WORKING_LIBRARY_COLLECTION = COLLECTIONS.find(collection => collection.id === "c007");
if (WORKING_LIBRARY_COLLECTION) WORKING_LIBRARY_COLLECTION.count = WORKING_LIBRARY_RECORDS.length;

const RECORDS = [...BASE_RECORDS.map(normalizeRecord), ...WORKING_LIBRARY_RECORDS];
const RECORDS_BY_ID = new Map(RECORDS.map(record => [record.id, record]));
localResults = [...RECORDS];

const QUERY_EXPANSION_MAP = {
  "african philosophy":["kwasi wiredu","paulin hountondji","tsenay serequeberhan","african epistemology","ubuntu","communal personhood","theophilus okere"],
  "ubuntu":["african ethics","communal personhood","motsamai molefe","elphus muade","african philosophy"],
  "sankofa":["design pedagogy","decolonial design","african futures","knowledge recovery"],
  "restitution":["museum critique","repatriation","collection violence","provenance tracing"],
  "oral history":["testimony","community archiving","listening","memory infrastructures"],
  "timbuktu":["ajami traditions","islamic scholarship","manuscripts","sahel"],
  "fanon":["anti-colonial theory","dying colonialism","liberation philosophy","black consciousness"],
  "nkrumah":["pan-africanism","consciencism","political thought","socialist imaginaries"],
  "cabral":["liberation philosophy","national culture","anti-colonial struggle","movement strategy"],
  "biko":["black consciousness","psychological liberation","anti-apartheid","student movements"],
  "adinkra":["akan","visual sovereignty","symbol systems","graphic sovereignty"],
  "ifa":["yoruba","divination systems","oral traditions","indigenous logic"],
  "museum":["restitution","display ethics","holding institutions","collection violence"],
  "language":["translation justice","script politics","multilingual archives","naming systems"],
  "sonic":["music","radio histories","listening","cassette circulations"],
  "architecture":["precolonial urbanism","vernacular architecture","spatial justice","settlement memory"]
};

const MEDIA_DISCOVERY_TERMS = ["archives","books","oral history","visual culture","architecture","manuscripts","political thought","music","pedagogy","museum collections"];
const LANGUAGE_DISCOVERY_TERMS = ["archive","philosophy","oral tradition","metadata"];
const PERIOD_DISCOVERY_TERMS = ["precolonial","colonial era","independence era","postcolonial","contemporary","diasporic"];

function getFeaturedRecords() {
  return RECORDS.filter(record => !String(record.id).startsWith("wl")).slice(0, 8);
}

function getFeaturedCollections(limit = 8) {
  const featured = COLLECTIONS.filter(collection => FEATURED_COLLECTION_TITLES.includes(collection.title));
  return featured.slice(0, limit);
}

function getFeaturedThemes(limit = 18) {
  return FEATURED_THEME_TERMS.slice(0, limit);
}

function buildFacetOptions(records, accessor, limit = 10) {
  const counts = new Map();
  records.forEach(record => {
    const values = uniqueValues(accessor(record) || []);
    values.forEach(value => counts.set(value, (counts.get(value) || 0) + 1));
  });
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([value, count]) => ({value, count}));
}

function buildQueryContext(query) {
  const raw = String(query || "").trim();
  const normalized = normalizeComparable(raw);
  const tokens = normalized.split(/\s+/).filter(Boolean);
  const expandedTerms = new Set(tokens);
  const expandedPhrases = [];

  Object.entries(QUERY_EXPANSION_MAP).forEach(([key, values]) => {
    if (normalized.includes(normalizeComparable(key))) {
      values.forEach(value => {
        expandedPhrases.push(value);
        normalizeComparable(value).split(/\s+/).filter(Boolean).forEach(token => expandedTerms.add(token));
      });
    }
  });

  return {
    raw,
    normalized,
    tokens:[...expandedTerms],
    phrases: uniqueValues([raw, ...expandedPhrases].filter(Boolean))
  };
}

function buildRelatedSearchIndex() {
  const seen = new Set();
  const entries = [];
  const creators = uniqueValues(RECORDS.map(record => record.creator));
  const communities = uniqueValues(RECORDS.map(record => record.community));
  const institutions = uniqueValues([...RECORDS.map(record => record.institution), ...SOURCES.map(source => source.name)]);

  function add(label, type, keywords = []) {
    const cleaned = compactSpaces(label);
    const key = normalizeComparable(cleaned);
    if (!cleaned || !key || seen.has(key)) return;
    seen.add(key);
    entries.push({label: cleaned, type, keywords: uniqueValues(keywords.concat(cleaned))});
  }

  THEMES.forEach(theme => add(theme, "theme", ["theme", theme]));
  COLLECTIONS.forEach(collection => add(collection.title, "collection", [collection.region, ...(collection.searchTerms || [])]));
  COUNTRY_TERRITORIES.forEach(country => add(country, "country", [country, "archives", "history"]));
  LANGUAGE_INDEX.forEach(language => add(language, "language", [language, "multilingual", "archive"]));
  SOURCES.forEach(source => add(source.name, "source", [source.region, source.type, source.access]));
  creators.forEach(creator => add(creator, "creator", ["creator", creator]));
  communities.forEach(community => add(community, "community", [community, "community archive"]));
  institutions.forEach(institution => add(institution, "institution", [institution, "institutional pathway"]));
  PERIOD_DISCOVERY_TERMS.forEach(period => add(period, "period", [period, "history"]));

  COUNTRY_TERRITORIES.slice(0, 90).forEach(country => {
    MEDIA_DISCOVERY_TERMS.forEach(term => add(`${country} ${term}`, "geo-medium", [country, term]));
  });

  THEMES.slice(0, 120).forEach(theme => {
    ["archives","books","oral history","visual culture","pedagogy","museum collections"].forEach(term => add(`${theme} ${term}`, "theme-medium", [theme, term]));
  });

  LANGUAGE_INDEX.forEach(language => {
    LANGUAGE_DISCOVERY_TERMS.forEach(term => add(`${language} ${term}`, "language-medium", [language, term]));
  });

  SOURCES.filter(source => source.access === "search").slice(0, 45).forEach(source => {
    ["decolonisation","African philosophy","archives"].forEach(term => add(`${source.name} ${term}`, "source-focus", [source.name, term]));
  });

  return entries;
}

const RELATED_SEARCH_INDEX = buildRelatedSearchIndex();

function buildSuggestionIndex() {
  const suggestions = [];
  RECORDS.forEach(record => {
    if (record.title) {
      suggestions.push({
        label: record.title,
        type: "title",
        value: record.title,
        meta: record.creator || ""
      });
    }
    if (record.creator) {
      suggestions.push({
        label: record.creator,
        type: "creator",
        value: record.creator,
        meta: "Creator"
      });
    }
  });
  THEMES.forEach(theme => {
    suggestions.push({
      label: theme,
      type: "theme",
      value: theme,
      meta: "Theme"
    });
  });
  COLLECTIONS.forEach(collection => {
    suggestions.push({
      label: collection.title,
      type: "collection",
      value: collection.title,
      meta: collection.region || "Collection"
    });
  });
  SOURCES.forEach(source => {
    suggestions.push({
      label: source.name,
      type: "source",
      value: source.name,
      meta: source.region || "Source"
    });
  });
  const seen = new Set();
  return suggestions.filter(item => {
    const key = `${item.type}::${normalizeComparable(item.label)}`;
    if (!item.label || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
const SUGGESTION_INDEX = buildSuggestionIndex();

// ─── Recent searches ────────────────────────────────────────────────────────
const RECENT_SEARCHES_KEY = "ared_recent_searches";
const MAX_RECENT_SEARCHES = 8;

function loadRecentSearches() {
  try {
    const raw = localStorage.getItem(RECENT_SEARCHES_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed)
      ? parsed.map(item => String(item).trim()).filter(Boolean).slice(0, MAX_RECENT_SEARCHES)
      : [];
  } catch (error) {
    console.warn("Could not load recent searches.", error);
    return [];
  }
}

function saveRecentSearches(items) {
  try {
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(items.slice(0, MAX_RECENT_SEARCHES)));
  } catch (error) {
    console.warn("Could not save recent searches.", error);
  }
}

function pushRecentSearch(query) {
  const value = String(query || "").trim();
  if (!value) return;
  const normalized = normalizeComparable(value);
  const next = [
    value,
    ...recentSearches.filter(item => normalizeComparable(item) !== normalized)
  ].slice(0, MAX_RECENT_SEARCHES);
  recentSearches = next;
  saveRecentSearches(recentSearches);
}

function clearRecentSearches() {
  recentSearches = [];
  saveRecentSearches([]);
}

function getSearchSuggestions(query, limit = 12) {
  const normalized = normalizeComparable(query);
  if (!normalized || normalized.length < 2) return [];
  const tokens = normalized.split(/\s+/).filter(Boolean);
  return SUGGESTION_INDEX
    .map(item => {
      const label = normalizeComparable(item.label);
      const meta = normalizeComparable(item.meta || "");
      let score = 0;
      let hasMatch = false;
      if (label.startsWith(normalized)) { score += 20; hasMatch = true; }
      else if (label.includes(normalized)) { score += 12; hasMatch = true; }
      if (meta.includes(normalized)) { score += 4; hasMatch = true; }
      tokens.forEach(token => {
        if (label.includes(token)) { score += 3; hasMatch = true; }
        if (meta.includes(token)) { score += 1; hasMatch = true; }
      });
      if (!hasMatch) return { item, score: 0 };
      if (item.type === "title") score += 3;
      if (item.type === "theme") score += 2;
      if (item.type === "collection") score += 2;
      return { item, score };
    })
    .filter(entry => entry.score > 0)
    .sort((a, b) =>
      b.score - a.score ||
      a.item.label.localeCompare(b.item.label)
    )
    .slice(0, limit)
    .map(entry => entry.item);
}

function renderRecentSearches(variant = "library") {
  if (!recentSearches.length) return "";
  // `variant` lets us scope the DOM so hero and library can coexist without
  // id collisions when both are rendered (in practice only one page at a time).
  const wrapperId = variant === "hero" ? "heroRecentSearches" : "recentSearches";
  const clearId   = variant === "hero" ? "clearRecentSearchesBtnHero" : "clearRecentSearchesBtn";
  return `
    <section class="recent-searches" id="${wrapperId}" data-recent-variant="${variant}">
      <div class="recent-searches-header">
        <span class="recent-searches-title">Recent searches</span>
        <button type="button" class="recent-searches-clear" id="${clearId}">Clear</button>
      </div>
      <div class="recent-searches-list">
        ${recentSearches.map(item => `
          <button
            type="button"
            class="recent-search-chip"
            data-recent-search="${escapeHtml(item)}"
            data-recent-variant="${variant}"
          >${escapeHtml(item)}</button>
        `).join("")}
      </div>
    </section>
  `;
}

function renderSearchSuggestions(id = "searchSuggestions") {
  if (!searchSuggestions.length) {
    return `<div class="search-suggestions empty" id="${id}" hidden></div>`;
  }
  return `
    <div class="search-suggestions" id="${id}">
      ${searchSuggestions.map((item, index) => `
        <button
          type="button"
          class="search-suggestion-item ${index === activeSuggestionIndex ? "active" : ""}"
          data-suggestion-value="${escapeHtml(item.value)}"
          data-suggestion-index="${index}"
        >
          <span class="search-suggestion-label">${escapeHtml(item.label)}</span>
          <span class="search-suggestion-meta">${escapeHtml(item.type)}</span>
        </button>
      `).join("")}
    </div>
  `;
}

// Imperative update: replace only the suggestions panel, keeping the input focused.
// Called from the input listener instead of a full render().
// `id` defaults to the library panel; pass "heroSuggestions" for the home page.
function updateSuggestionsDOM(id = "searchSuggestions") {
  const panel = document.getElementById(id);
  if (!panel) return;
  if (!searchSuggestions.length) {
    panel.innerHTML = "";
    panel.classList.add("empty");
    panel.setAttribute("hidden", "");
    return;
  }
  panel.classList.remove("empty");
  panel.removeAttribute("hidden");
  panel.innerHTML = searchSuggestions.map((item, index) => `
    <button
      type="button"
      class="search-suggestion-item ${index === activeSuggestionIndex ? "active" : ""}"
      data-suggestion-value="${escapeHtml(item.value)}"
      data-suggestion-index="${index}"
    >
      <span class="search-suggestion-label">${escapeHtml(item.label)}</span>
      <span class="search-suggestion-meta">${escapeHtml(item.type)}</span>
    </button>
  `).join("");
  bindSuggestionItemEvents(id);
}

function bindSuggestionItemEvents(id = "searchSuggestions", onSelect) {
  const panel = document.getElementById(id);
  if (!panel) return;

  // Use event delegation on the panel rather than per-button listeners.
  // The panel element persists across DOM updates of its children, so
  // even if the button the user tapped is replaced before the event
  // finishes propagating, the panel's listener still runs.
  //
  // We mark the panel so we only bind once, even if bindSuggestionItemEvents
  // is called multiple times for the same panel across renders.
  if (panel.dataset.suggestBound === "1") return;
  panel.dataset.suggestBound = "1";

  // Touch devices need different commit timing than mouse: pointerdown fires
  // at the very start of a touch, before the browser knows whether the user
  // is scrolling or tapping, so committing on pointerdown breaks scrolling.
  // We track touch movement and only commit on click (which fires at the end
  // of a tap, after touch resolution has happened). Mouse and pen still
  // commit on pointerdown for snappy desktop feel.
  let touchStartX = 0;
  let touchStartY = 0;
  let touchMoved = false;
  const TOUCH_MOVE_THRESHOLD = 8; // px — above this, treat as scroll

  const commitSelection = (event) => {
    // Walk up from event.target to find the nearest suggestion button.
    // Event.target can be the inner <span>, so we can't just check the button.
    const target = event.target && event.target.closest
      ? event.target.closest("[data-suggestion-value]")
      : null;
    if (!target) return;
    event.preventDefault();
    event.stopPropagation();
    const value = target.getAttribute("data-suggestion-value") || "";
    if (!value) return;
    if (typeof onSelect === "function") {
      onSelect(value);
      return;
    }
    // default: library search behaviour.
    // Note: we deliberately do NOT call input.blur() here. Blurring during
    // a pointerup sequence causes some browsers (esp. macOS Safari and
    // Chrome with precision trackpad drivers) to interpret the gesture
    // as a cancel rather than a commit, which breaks selection. The render()
    // below rebuilds the page; if focus should shift elsewhere, that will
    // happen naturally as the user interacts with the new page state.
    const input = document.getElementById("mainSearch");
    if (input) input.value = value;
    libraryQuery = value;
    searchSuggestions = [];
    activeSuggestionIndex = -1;
    pushRecentSearch(value);
    applyLibraryQuery(value, true);
    render();
  };

  // Track touch movement so we can distinguish a tap from a scroll gesture.
  panel.addEventListener("touchstart", (event) => {
    const touch = event.touches && event.touches[0];
    if (!touch) return;
    touchStartX = touch.clientX;
    touchStartY = touch.clientY;
    touchMoved = false;
  }, { passive: true });

  panel.addEventListener("touchmove", (event) => {
    const touch = event.touches && event.touches[0];
    if (!touch) return;
    const dx = Math.abs(touch.clientX - touchStartX);
    const dy = Math.abs(touch.clientY - touchStartY);
    if (dx > TOUCH_MOVE_THRESHOLD || dy > TOUCH_MOVE_THRESHOLD) touchMoved = true;
  }, { passive: true });

  // Mouse and pen: commit on pointerdown. Per-event pointerType detection is
  // more accurate than a static (pointer: coarse) media query, because hybrid
  // devices (touch-screen laptops, iPad with mouse) can use either input
  // method depending on the moment.
  panel.addEventListener("pointerdown", (event) => {
    if (event.pointerType === "touch") return;
    commitSelection(event);
  }, { passive: false });

  // Touch: commit on click, which fires after the touch ends and only if the
  // touch wasn't a scroll gesture (i.e. movement stayed under threshold).
  // Click also serves as a fallback for any pointerType the pointerdown path
  // didn't handle.
  panel.addEventListener("click", (event) => {
    if (touchMoved) {
      // user was scrolling, not tapping — reset and ignore
      touchMoved = false;
      return;
    }
    commitSelection(event);
  });
}

function closeSuggestionsPanel(id = "searchSuggestions") {
  if (!searchSuggestions.length && activeSuggestionIndex === -1) return;
  searchSuggestions = [];
  activeSuggestionIndex = -1;
  updateSuggestionsDOM(id);
}

function collectionCoverageScore(collection) {
  const searchTerms = uniqueValues([collection.title, collection.region, ...(collection.searchTerms || [])]);
  const foldedTerms = searchTerms.map(term => foldText(term));

  const recordHits = RECORDS.filter(record => {
    const text = buildRecordSearchText(record);
    return foldedTerms.some(term => term && text.includes(term));
  }).length;

  const relatedHits = RELATED_SEARCH_INDEX.filter(entry => {
    const entryText = foldText([entry.label, ...(entry.keywords || [])].join(" "));
    return foldedTerms.some(term => term && entryText.includes(term));
  }).length;

  const sourceHits = SOURCES.filter(source => {
    const sourceText = foldText([source.name, source.region, source.desc, source.type].join(" "));
    return foldedTerms.some(term => term && sourceText.includes(term));
  }).length;

  return Math.max(recordHits * 18 + relatedHits * 2 + sourceHits * 5, recordHits || 0);
}

COLLECTIONS.forEach(collection => {
  if (!collection.count) collection.count = collectionCoverageScore(collection);
});

function getCollectionSuggestions(query, limit = 8) {
  const context = buildQueryContext(query);
  if (!context.raw) return getFeaturedCollections(limit);

  return COLLECTIONS
    .map(collection => {
      const text = foldText([collection.title, collection.region, collection.desc, ...(collection.searchTerms || [])].join(" "));
      const score = context.tokens.reduce((total, token) => total + (text.includes(token) ? 5 : 0), 0);
      return {collection, score};
    })
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score || b.collection.count - a.collection.count || a.collection.title.localeCompare(b.collection.title))
    .slice(0, limit)
    .map(item => item.collection);
}

function getRelatedSearchSuggestions(query, limit = 16) {
  const context = buildQueryContext(query);
  if (!context.raw) {
    return FEATURED_QUERY_SUGGESTIONS
      .map(label => RELATED_SEARCH_INDEX.find(entry => entry.label.toLowerCase() === label.toLowerCase()) || {label, type:"featured", keywords:[label]})
      .slice(0, limit);
  }

  return RELATED_SEARCH_INDEX
    .map(entry => {
      const label = foldText(entry.label);
      const keywordText = foldText((entry.keywords || []).join(" "));
      let score = 0;
      context.tokens.forEach(token => {
        if (label.includes(token)) score += 7;
        if (keywordText.includes(token)) score += 5;
      });
      if (label.includes(context.normalized)) score += 10;
      return {entry, score};
    })
    .filter(item => item.score > 0 && normalizeComparable(item.entry.label) !== context.normalized)
    .sort((a, b) => b.score - a.score || a.entry.label.localeCompare(b.entry.label))
    .slice(0, limit)
    .map(item => item.entry);
}

function getPrimaryNarrative(record) {
  const ordered = [
    {label:"Abstract", content: paragraphs(record.abstract)},
    {label:"Summary", content: paragraphs(record.summary)},
    {label:"Description", content: paragraphs(record.description)}
  ].filter(section => section.content.length);

  if (!ordered.length) {
    return {
      primary: {label:"Record note", content:["No extended narrative is available for this entry yet."]},
      secondary: []
    };
  }

  const [primary, ...rest] = ordered;
  const secondary = rest.filter(section => section.content.join(" ") !== primary.content.join(" "));
  return {primary, secondary};
}

function getLeadImage(record) {
  if (!record || !Array.isArray(record.images) || !record.images.length) return null;
  return record.images[0] || null;
}

function getGalleryImages(record) {
  if (!record || !Array.isArray(record.images) || record.images.length < 2) return [];
  return record.images.slice(1);
}

function buildRecordSearchText(record) {
  return foldText([
    record.title,
    record.alternateTitle,
    record.creator,
    record.summary,
    record.abstract,
    (Array.isArray(record.description) ? record.description.join(" ") : (record.description || "")),
    record.region,
    record.country,
    record.community,
    record.period,
    record.collection,
    record.cat,
    record.type,
    record.institution,
    ...(record.sourcePathways || []),
    ...(record.language || []),
    ...(record.countries || []),
    record.provenance,
    record.rights,
    record.recordIdentifier,
    record.archiveIdentifier,
    record.citation,
    ...(record.contributors || []),
    ...(record.tags || []),
    ...(record.keywords || []),
    ...(record.concepts || []),
    ...(record.themes || []),
    ...(record.notes || [])
  ].join(" "));
}

function scoreRecord(record, context) {
  if (!context.raw) return 0;
  const terms = context.tokens;
  const title = foldText(record.title);
  const creator = foldText(record.creator);
  const tags = foldText([...(record.tags || []), ...(record.keywords || []), ...(record.concepts || []), ...(record.themes || [])].join(" "));
  const geo = foldText([record.region, record.country, record.community].join(" "));
  const summary = foldText([record.abstract, record.summary].join(" "));
  const detail = foldText(Array.isArray(record.description) ? record.description.join(" ") : (record.description || ""));
  const meta = foldText([record.collection, record.type, record.cat, record.recordIdentifier, record.archiveIdentifier, record.institution, ...(record.sourcePathways || []), ...(record.language || [])].join(" "));
  const phraseBonus = context.phrases.reduce((bonus, phrase) => {
    const normalizedPhrase = normalizeComparable(phrase);
    if (!normalizedPhrase) return bonus;
    if (title.includes(normalizedPhrase)) return bonus + 18;
    if (summary.includes(normalizedPhrase)) return bonus + 10;
    if (meta.includes(normalizedPhrase)) return bonus + 8;
    return bonus;
  }, 0);

  return phraseBonus + terms.reduce((score, term) => {
    if (title.includes(term)) score += 12;
    if (creator.includes(term)) score += 9;
    if (tags.includes(term)) score += 8;
    if (summary.includes(term)) score += 6;
    if (geo.includes(term)) score += 5;
    if (detail.includes(term)) score += 4;
    if (meta.includes(term)) score += 3;
    return score;
  }, 0);
}

function searchLocalRecords(query) {
  const context = buildQueryContext(query);
  if (!context.raw) return [...RECORDS];

  return RECORDS
    .map(record => ({record, score: scoreRecord(record, context), haystack: buildRecordSearchText(record)}))
    .filter(item => item.score > 0 || context.tokens.some(token => item.haystack.includes(token)))
    .sort((a, b) => b.score - a.score || a.record.title.localeCompare(b.record.title))
    .map(item => item.record);
}

function filterDisplayedRecords(records) {
  return records.filter(record => {
    const mode = getResultMode(record);
    if (mode === "live" || mode === "external_handoff") {
      if (quickFilters.hideSensitive && record.culturalSensitivity !== "Public") return false;
      if (quickFilters.openAccess && !["Public Domain","Creative Commons","Open Access"].includes(record.rightsStatus)) return false;
      return true;
    }
    for (const [key, selectedValues] of Object.entries(metadataFilters)) {
      if (!selectedValues || !selectedValues.length) continue;
      const recordValues = getRecordFacetValues(record, key);
      if (!selectedValues.some(value => recordValues.includes(value))) return false;
    }
    if (quickFilters.openAccess && !["Public Domain","Creative Commons","Open Access"].includes(record.rightsStatus)) return false;
    if (quickFilters.verified && record.verificationStatus !== "Verified") return false;
    if (quickFilters.hideSensitive && record.culturalSensitivity !== "Public") return false;
    if (quickFilters.metadataOnly && record.accessType !== "Metadata Only") return false;
    if (quickFilters.needsReview && !["Provisional","AI-Assisted, Needs Review","Needs Correction","Duplicate Suspected","Takedown Requested"].includes(record.verificationStatus)) return false;
    return true;
  });
}

function getRecordFacetValues(record, key) {
  if (key === "sourceOrigin") return [sourceOriginValue(record)];
  if (key === "country") return metadataList(record.countries || record.country);
  if (key === "curatedCollections") return metadataList(record.curatedCollections || record.collection);
  if (key === "knowledgeAreas") return metadataList(record.knowledgeAreas || record.themes || record.concepts);
  if (key === "region") return metadataList(record.regions || record.region);
  if (key === "recordType") return metadataList(record.recordType || record.type);
  if (key === "period") return metadataList(record.periods || record.period);
  const direct = record[key];
  if (Array.isArray(direct)) return direct.filter(Boolean);
  if (direct) return [direct];
  return [];
}

function hasAnyMetadataFilter() {
  return Object.values(metadataFilters).some(values => values && values.length) ||
    Object.values(quickFilters).some(Boolean);
}

function getActiveFilterCount() {
  const metadataCount = Object.values(metadataFilters).reduce((count, values) => {
    return count + (Array.isArray(values) ? values.length : 0);
  }, 0);
  const quickCount = Object.values(quickFilters).filter(Boolean).length;
  return metadataCount + quickCount;
}

function clearMetadataFilters() {
  metadataFilters = {};
  quickFilters = {openAccess:false, verified:false, hideSensitive:false, metadataOnly:false, needsReview:false};
}

function getRelatedRecords(record, limit = 3) {
  const explicit = record.relatedRecords
    .map(id => RECORDS_BY_ID.get(id))
    .filter(Boolean)
    .slice(0, limit);

  if (explicit.length >= limit) return explicit;

  const relatedIds = new Set(explicit.map(item => item.id));
  const pool = RECORDS.filter(item => item.id !== record.id && !relatedIds.has(item.id));

  const scored = pool.map(item => {
    const overlap = [...new Set([
      ...item.concepts.filter(concept => record.concepts.includes(concept)),
      ...item.tags.filter(tag => record.tags.includes(tag)),
      ...item.themes.filter(theme => record.themes.includes(theme)),
      item.cat === record.cat ? record.cat : "",
      item.region === record.region ? record.region : ""
    ].filter(Boolean))];

    return {item, score: overlap.length};
  }).filter(entry => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.item.title.localeCompare(b.item.title))
    .slice(0, limit - explicit.length)
    .map(entry => entry.item);

  return [...explicit, ...scored];
}

function buildRecordActions(record) {
  const actions = [];

  if (record.sourceUrl) {
    actions.push({
      label: record.sourceActionLabel || "View source",
      note: record.source || record.institution || "",
      url: record.sourceUrl
    });
  }

  if (record.institutionUrl && record.institutionUrl !== record.sourceUrl) {
    actions.push({
      label:"Visit institution",
      note: record.institution,
      url: record.institutionUrl
    });
  }

  if (record.collection) {
    const collectionMatch = COLLECTIONS.find(collection => collection.title === record.collection);
    if (collectionMatch) {
      actions.push({
        label:"Browse collection",
        note: collectionMatch.region,
        url:""
      });
    }
  }

  return [
    ...actions.filter(action => !action.url),
    ...dedupeLinks([
      ...actions.filter(action => action.url),
      ...(record.externalLinks || [])
    ])
  ];
}

function buildExternalDiscovery(query) {
  const context = buildQueryContext(query);
  if (!context.raw) return [];
  const handoffQuery = encodeURIComponent(uniqueValues([context.raw, ...context.phrases.slice(1, 3)]).join(" "));

  return DISCOVERY_SOURCE_IDS
    .map(id => SOURCES.find(source => source.id === id))
    .filter(Boolean)
    .map(source => ({
      ...source,
      actionLabel: source.searchTemplate ? "Search this source" : "Open source",
      actionUrl: source.searchTemplate ? `${source.searchTemplate}${handoffQuery}` : safeUrl(source.url)
    }))
    .filter(source => source.actionUrl);
}

function parseLegacyHashRoute() {
  const raw = window.location.hash.replace(/^#\/?/, "");
  if (!raw) return null;
  const parts = raw.split("/").filter(Boolean);
  if (parts[0] === "record" && parts[1]) {
    return {page:"record", recordId:decodeURIComponent(parts.slice(1).join("/"))};
  }
  const page = ["home","library","sources","about"].includes(parts[0]) ? parts[0] : "home";
  return {page, recordId:null};
}

function normaliseArchivePath(pathname = window.location.pathname) {
  const trimmed = String(pathname || "/").replace(/\/+$/, "");
  return trimmed || "/";
}

function parseRouteFromPathname(pathname = window.location.pathname) {
  const path = normaliseArchivePath(pathname);
  if (path === "/" || path === "/home") return {page:"home", recordId:null};
  if (path === "/library") return {page:"library", recordId:null};
  if (path === "/sources") return {page:"sources", recordId:null};
  if (path === "/about") return {page:"about", recordId:null};
  const recordMatch = path.match(/^\/records\/(.+)$/);
  if (recordMatch) {
    return {page:"record", recordId:decodeURIComponent(recordMatch[1])};
  }
  const legacyRecordMatch = path.match(/^\/record\/(.+)$/);
  if (legacyRecordMatch) {
    return {page:"record", recordId:decodeURIComponent(legacyRecordMatch[1])};
  }
  return {page:"home", recordId:null};
}

function parseRouteFromLocation() {
  const legacyRoute = parseLegacyHashRoute();
  if (legacyRoute) {
    const cleanPath = makePath(legacyRoute.page, legacyRoute.recordId);
    window.history.replaceState({archiveRoute:true}, "", `${cleanPath}${window.location.search || ""}`);
    return legacyRoute;
  }
  return parseRouteFromPathname(window.location.pathname);
}

function makePath(page, recordId) {
  if (page === "record" && recordId) return `/records/${encodeURIComponent(recordId)}`;
  if (["home","library","sources","about"].includes(page)) return `/${page}`;
  return "/home";
}

function archiveHref(page, recordId = null) {
  return makePath(page, recordId);
}

function isArchivePath(pathname) {
  const route = parseRouteFromPathname(pathname);
  return route.page !== "home" || ["/", "/home"].includes(normaliseArchivePath(pathname));
}

function applyRoute(route, options = {}) {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("app:loading:start"));
  }
  currentPage = route.page || "home";
  selectedRecordId = route.recordId || null;
  if (currentPage === 'library') hydrateSearchFromLocation();
  render();
  if (!options.preserveScroll) {
    window.scrollTo({top:0, behavior:options.smooth ? 'smooth' : 'auto'});
  }
  window.dispatchEvent(new CustomEvent("archive:navigation", {
    detail:{page:currentPage, recordId:selectedRecordId, path:window.location.pathname}
  }));
  if (typeof window !== "undefined") {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        window.dispatchEvent(new Event("app:loading:end"));
      });
    });
  }
}

function navigate(page, recordId = null, options = {}) {
  const nextPath = makePath(page, recordId);
  const currentPath = normaliseArchivePath(window.location.pathname);
  if (currentPath !== nextPath || window.location.hash) {
    window.history.pushState({archiveRoute:true, page, recordId}, "", nextPath);
  }
  applyRoute({page, recordId}, {smooth:options.smooth !== false});
}

function prepareArchivePageNavigation(element) {
  if (element.dataset.collection) {
    clearMetadataFilters();
    metadataFilters.curatedCollections = [element.dataset.collection];
    libraryQuery = '';
    localResults = searchLocalRecords(getEffectiveSearchQuery());
    liveResults = [];
    externalDiscovery = [];
    liveStatus = {state:'idle', message:'', sources:[]};
    refreshBlendedDiscovery(true);
  }
}

function handleArchiveNavigationClick(event) {
  if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  const target = event.target instanceof Element ? event.target : null;
  if (!target) return;

  const appShell = document.getElementById("app");
  if (!appShell) return;
  if (!target.closest("#app")) return;

  const explicitPage = target.closest('[data-page]');
  if (explicitPage) {
    const page = explicitPage.dataset.page;
    if (!page) return;
    event.preventDefault();
    event.stopPropagation();
    prepareArchivePageNavigation(explicitPage);
    navigate(page);
    return;
  }

  const anchor = target.closest('a[href]');
  if (!anchor) return;
  if (anchor.target && anchor.target !== '_self') return;
  if (anchor.hasAttribute('download')) return;

  let url;
  try {
    url = new URL(anchor.getAttribute('href'), window.location.origin);
  } catch {
    return;
  }
  if (url.origin !== window.location.origin) return;
  if (!isArchivePath(url.pathname)) return;

  const route = parseRouteFromPathname(url.pathname);
  event.preventDefault();
  event.stopPropagation();
  const nextUrl = `${makePath(route.page, route.recordId)}${url.search || ""}`;
  const currentUrl = `${normaliseArchivePath(window.location.pathname)}${window.location.search || ""}`;
  if (currentUrl !== nextUrl || window.location.hash) {
    window.history.pushState({archiveRoute:true, page:route.page, recordId:route.recordId}, "", nextUrl);
  }
  applyRoute(route, {smooth:true});
}


let siteContent = {
  about: {
    eyebrow: "About",
    title: "About this archive",
    lead:
      "A working archive of decolonising knowledge across Africa, the diaspora, and the Global South.",
    body:
      "<p>This archive brings together records, theories, visual culture, oral traditions, and institutional pathways that support the recovery and organisation of decolonising knowledge.</p>",
    missionTitle: "Mission",
    missionBody:
      "<p>To build an accessible, evolving archive that supports research, teaching, cultural memory, and public knowledge.</p>",
    contactTitle: "Contact",
    contactBody:
      "<p>For rights, corrections, collaborations, or archival enquiries, please contact the archive administrator.</p>"
  }
};

async function loadSiteContent() {
  try {
    const response = await fetch("/api/site-content", { cache: "no-store" });
    const data = await response.json();

    if (data && data.ok && data.content) {
      siteContent = {
        ...siteContent,
        ...data.content,
        about: {
          ...siteContent.about,
          ...(data.content.about || {})
        }
      };

      if (currentPage === "about") {
        render();
      }
    }
  } catch (error) {
    console.warn("Could not load site content, using defaults.", error);
  }
}

function renderCollectionCard(collection) {
  return `
    <article class="coll-card" data-page="library" data-collection="${escapeHtml(collection.title)}">
      <div class="coll-icon">${escapeHtml(collection.icon)}</div>
      <div class="coll-title">${escapeHtml(collection.title)}</div>
      <div class="coll-desc">${escapeHtml(collection.desc)}</div>
      <div class="coll-footer">
        <span class="coll-region">${escapeHtml(collection.region)}</span>
        <span class="coll-count">${Number(collection.count || 0).toLocaleString()}</span>
      </div>
    </article>
  `;
}

function renderRelatedSearchTags(items) {
  return `
    <div class="theme-grid">
      ${items.map(item => {
        const label = typeof item === "string" ? item : item.label;
        return `<span class="theme-tag related-search" data-related="${escapeHtml(label)}">${escapeHtml(label)}</span>`;
      }).join("")}
    </div>
  `;
}

function extractCitationYear(period) {
  if (!period) return "";
  const match = String(period).match(/\b(1[0-9]{3}|20[0-9]{2}|21[0-9]{2})\b/);
  return match ? match[1] : "";
}

function mapRecordTypeToRIS(type) {
  const value = String(type || "").toLowerCase();
  if (value.includes("book")) return "BOOK";
  if (value.includes("journal")) return "JOUR";
  if (value.includes("article")) return "JOUR";
  if (value.includes("archival")) return "MANSCPT";
  if (value.includes("oral")) return "GEN";
  if (value.includes("poster")) return "ART";
  if (value.includes("image")) return "ART";
  if (value.includes("artefact") || value.includes("artifact")) return "ART";
  if (value.includes("architecture")) return "GEN";
  return "GEN";
}

function generateArchiveCitation(record) {
  const creator = (record.creator || "").trim();
  const title = (record.title || "").trim();
  const institution = (record.institution || record.source || "").trim();
  const year = extractCitationYear(record.period);
  const url = (record.sourceUrl || "").trim();
  const id = (record.recordIdentifier || record.archiveIdentifier || "").trim();
  return [creator, title ? `"${title}."` : "", institution, year, url, id ? `Record ID: ${id}.` : ""].filter(Boolean).join(" ");
}

function splitCreatorName(name) {
  const clean = String(name || "").trim();
  if (!clean) return { full: "Unknown", last: "Unknown", initials: "" };
  if (clean.includes(",")) {
    const [last, rest] = clean.split(",").map(part => part.trim());
    const initials = (rest || "")
      .split(/\s+/)
      .filter(Boolean)
      .map(part => `${part.charAt(0).toUpperCase()}.`)
      .join(" ");
    return { full: clean, last, initials };
  }
  const parts = clean.split(/\s+/).filter(Boolean);
  const last = parts.length ? parts[parts.length - 1] : clean;
  const initials = parts.slice(0, -1).map(part => `${part.charAt(0).toUpperCase()}.`).join(" ");
  return { full: clean, last, initials };
}

function formatApaCitation(record) {
  const author = splitCreatorName(record.creator);
  const year = extractCitationYear(record.period) || "n.d.";
  const title = record.title || "Untitled";
  const source = record.institution || record.source || "Decolonising Archive";
  const url = record.sourceUrl || "";
  return `${author.last}, ${author.initials} (${year}). ${title}. ${source}.${url ? ` ${url}` : ""}`;
}

function formatChicagoCitation(record) {
  const creator = record.creator || "Unknown";
  const year = extractCitationYear(record.period) || "n.d.";
  const title = record.title || "Untitled";
  const source = record.institution || record.source || "Decolonising Archive";
  const url = record.sourceUrl || "";
  return `${creator}. "${title}." ${source}, ${year}.${url ? ` ${url}` : ""}`;
}

function formatMlaCitation(record) {
  const creator = record.creator || "Unknown";
  const title = record.title || "Untitled";
  const source = record.institution || record.source || "Decolonising Archive";
  const year = extractCitationYear(record.period) || "n.d.";
  const url = record.sourceUrl || "";
  return `${creator}. "${title}." ${source}, ${year}.${url ? ` ${url}` : ""}`;
}

function formatHarvardCitation(record) {
  const creator = record.creator || "Unknown";
  const year = extractCitationYear(record.period) || "n.d.";
  const title = record.title || "Untitled";
  const source = record.institution || record.source || "Decolonising Archive";
  const url = record.sourceUrl || "";
  return `${creator} (${year}) ${title}. ${source}.${url ? ` Available at: ${url}` : ""}`;
}

function generateCitationByStyle(record, style = "apa") {
  if (style === "chicago") return formatChicagoCitation(record);
  if (style === "mla") return formatMlaCitation(record);
  if (style === "harvard") return formatHarvardCitation(record);
  return formatApaCitation(record);
}

function generateRIS(record) {
  const lines = [];
  const year = extractCitationYear(record.period);
  lines.push(`TY  - ${mapRecordTypeToRIS(record.type)}`);
  if (record.title) lines.push(`TI  - ${record.title}`);
  if (record.creator) lines.push(`AU  - ${record.creator}`);
  if (year) lines.push(`PY  - ${year}`);
  if (record.institution || record.source) lines.push(`PB  - ${record.institution || record.source}`);
  if (record.collection) lines.push(`T2  - ${record.collection}`);
  if (record.sourceUrl) lines.push(`UR  - ${record.sourceUrl}`);
  if (record.recordIdentifier || record.archiveIdentifier) lines.push(`ID  - ${record.recordIdentifier || record.archiveIdentifier}`);
  lines.push("ER  -");
  return lines.join("\n");
}

async function copyCitation(record) {
  const citation = generateCitationByStyle(record, citationStyle);
  await navigator.clipboard.writeText(citation);
}

function downloadRIS(record) {
  const ris = generateRIS(record);
  const blob = new Blob([ris], { type: "application/x-research-info-systems" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const safeName = (record.title || "record").toLowerCase().replace(/[^a-z0-9]+/g, "-");
  link.href = url;
  link.download = `${safeName}.ris`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function bibtexEscape(value) {
  return String(value || "")
    .replace(/\\/g, "\\\\")
    .replace(/{/g, "\\{")
    .replace(/}/g, "\\}");
}

function mapRecordTypeToBibTeX(type) {
  const value = String(type || "").toLowerCase();
  if (value.includes("book")) return "book";
  if (value.includes("journal") || value.includes("article")) return "article";
  if (value.includes("archival")) return "misc";
  if (value.includes("oral")) return "misc";
  if (value.includes("image")) return "misc";
  if (value.includes("artefact") || value.includes("artifact")) return "misc";
  return "misc";
}

function generateBibTeX(record) {
  const entryType = mapRecordTypeToBibTeX(record.type);
  const keyBase = slugify(`${record.creator || "unknown"}-${record.title || "record"}-${extractCitationYear(record.period) || "nd"}`) || "archive-record";
  const lines = [
    `@${entryType}{${keyBase},`,
    `  author = {${bibtexEscape(record.creator || "Unknown")}},`,
    `  title = {${bibtexEscape(record.title || "Untitled")}},`
  ];
  const year = extractCitationYear(record.period);
  if (year) lines.push(`  year = {${year}},`);
  if (record.institution || record.source) lines.push(`  publisher = {${bibtexEscape(record.institution || record.source)}},`);
  if (record.collection) lines.push(`  series = {${bibtexEscape(record.collection)}},`);
  if (record.sourceUrl) lines.push(`  url = {${bibtexEscape(record.sourceUrl)}},`);
  if (record.recordIdentifier || record.archiveIdentifier) lines.push(`  note = {Record ID: ${bibtexEscape(record.recordIdentifier || record.archiveIdentifier)}},`);
  lines.push(`}`);
  return lines.join("\n");
}

function downloadBibTeX(record) {
  const bib = generateBibTeX(record);
  const blob = new Blob([bib], { type: "application/x-bibtex" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const safeName = (record.title || "record").toLowerCase().replace(/[^a-z0-9]+/g, "-");
  link.href = url;
  link.download = `${safeName}.bib`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function renderTagSection(label, values, extraClass = "") {
  if (!values || !values.length) return "";
  return `
    <section class="detail-section">
      <h2>${escapeHtml(label)}</h2>
      <div class="tag-row">
        ${values.map(value => `<span class="tag ${extraClass}">${escapeHtml(value)}</span>`).join("")}
      </div>
    </section>
  `;
}

function renderRecordWorkspaceTools(record) {
  const state = getRecordWorkspaceState(record.id);
  if (state.status === "idle") {
    queueMicrotask(() => fetchRecordWorkspaceState(record));
  }

  if (state.status === "loading" || state.authenticated === null) {
    return `
      <section class="detail-section record-workspace-tools">
        <h2>My workspace</h2>
        <p class="record-tools-muted">Loading your saved tools...</p>
      </section>
    `;
  }

  if (!state.authenticated) {
    return `
      <section class="detail-section record-workspace-tools">
        <h2>My workspace</h2>
        <p class="record-tools-muted">Sign in to bookmark this record, save related searches, and create reading lists.</p>
        <a class="record-tools-primary" href="${escapeHtml(memberSignInUrl())}">Sign in to save</a>
      </section>
    `;
  }

  const data = state.data || {};
  const readingLists = data.readingLists || [];
  const bookmark = data.bookmark;
  const messageClass = state.status === "saving"
    ? "record-tools-message is-loading"
    : state.status === "error"
      ? "record-tools-message is-error"
      : state.message
        ? "record-tools-message is-success"
        : "record-tools-message";
  const message = state.status === "saving"
    ? `<p class="${messageClass}" aria-label="Saving"></p>`
    : state.message
      ? `<p class="${messageClass}">${escapeHtml(state.message)}</p>`
      : "";
  const defaultSearch = uniqueValues([record.title, record.creator, record.collection, record.region].filter(Boolean)).slice(0, 3).join(" ");

  return `
    <section class="detail-section record-workspace-tools">
      <h2>My workspace</h2>
      ${message}
      <div class="record-tools-stack">
        <form class="record-tool-form" data-record-tool="bookmark">
          <div class="record-tool-heading">
            <strong>${bookmark ? "Bookmarked" : "Bookmark record"}</strong>
            ${bookmark ? `<span>Saved</span>` : ""}
          </div>
          <label>
            <span>Private note</span>
            <textarea name="note" rows="3" placeholder="Why this record matters">${escapeHtml(bookmark?.note || "")}</textarea>
          </label>
          <button type="submit">${bookmark ? "Update bookmark" : "Save bookmark"}</button>
        </form>

        <form class="record-tool-form" data-record-tool="save_search">
          <div class="record-tool-heading">
            <strong>Save search</strong>
          </div>
          <label>
            <span>Search query</span>
            <input name="query" value="${escapeHtml(defaultSearch)}" />
          </label>
          <button type="submit">Save search</button>
        </form>

        <form class="record-tool-form" data-record-tool="add_to_reading_list">
          <div class="record-tool-heading">
            <strong>Add to reading list</strong>
            <span>${readingLists.length} list${readingLists.length === 1 ? "" : "s"}</span>
          </div>
          ${readingLists.length ? `
            <label>
              <span>Add to existing</span>
              <select name="readingListId" required>
                <option value="">Choose list</option>
                ${readingLists.map(list => `<option value="${escapeHtml(list.id)}">${escapeHtml(list.title)}</option>`).join("")}
              </select>
            </label>
            <button type="submit" ${state.status === "saving" ? "disabled" : ""}>Add to list</button>
          ` : `
            <p class="record-tools-muted">No reading lists yet.</p>
          `}
        </form>

        <form class="record-tool-form" data-record-tool="create_reading_list">
          <div class="record-tool-heading">
            <strong>Create list with this record</strong>
          </div>
          <label>
            <span>List title</span>
            <input name="title" placeholder="Research list title" />
          </label>
          <label class="record-tool-check">
            <input type="checkbox" name="isPublic" />
            <span>Public list</span>
          </label>
          <button type="submit" ${state.status === "saving" ? "disabled" : ""}>Create list</button>
        </form>

      </div>
    </section>
  `;
}

function renderCardWorkspaceActions(record) {
  if (memberWorkspaceState.status === "idle") {
    queueMicrotask(fetchMemberWorkspaceState);
  }

  if (memberWorkspaceState.status === "loading" || memberWorkspaceState.authenticated === null) {
    return `<div class="record-card-icon-row" data-stop-card-open="true"><span class="record-card-loading" aria-live="polite">…</span></div>`;
  }

  if (!memberWorkspaceState.authenticated) {
    return `
      <div class="record-card-icon-row" data-stop-card-open="true">
        <button class="record-card-icon-btn" type="button" data-member-signin aria-label="Sign in to bookmark" title="Sign in to bookmark">
          ${iconBookmarkOutline()}
        </button>
        <button class="record-card-icon-btn" type="button" data-member-signin aria-label="Sign in to manage reading lists" title="Sign in to manage reading lists">
          ${iconListPlus()}
        </button>
        <button class="record-card-icon-btn" type="button" data-member-signin aria-label="Sign in for Archive Workbench" title="Sign in for Archive Workbench">
          ${iconWorkbenchLayers()}
        </button>
      </div>
    `;
  }

  const data = memberWorkspaceState.data || {};
  const readingLists = data.readingLists || [];
  const workbenchProjects = data.workbenchProjects || [];
  const bookmarked = (data.bookmarkRecordIds || []).includes(record.id);
  const isSaving = memberWorkspaceState.status === "saving";
  const listComposerOpen = getCardListComposerOpen(record.id);
  const workbenchComposerOpen = getCardWorkbenchComposerOpen(record.id);
  const message = memberWorkspaceState.message ? `<span class="record-card-message">${escapeHtml(memberWorkspaceState.message)}</span>` : "";
  return `
    <div class="record-card-actions-wrap" data-record-id="${escapeHtml(record.id)}" data-stop-card-open="true">
      <div class="record-card-icon-row">
        <button
          class="record-card-icon-btn ${bookmarked ? "is-active" : ""}"
          type="button"
          data-card-bookmark
          aria-label="${bookmarked ? "Remove bookmark" : "Save bookmark"}"
          title="${bookmarked ? "Remove bookmark" : "Save bookmark"}"
          ${isSaving ? "disabled" : ""}
        >
          ${isSaving ? `<span class="record-card-spinner" aria-hidden="true"></span>` : bookmarked ? iconBookmarkCheck() : iconBookmarkOutline()}
        </button>
        <button
          class="record-card-icon-btn ${listComposerOpen ? "is-active" : ""}"
          type="button"
          data-card-list-toggle
          aria-expanded="${listComposerOpen ? "true" : "false"}"
          aria-label="${listComposerOpen ? "Hide list actions" : "Show list actions"}"
          title="${listComposerOpen ? "Hide list actions" : "Add to reading list"}"
          ${isSaving ? "disabled" : ""}
        >
          ${iconListPlus()}
        </button>
        <button
          class="record-card-icon-btn ${workbenchComposerOpen ? "is-active" : ""}"
          type="button"
          data-card-workbench-toggle
          aria-expanded="${workbenchComposerOpen ? "true" : "false"}"
          aria-label="${workbenchComposerOpen ? "Hide Workbench" : "Add to Workbench"}"
          title="${workbenchComposerOpen ? "Hide Workbench" : "Add to Workbench"}"
          ${isSaving ? "disabled" : ""}
        >
          ${iconWorkbenchLayers()}
        </button>
      </div>
      ${listComposerOpen ? `
        <div class="record-card-list-create">
          ${readingLists.length ? `
            <select class="record-card-select" data-card-reading-list aria-label="Choose reading list">
              <option value="">Reading list</option>
              ${readingLists.map(list => `<option value="${escapeHtml(list.id)}">${escapeHtml(list.title)}</option>`).join("")}
            </select>
            <button class="record-card-inline-btn" type="button" data-card-add-list ${isSaving ? "disabled" : ""}>Add</button>
          ` : ""}
          <input class="record-card-input" data-card-new-list type="text" placeholder="New list" aria-label="New reading list title" />
          <button class="record-card-inline-btn" type="button" data-card-create-list ${isSaving ? "disabled" : ""}>Create</button>
        </div>
      ` : ""}
      ${workbenchComposerOpen ? `
        <div class="record-card-list-create record-card-workbench-panel">
          ${workbenchProjects.length ? `
            <select class="record-card-select" data-card-workbench-project aria-label="Choose Workbench project">
              <option value="">Workbench project</option>
              ${workbenchProjects.map(p => `<option value="${escapeHtml(p.id)}">${escapeHtml(p.title)}</option>`).join("")}
            </select>
            <button class="record-card-inline-btn" type="button" data-card-workbench-add ${isSaving ? "disabled" : ""}>Add</button>
          ` : `<p class="record-tools-muted">No projects yet.</p>`}
          <input class="record-card-input" data-card-new-workbench-project type="text" placeholder="New project title" aria-label="New Workbench project title" />
          <button class="record-card-inline-btn" type="button" data-card-workbench-create ${isSaving ? "disabled" : ""}>Create</button>
          <a class="record-card-inline-link" href="/my/workbench">Workbench →</a>
        </div>
      ` : ""}
      ${message}
    </div>
  `;
}

function renderActionList(record) {
  const actions = buildRecordActions(record);
  const collection = COLLECTIONS.find(item => item.title === record.collection);

  const items = actions.map(action => {
    if (action.url) {
      return `<a class="action-link" href="${escapeHtml(action.url)}" target="_blank" rel="noopener noreferrer">
        <div>
          <span>${escapeHtml(action.label)}</span>
          ${action.note ? `<small>${escapeHtml(action.note)}</small>` : ""}
        </div>
        <span>↗</span>
      </a>`;
    }

    if (collection) {
      return `<a class="action-link" href="${archiveHref("library")}" data-page="library" data-collection="${escapeHtml(collection.title)}">
        <div>
          <span>Browse collection</span>
          <small>${escapeHtml(collection.title)}</small>
        </div>
        <span>→</span>
      </a>`;
    }

    return "";
  }).filter(Boolean);

  items.push(`
    <a class="action-link" href="javascript:void(0)" id="copyCitationBtn">
      <div>
        <span>Copy citation</span>
        <small id="copyCitationNote">Copy archive citation text</small>
      </div>
      <span>⎘</span>
    </a>
  `);

  items.push(`
    <a class="action-link" href="javascript:void(0)" id="downloadRisBtn">
      <div>
        <span>Download RIS</span>
        <small>Export for Zotero, EndNote, or Mendeley</small>
      </div>
      <span>↓</span>
    </a>
  `);

  items.push(`
    <a class="action-link" href="javascript:void(0)" id="downloadBibBtn">
      <div>
        <span>Download BibTeX</span>
        <small>Export for LaTeX and reference managers</small>
      </div>
      <span>↓</span>
    </a>
  `);

  return `
    <section class="detail-section">
      <h2>Links &amp; Access</h2>
      <div class="action-list">${items.join("")}</div>
    </section>
  `;
}

function renderHome() {
  const featured = getFeaturedRecords();
  const featuredCollections = getFeaturedCollections();
  const featuredKnowledgeAreas = getFeaturedThemes();
  const relatedPreview = getRelatedSearchSuggestions("", 14);
  const relatedCount = RELATED_SEARCH_INDEX.length;
  const countryCount = COUNTRY_TERRITORIES.length;
  const languageCount = LANGUAGE_INDEX.length;
  const searchReadyCount = SOURCES.filter(source => source.access === "search").length;

  return `
    <div class="page active">
      <section class="hero">
        <div class="hero-inner">
          <div class="hero-eyebrow">${RECORDS.length} archive-indexed records · 300,000+ archive horizon · static-hosted discovery architecture</div>
          <h1>The archive of<br/><strong>decolonising knowledge</strong></h1>
          <p class="hero-sub">Books, oral histories, artefacts, images, textiles, posters, manuscripts, architectural documentation, and cultural records across Africa, the diaspora, and the Global South.</p>
          <div class="hero-search">
            <input type="text" id="heroSearch" placeholder="Search by title, creator, knowledge area, region, community…" autocomplete="off"/>
            <button id="heroSearchBtn" type="button">Search</button>
            ${renderSearchSuggestions("heroSuggestions")}
          </div>
          ${renderRecentSearches('hero')}
          <div class="hero-suggestions">
            ${FEATURED_QUERY_SUGGESTIONS.slice(0, 7).map(term => `<span class="suggestion" data-q="${escapeHtml(term)}">${escapeHtml(term)}</span>`).join("")}
          </div>
          <div class="hero-note">Core browsing runs from a stable archive index, while collections, knowledge areas, related searches, languages, source pathways, and search-ready handoffs scale well beyond the bundled record count.</div>
        </div>
      </section>

      <div class="stats-bar">
        <div class="stats-bar-inner">
          ${[
            [relatedCount.toLocaleString(), "Related searches"],
            [COLLECTIONS.length, "Collections"],
            [THEMES.length, "Knowledge Areas"],
            [SOURCES.length, "Source pathways"],
            [searchReadyCount, "Search-ready sources"],
            [countryCount, "Countries & territories"],
            [languageCount, "Languages"]
          ].map(([count, label]) => `
            <div class="stat-item">
              <div class="stat-n">${escapeHtml(String(count))}</div>
              <div class="stat-l">${escapeHtml(String(label))}</div>
            </div>
          `).join("").repeat(2)}
        </div>
      </div>

      <section class="section">
        <div class="section-header">
          <span class="section-title">Featured Records</span>
          <a href="${archiveHref("library")}" class="section-link" data-page="library">Browse all →</a>
        </div>
        <div class="card-grid">${featured.map(renderCard).join("")}</div>
      </section>

      <section class="section alt">
        <div class="section-header">
          <span class="section-title">Collections</span>
          <a href="${archiveHref("library")}" class="section-link" data-page="library">120+ collection pathways →</a>
        </div>
        <div class="coll-grid">
          ${featuredCollections.map(renderCollectionCard).join("")}
        </div>
      </section>

      <section class="section">
        <div class="section-header">
          <span class="section-title">Browse by Knowledge Area</span>
          <a href="${archiveHref("library")}" class="section-link" data-page="library">220+ knowledge areas →</a>
        </div>
        ${renderRelatedSearchTags(featuredKnowledgeAreas)}
      </section>

      <section class="section alt">
        <div class="section-header">
          <span class="section-title">Related Searches</span>
          <span class="section-link">${relatedCount.toLocaleString()} indexed discovery routes</span>
        </div>
        <p class="section-copy">Related searches connect knowledge areas, regions, communities, institutions, media types, languages, and nearby concepts so users can move laterally when a query is too narrow, too sparse, or phrased differently.</p>
        ${renderRelatedSearchTags(relatedPreview)}
      </section>

      <section class="section">
        <div class="section-header"><span class="section-title">Who is this archive for?</span></div>
        <div class="audience-grid">
          <div class="audience-card">
            <div class="audience-title">Researchers &amp; Academics</div>
            <ul class="audience-list">
              <li>Local indexed browsing that works on any static host</li>
              <li>Richer record detail with provenance, rights, and citation fields</li>
              <li>Related-search recovery across 2,500+ discovery routes</li>
              <li>Optional source handoffs to 40+ search-ready archives</li>
            </ul>
          </div>
          <div class="audience-card">
            <div class="audience-title">Students</div>
            <ul class="audience-list">
              <li>Curated anchor records plus an expanded African philosophy working library</li>
              <li>Knowledge area-led search, related-search guidance, and collection pathways</li>
              <li>Fast loading and mobile-safe browsing</li>
              <li>No sign-in or backend required</li>
            </ul>
          </div>
          <div class="audience-card">
            <div class="audience-title">Institutions</div>
            <ul class="audience-list">
              <li>Clear source and custody fields on every record</li>
              <li>Extensible data model for images, notes, and related records</li>
              <li>Static deployment with no fragile client-side dependency chain</li>
              <li>Source directory for institutional pathways and partnerships</li>
            </ul>
          </div>
          <div class="audience-card">
            <div class="audience-title">Independent Readers</div>
            <ul class="audience-list">
              <li>Calm editorial interface with clear navigation</li>
              <li>Useful detail pages instead of thin metadata stubs</li>
              <li>Direct paths to institutions where available</li>
              <li>Responsive layout across desktop and mobile</li>
            </ul>
          </div>
        </div>
      </section>
    </div>
  `;
}

function renderSourceCard(source, isDiscovery = false) {
  const statusClass = {search:"status-search",linked:"status-linked",partner:"status-partner",internal:"status-linked"}[source.access] || "status-linked";
  const statusLabel = {search:"Search-ready",linked:"Directory",partner:"Partnership",internal:"Internal"}[source.access] || source.access;
  const actionUrl = isDiscovery ? source.actionUrl : safeUrl(source.url);
  const actionLabel = isDiscovery ? `${source.actionLabel} →` : (source.access === "search" ? "Open source →" : source.access === "partner" ? "Partnership pathway →" : "View pathway →");

  return `
    <article class="source-card">
      <div class="source-header">
        <div class="source-name">${escapeHtml(source.name)}</div>
        <span class="status-chip ${statusClass}">${escapeHtml(statusLabel)}</span>
      </div>
      <div class="source-region">${escapeHtml(source.region)}</div>
      <div class="source-desc">${escapeHtml(source.desc)}</div>
      ${actionUrl ? `<a href="${escapeHtml(actionUrl)}" target="_blank" rel="noopener noreferrer" class="source-action">${escapeHtml(actionLabel)}</a>` : `<span class="source-action disabled">No public link available</span>`}
    </article>
  `;
}

function renderSources() {
  const groups = [
    {title:`African-Priority Rooms (${SOURCES.filter(source => source.type === "African-Priority").length})`, items:SOURCES.filter(source => source.type === "African-Priority"), alt:false},
    {title:`Search-Ready Sources (${SOURCES.filter(source => source.type === "Search-Ready").length})`, items:SOURCES.filter(source => source.type === "Search-Ready"), alt:true},
    {title:`Internal Architecture Pathways (${SOURCES.filter(source => source.type === "Internal Architecture").length})`, items:SOURCES.filter(source => source.type === "Internal Architecture"), alt:false},
    {title:`Partner & Community Routes (${SOURCES.filter(source => source.type === "Partner & Community").length})`, items:SOURCES.filter(source => source.type === "Partner & Community"), alt:true}
  ];
  const searchReadyCount = SOURCES.filter(source => source.access === "search").length;

  return `
    <div class="page active">
      <section class="hero hero-compact">
        <div class="hero-inner">
          <div class="hero-eyebrow">${SOURCES.length} source pathways · ${searchReadyCount} search-ready routes · static-friendly discovery model</div>
          <h1 class="source-hero-title">Archive <strong>source directory</strong></h1>
          <p class="hero-sub hero-sub-tight">The source directory now reflects a larger archive architecture: African-priority institutions, search-ready discovery layers, internal enrichment pathways, and partner routes for records that cannot simply be fetched in the browser.</p>
        </div>
      </section>

      ${groups.filter(group => group.items.length).map(group => `
        <section class="section ${group.alt ? "alt" : ""}">
          <div class="section-header"><span class="section-title">${group.title}</span></div>
          <div class="source-grid">${group.items.map(source => renderSourceCard(source)).join("")}</div>
        </section>
      `).join("")}

      <section class="section">
        <div class="section-header"><span class="section-title">Access Protocols &amp; Rights</span></div>
        <div class="protocol-grid">
          <div class="protocol-cell"><strong>Archive Index</strong>The core archive runs from a static archive dataset so browsing and search remain stable when hosted on any static domain.</div>
          <div class="protocol-cell"><strong>Search-Ready</strong>Links open the originating archive or discovery interface in a new tab rather than depending on fragile browser-side API aggregation.</div>
          <div class="protocol-cell"><strong>Directory</strong>Institutional homepages, repository directories, and partner routes remain visible even when item-level access is external or rights-limited.</div>
          <div class="protocol-cell"><strong>Partnership</strong>Some collections require institutional access, custodial agreements, or on-site consultation rather than public download.</div>
          <div class="protocol-cell"><strong>Internal Architecture</strong>Search expansion, taxonomy registries, enrichment layers, and routing logic are represented as first-class pathways inside the archive model.</div>
          <div class="protocol-cell"><strong>Community Custodianship</strong>Records may describe knowledge held by originating communities. Discovery does not override community governance or rights.</div>
          <div class="protocol-cell"><strong>Rights Handling</strong>Metadata and summaries can remain open while the underlying source retains its own access restrictions, licences, or viewing conditions.</div>
        </div>
      </section>
    </div>
  `;
}

function renderAbout() {
  const about = siteContent.about || {};

  return `
    <div class="page active">
      <div class="about-body">
        <div class="hero-eyebrow eyebrow-tight">${escapeHtml(about.eyebrow || "About")}</div>
        <h1>${escapeHtml(about.title || "About this archive")}</h1>
        <p class="about-lead">${escapeHtml(about.lead || "")}</p>

        <div class="about-richtext">${about.body || ""}</div>

        <h2>${escapeHtml(about.missionTitle || "Mission")}</h2>
        <div class="about-richtext">${about.missionBody || ""}</div>

        <h2>${escapeHtml(about.contactTitle || "Contact")}</h2>
        <div class="about-richtext">${about.contactBody || ""}</div>
      </div>
    </div>
  `;
}

function render() {
  const app = document.getElementById("app");
  if (!app) return;
  if (currentPage === "home") app.innerHTML = renderHome();
  if (currentPage === "library") app.innerHTML = renderLibrary();
  if (currentPage === "sources") app.innerHTML = renderSources();
  if (currentPage === "about") app.innerHTML = renderAbout();
  if (currentPage === "record") app.innerHTML = renderRecord();
  bindEvents();
}

let liveResults = [];
let liveStatus = {state:"idle", message:"", sources:[]};
/** Populated when the open-access aggregator returns notice copy (DOAB + external disclaimer). */
let openAccessNotices = null;
const LIVE_RESULT_CACHE = new Map();
const TRANSIENT_RESULTS_BY_ID = new Map();

function createHandoffAdapter(id, label, trust) {
  return {
    id,
    label,
    trust,
    async search(query) {
      const normalized = String(query || "").trim();
      return normalized ? buildInstitutionalSearchLinks(normalized).filter(item => item.liveSourceHint === id) : [];
    }
  };
}

const LIVE_SOURCE_ADAPTERS = [
  {
    id:"core",
    label:"CORE",
    trust:0.9,
    async search(query, options = {}) {
      const offset = Number(options.offset || 0);
      const limit = Number(options.limit || coreLimit);
      const response = await fetchWithTimeout(`/api/core-search?q=${encodeURIComponent(query)}&limit=${limit}&offset=${offset}`, {}, 9000);
      const data = await response.json();
      if (!response.ok || !data.ok) {
        throw new Error(data.detail || data.error || 'CORE search failed');
      }
      if (data.partial) {
        console.warn('[LIVE] CORE returned partial results:', data.warning || 'cluster under load');
      }
      const incomingHits = Number(data.totalHits || 0); if (incomingHits > 0) coreTotalHits = incomingHits;
      return Array.isArray(data.results) ? data.results : [];
    }
  },
  {
    id:"openAccess",
    label:"Open access & OER",
    trust:0.82,
    async search(query) {
      const response = await fetchWithTimeout(`/api/external-open-access?q=${encodeURIComponent(query)}`, { headers: { Accept: "application/json" } }, 9000);
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        return {
          items: [],
          sourceStatuses: [{ id: "external-open-access", label: "Open access API", state: "fail", message: `HTTP ${response.status}` }],
          notices: null,
          openAccessFetchFailed: true,
        };
      }
      const raw = Array.isArray(data.results) ? data.results : [];
      const items = raw.map((entry) => normalizeLiveRecord(entry));
      console.log("[EXTERNAL API RESULTS]", raw.length, items.slice(0, 2));
      return {
        items,
        sourceStatuses: Array.isArray(data.sourceStatuses) ? data.sourceStatuses : [],
        notices: data.notices || null,
      };
    }
  },
  createHandoffAdapter("britishmuseum", "British Museum", 0.74),
  createHandoffAdapter("unilever", "Unilever Archives", 0.72),
  createHandoffAdapter("uac", "United Africa Company", 0.78),
  createHandoffAdapter("britishlibrary", "British Library", 0.75),
  createHandoffAdapter("trove", "Trove", 0.73),
  createHandoffAdapter("smithsonian", "Smithsonian", 0.74),
  createHandoffAdapter("googlebooks", "Google Books", 0.68),
  createHandoffAdapter("worldcat", "WorldCat", 0.76),
  createHandoffAdapter("nlsa", "National Library of South Africa", 0.78),
  createHandoffAdapter("ufh", "University of Fort Hare / ANC Archives", 0.8),
  createHandoffAdapter("nigeriaarchives", "National Archives of Nigeria", 0.7),
  createHandoffAdapter("zimbabwearchives", "National Archives of Zimbabwe", 0.7),
  createHandoffAdapter("ugandaarchives", "Uganda National Archives", 0.69),
  createHandoffAdapter("bodleian", "Bodleian / Rhodes House", 0.73),
  {
    id:"openlibrary",
    label:"Open Library",
    trust:0.92,
    async search(query) {
      const json = await fetchJsonWithTimeout(`https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=8`, {}, 5500);
      const docs = Array.isArray(json.docs) ? json.docs.slice(0, 8) : [];
      return docs.map((doc, index) => normalizeLiveRecord({
        id:`live-openlibrary-${slugify((doc.key || doc.cover_edition_key || doc.title || query) + "-" + index)}`,
        title: doc.title || "Untitled record",
        creator: Array.isArray(doc.author_name) ? doc.author_name.join(", ") : (doc.author_name || "Unknown creator"),
        summary: doc.first_sentence ? stringifySentence(doc.first_sentence) : "",
        abstract: "",
        description:[
          doc.publisher && doc.publisher.length ? `Publishers: ${doc.publisher.slice(0, 3).join(", ")}.` : "",
          doc.subject && doc.subject.length ? `Subjects: ${doc.subject.slice(0, 6).join(", ")}.` : ""
        ].filter(Boolean),
        period: doc.first_publish_year ? String(doc.first_publish_year) : "",
        type:"Book",
        cat:"External books",
        region: inferRegionFromText([doc.place, doc.subject, doc.publisher].flat().filter(Boolean).join(" ")),
        country: inferCountryFromText([doc.place, doc.subject].flat().filter(Boolean).join(" ")),
        collection:"Open Library external discovery",
        institution:"Open Library",
        source:"Open Library",
        sourceUrl: doc.key ? `https://openlibrary.org${doc.key}` : `https://openlibrary.org/search?q=${encodeURIComponent(query)}`,
        sourceActionLabel:"View source record",
        externalLinks:[{label:"Open Library search", url:`https://openlibrary.org/search?q=${encodeURIComponent(query)}`}],
        language: uniqueValues((doc.language || []).map(code => mapLanguageCode(code))),
        tags: uniqueValues([...(doc.subject || []).slice(0, 6), ...(doc.person || []).slice(0, 2)]),
        concepts: inferConceptsFromText([doc.title, ...(doc.subject || [])].join(" ")),
        themes: inferThemesFromText([doc.title, ...(doc.subject || [])].join(" ")),
        images: buildOpenLibraryImages(doc),
        rights:"External source rights apply",
        provenance:"External metadata pulled from Open Library search.",
        citation: buildSimpleCitation(doc.title || "Untitled", Array.isArray(doc.author_name) ? doc.author_name.join(", ") : (doc.author_name || "Unknown creator"), doc.first_publish_year || "", "Open Library"),
        notes:["External-source record. Metadata completeness varies by source."],
        recordIdentifier: doc.key || doc.cover_edition_key || "",
        archiveIdentifier:`OL-${doc.cover_edition_key || doc.key || index}`,
        resultMode:"live",
        trustScore:0.92,
        liveSourceHint:"openlibrary"
      }));
    }
  },
  {
    id:"crossref",
    label:"Crossref",
    trust:0.89,
    async search(query) {
      // NOTE: `language` is NOT a valid Crossref `select` field — including it
      // makes the API reject the entire request with 400. (Authoritative list:
      // https://github.com/fabiobatalha/crossrefapi -> Works.FIELDS_SELECT.)
      // We rely on `mapLanguageCode(item.language)` falling back to "" when
      // the field is absent in the response.
      // `mailto` puts us in Crossref's "polite pool" (priority routing /
      // fewer 429s); harmless if you change the address.
      const json = await fetchJsonWithTimeout(`https://api.crossref.org/works?rows=8&query.bibliographic=${encodeURIComponent(query)}&select=DOI,title,author,issued,abstract,URL,container-title,type,subject,publisher,license,link&mailto=archive@ared.design`, {headers:{Accept:"application/json"}}, 6500);
      const items = json?.message?.items && Array.isArray(json.message.items) ? json.message.items.slice(0, 8) : [];
      return items.map((item, index) => {
        const authors = Array.isArray(item.author) ? item.author.map(person => [person.given, person.family].filter(Boolean).join(" ").trim()).filter(Boolean) : [];
        const title = Array.isArray(item.title) ? item.title[0] : (item.title || "Untitled record");
        const abstract = stripJats(item.abstract || "");
        const licenceUrl = item.license?.[0]?.URL || item.license?.[0]?.url || "";
        const pdfLink = (item.link || []).find(link => /pdf/i.test(`${link["content-type"] || ""} ${link.URL || ""}`))?.URL || "";
        const htmlLink = (item.link || []).find(link => /html/i.test(`${link["content-type"] || ""} ${link.URL || ""}`))?.URL || "";
        return normalizeLiveRecord({
          id:`live-crossref-${slugify((item.DOI || title) + "-" + index)}`,
          title,
          creator: authors.join(", ") || "Unknown creator",
          summary: abstract ? abstract.slice(0, 320) : `${Array.isArray(item["container-title"]) && item["container-title"][0] ? item["container-title"][0] : "Scholarly record"} surfaced via external metadata search.`,
          abstract,
          description:[
            Array.isArray(item.subject) && item.subject.length ? `Subjects: ${item.subject.slice(0, 6).join(", ")}.` : "",
            item.publisher ? `Publisher: ${item.publisher}.` : ""
          ].filter(Boolean),
          period: item.issued?.["date-parts"]?.[0]?.[0] ? String(item.issued["date-parts"][0][0]) : "",
          type: mapCrossrefType(item.type),
          cat:"Research & scholarly metadata",
          region: inferRegionFromText([title, ...(item.subject || [])].join(" ")),
          country: inferCountryFromText([title, ...(item.subject || [])].join(" ")),
          collection:"Crossref external discovery",
          institution: Array.isArray(item["container-title"]) ? item["container-title"][0] : "Crossref",
          source:"Crossref",
          sourceUrl: item.URL || (item.DOI ? `https://doi.org/${item.DOI}` : `https://search.crossref.org/?q=${encodeURIComponent(query)}`),
          licence_url: licenceUrl,
          pdf_url: pdfLink,
          html_url: htmlLink,
          sourceActionLabel:"Open source record",
          externalLinks: item.DOI ? [{label:"DOI", url:`https://doi.org/${item.DOI}`}] : [],
          language: uniqueValues([mapLanguageCode(item.language)]),
          tags: uniqueValues(item.subject || []),
          concepts: inferConceptsFromText([title, ...(item.subject || [])].join(" ")),
          themes: inferThemesFromText([title, ...(item.subject || [])].join(" ")),
          images: [],
          rights:"External source rights apply",
          provenance:"External metadata pulled from Crossref.",
          citation: buildSimpleCitation(title, authors.join(", ") || "Unknown creator", item.issued?.["date-parts"]?.[0]?.[0] || "", "Crossref"),
          notes:["External-source scholarly metadata. Some abstracts are shortened for display."],
          recordIdentifier: item.DOI || "",
          archiveIdentifier: item.DOI ? `DOI:${item.DOI}` : `CR-${index}`,
          resultMode:"live",
          trustScore:0.89,
          liveSourceHint:"crossref"
        });
      });
    }
  },
  {
    id:"loc",
    label:"Library of Congress",
    trust:0.9,
    async search(query) {
      const json = await fetchJsonWithTimeout(`https://www.loc.gov/search/?fo=json&fa=partof:general%20collections&q=${encodeURIComponent(query)}`, {}, 7000);
      const items = Array.isArray(json.results) ? json.results.slice(0, 8) : [];
      return items.map((item, index) => normalizeLiveRecord({
        id:`live-loc-${slugify((item.id || item.url || item.title || query) + "-" + index)}`,
        title: item.title || "Untitled record",
        creator: Array.isArray(item.contributor_names) ? item.contributor_names.join(", ") : (item.creator || item.contributor || "Library of Congress"),
        summary: item.description || item.item?.description || item.subject?.slice?.(0, 3)?.join(", ") || "External archival result from the Library of Congress.",
        abstract: item.description || "",
        description:[
          item.original_format && item.original_format.length ? `Format: ${item.original_format.join(", ")}.` : "",
          item.subject && item.subject.length ? `Subjects: ${item.subject.slice(0, 6).join(", ")}.` : ""
        ].filter(Boolean),
        period: item.date || "",
        type: mapLocType(item.format?.[0] || item.original_format?.[0] || ""),
        cat:"External cultural heritage",
        region: inferRegionFromText([item.title, ...(item.subject || []), item.description || ""].join(" ")),
        country: inferCountryFromText([item.title, ...(item.subject || [])].join(" ")),
        collection:"Library of Congress external discovery",
        institution:"Library of Congress",
        source:"Library of Congress",
        sourceUrl: item.url || item.id || `https://www.loc.gov/search/?in=all&q=${encodeURIComponent(query)}`,
        rights: firstText(item.rights_advisory, item.rights_information, item.item?.rights_advisory, item.item?.rights_information, item.access_restricted, item.reproduction_number) || "External source rights apply",
        rights_statement: firstText(item.rights_advisory, item.rights_information, item.item?.rights_advisory, item.item?.rights_information),
        access_type: item.url || item.id ? "External Link Only" : "Metadata Only",
        sourceActionLabel:"View source record",
        externalLinks: item.image_url && item.image_url.length ? [{label:"LoC media", url:item.image_url[0]}] : [],
        language: uniqueValues([mapLanguageCode(item.language?.[0])]),
        tags: uniqueValues([...(item.subject || []).slice(0, 6), ...(item.locations || []).slice(0, 2)]),
        concepts: inferConceptsFromText([item.title, ...(item.subject || [])].join(" ")),
        themes: inferThemesFromText([item.title, ...(item.subject || [])].join(" ")),
        images: buildLocImages(item),
        rights:"External source rights apply",
        provenance:"External metadata pulled from the Library of Congress JSON search endpoint.",
        citation: buildSimpleCitation(item.title || "Untitled", Array.isArray(item.contributor_names) ? item.contributor_names.join(", ") : "Library of Congress", item.date || "", "Library of Congress"),
        notes:["External-source record from the Library of Congress."],
        recordIdentifier: item.id || item.url || "",
        archiveIdentifier:`LOC-${index}`,
        resultMode:"live",
        trustScore:0.9,
        liveSourceHint:"loc"
      }));
    }
  },
  {
    id:"met",
    label:"The Met Collection",
    trust:0.88,
    async search(query) {
      const searchJson = await fetchJsonWithTimeout(`https://collectionapi.metmuseum.org/public/collection/v1/search?hasImages=true&q=${encodeURIComponent(query)}`, {}, 7000);
      const ids = Array.isArray(searchJson.objectIDs) ? searchJson.objectIDs.slice(0, 6) : [];
      const settled = await Promise.allSettled(ids.map(id => fetchJsonWithTimeout(`https://collectionapi.metmuseum.org/public/collection/v1/objects/${id}`, {}, 7000)));
      return settled.filter(item => item.status === "fulfilled").map(item => item.value).map((obj, index) => normalizeLiveRecord({
        id:`live-met-${obj.objectID || index}`,
        title: obj.title || "Untitled object",
        creator: obj.artistDisplayName || obj.culture || "Metropolitan Museum of Art",
        summary: obj.objectName ? `${obj.objectName}${obj.period ? ` · ${obj.period}` : ""}.` : "External museum object from The Met.",
        abstract: obj.creditLine || "",
        description:[obj.medium ? `Medium: ${obj.medium}.` : "", obj.objectDate ? `Date: ${obj.objectDate}.` : "", obj.repository ? `Repository: ${obj.repository}.` : ""].filter(Boolean),
        period: obj.objectDate || obj.period || "",
        type: obj.objectName || "Artefact",
        cat:"External museum objects",
        region: inferRegionFromText([obj.culture, obj.region, obj.department, obj.title].filter(Boolean).join(" ")),
        country: inferCountryFromText([obj.culture, obj.region, obj.title].filter(Boolean).join(" ")),
        collection:"The Met external discovery",
        institution:"The Metropolitan Museum of Art",
        source:"The Met Collection API",
        sourceUrl: obj.objectURL || `https://www.metmuseum.org/art/collection/search/${obj.objectID}`,
        public_domain: Boolean(obj.isPublicDomain),
        rights: obj.isPublicDomain ? "Public domain metadata from The Met Collection API." : "External source rights apply",
        rights_statement: obj.rightsAndReproduction || obj.creditLine || "",
        sourceActionLabel:"View museum record",
        externalLinks: [],
        language: [],
        tags: uniqueValues([obj.department, obj.objectName, obj.culture, obj.period].filter(Boolean)),
        concepts: inferConceptsFromText([obj.title, obj.objectName, obj.culture, obj.medium].filter(Boolean).join(" ")),
        themes: inferThemesFromText([obj.title, obj.objectName, obj.medium].filter(Boolean).join(" ")),
        images: buildMetImages(obj),
        rights:"External source rights apply",
        provenance:"External object metadata pulled from The Met Collection API.",
        citation: buildSimpleCitation(obj.title || "Untitled object", obj.artistDisplayName || obj.culture || "The Met", obj.objectDate || "", "The Met"),
        notes:["External-source museum object."],
        recordIdentifier: String(obj.objectID || ""),
        archiveIdentifier:`MET-${obj.objectID || index}`,
        resultMode:"live",
        trustScore:0.88,
        liveSourceHint:"met"
      }));
    }
  },
  {
    id:"wikimedia",
    label:"Wikimedia Commons",
    trust:0.78,
    async search(query) {
      const json = await fetchJsonWithTimeout(`https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrnamespace=6&gsrsearch=${encodeURIComponent(query)}&gsrlimit=8&prop=imageinfo|info&iiprop=url|extmetadata&inprop=url&format=json&origin=*`, {}, 7000);
      const pages = json.query?.pages ? Object.values(json.query.pages).slice(0, 8) : [];
      return pages.map((page, index) => {
        const ext = page.imageinfo?.[0]?.extmetadata || {};
        return normalizeLiveRecord({
        id:`live-wikimedia-${page.pageid || index}`,
        title: page.title ? page.title.replace(/^File:/, "") : "Untitled image",
        creator: ext.Artist?.value ? stripHtml(ext.Artist.value) : "Wikimedia Commons contributor",
        summary: ext.ImageDescription?.value ? stripHtml(ext.ImageDescription.value).slice(0, 320) : "External media record from Wikimedia Commons.",
        abstract: ext.ImageDescription?.value ? stripHtml(ext.ImageDescription.value) : "",
        description:[ext.LicenseShortName?.value ? `License: ${stripHtml(ext.LicenseShortName.value)}.` : ""].filter(Boolean),
        type:"Image",
        cat:"External images",
        region: inferRegionFromText(page.title || ""),
        country: inferCountryFromText(page.title || ""),
        collection:"Wikimedia Commons external discovery",
        institution:"Wikimedia Commons",
        source:"Wikimedia Commons",
        sourceUrl: page.fullurl || `https://commons.wikimedia.org/wiki/${encodeURIComponent(page.title || "")}`,
        licence: firstText(ext.LicenseShortName?.value, ext.License?.value),
        licence_url: firstText(ext.LicenseUrl?.value),
        rights: firstText(ext.UsageTerms?.value, ext.License?.value, ext.LicenseShortName?.value) || "External source rights apply",
        rights_statement: firstText(ext.UsageTerms?.value),
        extmetadata: ext,
        sourceActionLabel:"View media record",
        externalLinks: [],
        language: [],
        tags: uniqueValues((page.title || "").replace(/^File:/, "").split(/[_\s]+/).slice(0, 6)),
        concepts: inferConceptsFromText(page.title || ""),
        themes: inferThemesFromText(page.title || ""),
        images: buildWikimediaImages(page),
        rights:"External source rights apply",
        provenance:"External media metadata pulled from Wikimedia Commons.",
        citation: buildSimpleCitation(page.title ? page.title.replace(/^File:/, "") : "Untitled image", "Wikimedia Commons contributor", "", "Wikimedia Commons"),
        notes:["External-source image or media file."],
        recordIdentifier: String(page.pageid || ""),
        archiveIdentifier:`WC-${page.pageid || index}`,
        resultMode:"live",
        trustScore:0.78,
        liveSourceHint:"wikimedia"
        });
      });
    }
  },
  {
    id:"openalex",
    label:"OpenAlex",
    trust:0.86,
    async search(query) {
      const json = await fetchJsonWithTimeout(`https://api.openalex.org/works?per-page=8&search=${encodeURIComponent(query)}&select=id,display_name,publication_year,authorships,primary_location,best_oa_location,concepts,abstract_inverted_index,type,open_access,locations_count`, {}, 7000);
      const items = Array.isArray(json.results) ? json.results.slice(0, 8) : [];
      return items.map((item, index) => {
        const authors = Array.isArray(item.authorships) ? item.authorships.map(author => author.author?.display_name).filter(Boolean) : [];
        const title = item.display_name || "Untitled work";
        const abstract = decodeOpenAlexAbstract(item.abstract_inverted_index);
        const sourceName = item.primary_location?.source?.display_name || "OpenAlex";
        return normalizeLiveRecord({
          id:`live-openalex-${slugify((item.id || title) + "-" + index)}`,
          title,
          creator: authors.join(", ") || "Unknown creator",
          summary: abstract ? abstract.slice(0, 320) : `${sourceName} surfaced via OpenAlex external metadata.`,
          abstract,
          description:[item.type ? `Type: ${item.type}.` : "", Array.isArray(item.concepts) && item.concepts.length ? `Concepts: ${item.concepts.slice(0, 5).map(concept => concept.display_name).join(", ")}.` : ""].filter(Boolean),
          period: item.publication_year ? String(item.publication_year) : "",
          type: mapOpenAlexType(item.type),
          cat:"Research & scholarly metadata",
          region: inferRegionFromText([title, ...(item.concepts || []).map(concept => concept.display_name)].join(" ")),
          country: inferCountryFromText([title, ...(item.concepts || []).map(concept => concept.display_name)].join(" ")),
          collection:"OpenAlex external discovery",
          institution: sourceName,
          source:"OpenAlex",
          sourceUrl: item.primary_location?.landing_page_url || item.id || `https://api.openalex.org/works?search=${encodeURIComponent(query)}`,
          licence: firstText(item.primary_location?.license, item.best_oa_location?.license),
          licence_url: firstText(item.primary_location?.license_url, item.best_oa_location?.license_url),
          open_access: item.open_access,
          is_oa: item.open_access?.is_oa,
          oa_status: item.open_access?.oa_status,
          full_text_url: item.best_oa_location?.landing_page_url || "",
          pdf_url: item.best_oa_location?.pdf_url || "",
          sourceActionLabel:"Open source record",
          externalLinks: item.id ? [{label:"OpenAlex", url:item.id}] : [],
          language: [],
          tags: uniqueValues((item.concepts || []).slice(0, 6).map(concept => concept.display_name)),
          concepts: inferConceptsFromText([title, ...(item.concepts || []).map(concept => concept.display_name)].join(" ")),
          themes: inferThemesFromText([title, ...(item.concepts || []).map(concept => concept.display_name)].join(" ")),
          images: [],
          rights:"External source rights apply",
          provenance:"External scholarly metadata pulled from OpenAlex.",
          citation: buildSimpleCitation(title, authors.join(", ") || "Unknown creator", item.publication_year || "", sourceName),
          notes:["External-source research metadata from OpenAlex."],
          recordIdentifier: item.id || "",
          archiveIdentifier:`OA-${index}`,
          resultMode:"live",
          trustScore:0.86,
          liveSourceHint:"openalex"
        });
      });
    }
  }
];

function stringifySentence(value){ if (typeof value === 'string') return value; if (Array.isArray(value)) return value.join(' '); if (value && typeof value === 'object') return Object.values(value).join(' '); return ''; }
function stripJats(value){ return String(value || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(); }
function stripHtml(value){ return String(value || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(); }
function decodeOpenAlexAbstract(index){ if (!index || typeof index !== 'object') return ''; const pairs = Object.entries(index).flatMap(([word, positions]) => Array.isArray(positions) ? positions.map(pos => [pos, word]) : []); return pairs.sort((a,b) => a[0]-b[0]).map(([,word]) => word).join(' '); }
function buildSimpleCitation(title, creator, year, source){ return [creator, year ? `(${year})` : '', title, source].filter(Boolean).join('. ') + '.'; }
function mapCrossrefType(value){ const map = { 'journal-article':'Journal article', book:'Book', 'book-chapter':'Book chapter', 'proceedings-article':'Proceedings paper', 'posted-content':'Preprint', report:'Report' }; return map[value] || 'Research paper'; }
function mapOpenAlexType(value){ const map = { article:'Journal article', book:'Book', book_chapter:'Book chapter', dissertation:'Dissertation', preprint:'Preprint', report:'Report', dataset:'Dataset', reference_entry:'Reference entry' }; return map[value] || 'Research paper'; }
function mapLocType(value){ const lower = foldText(value || ''); if (/photo|image|print/.test(lower)) return 'Image'; if (/manuscript/.test(lower)) return 'Manuscript'; if (/map/.test(lower)) return 'Map'; if (/book/.test(lower)) return 'Book'; if (/film|video|moving/.test(lower)) return 'Video'; if (/newspaper|article/.test(lower)) return 'Article'; return 'Cultural record'; }
function mapLanguageCode(code){ const map = { en:'English', fr:'French', ar:'Arabic', sw:'Swahili', yo:'Yoruba', pt:'Portuguese' }; return map[code] || code || ''; }
function inferRegionFromText(text){ const lower = foldText(text); if (/ghana|nigeria|benin|mali|senegal|yoruba|akan|ashanti/.test(lower)) return 'West Africa'; if (/kenya|tanzania|uganda|swahili|ethiopia|somalia/.test(lower)) return 'East Africa'; if (/south africa|zimbabwe|zulu|xhosa|ndebele/.test(lower)) return 'Southern Africa'; if (/diaspora|caribbean|latin america/.test(lower)) return 'Diaspora'; return 'Africa / Global'; }
function inferCountryFromText(text){ const lower = foldText(text); const pairs = [['ghana','Ghana'],['nigeria','Nigeria'],['kenya','Kenya'],['south africa','South Africa'],['mali','Mali'],['zimbabwe','Zimbabwe'],['tanzania','Tanzania']]; const hit = pairs.find(([needle]) => lower.includes(needle)); return hit ? hit[1] : ''; }
function inferConceptsFromText(text){ const lower = foldText(text); const concepts = []; if (/decolon|anti-colonial|colonial/.test(lower)) concepts.push('decolonisation'); if (/archive|manuscript|record/.test(lower)) concepts.push('archival recovery'); if (/indigenous|oral|ifa|ubuntu|sankofa/.test(lower)) concepts.push('indigenous epistemologies'); if (/design|textile|visual|poster|image/.test(lower)) concepts.push('visual sovereignty'); return uniqueValues(concepts); }
function inferThemesFromText(text){ const lower = foldText(text); const themes = []; if (/philosophy|thought|theory/.test(lower)) themes.push('African Philosophy'); if (/music|sound|recording/.test(lower)) themes.push('Music & Performance'); if (/education|pedagogy|curriculum/.test(lower)) themes.push('Design Pedagogy'); if (/archive|records|manuscript/.test(lower)) themes.push('Archival Recovery'); if (/textile|design|image|visual/.test(lower)) themes.push('Visual Sovereignty'); return uniqueValues(themes); }
function buildOpenLibraryImages(doc){ const cover = doc.cover_i || doc.cover_id; if (!cover) return []; return [{src:`https://covers.openlibrary.org/b/id/${cover}-L.jpg`, alt:doc.title || 'Cover image', caption:'Cover image from Open Library'}]; }
function buildLocImages(item){ const urls = Array.isArray(item.image_url) ? item.image_url.filter(Boolean) : []; return urls.slice(0,3).map((src, index) => ({src, alt:item.title || 'Library of Congress image', caption:index === 0 ? 'Media from the Library of Congress' : ''})); }
function buildMetImages(obj){ const images = []; if (obj.primaryImageSmall) images.push({src:obj.primaryImageSmall, alt:obj.title || 'Met collection image', caption:'Primary image from The Met'}); if (!images.length && obj.primaryImage) images.push({src:obj.primaryImage, alt:obj.title || 'Met collection image', caption:'Primary image from The Met'}); return images; }
function buildWikimediaImages(page){ const src = page.imageinfo?.[0]?.thumburl || page.imageinfo?.[0]?.url; return src ? [{src, alt:(page.title || 'Wikimedia media').replace(/^File:/,''), caption:'Image from Wikimedia Commons'}] : []; }
function fetchWithTimeout(url, options = {}, timeout = 5500){ const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), timeout); return fetch(url, {...options, signal:controller.signal}).finally(() => clearTimeout(timer)); }
async function fetchJsonWithTimeout(url, options = {}, timeout = 5500){ const response = await fetchWithTimeout(url, options, timeout); if (!response.ok) throw new Error(`Request failed: ${response.status}`); return response.json(); }
function normalizeLiveRecord(record){
  const rights = normalizeExternalRightsMetadata(record);
  const canUseMedia = rights.hasConfirmedReuseRights;
  const safeSourceUrl = rights.sourceUrl || safeUrl(record.sourceUrl);
  return { id: record.id, title: record.title || 'Untitled record', alternateTitle: record.alternateTitle || '', creator: record.creator || 'Unknown creator', contributors: listify(record.contributors), summary: record.summary || '', abstract: record.abstract || '', description: listify(record.description), region: record.region || 'Global / Comparative', country: record.country || '', community: record.community || '', period: record.period || '', concepts: uniqueValues(record.concepts || []), themes: uniqueValues(record.themes || []), tags: uniqueValues(record.tags || []), rights: record.rights || 'Check original source before reuse.', rightsStatus: rights.rightsStatus, licence: rights.licence, accessType: rights.accessType, reusePermission: record.reusePermission || (canUseMedia ? 'Check Original Source' : 'No Reuse Without Permission'), verificationStatus: rights.verificationStatus, culturalSensitivity: record.culturalSensitivity || 'Public', communityReviewStatus: record.communityReviewStatus || 'Not Required', provenance: record.provenance || '', source: record.source || 'External source', sourceName: record.sourceName || record.source || record.institution || 'External source', sourceType: record.sourceType || inferSourceType(record.source || record.institution || ''), cat: record.cat || 'External source results', type: record.type || 'External record', collection: record.collection || '', institution: record.institution || record.source || '', language: uniqueValues(record.language || []), sourceUrl: safeSourceUrl, sourceActionLabel: record.sourceActionLabel || 'View source', externalLinks: (record.externalLinks || []).filter(link => link && safeUrl(link.url)).map(link => ({label:link.label || 'Open link', url:safeUrl(link.url)})), sourcePathways: uniqueValues(record.sourcePathways || ['External source adapter']), notes: listify(record.notes), archiveIdentifier: record.archiveIdentifier || '', recordIdentifier: record.recordIdentifier || record.id, material: record.material || '', medium: record.medium || '', citation: record.citation || '', relatedRecords: listify(record.relatedRecords), images: canUseMedia ? (record.images || []).filter(image => safeUrl(image.src || image.url)).map(image => ({src:safeUrl(image.src || image.url), alt:image.alt || record.title, caption:image.caption || ''})) : [], resultMode: record.resultMode || 'live', trustScore: Number(record.trustScore || 0.75), liveSourceHint: record.liveSourceHint || '', rightsMetadataFound: rights.verificationStatus !== 'Unverified', externalRightsRow: record.externalRightsRow || null, sourceCategoryGroup: record.sourceCategoryGroup || '' };
}
function getRecordByIdAny(id){ return RECORDS_BY_ID.get(id) || TRANSIENT_RESULTS_BY_ID.get(id) || null; }
function resultModeLabel(mode){ return sourceOriginValue(mode); }
function getResultMode(record){ if (record.resultMode) return record.resultMode; if (record.source && record.source !== 'Local Bank' && record.source !== 'African Philosophy Working Library') return 'hybrid'; return 'local'; }

function buildInstitutionalSearchLinks(query){
  const normalized = (query || '').trim();
  const q = encodeURIComponent(normalized);
  if (!normalized) return [];
  const mk = (id, title, creator, summary, type, region, country, source, url, labels, hint, trust=0.72) => ({
    id:`handoff-${id}-${slugify(normalized)}`,
    title:`${title} for “${normalized}”`,
    creator,
    summary,
    abstract:`Dynamic external discovery pathway into ${title} results.`,
    description:['Search-ready institutional handoff generated from the active archive query.'],
    type,
    cat:'External source handoff',
    region,
    country,
    language:['English'],
    tags:[...labels,'handoff','Decolonising Knowledges'],
    concepts:inferConceptsFromText(`${title} ${normalized}`),
    themes:['Decolonising Knowledges', ...inferThemesFromText(`${title} ${normalized}`)],
    externalLinks:[{label:`Open ${title} search`, url}],
    source,
    sourceUrl:url,
    institution:creator,
    rights:'External source rights apply',
    provenance:'Dynamic external handoff generated from the active query.',
    citation:buildSimpleCitation(`${title} results for ${normalized}`, creator, '', source),
    recordIdentifier:`${id}-${slugify(normalized)}`,
    archiveIdentifier:`${id.toUpperCase()}-${slugify(normalized)}`,
    resultMode:'external_handoff',
    trustScore:trust,
    liveSourceHint:hint
  });

  return [
    mk('britishmuseum','British Museum','British Museum','Search the British Museum collection for related objects, documentation, and collection records.','Museum / Collection Search','Global / Africa','United Kingdom','British Museum Collection Online',`https://www.britishmuseum.org/collection/search?keyword=${q}`,['British Museum','museum','collection'],'britishmuseum',0.74),
    mk('unilever','Unilever Archives','Unilever Archives','Search corporate archival records, image holdings, publicity materials, and historical documentation related to the query.','Archive Search','Global / Africa','United Kingdom','Unilever Archives',`https://archives-unilever.com/discover/search?q=${q}`,['Unilever Archives','corporate archive'],'unilever',0.72),
    {
      ...mk('uac','United Africa Company records','Unilever Archives / UK National Archives Discovery','Search United Africa Company records, commercial documentation, photographs, and related archival references.','Colonial Commercial Archive','West Africa / UK','United Kingdom','United Africa Company Archive Pathway',`https://archives-unilever.com/discover/search?q=${encodeURIComponent('United Africa Company ' + normalized)}`,['United Africa Company','UAC','colonial commerce','archive'],'uac',0.78),
      externalLinks:[
        {label:'Open UAC search in Unilever Archives', url:`https://archives-unilever.com/discover/search?q=${encodeURIComponent('United Africa Company ' + normalized)}`},
        {label:'Open UAC search in UK National Archives', url:`https://discovery.nationalarchives.gov.uk/results/r?_q=${encodeURIComponent('United Africa Company ' + normalized)}`}
      ]
    },
    mk('britishlibrary','British Library','British Library','Search library holdings, manuscripts, newspapers, maps, sound, and archives relevant to the query.','Library Search','Global / Africa / Asia','United Kingdom','British Library',`https://explore.bl.uk/primo_library/libweb/action/search.do?fn=search&ct=search&vl(freeText0)=${q}`,['British Library','books','manuscripts','archives'],'britishlibrary',0.75),
    mk('trove','Trove','National Library of Australia','Search books, newspapers, images, archives, and digitised records related to the query.','Library / Discovery Search','Australia / Global','Australia','Trove',`https://trove.nla.gov.au/search?keyword=${q}`,['Trove','newspapers','books','archives'],'trove',0.73),
    mk('smithsonian','Smithsonian','Smithsonian Institution','Search collections, images, objects, and documentation related to the query.','Museum / Collection Search','Global / Africa / Diaspora','United States','Smithsonian Open Access / Collections Search',`https://www.si.edu/search?edan_q=${q}`,['Smithsonian','museum','objects','images'],'smithsonian',0.74),
    mk('googlebooks','Google Books','Google Books','Search global book metadata, previews, and bibliographic references related to the query.','Book Search','Global','United States','Google Books',`https://books.google.com/books?q=${q}`,['Google Books','books','bibliography'],'googlebooks',0.68),
    mk('worldcat','WorldCat','WorldCat','Search global library holdings for books, theses, audiovisual works, and archival materials related to the query.','Union Catalogue Search','Global','Global','WorldCat',`https://search.worldcat.org/search?q=${q}`,['WorldCat','library','catalogue','theses'],'worldcat',0.76),
    mk('nlsa','National Library of South Africa','National Library of South Africa','Search South African documentary heritage, books, manuscripts, and special collections related to the query.','National Library Search','Southern Africa','South Africa','National Library of South Africa',`https://www.nlsa.ac.za/search/node/${q}`,['South Africa','library','manuscripts'],'nlsa',0.78),
    mk('ufh','University of Fort Hare / ANC Archives','University of Fort Hare','Search liberation struggle records and ANC-related archival holdings linked to the query.','Liberation Archive Search','Southern Africa','South Africa','University of Fort Hare / ANC Archives',`https://www.ufh.ac.za/search/node/${q}`,['ANC','liberation','archive'],'ufh',0.8),
    mk('nigeriaarchives','National Archives of Nigeria','National Archives of Nigeria','Search pathways into Nigerian archival and documentary holdings related to the query.','Archive Pathway','West Africa','Nigeria','National Archives of Nigeria Pathway',`https://www.google.com/search?q=site%3Anationalarchives.gov.ng+${q}`,['Nigeria','archive','documents'],'nigeriaarchives',0.7),
    mk('zimbabwearchives','National Archives of Zimbabwe','National Archives of Zimbabwe','Search pathways into Zimbabwean archival and documentary heritage records related to the query.','Archive Pathway','Southern Africa','Zimbabwe','National Archives of Zimbabwe Pathway',`https://www.google.com/search?q=site%3Aarchives.gov.zw+${q}`,['Zimbabwe','archive','documents'],'zimbabwearchives',0.7),
    mk('ugandaarchives','Uganda National Archives','Uganda National Archives','Search pathways into Ugandan archival and documentary collections related to the query.','Archive Pathway','East Africa','Uganda','Uganda National Archives Pathway',`https://www.google.com/search?q=site%3Anationalarchives.go.ug+${q}`,['Uganda','archive','documents'],'ugandaarchives',0.69),
    mk('bodleian','Bodleian / Rhodes House African Studies','Bodleian Libraries / Rhodes House','Search African studies archives, manuscripts, photographs, and colonial records related to the query.','Research Archive Search','Africa / UK','United Kingdom','Bodleian / Rhodes House African Studies Pathway',`https://solo.bodleian.ox.ac.uk/discovery/search?query=any,contains,${q}`,['Bodleian','Rhodes House','African studies'],'bodleian',0.73)
  ];
}

function makeExternalFallbacks(query){ return buildExternalDiscovery(query).map((source, index) => normalizeLiveRecord({ id:`handoff-${slugify(source.name + '-' + query + '-' + index)}`, title:`Search ${source.name}`, creator: source.region || 'External archive', summary: source.desc, abstract: `No strong local match was found, so this handoff opens ${source.name} directly for broader archive discovery.`, description:[source.desc], type:'External handoff', cat:'External source pathways', region: source.region || 'Global', collection:'External Source Handoffs', institution: source.name, source: source.name, sourceUrl: source.actionUrl, sourceActionLabel: source.actionLabel || 'Open source', externalLinks: source.url && source.url !== source.actionUrl ? [{label:'Source home', url:source.url}] : [], notes:['This result is a handoff to the source institution or discovery service rather than a hosted local archive record.'], sourcePathways:['Source handoff router', source.name], resultMode:'external_handoff', trustScore:0.55, liveSourceHint:'handoff' })); }
function scoreBlendedResult(record, query){
  const context = buildQueryContext(query);
  const base = scoreRecord(record, context);
  const mode = getResultMode(record);
  const modeBonus = {local:18, hybrid:12, live:7, external_handoff:2}[mode] || 0;
  const descriptionText = Array.isArray(record.description)
    ? record.description.join(' ')
    : (record.description || '');
  const completeness = [
    record.abstract,
    record.summary,
    descriptionText,
    (record.images || []).length ? 'img' : ''
  ].filter(Boolean).length * 2;
  return base + modeBonus + completeness + Math.round((record.trustScore || 0) * 6);
}
function dedupeBlendedResults(items, query){ const seen = new Map(); const ranked = items.filter(Boolean).map(item => ({item, score: scoreBlendedResult(item, query || libraryQuery)})).sort((a,b) => b.score - a.score || a.item.title.localeCompare(b.item.title)); for (const entry of ranked){ const key = normalizeComparable([entry.item.title, entry.item.creator, entry.item.period].join(' ')); if (!seen.has(key)) seen.set(key, entry); } return [...seen.values()].map(entry => entry.item); }
function normalizeAdapterResult(value) {
  if (Array.isArray(value)) return { items: value, sourceStatuses: [], notices: null, openAccessFetchFailed: false };
  if (value && typeof value === "object" && Array.isArray(value.items)) {
    return {
      items: value.items,
      sourceStatuses: Array.isArray(value.sourceStatuses) ? value.sourceStatuses : [],
      notices: value.notices || null,
      openAccessFetchFailed: Boolean(value.openAccessFetchFailed),
    };
  }
  return { items: [], sourceStatuses: [], notices: null, openAccessFetchFailed: false };
}
async function fetchLiveResults(query){
  const normalizedQuery = query.trim();
  if (!normalizedQuery) return [];
  console.log('[LIVE] fetchLiveResults start', { query: normalizedQuery });
  if (LIVE_RESULT_CACHE.has(normalizedQuery)) {
    console.log('[LIVE] cache hit', normalizedQuery);
    const cached = LIVE_RESULT_CACHE.get(normalizedQuery);
    liveResults = cached;
    externalDiscovery = cached.filter(item => getResultMode(item) === 'external_handoff');
    liveStatus = { state: 'done', message: '', sources: liveStatus.sources || [], openAccessWarning: '' };
    render();
    return cached;
  }

  // Reset incremental state
  openAccessNotices = null;
  const gathered = [];
  const statuses = LIVE_SOURCE_ADAPTERS.map(adapter => ({ label: adapter.label, state: 'loading' }));
  let openAccessWarning = '';
  const fallbacks = makeExternalFallbacks(normalizedQuery);
  fallbacks.forEach(item => TRANSIENT_RESULTS_BY_ID.set(item.id, item));

  // Tokenise current query so a slow response that resolves after a new
  // search doesn't overwrite the visible results.
  fetchLiveResults._token = (fetchLiveResults._token || 0) + 1;
  const token = fetchLiveResults._token;
  const stillCurrent = () => token === fetchLiveResults._token && getEffectiveSearchQuery().trim() === normalizedQuery;

  const publishProgress = (finalised = false) => {
    if (!stillCurrent()) return;
    // Build display set: gathered (deduped) + a handful of registry handoffs so the
    // grid never looks empty while heavier adapters are still pending.
    const handoffSlots = gathered.length >= 10 ? 0 : Math.max(4, 12 - gathered.length);
    const fallbackPool = fallbacks.slice(0, handoffSlots);
    const combined = dedupeBlendedResults([...gathered, ...fallbackPool], normalizedQuery).slice(0, 24);
    liveResults = combined;
    externalDiscovery = combined.filter(item => getResultMode(item) === 'external_handoff');
    liveStatus = {
      state: finalised ? 'done' : 'loading',
      message: finalised
        ? (gathered.length ? `Showing ${gathered.length + combined.filter(item => getResultMode(item) === 'external_handoff').length} external source results for “${normalizedQuery}”.` : `External source discovery could not return direct records for “${normalizedQuery}”, so source handoffs are shown instead.`)
        : `Searching external sources for “${normalizedQuery}”…`,
      sources: statuses.slice(),
      openAccessWarning
    };
    render();
  };

  // Render the loading state immediately so the UI never sits blank.
  publishProgress(false);

  // Kick all adapters off concurrently, but render after each one resolves
  // instead of waiting for them all.
  const tasks = LIVE_SOURCE_ADAPTERS.map((adapter, index) => {
    return Promise.resolve()
      .then(() => adapter.search(normalizedQuery))
      .then(value => {
        if (!stillCurrent()) return;
        const { items, sourceStatuses, notices, openAccessFetchFailed } = normalizeAdapterResult(value);
        items.forEach(item => {
          TRANSIENT_RESULTS_BY_ID.set(item.id, item);
          gathered.push(item);
        });
        statuses[index] = { label: adapter.label, state: items.length ? 'ok' : 'empty', count: items.length };

        if (adapter.id === 'openAccess') {
          if (notices) openAccessNotices = notices;
          if (Array.isArray(sourceStatuses)) {
            sourceStatuses.forEach(s => {
              const st = s.state === 'fail' ? 'fail'
                : (s.state === 'skipped' || s.state === 'unavailable') ? 'fail'
                : (typeof s.count === 'number' && s.count > 0) ? 'ok' : 'empty';
              statuses.push({
                label: s.label || s.id || 'Source',
                state: st,
                count: typeof s.count === 'number' ? s.count : undefined
              });
            });
          }
          if (openAccessFetchFailed) {
            openAccessWarning = 'The /api/external-open-access request failed (network or HTTP error).';
          } else if (!items.length && Array.isArray(sourceStatuses) && sourceStatuses.some(s => s.state === 'fail' || s.state === 'unavailable')) {
            const detail = sourceStatuses.map(s => [s.label || s.id, s.message || s.state].filter(Boolean).join(': ')).filter(Boolean).join(' · ');
            openAccessWarning = detail || 'External open-access search failed or returned no records.';
          }
        }
        console.log('[LIVE] adapter resolved', { adapter: adapter.label, count: items.length });
        publishProgress(false);
      })
      .catch(error => {
        if (!stillCurrent()) return;
        console.warn('[LIVE] adapter failed', { adapter: adapter.label, error: String(error) });
        statuses[index] = { label: adapter.label, state: 'fail', count: 0 };
        if (adapter.id === 'openAccess' && !openAccessWarning) {
          openAccessWarning = `Open access aggregation failed: ${String(error && error.message ? error.message : error)}`;
        }
        publishProgress(false);
      });
  });

  await Promise.allSettled(tasks);
  if (!stillCurrent()) {
    // A newer query has taken over — bail without touching state.
    return liveResults;
  }

  const handoffSlots = gathered.length >= 10 ? 0 : Math.max(4, 12 - gathered.length);
  const fallbackPool = fallbacks.slice(0, handoffSlots);
  const combined = dedupeBlendedResults([...gathered, ...fallbackPool], normalizedQuery).slice(0, 24);
  console.log('[LIVE] combined results', { gathered: gathered.length, fallbackPool: fallbackPool.length, combined: combined.length });
  LIVE_RESULT_CACHE.set(normalizedQuery, combined);
  publishProgress(true);
  return combined;
}
function maybeFetchLiveResults(query){
  const normalizedQuery = query.trim();
  console.log('[LIVE] maybeFetchLiveResults', { normalizedQuery, sourceMode });
  if (!sourceMode || !normalizedQuery) return Promise.resolve([]);
  // fetchLiveResults() now drives liveResults / externalDiscovery / liveStatus
  // and calls render() itself as each adapter resolves — we just await and
  // return the final combined set.
  return fetchLiveResults(normalizedQuery).then(results => {
    console.log('[LIVE] maybeFetchLiveResults success', { count: results.length });
    return results;
  }).catch(error => {
    console.warn('[LIVE] maybeFetchLiveResults failed', error);
    liveStatus = {
      state: 'error',
      message: 'External source discovery failed. Archive records are still available.',
      openAccessWarning: String(error && error.message ? error.message : error),
      sources: LIVE_SOURCE_ADAPTERS.map(adapter => ({ label: adapter.label, state: 'fail' }))
    };
    liveResults = makeExternalFallbacks(normalizedQuery);
    externalDiscovery = liveResults.filter(item => getResultMode(item) === 'external_handoff');
    render();
    return liveResults;
  });
}

function isSeriousRightsIssue(record) {
  const adminText = String(record.adminNotes || record.copyrightNote || "").toLowerCase();
  return record.rightsStatus === "Takedown Requested" ||
    record.communityReviewStatus === "Do Not Publish" ||
    record.verificationStatus === "Copyright Risk" ||
    record.verificationStatus === "Takedown Requested" ||
    record.culturalSensitivity === "Takedown / Review Requested" ||
    adminText.includes("copyright risk");
}

function isSensitiveRecord(record) {
  return record.culturalSensitivity === "Restricted" ||
    record.culturalSensitivity === "Do Not Display Media" ||
    record.culturalSensitivity === "Community Review Needed" ||
    record.rightsStatus === "Restricted / Sensitive";
}

function isRightsLimited(record) {
  return record.rightsStatus === "In Copyright" ||
    record.rightsStatus === "Rights Unknown" ||
    record.rightsStatus === "Restricted / Sensitive" ||
    record.rightsStatus === "Check source" ||
    record.accessType === "Metadata Only" ||
    record.accessType === "External Link Only";
}

function metadataDisplayValue(value) {
  const map = {
    "In Copyright":"In copyright",
    "External Link Only":"External link only",
    "Full Text Available":"Full text available",
    "Download Available":"Download available",
    "Read Online":"Read online",
    "Metadata Only":"Metadata only",
    "Restricted Access":"Restricted access",
    "Requires Permission":"Requires permission",
    "Check Source":"Check source",
    "Source Checked":"Source checked",
    "Rights Checked":"Rights checked",
    "External Source":"External source",
    "Rights Unknown":"Rights unknown"
  };
  return map[value] || value || "";
}

function getCardTrustState(record) {
  if (isSeriousRightsIssue(record)) return "danger";
  if (isSensitiveRecord(record)) return "sensitive";
  if (record.rightsStatus === "Open Access" || record.rightsStatus === "Public Domain" || record.rightsStatus === "Creative Commons") return "open";
  return "neutral";
}

function isPositiveRightsStatus(status) {
  const s = String(status || "").trim();
  return s === "Open Access" || s === "Public Domain" || s === "Creative Commons";
}

function isPositiveAccessStatus(status) {
  const s = String(status || "").trim();
  return s === "Full Text Available" || s === "Download Available" || s === "Read Online";
}

function isPositiveReviewStatus(status) {
  const s = String(status || "").trim();
  return s === "Source Checked" || s === "Rights Checked" || s === "Verified" ||
    s === "Metadata Reviewed" ||
    s === "Source checked" || s === "Rights checked" || /^verified\b/i.test(s);
}

function displayCardRecordType(record) {
  const raw = String(record.type || "Record").trim();
  if (/^live$/i.test(raw)) return "External record";
  return raw || "Record";
}

function renderCardRightsBlock(record) {
  // Resolve the short summary triplet (Rights · Access · Review). Prefer an
  // explicit externalRightsRow when present, otherwise fall back to record fields.
  const er = record.externalRightsRow || {};
  const rightsRaw = er.rights || record.rightsStatus || "";
  const accessRaw = er.access || record.accessType || "";
  const reviewRaw = er.review || record.verificationStatus || "";
  const mode = getResultMode(record);

  const rights = rightsRaw && rightsRaw !== "Rights Unknown"
    ? metadataDisplayValue(rightsRaw)
    : "Check source";
  const access = accessRaw
    ? metadataDisplayValue(accessRaw)
    : (record.sourceUrl ? "External link only" : "Metadata only");
  let review = reviewRaw ? metadataDisplayValue(reviewRaw) : "Unverified";
  if (!reviewRaw && mode === "external_handoff") review = "Unverified";

  const licenceLabel = record.licence && record.licence !== "Check source"
    ? metadataDisplayValue(record.licence)
    : "";
  const sensitive = isSensitiveRecord(record);
  const trustState = getCardTrustState(record);

  // Truncate long summary chunks so the chip stays one row
  const truncate = (value, max) => {
    const str = String(value || "");
    return str.length > max ? str.slice(0, max - 1) + "…" : str;
  };
  const summaryBits = [
    truncate(rights, 32),
    truncate(access, 32),
    truncate(review, 28)
  ];
  if (sensitive) summaryBits.push("Media hidden");
  const summary = summaryBits.filter(Boolean).join(" · ");

  // Full long-form panel rows
  const rowsHtml = [
    ["Rights status", rights],
    ["Rights statement", record.rights || ""],
    licenceLabel ? ["Licence", licenceLabel] : null,
    ["Access", access],
    ["Review", review],
    record.reusePermission ? ["Reuse permission", record.reusePermission] : null,
    record.culturalSensitivity ? ["Cultural sensitivity", record.culturalSensitivity] : null,
    sensitive
      ? ["Media", "Hidden — metadata shown for discovery under cultural or rights protocol."]
      : null,
    record.communityReviewStatus ? ["Community review", record.communityReviewStatus] : null,
    record.provenance ? ["Provenance", record.provenance] : null,
    record.sourceName ? ["Source", record.sourceName] : null
  ]
    .filter(Boolean)
    .filter(([, value]) => value && String(value).trim() !== "")
    .map(([label, value]) => `<div class="record-rights-row"><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`)
    .join("");

  const panelId = `rights-panel-${record.id}`;
  const stateClass = sensitive ? "is-sensitive" : `is-${trustState}`;

  if (trustState === "danger") {
    return `<div class="record-rights-compact is-danger" data-stop-card-open="true">
      <div class="record-rights-headline">Review required before publish or reuse.</div>
      <button type="button" class="record-rights-toggle" data-rights-toggle aria-expanded="false" aria-controls="${escapeHtml(panelId)}">
        <span class="record-rights-label">Rights &amp; access</span>
        <span class="record-rights-summary">${escapeHtml(summary)}</span>
        <span class="record-rights-chevron" aria-hidden="true">▾</span>
      </button>
      <div class="record-rights-panel" id="${escapeHtml(panelId)}" hidden>
        <dl class="record-rights-dl">${rowsHtml}</dl>
      </div>
    </div>`;
  }

  return `<div class="record-rights-compact ${stateClass}" data-stop-card-open="true">
    <button type="button" class="record-rights-toggle" data-rights-toggle aria-expanded="false" aria-controls="${escapeHtml(panelId)}">
      <span class="record-rights-label">Rights &amp; access</span>
      <span class="record-rights-summary">${escapeHtml(summary)}</span>
      <span class="record-rights-chevron" aria-hidden="true">▾</span>
    </button>
    <div class="record-rights-panel" id="${escapeHtml(panelId)}" hidden>
      <dl class="record-rights-dl">${rowsHtml}</dl>
    </div>
  </div>`;
}

function renderCardChips(record) {
  const knowledgePrimary = (record.knowledgeAreas || record.themes || record.concepts || [])[0] || record.cat;
  const ordered = [];
  if (record.region) ordered.push(record.region);
  if (knowledgePrimary) ordered.push(knowledgePrimary);
  const shown = ordered.slice(0, 2);
  const pool = uniqueValues([
    record.region,
    record.country,
    knowledgePrimary,
    record.community,
    record.collection,
    ...(record.concepts || []),
    ...(record.knowledgeAreas || record.themes || []),
    record.material,
    record.medium
  ].filter(Boolean));
  const shownSet = new Set(shown);
  const extraCount = pool.filter(value => !shownSet.has(value)).length;
  if (!shown.length && !extraCount) return "";
  return `<div class="record-card-chips card-tags">
    ${shown.map(value => `<span class="kchip">${escapeHtml(value)}</span>`).join('<span class="kchip-dot" aria-hidden="true">·</span>')}
    ${extraCount ? `<span class="kchip-dot" aria-hidden="true">·</span><span class="kchip is-more">+${extraCount} more</span>` : ""}
  </div>`;
}

function recordHasDisplayableImage(record) {
  if (isSensitiveRecord(record) || isSeriousRightsIssue(record)) return false;
  if (!canDisplayMedia(record)) return false;
  const leadImage = getLeadImage(record);
  return Boolean(leadImage && leadImage.src);
}

function renderRecordCardThumbStack(record) {
  if (!recordHasDisplayableImage(record)) return "";
  const leadImage = getLeadImage(record);
  const src = escapeHtml(leadImage.src);
  return `<div class="record-card-thumb-stack">
    <figure class="record-card-thumb-mini" data-card-hover-preview>
      <img src="${src}" alt="${escapeHtml(leadImage.alt || record.title || "Cover")}" loading="lazy" decoding="async" />
    </figure>
    <div class="record-card-hover-preview" aria-hidden="true">
      <img src="${src}" alt="" loading="lazy" decoding="async" />
    </div>
  </div>`;
}

function renderExpandedMetadataDrawer(record) {
  const rows = [
    ["Record Type", record.type],
    ["Knowledge Area", (record.knowledgeAreas || record.themes || record.concepts || [])[0] || record.cat],
    ["Region", record.region],
    ["Country", record.country],
    ["Community / Cultural Group", record.community],
    ["Language", Array.isArray(record.language) ? record.language.join(", ") : record.language],
    ["Script", Array.isArray(record.script) ? record.script.join(", ") : record.script],
    ["Rights Status", record.rightsStatus],
    ["Licence", record.licence],
    ["Access Type", record.accessType],
    ["Verification Status", record.verificationStatus],
    ["Source Name", record.sourceName || record.institution || record.source],
    ["Date Accessed", record.dateAccessed],
    ["Citation", record.citation]
  ].filter(([, value]) => value !== undefined && value !== null && String(value).trim() !== "");

  if (!rows.length) return "";

  return `<dl class="record-card-drawer-grid">
    ${rows.map(([label, value]) => `<div class="record-card-drawer-row">
      <dt>${escapeHtml(label)}</dt>
      <dd>${escapeHtml(value)}</dd>
    </div>`).join("")}
  </dl>`;
}

function renderCard(record) {
  const summary =
    record.abstract ||
    record.summary ||
    (Array.isArray(record.description) ? record.description[0] : record.description) ||
    '';
  const mode = getResultMode(record);
  const streamOrigin = libraryStreamOriginLabel(record);
  const streamOriginClass = libraryStreamOriginClass(record);
  const subSource = record.sourceName || record.institution || record.source || 'Archive record';
  const actionHint = mode === 'external_handoff' ? 'Open source' : 'Open record';
  const sourceUrl = safeUrl(record.sourceUrl);
  const trustState = getCardTrustState(record);
  const drawerOpen = getCardDrawerOpen(record.id);
  const hasThumb = recordHasDisplayableImage(record);

  const creatorLine = record.creator ? `<div class="record-card-creator">${escapeHtml(record.creator)}</div>` : "";
  const sourceBits = [];
  if (subSource) sourceBits.push(escapeHtml(subSource));
  if (record.period) sourceBits.push(escapeHtml(record.period));
  const sourceLine = sourceBits.length
    ? `<div class="record-card-source">${sourceBits.join(' <span class="record-card-source-dot" aria-hidden="true">·</span> ')}</div>`
    : "";

  const primarySourceControl = sourceUrl
    ? `<a class="archiveAction archiveActionPrimary" href="${escapeHtml(sourceUrl)}" target="_blank" rel="noopener noreferrer" data-stop-card-open="true" aria-label="View source (opens in new tab)">
        <span class="archiveAction__icon archiveAction__iconLeft" aria-hidden="true">→</span>
        <span class="archiveAction__text">View source</span>
        <span class="archiveAction__icon archiveAction__iconRight" aria-hidden="true">→</span>
      </a>`
    : `<button type="button" class="archiveAction archiveActionOutline" data-card-open-record aria-label="View full record details">View details</button>`;

  const recordTypeLabel = escapeHtml(displayCardRecordType(record).toUpperCase());

  return `<article class="card record-card archive-card archive-record-card${hasThumb ? " has-image has-thumb" : " no-image no-thumb"}" data-id="${escapeHtml(record.id)}" data-mode="${escapeHtml(mode)}" data-origin="${escapeHtml(streamOrigin)}" data-trust="${escapeHtml(trustState)}" ${mode === 'external_handoff' && sourceUrl ? `data-url="${escapeHtml(sourceUrl)}"` : ''} role="button" tabindex="0" aria-label="${escapeHtml(actionHint)} ${escapeHtml(record.title)}">
    <div class="record-card-body archive-card-body">
      <div class="record-card-label-row">
        <span class="record-card-label type-label">${recordTypeLabel}</span>
        <span class="record-card-label source-label ${streamOriginClass}">${escapeHtml(streamOrigin)}</span>
      </div>
      <div class="record-card-main">
        <div class="record-card-top">
          <div class="record-card-copy">
            <h3 class="record-card-title archive-card-title">${escapeHtml(record.title)}</h3>
            ${creatorLine}
            ${sourceLine}
            ${summary ? `<p class="record-card-summary">${escapeHtml(summary)}</p>` : ""}
            <div class="record-card-divider" aria-hidden="true"></div>
            ${renderCardRightsBlock(record)}
            ${renderCardChips(record)}
          </div>
          ${renderRecordCardThumbStack(record)}
        </div>
      </div>
    </div>
    <footer class="record-card-actions cardFooter card-footer" data-stop-card-open="true">
      <div class="record-card-actions-icons cardFooter__icons card-footer-icons">
        ${renderCardWorkspaceActions(record)}
      </div>
      <div class="record-card-actions-buttons cardFooter__actions card-footer-actions">
        <button type="button" class="record-card-secondary-btn actionSecondary" data-card-drawer-toggle aria-expanded="${drawerOpen ? "true" : "false"}">${drawerOpen ? "Hide details" : "More details"}</button>
        ${primarySourceControl}
      </div>
    </footer>
    <section class="record-card-drawer ${drawerOpen ? "is-open" : ""}" aria-hidden="${drawerOpen ? "false" : "true"}">
      <div class="record-card-drawer-label">Metadata</div>
      ${renderExpandedMetadataDrawer(record)}
    </section>
  </article>`;
}
function renderRecord() { const record = getRecordByIdAny(selectedRecordId); if (!record) { return `<div class="page active"><div class="detail"><div class="detail-shell"><div class="breadcrumb"><a href="/home" data-page="home">Archive</a><span>›</span><a href="/library" data-page="library">Library</a><span>›</span><span>Record</span></div><div class="empty"><h3>Record not found</h3><p>The requested record is not available in the archive index or current external result cache. Return to the library and continue browsing.</p></div></div></div></div>`; } const {primary, secondary} = getPrimaryNarrative(record); const metadataRows = [['Title', record.title], ['Alternate title', record.alternateTitle], ['Creator', record.creator], ['Contributors', humanList(record.contributors)], ['Institution', record.institution], ['Source', record.source], ['Country', record.country], ['Region', record.region], ['Community', record.community], ['Period', record.period], ['Category', record.cat], ['Record type', record.type], ['Collection', record.collection], ['Material', record.material], ['Medium', record.medium], ['Language', humanList(record.language)], ['Script / Writing System', humanList(record.script)], ['Rights Status', record.rightsStatus], ['Licence', record.licence], ['Access Type', record.accessType], ['Reuse Permission', record.reusePermission], ['Cultural Sensitivity', record.culturalSensitivity], ['Community Review Status', record.communityReviewStatus], ['Verification Status', record.verificationStatus], ['Date Accessed', record.dateAccessed], ['Source Type', record.sourceType]].filter(([,value]) => value); const identifierRows = [['Record ID', record.recordIdentifier], ['Archive ID', record.archiveIdentifier], ['Mode', resultModeLabel(getResultMode(record))]].filter(([,value]) => value); const related = getResultMode(record) === 'local' || getResultMode(record) === 'hybrid' ? getRelatedRecords(record, 3) : []; const leadImage = canDisplayMedia(record) ? getLeadImage(record) : null; const gallery = canDisplayMedia(record) ? getGalleryImages(record) : []; const warning = rightsWarning(record); const mode = getResultMode(record); const badges = [`<span class="badge">${escapeHtml(record.type)}</span>`, record.period ? `<span class="period">${escapeHtml(record.period)}</span>` : '', `<span class="result-status ${escapeHtml(mode)}">${escapeHtml(resultModeLabel(mode))}</span>`, record.source ? `<span class="badge">${escapeHtml(record.source)}</span>` : ''].filter(Boolean).join(''); return `<div class="page active"><div class="detail"><div class="detail-shell"><div class="breadcrumb"><a href="/home" data-page="home">Archive</a><span>›</span><a href="/library" data-page="library">Library</a><span>›</span><span>${escapeHtml(record.type)}</span></div><header class="detail-header"><div class="detail-type">${badges}</div><h1>${escapeHtml(record.title)}</h1>${record.alternateTitle ? `<div class="detail-alt">${escapeHtml(record.alternateTitle)}</div>` : ''}<div class="detail-creator">${escapeHtml(record.creator)}</div><div class="detail-subline">${record.institution ? `<span>${escapeHtml(record.institution)}</span>` : ''}${record.collection ? `<span>${escapeHtml(record.collection)}</span>` : ''}${record.country ? `<span>${escapeHtml(record.country)}</span>` : ''}${record.sourceUrl ? `<span class="detail-outbound"><a class="inline-link" href="${escapeHtml(record.sourceUrl)}" target="_blank" rel="noopener noreferrer">Open original source ↗</a></span>` : ''}</div></header>${warning ? `<section class="provenance-box rights-warning"><div class="label">Rights and cultural protocol</div><p>${escapeHtml(warning)}</p>${record.culturalProtocolNote ? `<p>${escapeHtml(record.culturalProtocolNote)}</p>` : ''}${record.sourceUrl ? `<a class="inline-link" href="${escapeHtml(record.sourceUrl)}" target="_blank" rel="noopener noreferrer">Open original source</a>` : ''}</section>` : ''}${leadImage ? `<figure class="detail-media" data-media-root><div class="detail-media-main"><img src="${escapeHtml(leadImage.src)}" alt="${escapeHtml(leadImage.alt)}" loading="lazy"/></div>${leadImage.caption ? `<figcaption class="detail-media-caption">${escapeHtml(leadImage.caption)}</figcaption>` : ''}${gallery.length ? `<div class="gallery-grid">${gallery.map(image => `<figure class="gallery-thumb"><img src="${escapeHtml(image.src)}" alt="${escapeHtml(image.alt)}" loading="lazy"/>${image.caption ? `<figcaption>${escapeHtml(image.caption)}</figcaption>` : ''}</figure>`).join('')}</div>` : ''}</figure>` : ''}<div class="detail-body"><div class="detail-main"><section class="detail-summary"><div class="label">${escapeHtml(primary.label)}</div>${primary.content.map(paragraph => `<p>${escapeHtml(paragraph)}</p>`).join('')}</section>${secondary.map(section => `<section class="detail-section alt"><h2>${escapeHtml(section.label)}</h2><div class="detail-copy">${section.content.map(paragraph => `<p>${escapeHtml(paragraph)}</p>`).join('')}</div></section>`).join('')}<section class="detail-section"><h2>Metadata</h2><table class="meta-table">${metadataRows.map(([label, value]) => `<tr><td>${escapeHtml(label)}</td><td>${escapeHtml(value)}</td></tr>`).join('')}</table></section>${renderTagSection('Concepts', record.concepts, 'concept-tag')}${renderTagSection('Knowledge Areas', record.knowledgeAreas || record.themes, 'theme-chip')}${renderTagSection('Tags', record.tags)}<section class="provenance-box"><div class="label">Provenance & rights</div>${record.provenance ? `<p>${escapeHtml(record.provenance)}</p>` : ''}${record.rights ? `<p><strong>Rights:</strong> ${escapeHtml(record.rights)}</p>` : ''}</section>${related.length ? `<section class="detail-section"><div class="section-header"><span class="section-title">Related records</span></div><div class="card-grid">${related.map(renderCard).join('')}</div></section>` : ''}</div><aside class="detail-side">${renderRecordWorkspaceTools(record)}${renderActionList(record)}<section class="detail-section alt"><h2>Citation</h2><div class="citation-controls"><label for="citationStyleSelect" class="citation-label">Style</label><select id="citationStyleSelect" class="citation-select"><option value="apa" ${citationStyle === "apa" ? "selected" : ""}>APA 7</option><option value="chicago" ${citationStyle === "chicago" ? "selected" : ""}>Chicago</option><option value="mla" ${citationStyle === "mla" ? "selected" : ""}>MLA 9</option><option value="harvard" ${citationStyle === "harvard" ? "selected" : ""}>Harvard</option></select><button class="citation-copy-btn" id="copyCitationInlineBtn" type="button" title="Copy citation">⎘</button></div><div class="citation" id="citationText">${escapeHtml(generateCitationByStyle(record, citationStyle))}</div></section>${record.notes.length ? `<section class="detail-section"><h2>Notes</h2><div class="note-list">${record.notes.map(note => `<p>${escapeHtml(note)}</p>`).join('')}</div></section>` : ''}<section class="detail-section alt"><h2>Identifiers</h2><table class="meta-table">${identifierRows.map(([label, value]) => `<tr><td>${escapeHtml(label)}</td><td>${escapeHtml(value)}</td></tr>`).join('')}</table></section>${record.externalLinks.length ? `<section class="detail-section"><h2>External References</h2><div class="inline-links">${record.externalLinks.map(link => `<a class="inline-link" href="${escapeHtml(link.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(link.label)}</a>`).join('')}</div></section>` : ''}</aside></div></div></div></div>`; }
function renderLiveStatus(){ const effectiveQuery = getEffectiveSearchQuery(); if (!effectiveQuery || !sourceMode) return ''; const alertText = liveStatus.state === "error" ? [liveStatus.message || "External source discovery failed.", liveStatus.openAccessWarning].filter(Boolean).join(" ") : (liveStatus.openAccessWarning || ""); const alertHtml = alertText ? `<div class="live-status-warning" role="alert">${escapeHtml(alertText)}</div>` : ""; return `<div class="source-status">${alertHtml}<div class="live-status-detail"><div>${escapeHtml(liveStatus.message || 'External source discovery is ready when archive results are sparse.')}</div>${liveStatus.sources && liveStatus.sources.length ? `<div class="live-status-meta">${liveStatus.sources.map(source => `<span class="live-status-chip ${source.state === 'ok' ? 'ok' : source.state === 'fail' ? 'fail' : ''}">${escapeHtml(source.label)}${typeof source.count === 'number' ? ` · ${source.count}` : ''}</span>`).join('')}</div>` : ''}</div></div>`; }
function renderSearchSaveAction(effectiveQuery){
  if (!effectiveQuery) return "";
  const defaultLabel = effectiveQuery || libraryQuery || "";
  const message = memberWorkspaceState.message ? `<span class="search-save-message">${escapeHtml(memberWorkspaceState.message)}</span>` : "";
  return `
    <form class="search-save-action search-save-inline" id="saveSearchForm">
      <input type="hidden" name="query" value="${escapeHtml(effectiveQuery || libraryQuery)}" />
      <input
        class="search-save-inline-input"
        name="label"
        value="${escapeHtml(defaultLabel)}"
        aria-label="Saved search label"
        placeholder="Name this search"
      />
      <button class="search-save-inline-button" type="submit">
        ${memberWorkspaceState.status === "saving" ? `<span class="record-action-spinner" aria-hidden="true"></span>` : "Save this search"}
      </button>
      ${message}
    </form>
  `;
}

function getEffectiveSearchQuery(){ const filterParts = Object.values(metadataFilters).flat().map(value => (value || '').trim()).filter(Boolean); const parts = [libraryQuery, ...filterParts].map(value => (value || '').trim()).filter(Boolean); return uniqueValues(parts).join(' '); }
function refreshBlendedDiscovery(forceLive = false){ const effectiveQuery = getEffectiveSearchQuery(); externalDiscovery = effectiveQuery ? buildExternalDiscovery(effectiveQuery) : []; if (!sourceMode || !effectiveQuery) { if (!effectiveQuery) { liveResults = []; openAccessNotices = null; liveStatus = {state:'idle', message:'', sources:[]}; } return Promise.resolve([]); } if (forceLive || localResults.length < 24 || liveResults.length === 0) { return maybeFetchLiveResults(effectiveQuery); } return Promise.resolve(liveResults); }
function renderOpenAccessNoticeStrip() {
  if (!openAccessNotices) return "";
  const ext = openAccessNotices.externalRights;
  const dm = openAccessNotices.doabMetadata;
  if (!ext && !dm) return "";
  const parts = [];
  if (ext) parts.push(`<p class="external-source-notice__p">${escapeHtml(ext)}</p>`);
  if (dm) parts.push(`<p class="external-source-notice__p external-source-notice__p--doab">${escapeHtml(dm)}</p>`);
  return `<div class="external-source-notice" role="note">${parts.join("")}</div>`;
}

function isOpenAccessDiscoveryRecord(item) {
  if (!item || typeof item !== "object") return false;
  const src = String(item.source || item.institution || item.sourceName || "").toLowerCase();
  const coll = String(item.collection || "").toLowerCase();
  const st = String(item.sourceType || "").toLowerCase();
  if (item.liveSourceHint === "openAccessPack") return true;
  if (st === "open_access" || st === "open_access_books" || st === "open_textbook" || st === "oer") return true;
  if (coll.includes("open access books") || coll.includes("oer")) return true;
  const needles = ["doab", "openstax", "project gutenberg", "open textbook library", "libretexts", "pressbooks", "jstor open access"];
  if (needles.some((n) => src.includes(n))) return true;
  return false;
}

function dedupeLibraryStreamItems(items) {
  const seen = new Set();
  return items.filter((item) => {
    const key =
      item.id ||
      item.recordIdentifier ||
      item.sourceUrl ||
      (item.title && item.source ? `${item.title}::${item.source}` : "") ||
      (item.title ? String(item.title) : "");
    if (!String(key || "").trim()) return true;
    const clean = String(key).toLowerCase().trim();
    if (seen.has(clean)) return false;
    seen.add(clean);
    return true;
  });
}

function weaveLibraryStreamResults(groups) {
  const q = getEffectiveSearchQuery() || libraryQuery || "";
  const pools = groups.map((group) =>
    [...(group.items || [])].sort(
      (a, b) => scoreBlendedResult(b, q) - scoreBlendedResult(a, q)
    )
  );
  const pattern = groups.flatMap((group, groupIndex) =>
    Array.from({ length: Math.max(1, Number(group.weight) || 0) }, () => groupIndex)
  );
  const output = [];
  let safety = 0;
  while (pools.some((pool) => pool.length) && safety < 10000) {
    for (const index of pattern) {
      const item = pools[index]?.shift();
      if (item) output.push(item);
    }
    safety++;
  }
  return dedupeLibraryStreamItems(output);
}

function libraryStreamOriginLabel(record) {
  const mode = getResultMode(record);
  const text = [
    record.liveSourceHint,
    record.sourceType,
    record.sourceCategoryGroup,
    record.collection,
    record.source,
    record.institution,
    record.cat,
    record.rightsStatus
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (text.includes("public domain")) return "Public Domain";
  if (record.liveSourceHint === "openAccessPack" || isOpenAccessDiscoveryRecord(record)) {
    return "Open Access";
  }
  if (mode === "external_handoff") return "Source Handoff";
  if (mode === "live") return "External Source";
  return "Archive";
}

function libraryStreamOriginClass(record) {
  const label = libraryStreamOriginLabel(record);
  const map = {
    Archive: "is-origin-archive",
    "External Source": "is-origin-external",
    "Open Access": "is-origin-open-access",
    "Source Handoff": "is-origin-handoff",
    "Public Domain": "is-origin-public-domain"
  };
  return map[label] || "is-origin-archive";
}

function renderLibraryLoader(){
  const shouldShow = currentPage === 'library' && (
    liveStatus.state === 'loading' ||
    coreLoadingMore
  );

  if (!shouldShow) return '';

  const label = coreLoadingMore
    ? 'Loading more results…'
    : 'Loading library results…';

  return `<div class="library-loader" role="status" aria-live="polite" aria-busy="true">
    <div class="library-loader-bar"><span></span></div>
    <div class="library-loader-text">${escapeHtml(label)}</div>
  </div>`;
}

function renderFilterSection(label, content, options = {}) {
  const {accordion = false, open = false} = options;
  if (accordion) {
    return `<details class="filter-accordion" ${open ? "open" : ""}><summary>${escapeHtml(label)}</summary><div class="filter-accordion-panel">${content}</div></details>`;
  }
  return `<div class="sidebar-section"><div class="sidebar-label">${escapeHtml(label)}</div>${content}</div>`;
}

function renderMetadataFilterGroup(group, records, options = {}) {
  const selected = new Set(metadataFilters[group.key] || []);
  const facetOptions = group.dynamic
    ? buildFacetOptions(records, record => getRecordFacetValues(record, group.key), 18).map(option => option.value)
    : group.options;
  if (!facetOptions.length) return "";
  const content = facetOptions.map(option => `<label class="filter-opt"><input type="checkbox" data-filter-key="${escapeHtml(group.key)}" value="${escapeHtml(option)}" ${selected.has(option) ? 'checked' : ''}/><span>${escapeHtml(option)}</span></label>`).join('');
  return renderFilterSection(group.label, content, options);
}

function renderQuickFilters(options = {}) {
  const items = [
    ["openAccess","Show only open access"],
    ["verified","Show only verified records"],
    ["hideSensitive","Hide culturally sensitive records"],
    ["metadataOnly","Show metadata-only records"],
    ["needsReview","Show records needing review"]
  ];
  const content = items.map(([key, label]) => `<label class="filter-opt"><input type="checkbox" data-quick-filter="${escapeHtml(key)}" ${quickFilters[key] ? 'checked' : ''}/><span>${escapeHtml(label)}</span></label>`).join('');
  return renderFilterSection(options.accordion ? "Quick Filters" : "Quick filters", content, options);
}

function renderMobileFilterDrawer(totalResults, activeFilterCount) {
  if (!mobileFiltersOpen) return "";
  const resultLabel = `${totalResults.toLocaleString()} result${totalResults === 1 ? "" : "s"}`;
  const groups = [
    renderQuickFilters({accordion:true, open:true}),
    ...METADATA_FILTER_GROUPS.map(group => renderMetadataFilterGroup(group, RECORDS, {
      accordion:true,
      open: group.key === "sourceOrigin"
    }))
  ].join("");
  return `<button class="mobile-filter-backdrop" id="mobileFilterBackdrop" type="button" aria-label="Close filters"></button><section class="mobile-filter-drawer" id="mobileFilterDrawer" role="dialog" aria-modal="true" aria-labelledby="mobileFilterTitle"><header class="mobile-filter-header"><div><p class="mobile-filter-kicker">${activeFilterCount ? `${activeFilterCount} active` : "Refine results"}</p><h2 id="mobileFilterTitle">Filters</h2></div><div class="mobile-filter-header-actions">${activeFilterCount ? `<button id="mobileFilterClearDrawer" class="mobile-filter-clear-all" type="button">Clear all</button>` : ""}<button id="mobileFilterClose" class="mobile-filter-close" type="button" aria-label="Close filters">&times;</button></div></header><div class="mobile-filter-body">${groups}</div><footer class="mobile-filter-footer"><button id="mobileFilterApply" class="mobile-filter-apply" type="button">Show ${escapeHtml(resultLabel)}</button></footer></section>`;
}

function renderLibrary() {
  const effectiveQuery = getEffectiveSearchQuery();
  const filteredExternalResults = sourceMode ? filterDisplayedRecords(liveResults) : [];
  const displayedLive = filteredExternalResults.filter(item => getResultMode(item) === "live");
  const displayedOpenAccess = displayedLive.filter(item => isOpenAccessDiscoveryRecord(item));
  const displayedLiveOther = displayedLive.filter(item => !isOpenAccessDiscoveryRecord(item));
  const displayedExternal = filteredExternalResults.filter(item => getResultMode(item) === "external_handoff");
  const displayedLocal = filterDisplayedRecords(localResults);

  const cArchive = displayedLocal.length;
  const cExt = displayedLiveOther.length;
  const cOA = displayedOpenAccess.length;
  const cHand = displayedExternal.length;

  const blendedResults =
    sourceMode && effectiveQuery
      ? weaveLibraryStreamResults([
          { label: "Archive", weight: 2, items: displayedLocal },
          { label: "External", weight: 2, items: displayedLiveOther },
          { label: "Open Access", weight: 1, items: displayedOpenAccess },
          { label: "Handoff", weight: 1, items: displayedExternal },
        ])
      : displayedLocal;

  const totalBlended = blendedResults.length;
  const canLoadMoreCore =
    sourceMode &&
    displayedLiveOther.length > 0 &&
    (coreTotalHits === 0 || displayedLiveOther.length < coreTotalHits);

  const relatedSearches = getRelatedSearchSuggestions(effectiveQuery || libraryQuery, 18);
  const collectionSuggestions = getCollectionSuggestions(effectiveQuery || libraryQuery, 8);
  const topKnowledgeAreas = getFeaturedThemes(12);
  const topSources = SOURCES.filter(source => source.access === "search").slice(0, 6);
  const hasFilter = hasAnyMetadataFilter() || libraryQuery;
  const activeFilterCount = getActiveFilterCount();

  const qEsc = effectiveQuery ? escapeHtml(effectiveQuery) : "";
  const metaPrimary =
    sourceMode && effectiveQuery
      ? `${totalBlended} result${totalBlended !== 1 ? "s" : ""}${effectiveQuery ? ` for “${qEsc}”` : ""} · ${cArchive} archive · ${cExt} external · ${cOA} open access · ${cHand} handoff${cHand !== 1 ? "s" : ""}`
      : `${totalBlended} result${totalBlended !== 1 ? "s" : ""}${effectiveQuery ? ` for “${qEsc}”` : ""} · `;

  const strip =
    sourceMode && effectiveQuery
      ? `<div class="result-source-strip" aria-label="Counts by origin"><span class="result-source-strip__item"><strong>${cArchive}</strong> archive</span><span class="result-source-strip__sep" aria-hidden="true">·</span><span class="result-source-strip__item"><strong>${cExt}</strong> external</span><span class="result-source-strip__sep" aria-hidden="true">·</span><span class="result-source-strip__item"><strong>${cOA}</strong> open access</span><span class="result-source-strip__sep" aria-hidden="true">·</span><span class="result-source-strip__item"><strong>${cHand}</strong> handoff${cHand !== 1 ? "s" : ""}</span></div>`
      : "";

  const emptyGuide = `<div class="empty empty-guide"><h3>No matching records yet</h3><p>Try a broader search, clear filters, or explore these discovery paths.</p>${relatedSearches.length ? `<div class="empty-guide-block"><div class="empty-guide-title">Related searches</div>${renderRelatedSearchTags(relatedSearches.slice(0, 8))}</div>` : ""}${topKnowledgeAreas.length ? `<div class="empty-guide-block"><div class="empty-guide-title">Top knowledge areas</div>${renderRelatedSearchTags(topKnowledgeAreas.slice(0, 10))}</div>` : ""}${collectionSuggestions.length ? `<div class="empty-guide-block"><div class="empty-guide-title">Curated collection pathways</div><div class="coll-grid">${collectionSuggestions.slice(0, 4).map(renderCollectionCard).join("")}</div></div>` : ""}${topSources.length ? `<div class="empty-guide-block"><div class="empty-guide-title">Source pathways</div><div class="source-grid">${topSources.map(source => renderSourceCard(source)).join("")}</div></div>` : ""}</div>`;

  const blendedSection =
    totalBlended > 0
      ? `<section class="results-section blended-results-section"><div class="results-section-title"><h3>Results</h3><span>${totalBlended} blended archive, open access and external source result${totalBlended !== 1 ? "s" : ""}</span></div>${sourceMode && effectiveQuery ? renderOpenAccessNoticeStrip() : ""}${strip}<div class="card-grid results-grid blended-results-grid">${blendedResults.map(renderCard).join("")}</div>${canLoadMoreCore ? `<div class="load-more-wrap"><button id="loadMoreCoreBtn" class="load-more-btn" type="button">${coreLoadingMore ? "Loading…" : "Load more CORE results"}</button></div>` : ""}</section>`
      : emptyGuide;

  return `<div class="page active"><div class="library-layout"><aside class="sidebar">${hasFilter ? `<button class="clear-btn" id="clearBtn" type="button">Clear all filters</button>` : ""}${renderQuickFilters()}${METADATA_FILTER_GROUPS.map(group => renderMetadataFilterGroup(group, RECORDS)).join("")}</aside><div class="main-results library-blended-discovery"><div class="search-bar"><input type="text" id="mainSearch" value="${escapeHtml(libraryQuery)}" placeholder="Search metadata, provenance, rights, source, and cultural protocol fields…" autocomplete="off"/><button id="localSearchBtn" type="button">Search</button><button class="secondary ${sourceMode ? "live-on" : "live-off"}" id="sourceSearchBtn" type="button">${sourceMode ? "External sources on" : "External sources off"}</button></div>${renderSearchSuggestions()}${renderRecentSearches("library")}${renderSearchSaveAction(effectiveQuery)}<div class="mobile-filter-bar"><button id="mobileFilterToggle" class="mobile-filter-btn ${mobileFiltersOpen ? "active" : ""}" type="button" aria-expanded="${mobileFiltersOpen ? "true" : "false"}" aria-controls="mobileFilterDrawer">Filters${activeFilterCount ? ` (${activeFilterCount})` : ""}</button>${activeFilterCount ? `<button id="mobileClearFilters" class="mobile-clear-btn" type="button">Clear</button>` : ""}</div>${renderMobileFilterDrawer(totalBlended, activeFilterCount)}${renderLibraryLoader()}${renderLiveStatus()}<div class="results-stack">${blendedSection}${relatedSearches.length ? `<section class="results-section"><div class="results-section-title"><h3>Related searches</h3><span>${RELATED_SEARCH_INDEX.length.toLocaleString()} discovery routes</span></div>${renderRelatedSearchTags(relatedSearches)}</section>` : ""}${collectionSuggestions.length ? `<section class="results-section"><div class="results-section-title"><h3>Curated collection pathways</h3><span>${COLLECTIONS.length} editorial browse routes</span></div><div class="coll-grid">${collectionSuggestions.map(renderCollectionCard).join("")}</div></section>` : ""}</div></div></div></div>`;
}

function applyLibraryQuery(value, clearSources = true) { const nextQuery = value.trim(); const queryChanged = nextQuery !== libraryQuery; console.log('[APPLY QUERY]', { value: nextQuery, clearSources, queryChanged, beforeLiveResults: liveResults.length }); libraryQuery = nextQuery; localResults = searchLocalRecords(getEffectiveSearchQuery() || libraryQuery); if (clearSources && queryChanged) { liveResults = []; openAccessNotices = null; externalDiscovery = []; coreOffset = coreLimit; coreTotalHits = 0; liveStatus = {state:'idle', message: getEffectiveSearchQuery() ? 'Archive results loaded. External source discovery is available.' : '', sources:[]}; } refreshBlendedDiscovery(true); }

function closeMobileFilters() {
  mobileFiltersOpen = false;
  render();
}

function clearMobileFilters() {
  clearMetadataFilters();
  localResults = searchLocalRecords(getEffectiveSearchQuery() || libraryQuery);
  refreshBlendedDiscovery(true);
  render();
}

function handleMobileFilterEscape(event) {
  if (event.key === "Escape" && mobileFiltersOpen) closeMobileFilters();
}

function bindCardEvents() {
  document.querySelectorAll(".card[data-id]").forEach(card => {
    const open = () => {
      const recordId = card.dataset.id;
      const record = recordId ? getRecordByIdAny(recordId) : null;
      console.log('[CARD CLICK]', {
        recordId,
        mode: card.dataset.mode,
        hasRecord: !!record,
        sourceUrl: record?.sourceUrl || card.dataset.url || ''
      });
      if (recordId && record) {
        navigate("record", recordId);
        return;
      }

      const url = card.dataset.url;
      if (typeof url === "string" && /^https?:\/\//i.test(url.trim())) {
        openExternal(url.trim());
      }
    };

    // Selector for "interactive descendants whose events must not bubble up
    // and trigger the card-open behaviour". Native form controls are listed
    // explicitly so the guard still works if a control is missing the
    // `data-stop-card-open` marker. `label` is included because clicking a
    // <label> synthesises a click on its associated input.
    const interactiveSelector =
      'a,button,input,select,textarea,label,[contenteditable="true"],[data-stop-card-open="true"]';

    card.addEventListener("click", event => {
      if (event.target instanceof Element && event.target.closest(interactiveSelector)) return;
      open();
    });

    card.addEventListener("keydown", event => {
      // Skip when the keystroke is happening inside a nested interactive
      // control — otherwise typing Space/Enter inside the "New list title"
      // input or pressing Space on the bookmark button would navigate to the
      // record page (and eat the keystroke). The card itself has
      // role="button" + tabindex="0", so we still handle Enter/Space when
      // it is focused directly.
      if (event.target instanceof Element && event.target !== card && event.target.closest(interactiveSelector)) return;
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        open();
      }
    });
  });
}

async function loadMoreCoreResults() {
  if (coreLoadingMore || !sourceMode) return;
  const effectiveQuery = getEffectiveSearchQuery();
  if (!effectiveQuery) return;
  console.log('[CORE LOAD MORE] start', { query: effectiveQuery, offset: coreOffset, limit: coreLimit });
  coreLoadingMore = true;
  render();
  try {
    const coreAdapter = LIVE_SOURCE_ADAPTERS.find(adapter => adapter.id === 'core');
    if (!coreAdapter) throw new Error('CORE adapter missing');
    const nextBatch = await coreAdapter.search(effectiveQuery, {
      offset: coreOffset,
      limit: coreLimit
    });
    console.log('[CORE LOAD MORE] returned', { count: Array.isArray(nextBatch) ? nextBatch.length : 0 });
    if (Array.isArray(nextBatch) && nextBatch.length) {
      const existingIds = new Set(liveResults.map(item => item.id));
      nextBatch.forEach(item => {
        TRANSIENT_RESULTS_BY_ID.set(item.id, item);
        if (!existingIds.has(item.id)) {
          liveResults.push(item);
        }
      });
      coreOffset += coreLimit;
    }
  } catch (error) {
    console.warn('[CORE LOAD MORE] failed', { error: String(error) });
    liveStatus = {
      state:'warning',
      message:'CORE is temporarily busy. Try loading more again.',
      sources:[{ label:'CORE', state:'fail', count:0 }]
    };
  } finally {
    coreLoadingMore = false;
    render();
  }
}

function bindEvents() { document.querySelectorAll('[data-page]').forEach(element => { element.addEventListener('click', event => { const page = element.dataset.page; if (!page) return; event.preventDefault(); if (element.dataset.collection) { clearMetadataFilters(); metadataFilters.curatedCollections = [element.dataset.collection]; libraryQuery = ''; localResults = searchLocalRecords(getEffectiveSearchQuery()); liveResults = []; externalDiscovery = []; liveStatus = {state:'idle', message:'', sources:[]}; refreshBlendedDiscovery(true); } navigate(page); }); }); const hamburger = document.getElementById('hamburger'); const navMobile = document.getElementById('navMobile'); if (hamburger && navMobile) hamburger.addEventListener('click', () => navMobile.classList.toggle('open')); document.querySelectorAll('.suggestion[data-q], .related-search[data-related]').forEach(element => { element.addEventListener('click', () => { applyLibraryQuery(element.dataset.q || element.dataset.related || ''); navigate('library'); }); }); const heroInput = document.getElementById('heroSearch'); const heroButton = document.getElementById('heroSearchBtn'); if (heroInput && heroButton) { const submitHero = () => { const value = heroInput.value.trim(); if (value) pushRecentSearch(value); applyLibraryQuery(value); searchSuggestions = []; activeSuggestionIndex = -1; currentPage = 'library'; selectedRecordId = null; navigate('library'); requestAnimationFrame(() => { render(); const mainSearchAfter = document.getElementById('mainSearch'); if (mainSearchAfter) mainSearchAfter.value = libraryQuery; }); };
const pickHeroSuggestion = (value) => {
  heroInput.value = value;
  libraryQuery = value;
  searchSuggestions = [];
  activeSuggestionIndex = -1;
  pushRecentSearch(value);
  applyLibraryQuery(value);
  currentPage = 'library';
  selectedRecordId = null;
  navigate('library');
  requestAnimationFrame(() => { render(); const mainSearchAfter = document.getElementById('mainSearch'); if (mainSearchAfter) mainSearchAfter.value = libraryQuery; });
};
heroButton.addEventListener('click', submitHero);
heroInput.addEventListener('keydown', event => {
  if (event.key === 'Enter') {
    if (activeSuggestionIndex >= 0 && searchSuggestions[activeSuggestionIndex]) {
      pickHeroSuggestion(searchSuggestions[activeSuggestionIndex].value);
      return;
    }
    submitHero();
    return;
  }
  if (event.key === 'ArrowDown' && searchSuggestions.length) {
    event.preventDefault();
    activeSuggestionIndex = (activeSuggestionIndex + 1) % searchSuggestions.length;
    updateSuggestionsDOM('heroSuggestions');
    return;
  }
  if (event.key === 'ArrowUp' && searchSuggestions.length) {
    event.preventDefault();
    activeSuggestionIndex = activeSuggestionIndex <= 0 ? searchSuggestions.length - 1 : activeSuggestionIndex - 1;
    updateSuggestionsDOM('heroSuggestions');
    return;
  }
  if (event.key === 'Escape') {
    closeSuggestionsPanel('heroSuggestions');
  }
});
heroInput.addEventListener('input', () => {
  searchSuggestions = getSearchSuggestions(heroInput.value);
  activeSuggestionIndex = -1;
  updateSuggestionsDOM('heroSuggestions');
});
heroInput.addEventListener('focus', () => {
  if (heroInput.value && !searchSuggestions.length) {
    searchSuggestions = getSearchSuggestions(heroInput.value);
    activeSuggestionIndex = -1;
    updateSuggestionsDOM('heroSuggestions');
  }
});
bindSuggestionItemEvents('heroSuggestions', pickHeroSuggestion);
} const mainSearch = document.getElementById('mainSearch'); const localSearchBtn = document.getElementById('localSearchBtn'); const sourceSearchBtn = document.getElementById('sourceSearchBtn'); const mobileFilterToggle = document.getElementById('mobileFilterToggle'); const mobileClearFilters = document.getElementById('mobileClearFilters'); if (mainSearch && localSearchBtn) { const submitSearch = () => { const value = mainSearch.value.trim(); searchSuggestions = []; activeSuggestionIndex = -1; if (value) pushRecentSearch(value); applyLibraryQuery(value); render(); }; localSearchBtn.addEventListener('click', submitSearch); mainSearch.addEventListener('keydown', event => {
  if (event.key === 'Enter') {
    if (activeSuggestionIndex >= 0 && searchSuggestions[activeSuggestionIndex]) {
      const chosen = searchSuggestions[activeSuggestionIndex];
      mainSearch.value = chosen.value;
      libraryQuery = chosen.value;
      searchSuggestions = [];
      activeSuggestionIndex = -1;
      pushRecentSearch(chosen.value);
      applyLibraryQuery(chosen.value);
      render();
      return;
    }
    submitSearch();
    return;
  }
  if (event.key === 'ArrowDown' && searchSuggestions.length) {
    event.preventDefault();
    activeSuggestionIndex = (activeSuggestionIndex + 1) % searchSuggestions.length;
    updateSuggestionsDOM();
    return;
  }
  if (event.key === 'ArrowUp' && searchSuggestions.length) {
    event.preventDefault();
    activeSuggestionIndex = activeSuggestionIndex <= 0 ? searchSuggestions.length - 1 : activeSuggestionIndex - 1;
    updateSuggestionsDOM();
    return;
  }
  if (event.key === 'Escape') {
    closeSuggestionsPanel();
  }
}); mainSearch.addEventListener('input', () => {
  clearTimeout(debounceTimer);
  searchSuggestions = getSearchSuggestions(mainSearch.value);
  activeSuggestionIndex = -1;
  updateSuggestionsDOM();
}); mainSearch.addEventListener('focus', () => {
  if (mainSearch.value && !searchSuggestions.length) {
    searchSuggestions = getSearchSuggestions(mainSearch.value);
    activeSuggestionIndex = -1;
    updateSuggestionsDOM();
  }
}); bindSuggestionItemEvents(); } const loadMoreCoreBtn = document.getElementById('loadMoreCoreBtn'); if (loadMoreCoreBtn) { loadMoreCoreBtn.addEventListener('click', () => { loadMoreCoreResults(); }); }
const copyCitationBtn = document.getElementById('copyCitationBtn'); if (copyCitationBtn && currentPage === 'record' && selectedRecordId) { copyCitationBtn.addEventListener('click', async () => { try { const record = getRecordByIdAny(selectedRecordId); if (!record) return; await copyCitation(record); const note = document.getElementById('copyCitationNote'); if (note) note.textContent = 'Copied'; window.setTimeout(() => { const resetNote = document.getElementById('copyCitationNote'); if (resetNote) resetNote.textContent = 'Copy archive citation text'; }, 1400); } catch (error) { console.error('Failed to copy citation:', error); } }); }
const citationStyleSelect = document.getElementById('citationStyleSelect'); if (citationStyleSelect && currentPage === 'record' && selectedRecordId) { citationStyleSelect.addEventListener('change', event => { citationStyle = event.target.value || 'apa'; render(); }); }
const copyCitationInlineBtn = document.getElementById('copyCitationInlineBtn'); if (copyCitationInlineBtn && currentPage === 'record' && selectedRecordId) { copyCitationInlineBtn.addEventListener('click', async () => { try { const record = getRecordByIdAny(selectedRecordId); if (!record) return; await navigator.clipboard.writeText(generateCitationByStyle(record, citationStyle)); copyCitationInlineBtn.textContent = '✓'; copyCitationInlineBtn.classList.add('copied'); window.setTimeout(() => { copyCitationInlineBtn.textContent = '⎘'; copyCitationInlineBtn.classList.remove('copied'); }, 1800); } catch(e) { console.warn('copy failed', e); } }); }
const downloadRisBtn = document.getElementById('downloadRisBtn'); if (downloadRisBtn && currentPage === 'record' && selectedRecordId) { downloadRisBtn.addEventListener('click', () => { const record = getRecordByIdAny(selectedRecordId); if (!record) return; downloadRIS(record); }); }
const downloadBibBtn = document.getElementById('downloadBibBtn'); if (downloadBibBtn && currentPage === 'record' && selectedRecordId) { downloadBibBtn.addEventListener('click', () => { const record = getRecordByIdAny(selectedRecordId); if (!record) return; downloadBibTeX(record); }); }

document.querySelectorAll('[data-record-tool]').forEach(form => {
  form.addEventListener('submit', event => {
    event.preventDefault();
    const record = getRecordByIdAny(selectedRecordId);
    if (!record) return;
    const formData = new FormData(form);
    const tool = form.dataset.recordTool;
    const payload = {action: tool};
    formData.forEach((value, key) => {
      payload[key] = typeof value === 'string' ? value : '';
    });
    if (tool === 'create_reading_list') payload.isPublic = formData.get('isPublic') === 'on';
    postRecordWorkspaceAction(record, payload);
  });
});
document.querySelectorAll('[data-member-signin]').forEach(button => {
  button.addEventListener('click', event => {
    event.preventDefault();
    redirectToMemberSignIn();
  });
});
document.querySelectorAll('[data-card-drawer-toggle]').forEach(button => {
  button.addEventListener('click', event => {
    event.preventDefault();
    event.stopPropagation();
    const card = button.closest('.record-card');
    const recordId = card ? card.dataset.id : '';
    if (!recordId) return;
    setCardDrawerOpen(recordId, !getCardDrawerOpen(recordId));
    render();
  });
});
document.querySelectorAll('[data-card-open-record]').forEach(button => {
  button.addEventListener('click', event => {
    event.preventDefault();
    event.stopPropagation();
    const card = button.closest('.record-card');
    const recordId = card ? card.dataset.id : '';
    if (!recordId) return;
    navigate('record', recordId);
  });
});
document.querySelectorAll('[data-card-bookmark]').forEach(button => {
  button.addEventListener('click', event => {
    event.preventDefault();
    const container = button.closest('[data-record-id]');
    const record = container ? getRecordByIdAny(container.dataset.recordId || '') : null;
    if (!record) return;
    const data = memberWorkspaceState.data || {};
    const bookmarked = (data.bookmarkRecordIds || []).includes(record.id);
    postRecordWorkspaceAction(record, {
      action:"bookmark",
      bookmarked:!bookmarked
    });
  });
});
document.querySelectorAll('[data-card-list-toggle]').forEach(button => {
  button.addEventListener('click', event => {
    event.preventDefault();
    const container = button.closest('[data-record-id]');
    const recordId = container ? String(container.dataset.recordId || "") : "";
    if (!recordId) return;
    setCardListComposerOpen(recordId, !getCardListComposerOpen(recordId));
    setCardWorkbenchComposerOpen(recordId, false);
    render();
  });
});
document.querySelectorAll('[data-card-workbench-toggle]').forEach(button => {
  button.addEventListener('click', event => {
    event.preventDefault();
    const container = button.closest('[data-record-id]');
    const recordId = container ? String(container.dataset.recordId || "") : "";
    if (!recordId) return;
    setCardWorkbenchComposerOpen(recordId, !getCardWorkbenchComposerOpen(recordId));
    setCardListComposerOpen(recordId, false);
    render();
  });
});
document.querySelectorAll('[data-card-add-list]').forEach(button => {
  button.addEventListener('click', event => {
    event.preventDefault();
    const container = button.closest('[data-record-id]');
    const record = container ? getRecordByIdAny(container.dataset.recordId || '') : null;
    const select = container ? container.querySelector('[data-card-reading-list]') : null;
    if (!record || !select || !select.value) return;
    postRecordWorkspaceAction(record, {
      action:"add_to_reading_list",
      readingListId:select.value
    });
  });
});
document.querySelectorAll('[data-card-create-list]').forEach(button => {
  button.addEventListener('click', event => {
    event.preventDefault();
    const container = button.closest('[data-record-id]');
    const record = container ? getRecordByIdAny(container.dataset.recordId || '') : null;
    const input = container ? container.querySelector('[data-card-new-list]') : null;
    const title = input ? input.value.trim() : "";
    if (!record || !title) {
      memberWorkspaceState = {...memberWorkspaceState, status:"ready", message:"Add a list title first."};
      render();
      return;
    }
    postRecordWorkspaceAction(record, {
      action:"create_reading_list",
      title
    });
  });
});
document.querySelectorAll('[data-card-workbench-add]').forEach(button => {
  button.addEventListener('click', event => {
    event.preventDefault();
    const container = button.closest('[data-record-id]');
    const record = container ? getRecordByIdAny(container.dataset.recordId || '') : null;
    const select = container ? container.querySelector('[data-card-workbench-project]') : null;
    if (!record || !select || !select.value) return;
    postRecordWorkspaceAction(record, {
      action:"workbench_add_record",
      projectId:select.value
    });
  });
});
document.querySelectorAll('[data-card-workbench-create]').forEach(button => {
  button.addEventListener('click', event => {
    event.preventDefault();
    const container = button.closest('[data-record-id]');
    const record = container ? getRecordByIdAny(container.dataset.recordId || '') : null;
    const input = container ? container.querySelector('[data-card-new-workbench-project]') : null;
    const title = input ? input.value.trim() : "";
    if (!record || !title) {
      memberWorkspaceState = {...memberWorkspaceState, status:"ready", message:"Add a project title first."};
      render();
      return;
    }
    postRecordWorkspaceAction(record, {
      action:"workbench_create_project",
      workbenchTitle:title
    });
  });
});
document.querySelectorAll('[data-save-search]').forEach(form => {
  form.addEventListener('submit', event => {
    event.preventDefault();
    const formData = new FormData(form);
    const query = String(formData.get('query') || getEffectiveSearchQuery() || libraryQuery).trim();
    const label = String(formData.get('label') || query).trim();
    postSearchWorkspaceAction({
      action:"save_search",
      query,
      label,
      filters:getCurrentSearchFilters()
    });
  });
});
document.removeEventListener('keydown', handleMobileFilterEscape);
document.addEventListener('keydown', handleMobileFilterEscape);
if (mobileFilterToggle) { mobileFilterToggle.addEventListener('click', () => { mobileFiltersOpen = !mobileFiltersOpen; render(); }); }
if (mobileClearFilters) { mobileClearFilters.addEventListener('click', clearMobileFilters); }
["mobileFilterClose","mobileFilterBackdrop","mobileFilterApply"].forEach(id => {
  const control = document.getElementById(id);
  if (control) control.addEventListener('click', closeMobileFilters);
});
const mobileFilterClearDrawer = document.getElementById('mobileFilterClearDrawer');
if (mobileFilterClearDrawer) mobileFilterClearDrawer.addEventListener('click', clearMobileFilters);
if (sourceSearchBtn) { sourceSearchBtn.addEventListener('click', () => { console.log('[SOURCE MODE TOGGLE]', { nextOn: !sourceMode }); sourceMode = !sourceMode; if (sourceMode) { refreshBlendedDiscovery(true); } else { liveResults = []; openAccessNotices = null; externalDiscovery = []; liveStatus = {state:'idle', message:'External source discovery is off. Showing archive records only.', sources:[]}; } render(); }); } document.querySelectorAll('input[data-filter-key]').forEach(input => { input.addEventListener('change', () => { const key = input.dataset.filterKey; const checkedValues = [...new Set(Array.from(document.querySelectorAll(`input[data-filter-key="${key}"]:checked`)).map(item => item.value))]; if (checkedValues.length) metadataFilters[key] = checkedValues; else delete metadataFilters[key]; localResults = searchLocalRecords(getEffectiveSearchQuery()); refreshBlendedDiscovery(true); render(); }); }); document.querySelectorAll('input[data-quick-filter]').forEach(input => { input.addEventListener('change', () => { const key = input.dataset.quickFilter; quickFilters[key] = input.checked; localResults = searchLocalRecords(getEffectiveSearchQuery()); refreshBlendedDiscovery(true); render(); }); }); const clearBtn = document.getElementById('clearBtn'); if (clearBtn) { clearBtn.addEventListener('click', () => { clearMetadataFilters(); libraryQuery = ''; localResults = [...RECORDS]; liveResults = []; externalDiscovery = []; liveStatus = {state:'idle', message:'', sources:[]}; render(); }); } bindCardEvents(); document.querySelectorAll('[data-recent-search]').forEach(button => { button.addEventListener('click', () => { const value = button.dataset.recentSearch || ''; if (!value) return; const variant = button.dataset.recentVariant || 'library'; libraryQuery = value; searchSuggestions = []; activeSuggestionIndex = -1; pushRecentSearch(value); applyLibraryQuery(value, true); if (variant === 'hero') { currentPage = 'library'; selectedRecordId = null; navigate('library'); requestAnimationFrame(() => { render(); const ms = document.getElementById('mainSearch'); if (ms) ms.value = value; }); } else { render(); const ms = document.getElementById('mainSearch'); if (ms) ms.value = value; } }); }); const clearRecentBtnLibrary = document.getElementById('clearRecentSearchesBtn'); if (clearRecentBtnLibrary) { clearRecentBtnLibrary.addEventListener('click', () => { clearRecentSearches(); render(); }); } const clearRecentBtnHero = document.getElementById('clearRecentSearchesBtnHero'); if (clearRecentBtnHero) { clearRecentBtnHero.addEventListener('click', () => { clearRecentSearches(); render(); }); } document.querySelectorAll('[data-media-root] img').forEach(image => { image.addEventListener('error', () => { const mediaRoot = image.closest('[data-media-root]'); if (mediaRoot) mediaRoot.classList.add('hidden'); }, {once:true}); }); }
function syncRouteFromPath(options = {}) {
  const route = parseRouteFromLocation();
  currentPage = route.page;
  selectedRecordId = route.recordId;
  document.querySelectorAll('.nav-link').forEach(link => {
    link.classList.toggle('active', link.getAttribute('href') === makePath(currentPage, selectedRecordId));
  });
  applyRoute(route, {preserveScroll: options.preserveScroll || options.scroll === false});
}

window.addEventListener("popstate", () => {
  syncRouteFromPath({preserveScroll:true});
});

function initArchiveApp() {
  // One initialisation per full document load. In-app archive routing (capture)
  // only handles clicks inside #app so navbar/footer are never hijacked after a
  // Next client transition. Navbar uses hardNavigateToArchive from dashboard routes.
  recentSearches = loadRecentSearches();
  loadSiteContent();

  document.removeEventListener('click', handleArchiveNavigationClick, true);
  document.addEventListener('click', handleArchiveNavigationClick, true);

  // Global outside-click handler for suggestion panels.
  // Registered once, not on every render, to avoid leaking listeners.
  //
  // Uses 'click' (not 'pointerdown'): pointerdown fires during scroll gestures
  // on trackpads, which would close the panel just from scrolling. 'click'
  // only fires when pointer down+up land on the same element.
  //
  // The suggestion buttons call preventDefault on their own mousedown to hold
  // focus, and run their action on click, so the inside-click check here
  // correctly excludes them before this handler decides to close anything.
  document.addEventListener('click', event => {
    const inSearchBar   = event.target.closest('.search-bar');
    const inHeroSearch  = event.target.closest('.hero-search');
    const inPanel       = event.target.closest('.search-suggestions');
    if (inSearchBar || inHeroSearch || inPanel) return;
    if (document.getElementById('searchSuggestions')) closeSuggestionsPanel('searchSuggestions');
    if (document.getElementById('heroSuggestions'))   closeSuggestionsPanel('heroSuggestions');
  });

  // Delegated rights-disclosure toggle. Installed once and works after every
  // re-render. Stops propagation so clicking it never opens the parent card.
  document.addEventListener('click', event => {
    const toggle = event.target instanceof Element ? event.target.closest('[data-rights-toggle]') : null;
    if (!toggle) return;
    event.preventDefault();
    event.stopPropagation();
    const wrap = toggle.closest('.record-rights-compact');
    if (!wrap) return;
    const panel = wrap.querySelector('.record-rights-panel');
    if (!panel) return;
    const expanded = toggle.getAttribute('aria-expanded') === 'true';
    if (expanded) {
      toggle.setAttribute('aria-expanded', 'false');
      panel.hidden = true;
      wrap.classList.remove('is-open');
    } else {
      toggle.setAttribute('aria-expanded', 'true');
      panel.hidden = false;
      wrap.classList.add('is-open');
    }
  });
  // Keyboard accessibility: Space/Enter on the toggle behave like click.
  document.addEventListener('keydown', event => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    const toggle = event.target instanceof Element ? event.target.closest('[data-rights-toggle]') : null;
    if (!toggle) return;
    event.preventDefault();
    event.stopPropagation();
    toggle.click();
  });

  syncRouteFromPath({scroll:false});
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initArchiveApp);
} else {
  initArchiveApp();
}
