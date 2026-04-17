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
  "African Philosophy Working Library"
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
  ["Related search expansion engine","Generates adjacent discovery routes from themes, places, languages, and source pathways."],
  ["Variant spelling resolver","Supports alternate spellings, transliteration differences, and naming variations."],
  ["Multilingual alias layer","Maps language, community, and regional variants into shared discovery pathways."],
  ["Collection pathway builder","Constructs editorial browse routes from regional, thematic, and format taxonomies."],
  ["Theme registry","Maintains the expanded intellectual taxonomy that drives discovery and browse."],
  ["Historical geography mapper","Links current countries, territories, and historical geographies in search logic."],
  ["Language family registry","Supports language-aware discovery across multilingual metadata and script traditions."],
  ["Institution lookup cache","Stores source institution descriptors for outbound routing and context."],
  ["Citation enrichment layer","Builds portable citation text for local and imported records."],
  ["Related-record graph","Connects records by theme, tag, concept, region, and collection."],
  ["Media fallback layer","Ensures missing images or media do not break the detail layout."],
  ["Static search index builder","Bundles search-friendly metadata directly into the shipped HTML."],
  ["Zero-result recovery layer","Uses related searches and source handoffs to recover from dead-end queries."],
  ["Source handoff router","Sends users to external institutions without blocking the local archive flow."],
  ["Manual curation pathway","Editorial intake route for hand-built records and curated summaries."],
  ["Archive quality review","Internal pathway for checking metadata consistency, duplication, and gaps."],
  ["Record link resolver","Coordinates internal record detail links and outbound source links."],
  ["Query expansion dictionary","Expands core archive terms into nearby intellectual and regional vocabularies."],
  ["Collection coverage estimator","Derives collection scale from record, theme, and source overlap."],
  ["Taxonomy maintenance pathway","Keeps themes, collections, countries, and languages aligned as the archive grows."]
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
let libraryQuery = "";
let localResults = [];
let filterType = "";
let filterRegion = "";
let filterCat = "";
let filterTheme = "";
let filterCollection = "";
let filterLanguage = "";
let sourceMode = true;
let externalDiscovery = [];
let debounceTimer = null;

const SOURCE_MAP = new Map(SOURCES.map(source => [source.name, source]));

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
      "The current detail view is built from filename-level metadata. It preserves the title, creator, inferred themes, and discovery links so the record remains useful now, while still allowing richer abstracts, cover images, and catalogue references to be added later."
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
    language: uniqueValues(merged.language || []),
    concepts,
    themes,
    tags: uniqueValues(merged.tags || []),
    keywords,
    images: (merged.images || []).filter(image => safeUrl(image.src || image.url)).map(image => ({
      src: safeUrl(image.src || image.url),
      alt: image.alt || merged.title,
      caption: image.caption || ""
    })),
    externalLinks,
    collection: merged.collection || merged.cat || "",
    institution: merged.institution || (record.source === "Local Bank" ? "Decolonising Archive local index" : record.source || ""),
    citation: merged.citation || derivedCitation({...merged, description}),
    archiveIdentifier: merged.archiveIdentifier || `DA-${record.id.toUpperCase()}`,
    recordIdentifier: merged.recordIdentifier || record.id.toUpperCase(),
    relatedRecords: uniqueValues(merged.relatedRecords || []),
    sourcePathways: uniqueValues(merged.sourcePathways || defaultSourcePathways(record)),
    countries: uniqueValues([...(merged.countries || []), record.country]),
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
  return RECORDS.filter(record => !String(record.id).startsWith("wl")).slice(0, 6);
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
  return record.images[0] || null;
}

function getGalleryImages(record) {
  return record.images.slice(1);
}

function buildRecordSearchText(record) {
  return foldText([
    record.title,
    record.alternateTitle,
    record.creator,
    record.summary,
    record.abstract,
    record.description.join(" "),
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
  const detail = foldText(record.description.join(" "));
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
    if (filterType && record.type !== filterType) return false;
    if (filterRegion && record.region !== filterRegion) return false;
    if (filterCat && record.cat !== filterCat) return false;
    if (filterTheme && ![...record.themes, ...record.concepts].includes(filterTheme)) return false;
    if (filterCollection && record.collection !== filterCollection) return false;
    if (filterLanguage && !(record.language || []).includes(filterLanguage)) return false;
    return true;
  });
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


async function logSearchTerm(rawTerm) {
  const term = String(rawTerm || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .slice(0, 120);

  if (!term || term.length < 2) return;

  try {
    await fetch("/api/search-term", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ term }),
    });
  } catch (error) {
    console.error("Failed to log search term:", error);
  }
}

function parseHash() {
  const raw = window.location.hash.replace(/^#\/?/, "");
  if (!raw) return {page:"home", recordId:null};
  const parts = raw.split("/").filter(Boolean);
  if (parts[0] === "record" && parts[1]) {
    return {page:"record", recordId:decodeURIComponent(parts.slice(1).join("/"))};
  }
  const page = ["home","library","sources","about"].includes(parts[0]) ? parts[0] : "home";
  return {page, recordId:null};
}

function makeHash(page, recordId) {
  if (page === "record" && recordId) return `#/record/${encodeURIComponent(recordId)}`;
  return `#/${page}`;
}

function navigate(page, recordId = null) {
  const nextHash = makeHash(page, recordId);
  currentPage = page;
  selectedRecordId = recordId;
  if (window.location.hash !== nextHash) {
    window.location.hash = nextHash;
    if (page === "library") {
      requestAnimationFrame(() => render());
    }
    return;
  }
  syncRouteFromHash();
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
      return `<a class="action-link" href="#/library" data-page="library" data-collection="${escapeHtml(collection.title)}">
        <div>
          <span>Browse collection</span>
          <small>${escapeHtml(collection.title)}</small>
        </div>
        <span>→</span>
      </a>`;
    }

    return "";
  }).filter(Boolean);

  if (!items.length) return "";

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
  const featuredThemes = getFeaturedThemes();
  const relatedPreview = getRelatedSearchSuggestions("", 14);
  const relatedCount = RELATED_SEARCH_INDEX.length;
  const countryCount = COUNTRY_TERRITORIES.length;
  const languageCount = LANGUAGE_INDEX.length;
  const searchReadyCount = SOURCES.filter(source => source.access === "search").length;

  return `
    <div class="page active">
      <section class="hero">
        <div class="hero-eyebrow">${RECORDS.length} locally indexed records · 300,000+ archive horizon · static-hosted discovery architecture</div>
        <h1>The archive of<br/><strong>decolonising knowledge</strong></h1>
        <p class="hero-sub">Books, oral histories, artefacts, images, textiles, posters, manuscripts, architectural documentation, and cultural records across Africa, the diaspora, and the Global South.</p>
        <div class="hero-search">
          <input type="text" id="heroSearch" placeholder="Search by title, creator, theme, region, community…" autocomplete="off"/>
          <button id="heroSearchBtn" type="button">Search</button>
        </div>
        <div class="hero-suggestions">
          ${FEATURED_QUERY_SUGGESTIONS.slice(0, 7).map(term => `<span class="suggestion" data-q="${escapeHtml(term)}">${escapeHtml(term)}</span>`).join("")}
        </div>
        <div class="hero-note">Core browsing runs from a stable local index, while collections, themes, related searches, languages, source pathways, and search-ready handoffs scale well beyond the bundled record count.</div>
      </section>

      <div class="stats-bar">
        ${[
          [relatedCount.toLocaleString(), "Related searches"],
          [COLLECTIONS.length, "Collections"],
          [THEMES.length, "Themes"],
          [SOURCES.length, "Source pathways"],
          [searchReadyCount, "Search-ready sources"],
          [countryCount, "Countries & territories"],
          [languageCount, "Languages"]
        ].map(([count, label]) => `
          <div class="stat-item">
            <div class="stat-n">${escapeHtml(String(count))}</div>
            <div class="stat-l">${escapeHtml(String(label))}</div>
          </div>
        `).join("")}
      </div>

      <section class="section">
        <div class="section-header">
          <span class="section-title">Featured Records</span>
          <a href="#/library" class="section-link" data-page="library">Browse all →</a>
        </div>
        <div class="card-grid">${featured.map(renderCard).join("")}</div>
      </section>

      <section class="section alt">
        <div class="section-header">
          <span class="section-title">Collections</span>
          <a href="#/library" class="section-link" data-page="library">120+ collection pathways →</a>
        </div>
        <div class="coll-grid">
          ${featuredCollections.map(renderCollectionCard).join("")}
        </div>
      </section>

      <section class="section">
        <div class="section-header">
          <span class="section-title">Browse by Theme</span>
          <a href="#/library" class="section-link" data-page="library">220+ themes →</a>
        </div>
        ${renderRelatedSearchTags(featuredThemes)}
      </section>

      <section class="section alt">
        <div class="section-header">
          <span class="section-title">Related Searches</span>
          <span class="section-link">${relatedCount.toLocaleString()} indexed discovery routes</span>
        </div>
        <p class="section-copy">Related searches connect themes, regions, communities, institutions, media types, languages, and nearby concepts so users can move laterally when a query is too narrow, too sparse, or phrased differently.</p>
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
              <li>Theme-led search, related-search guidance, and collection pathways</li>
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

      <footer>
        <span>Decolonising Archive · Open access · CC0 metadata</span>
        <span>Yaw Ofosu-Asare · Founding editor</span>
      </footer>
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
        <div class="hero-eyebrow">${SOURCES.length} source pathways · ${searchReadyCount} search-ready routes · static-friendly discovery model</div>
        <h1 class="source-hero-title">Archive <strong>source directory</strong></h1>
        <p class="hero-sub hero-sub-tight">The source directory now reflects a larger archive architecture: African-priority institutions, search-ready discovery layers, internal enrichment pathways, and partner routes for records that cannot simply be fetched live in the browser.</p>
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
          <div class="protocol-cell"><strong>Local Index</strong>The core archive runs from a static local dataset so browsing and search remain stable when hosted on any static domain.</div>
          <div class="protocol-cell"><strong>Search-Ready</strong>Links open the originating archive or discovery interface in a new tab rather than depending on fragile browser-side API aggregation.</div>
          <div class="protocol-cell"><strong>Directory</strong>Institutional homepages, repository directories, and partner routes remain visible even when item-level access is external or rights-limited.</div>
          <div class="protocol-cell"><strong>Partnership</strong>Some collections require institutional access, custodial agreements, or on-site consultation rather than public download.</div>
          <div class="protocol-cell"><strong>Internal Architecture</strong>Search expansion, taxonomy registries, enrichment layers, and routing logic are represented as first-class pathways inside the archive model.</div>
          <div class="protocol-cell"><strong>Community Custodianship</strong>Records may describe knowledge held by originating communities. Discovery does not override community governance or rights.</div>
          <div class="protocol-cell"><strong>Rights Handling</strong>Metadata and summaries can remain open while the underlying source retains its own access restrictions, licences, or viewing conditions.</div>
        </div>
      </section>

      <footer>
        <span>Decolonising Archive · Open access · CC0 metadata</span>
        <span>Source directory updated for static hosting</span>
      </footer>
    </div>
  `;
}

function renderAbout() {
  return `
    <div class="page active">
      <div class="about-body">
        <div class="hero-eyebrow eyebrow-tight">About this project</div>
        <h1>Decolonising Archive</h1>
        <p class="about-lead">An open-access cultural knowledge archive dedicated to preserving, organising, and making discoverable records related to decolonising knowledge across Africa, the diaspora, and the Global South.</p>
        <p>The archive combines a stable local index with optional source handoffs to external institutions. That means the core browsing, search, and record-detail experience works reliably on static hosting, while still keeping institutional pathways visible.</p>
        <p>All metadata is published under CC0. Individual records remain subject to the rights, custodianship conditions, and access policies of their originating communities and institutions. The archive does not claim ownership of any record — it facilitates discovery, provenance transparency, and contextual reading.</p>

        <h2>Founding Editor</h2>
        <div class="person-block">
          <div class="person-avatar">YO</div>
          <div>
            <div class="person-name">Dr Yaw Ofosu-Asare</div>
            <div class="person-role">Design researcher and author based in Melbourne, Australia. Author of <em>Decolonising Design in Africa</em> (Routledge, 2024) and <em>African Design Futures</em> (Palgrave Macmillan, 2024). Guest editor, <em>Design and Culture</em> special issue: Afrikan Design. Research focus: decolonial design theory, African design philosophy, and design pedagogy.</div>
          </div>
        </div>

        <h2>Technical Architecture</h2>
        <div class="info-block">
          <p>Static archive interface · Structured local record index and search layer · Expanded taxonomy architecture spanning collections, themes, source pathways, and related-search routes · Stable internal routing for consistent access and navigation · Responsive editorial layout designed for clarity across devices · External source pathways integrated for broader discovery · Built for resilient public browsing, extensibility, and ongoing archival growth.</p>
        </div>

        <h2>Data Model</h2>
        <div class="info-block">
          <p>Each record can carry richer fields including abstract, summary, multi-paragraph description, institution, contributors, collection, rights, provenance, citation, notes, identifiers, optional images, external references, related-record links, language, country coverage, and source pathways. The larger working-library shelf is embedded into the static index so topics such as African philosophy return broader local results, while the expanded taxonomy layer powers filters, browse routes, and query expansion. Missing fields are hidden cleanly rather than rendered as empty placeholders.</p>
        </div>

        <h2>Production Notes</h2>
        <div class="info-block">
          <p>The site is designed to deploy safely on static hosts. The local index powers search, filters, and record pages without cross-origin requests. External archives remain available through explicit source links, so CORS failures no longer block the core experience.</p>
        </div>

        <h2>Contact &amp; Partnership</h2>
        <p>For institutional partnership, bulk data access, or repatriation documentation enquiries, contact through the archive editor. For archive contribution or source pathway additions, reach out via <a href="https://yofosuasare.com" class="inline-link">yofosuasare.com</a>.</p>
      </div>
      <footer>
        <span>Decolonising Archive · Open access · CC0 metadata</span>
        <span>Yaw Ofosu-Asare · Founding editor</span>
      </footer>
    </div>
  `;
}

function render() {
  const app = document.getElementById("app");
  if (currentPage === "home") app.innerHTML = renderHome();
  if (currentPage === "library") app.innerHTML = renderLibrary();
  if (currentPage === "sources") app.innerHTML = renderSources();
  if (currentPage === "about") app.innerHTML = renderAbout();
  if (currentPage === "record") app.innerHTML = renderRecord();
  bindEvents();
}

let liveResults = [];
let liveStatus = {state:"idle", message:"", sources:[]};
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
    async search(query) {
      const response = await fetch(`/api/core-search?q=${encodeURIComponent(query)}&limit=10&offset=0`);
      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data.detail || data.error || "CORE search failed");
      }

      return Array.isArray(data.results) ? data.results : [];
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
        cat:"Live Books",
        region: inferRegionFromText([doc.place, doc.subject, doc.publisher].flat().filter(Boolean).join(" ")),
        country: inferCountryFromText([doc.place, doc.subject].flat().filter(Boolean).join(" ")),
        collection:"Open Library live discovery",
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
        provenance:"Live metadata pulled from Open Library search.",
        citation: buildSimpleCitation(doc.title || "Untitled", Array.isArray(doc.author_name) ? doc.author_name.join(", ") : (doc.author_name || "Unknown creator"), doc.first_publish_year || "", "Open Library"),
        notes:["Live-fetched record. Metadata completeness varies by source."],
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
      const json = await fetchJsonWithTimeout(`https://api.crossref.org/works?rows=8&query.bibliographic=${encodeURIComponent(query)}&select=DOI,title,author,issued,abstract,URL,container-title,type,subject,publisher,language`, {headers:{Accept:"application/json"}}, 6500);
      const items = json?.message?.items && Array.isArray(json.message.items) ? json.message.items.slice(0, 8) : [];
      return items.map((item, index) => {
        const authors = Array.isArray(item.author) ? item.author.map(person => [person.given, person.family].filter(Boolean).join(" ").trim()).filter(Boolean) : [];
        const title = Array.isArray(item.title) ? item.title[0] : (item.title || "Untitled record");
        const abstract = stripJats(item.abstract || "");
        return normalizeLiveRecord({
          id:`live-crossref-${slugify((item.DOI || title) + "-" + index)}`,
          title,
          creator: authors.join(", ") || "Unknown creator",
          summary: abstract ? abstract.slice(0, 320) : `${Array.isArray(item["container-title"]) && item["container-title"][0] ? item["container-title"][0] : "Scholarly record"} surfaced via live metadata search.`,
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
          collection:"Crossref live discovery",
          institution: Array.isArray(item["container-title"]) ? item["container-title"][0] : "Crossref",
          source:"Crossref",
          sourceUrl: item.URL || (item.DOI ? `https://doi.org/${item.DOI}` : `https://search.crossref.org/?q=${encodeURIComponent(query)}`),
          sourceActionLabel:"Open source record",
          externalLinks: item.DOI ? [{label:"DOI", url:`https://doi.org/${item.DOI}`}] : [],
          language: uniqueValues([mapLanguageCode(item.language)]),
          tags: uniqueValues(item.subject || []),
          concepts: inferConceptsFromText([title, ...(item.subject || [])].join(" ")),
          themes: inferThemesFromText([title, ...(item.subject || [])].join(" ")),
          images: [],
          rights:"External source rights apply",
          provenance:"Live metadata pulled from Crossref.",
          citation: buildSimpleCitation(title, authors.join(", ") || "Unknown creator", item.issued?.["date-parts"]?.[0]?.[0] || "", "Crossref"),
          notes:["Live-fetched scholarly metadata. Some abstracts are shortened for display."],
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
        summary: item.description || item.item?.description || item.subject?.slice?.(0, 3)?.join(", ") || "Live archival result from the Library of Congress.",
        abstract: item.description || "",
        description:[
          item.original_format && item.original_format.length ? `Format: ${item.original_format.join(", ")}.` : "",
          item.subject && item.subject.length ? `Subjects: ${item.subject.slice(0, 6).join(", ")}.` : ""
        ].filter(Boolean),
        period: item.date || "",
        type: mapLocType(item.format?.[0] || item.original_format?.[0] || ""),
        cat:"Live cultural heritage",
        region: inferRegionFromText([item.title, ...(item.subject || []), item.description || ""].join(" ")),
        country: inferCountryFromText([item.title, ...(item.subject || [])].join(" ")),
        collection:"Library of Congress live discovery",
        institution:"Library of Congress",
        source:"Library of Congress",
        sourceUrl: item.url || item.id || `https://www.loc.gov/search/?in=all&q=${encodeURIComponent(query)}`,
        sourceActionLabel:"View source record",
        externalLinks: item.image_url && item.image_url.length ? [{label:"LoC media", url:item.image_url[0]}] : [],
        language: uniqueValues([mapLanguageCode(item.language?.[0])]),
        tags: uniqueValues([...(item.subject || []).slice(0, 6), ...(item.locations || []).slice(0, 2)]),
        concepts: inferConceptsFromText([item.title, ...(item.subject || [])].join(" ")),
        themes: inferThemesFromText([item.title, ...(item.subject || [])].join(" ")),
        images: buildLocImages(item),
        rights:"External source rights apply",
        provenance:"Live metadata pulled from the Library of Congress JSON search endpoint.",
        citation: buildSimpleCitation(item.title || "Untitled", Array.isArray(item.contributor_names) ? item.contributor_names.join(", ") : "Library of Congress", item.date || "", "Library of Congress"),
        notes:["Live-fetched record from the Library of Congress."],
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
        summary: obj.objectName ? `${obj.objectName}${obj.period ? ` · ${obj.period}` : ""}.` : "Live museum object from The Met.",
        abstract: obj.creditLine || "",
        description:[obj.medium ? `Medium: ${obj.medium}.` : "", obj.objectDate ? `Date: ${obj.objectDate}.` : "", obj.repository ? `Repository: ${obj.repository}.` : ""].filter(Boolean),
        period: obj.objectDate || obj.period || "",
        type: obj.objectName || "Artefact",
        cat:"Live museum objects",
        region: inferRegionFromText([obj.culture, obj.region, obj.department, obj.title].filter(Boolean).join(" ")),
        country: inferCountryFromText([obj.culture, obj.region, obj.title].filter(Boolean).join(" ")),
        collection:"The Met live discovery",
        institution:"The Metropolitan Museum of Art",
        source:"The Met Collection API",
        sourceUrl: obj.objectURL || `https://www.metmuseum.org/art/collection/search/${obj.objectID}`,
        sourceActionLabel:"View museum record",
        externalLinks: [],
        language: [],
        tags: uniqueValues([obj.department, obj.objectName, obj.culture, obj.period].filter(Boolean)),
        concepts: inferConceptsFromText([obj.title, obj.objectName, obj.culture, obj.medium].filter(Boolean).join(" ")),
        themes: inferThemesFromText([obj.title, obj.objectName, obj.medium].filter(Boolean).join(" ")),
        images: buildMetImages(obj),
        rights:"External source rights apply",
        provenance:"Live object metadata pulled from The Met Collection API.",
        citation: buildSimpleCitation(obj.title || "Untitled object", obj.artistDisplayName || obj.culture || "The Met", obj.objectDate || "", "The Met"),
        notes:["Live-fetched museum object."],
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
      return pages.map((page, index) => normalizeLiveRecord({
        id:`live-wikimedia-${page.pageid || index}`,
        title: page.title ? page.title.replace(/^File:/, "") : "Untitled image",
        creator: page.imageinfo?.[0]?.extmetadata?.Artist?.value ? stripHtml(page.imageinfo[0].extmetadata.Artist.value) : "Wikimedia Commons contributor",
        summary: page.imageinfo?.[0]?.extmetadata?.ImageDescription?.value ? stripHtml(page.imageinfo[0].extmetadata.ImageDescription.value).slice(0, 320) : "Live media record from Wikimedia Commons.",
        abstract: page.imageinfo?.[0]?.extmetadata?.ImageDescription?.value ? stripHtml(page.imageinfo[0].extmetadata.ImageDescription.value) : "",
        description:[page.imageinfo?.[0]?.extmetadata?.LicenseShortName?.value ? `License: ${stripHtml(page.imageinfo[0].extmetadata.LicenseShortName.value)}.` : ""].filter(Boolean),
        type:"Image",
        cat:"Live images",
        region: inferRegionFromText(page.title || ""),
        country: inferCountryFromText(page.title || ""),
        collection:"Wikimedia Commons live discovery",
        institution:"Wikimedia Commons",
        source:"Wikimedia Commons",
        sourceUrl: page.fullurl || `https://commons.wikimedia.org/wiki/${encodeURIComponent(page.title || "")}`,
        sourceActionLabel:"View media record",
        externalLinks: [],
        language: [],
        tags: uniqueValues((page.title || "").replace(/^File:/, "").split(/[_\s]+/).slice(0, 6)),
        concepts: inferConceptsFromText(page.title || ""),
        themes: inferThemesFromText(page.title || ""),
        images: buildWikimediaImages(page),
        rights:"External source rights apply",
        provenance:"Live media metadata pulled from Wikimedia Commons.",
        citation: buildSimpleCitation(page.title ? page.title.replace(/^File:/, "") : "Untitled image", "Wikimedia Commons contributor", "", "Wikimedia Commons"),
        notes:["Live-fetched image or media file."],
        recordIdentifier: String(page.pageid || ""),
        archiveIdentifier:`WC-${page.pageid || index}`,
        resultMode:"live",
        trustScore:0.78,
        liveSourceHint:"wikimedia"
      }));
    }
  },
  {
    id:"openalex",
    label:"OpenAlex",
    trust:0.86,
    async search(query) {
      const json = await fetchJsonWithTimeout(`https://api.openalex.org/works?per-page=8&search=${encodeURIComponent(query)}&select=id,display_name,publication_year,authorships,primary_location,concepts,abstract_inverted_index,type,open_access,locations_count`, {}, 7000);
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
          summary: abstract ? abstract.slice(0, 320) : `${sourceName} surfaced via OpenAlex live metadata.`,
          abstract,
          description:[item.type ? `Type: ${item.type}.` : "", Array.isArray(item.concepts) && item.concepts.length ? `Concepts: ${item.concepts.slice(0, 5).map(concept => concept.display_name).join(", ")}.` : ""].filter(Boolean),
          period: item.publication_year ? String(item.publication_year) : "",
          type: mapOpenAlexType(item.type),
          cat:"Research & scholarly metadata",
          region: inferRegionFromText([title, ...(item.concepts || []).map(concept => concept.display_name)].join(" ")),
          country: inferCountryFromText([title, ...(item.concepts || []).map(concept => concept.display_name)].join(" ")),
          collection:"OpenAlex live discovery",
          institution: sourceName,
          source:"OpenAlex",
          sourceUrl: item.primary_location?.landing_page_url || item.id || `https://api.openalex.org/works?search=${encodeURIComponent(query)}`,
          sourceActionLabel:"Open source record",
          externalLinks: item.id ? [{label:"OpenAlex", url:item.id}] : [],
          language: [],
          tags: uniqueValues((item.concepts || []).slice(0, 6).map(concept => concept.display_name)),
          concepts: inferConceptsFromText([title, ...(item.concepts || []).map(concept => concept.display_name)].join(" ")),
          themes: inferThemesFromText([title, ...(item.concepts || []).map(concept => concept.display_name)].join(" ")),
          images: [],
          rights:"External source rights apply",
          provenance:"Live scholarly metadata pulled from OpenAlex.",
          citation: buildSimpleCitation(title, authors.join(", ") || "Unknown creator", item.publication_year || "", sourceName),
          notes:["Live-fetched research metadata from OpenAlex."],
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
function normalizeLiveRecord(record){ return { id: record.id, title: record.title || 'Untitled record', alternateTitle: record.alternateTitle || '', creator: record.creator || 'Unknown creator', contributors: listify(record.contributors), summary: record.summary || '', abstract: record.abstract || '', description: listify(record.description), region: record.region || 'Africa / Global', country: record.country || '', community: record.community || '', period: record.period || '', concepts: uniqueValues(record.concepts || []), themes: uniqueValues(record.themes || []), tags: uniqueValues(record.tags || []), rights: record.rights || 'External source rights apply', provenance: record.provenance || '', source: record.source || 'Live source', cat: record.cat || 'Live results', type: record.type || 'External record', collection: record.collection || '', institution: record.institution || record.source || '', language: uniqueValues(record.language || []), sourceUrl: safeUrl(record.sourceUrl), sourceActionLabel: record.sourceActionLabel || 'View source', externalLinks: (record.externalLinks || []).filter(link => link && safeUrl(link.url)).map(link => ({label:link.label || 'Open link', url:safeUrl(link.url)})), sourcePathways: uniqueValues(record.sourcePathways || ['Live source adapter']), notes: listify(record.notes), archiveIdentifier: record.archiveIdentifier || '', recordIdentifier: record.recordIdentifier || record.id, material: record.material || '', medium: record.medium || '', citation: record.citation || '', relatedRecords: listify(record.relatedRecords), images: (record.images || []).filter(image => safeUrl(image.src || image.url)).map(image => ({src:safeUrl(image.src || image.url), alt:image.alt || record.title, caption:image.caption || ''})), resultMode: record.resultMode || 'live', trustScore: Number(record.trustScore || 0.75), liveSourceHint: record.liveSourceHint || '' }; }
function getRecordByIdAny(id){ return RECORDS_BY_ID.get(id) || TRANSIENT_RESULTS_BY_ID.get(id) || null; }
function resultModeLabel(mode){ return {local:'Local', live:'Live', hybrid:'Hybrid', external_handoff:'External'}[mode] || 'Local'; }
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
function scoreBlendedResult(record, query){ const context = buildQueryContext(query); const base = scoreRecord(record, context); const mode = getResultMode(record); const modeBonus = {local:18, hybrid:12, live:7, external_handoff:2}[mode] || 0; const completeness = [record.abstract, record.summary, (record.description || []).join(' '), (record.images || []).length ? 'img' : ''].filter(Boolean).length * 2; return base + modeBonus + completeness + Math.round((record.trustScore || 0) * 6); }
function dedupeBlendedResults(items, query){ const seen = new Map(); const ranked = items.filter(Boolean).map(item => ({item, score: scoreBlendedResult(item, query || libraryQuery)})).sort((a,b) => b.score - a.score || a.item.title.localeCompare(b.item.title)); for (const entry of ranked){ const key = normalizeComparable([entry.item.title, entry.item.creator, entry.item.period].join(' ')); if (!seen.has(key)) seen.set(key, entry); } return [...seen.values()].map(entry => entry.item); }
async function fetchLiveResults(query){ const normalizedQuery = query.trim(); if (!normalizedQuery) return []; if (LIVE_RESULT_CACHE.has(normalizedQuery)) return LIVE_RESULT_CACHE.get(normalizedQuery); liveStatus = {state:'loading', message:`Searching live sources for “${normalizedQuery}”…`, sources:LIVE_SOURCE_ADAPTERS.map(adapter => ({label:adapter.label, state:'loading'}))}; render(); const settled = await Promise.allSettled(LIVE_SOURCE_ADAPTERS.map(adapter => adapter.search(normalizedQuery))); const gathered = []; const statuses = []; settled.forEach((result, index) => { const adapter = LIVE_SOURCE_ADAPTERS[index]; if (result.status === 'fulfilled') { const items = Array.isArray(result.value) ? result.value : []; items.forEach(item => { TRANSIENT_RESULTS_BY_ID.set(item.id, item); gathered.push(item); }); statuses.push({label:adapter.label, state:items.length ? 'ok' : 'empty', count:items.length}); } else { statuses.push({label:adapter.label, state:'fail', count:0}); } }); const fallbacks = makeExternalFallbacks(normalizedQuery); fallbacks.forEach(item => TRANSIENT_RESULTS_BY_ID.set(item.id, item)); const fallbackPool = gathered.length >= 10 ? [] : fallbacks.slice(0, Math.max(4, 12 - gathered.length)); const combined = dedupeBlendedResults([...gathered, ...fallbackPool], normalizedQuery).slice(0, 24); LIVE_RESULT_CACHE.set(normalizedQuery, combined); liveStatus = { state:'done', message: gathered.length ? `Showing ${gathered.length} live records and ${combined.filter(item => getResultMode(item) === 'external_handoff').length} source handoffs for “${normalizedQuery}”.` : `Live fallback could not return direct records for “${normalizedQuery}”, so source handoffs are shown instead.`, sources: statuses }; return combined; }
function maybeFetchLiveResults(query){ const normalizedQuery = query.trim(); if (!sourceMode || !normalizedQuery) return Promise.resolve([]); return fetchLiveResults(normalizedQuery).then(results => { liveResults = results; externalDiscovery = results.filter(item => getResultMode(item) === 'external_handoff'); render(); return results; }).catch(() => { liveStatus = {state:'error', message:'Live fallback failed. The local archive is still available, and external handoffs remain in place.', sources:LIVE_SOURCE_ADAPTERS.map(adapter => ({label:adapter.label, state:'fail'}))}; liveResults = makeExternalFallbacks(normalizedQuery); externalDiscovery = liveResults.filter(item => getResultMode(item) === 'external_handoff'); render(); return liveResults; }); }
function renderCard(record) { const summary = record.abstract || record.summary || (record.description && record.description[0]) || ''; const mode = getResultMode(record); const leadImage = (record.images || [])[0]; const externalPrimary = (record.externalLinks || [])[0]; const subSource = record.institution || record.source || 'Archive record'; const actionHint = mode === 'external_handoff' ? 'Open source' : 'Open record'; return `<article class="card" data-id="${escapeHtml(record.id)}" data-mode="${escapeHtml(mode)}" ${mode === 'external_handoff' && record.sourceUrl ? `data-url="${escapeHtml(record.sourceUrl)}"` : ''} role="button" tabindex="0" aria-label="${escapeHtml(actionHint)} ${escapeHtml(record.title)}">${leadImage ? `<div class="card-thumb"><img src="${escapeHtml(leadImage.src)}" alt="${escapeHtml(leadImage.alt || record.title)}" loading="lazy"/></div>` : ''}<div class="card-meta"><span class="badge">${escapeHtml(record.type)}</span><span class="result-status ${escapeHtml(mode)}">${escapeHtml(resultModeLabel(mode))}</span></div><div class="card-title">${escapeHtml(record.title)}</div><div class="card-creator">${escapeHtml(record.creator)}</div><div class="card-source">${escapeHtml(subSource)}${record.period ? ` · ${escapeHtml(record.period)}` : ''}</div><div class="card-summary">${escapeHtml(summary)}</div><div class="card-footer">${record.region ? `<span class="chip">${escapeHtml(record.region)}</span>` : ''}${record.country ? `<span class="chip">${escapeHtml(record.country)}</span>` : ''}${(record.concepts || [])[0] ? `<span class="chip">${escapeHtml(record.concepts[0])}</span>` : ''}</div>${(record.sourceUrl || externalPrimary) ? `<div class="card-links">${record.sourceUrl ? `<a class="card-link" href="${escapeHtml(record.sourceUrl)}" target="_blank" rel="noopener noreferrer" data-stop-card-open="true">View source</a>` : ''}${externalPrimary ? `<a class="card-link" href="${escapeHtml(externalPrimary.url)}" target="_blank" rel="noopener noreferrer" data-stop-card-open="true">More links</a>` : ''}</div>` : ''}</article>`; }
function renderRecord() { const record = getRecordByIdAny(selectedRecordId); if (!record) { return `<div class="page active"><div class="detail"><div class="detail-shell"><div class="breadcrumb"><a href="#/home" data-page="home">Archive</a><span>›</span><a href="#/library" data-page="library">Library</a><span>›</span><span>Record</span></div><div class="empty"><h3>Record not found</h3><p>The requested record is not available in the local archive index or current live result cache. Return to the library and continue browsing.</p></div></div></div></div>`; } const {primary, secondary} = getPrimaryNarrative(record); const metadataRows = [['Title', record.title], ['Alternate title', record.alternateTitle], ['Creator', record.creator], ['Contributors', humanList(record.contributors)], ['Institution', record.institution], ['Source', record.source], ['Country', record.country], ['Region', record.region], ['Community', record.community], ['Period', record.period], ['Category', record.cat], ['Record type', record.type], ['Collection', record.collection], ['Material', record.material], ['Medium', record.medium], ['Language', humanList(record.language)]].filter(([,value]) => value); const identifierRows = [['Record ID', record.recordIdentifier], ['Archive ID', record.archiveIdentifier], ['Mode', resultModeLabel(getResultMode(record))]].filter(([,value]) => value); const related = getResultMode(record) === 'local' || getResultMode(record) === 'hybrid' ? getRelatedRecords(record, 3) : []; const leadImage = getLeadImage(record); const gallery = getGalleryImages(record); const mode = getResultMode(record); const badges = [`<span class="badge">${escapeHtml(record.type)}</span>`, record.period ? `<span class="period">${escapeHtml(record.period)}</span>` : '', `<span class="result-status ${escapeHtml(mode)}">${escapeHtml(resultModeLabel(mode))}</span>`, record.source ? `<span class="badge">${escapeHtml(record.source)}</span>` : ''].filter(Boolean).join(''); return `<div class="page active"><div class="detail"><div class="detail-shell"><div class="breadcrumb"><a href="#/home" data-page="home">Archive</a><span>›</span><a href="#/library" data-page="library">Library</a><span>›</span><span>${escapeHtml(record.type)}</span></div><header class="detail-header"><div class="detail-type">${badges}</div><h1>${escapeHtml(record.title)}</h1>${record.alternateTitle ? `<div class="detail-alt">${escapeHtml(record.alternateTitle)}</div>` : ''}<div class="detail-creator">${escapeHtml(record.creator)}</div><div class="detail-subline">${record.institution ? `<span>${escapeHtml(record.institution)}</span>` : ''}${record.collection ? `<span>${escapeHtml(record.collection)}</span>` : ''}${record.country ? `<span>${escapeHtml(record.country)}</span>` : ''}${record.sourceUrl ? `<span class="detail-outbound"><a class="inline-link" href="${escapeHtml(record.sourceUrl)}" target="_blank" rel="noopener noreferrer">Open original source ↗</a></span>` : ''}</div></header>${leadImage ? `<figure class="detail-media" data-media-root><div class="detail-media-main"><img src="${escapeHtml(leadImage.src)}" alt="${escapeHtml(leadImage.alt)}" loading="lazy"/></div>${leadImage.caption ? `<figcaption class="detail-media-caption">${escapeHtml(leadImage.caption)}</figcaption>` : ''}${gallery.length ? `<div class="gallery-grid">${gallery.map(image => `<figure class="gallery-thumb"><img src="${escapeHtml(image.src)}" alt="${escapeHtml(image.alt)}" loading="lazy"/>${image.caption ? `<figcaption>${escapeHtml(image.caption)}</figcaption>` : ''}</figure>`).join('')}</div>` : ''}</figure>` : ''}<div class="detail-body"><div class="detail-main"><section class="detail-summary"><div class="label">${escapeHtml(primary.label)}</div>${primary.content.map(paragraph => `<p>${escapeHtml(paragraph)}</p>`).join('')}</section>${secondary.map(section => `<section class="detail-section alt"><h2>${escapeHtml(section.label)}</h2><div class="detail-copy">${section.content.map(paragraph => `<p>${escapeHtml(paragraph)}</p>`).join('')}</div></section>`).join('')}<section class="detail-section"><h2>Metadata</h2><table class="meta-table">${metadataRows.map(([label, value]) => `<tr><td>${escapeHtml(label)}</td><td>${escapeHtml(value)}</td></tr>`).join('')}</table></section>${renderTagSection('Concepts', record.concepts, 'concept-tag')}${renderTagSection('Themes', record.themes, 'theme-chip')}${renderTagSection('Tags', record.tags)}<section class="provenance-box"><div class="label">Provenance & rights</div>${record.provenance ? `<p>${escapeHtml(record.provenance)}</p>` : ''}${record.rights ? `<p><strong>Rights:</strong> ${escapeHtml(record.rights)}</p>` : ''}</section>${related.length ? `<section class="detail-section"><div class="section-header"><span class="section-title">Related records</span></div><div class="card-grid">${related.map(renderCard).join('')}</div></section>` : ''}</div><aside class="detail-side">${renderActionList(record)}<section class="detail-section alt"><h2>Citation</h2><div class="citation">${escapeHtml(record.citation || 'Citation not yet available.')}</div></section>${record.notes.length ? `<section class="detail-section"><h2>Notes</h2><div class="note-list">${record.notes.map(note => `<p>${escapeHtml(note)}</p>`).join('')}</div></section>` : ''}<section class="detail-section alt"><h2>Identifiers</h2><table class="meta-table">${identifierRows.map(([label, value]) => `<tr><td>${escapeHtml(label)}</td><td>${escapeHtml(value)}</td></tr>`).join('')}</table></section>${record.externalLinks.length ? `<section class="detail-section"><h2>External References</h2><div class="inline-links">${record.externalLinks.map(link => `<a class="inline-link" href="${escapeHtml(link.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(link.label)}</a>`).join('')}</div></section>` : ''}</aside></div></div></div></div>`; }
function renderLiveStatus(){ const effectiveQuery = getEffectiveSearchQuery(); if (!effectiveQuery || !sourceMode) return '';  return `<div class="source-status"><div class="live-status-detail"><div>${escapeHtml(liveStatus.message || 'Live fallback is ready when local results are sparse.')}</div>${liveStatus.sources && liveStatus.sources.length ? `<div class="live-status-meta">${liveStatus.sources.map(source => `<span class="live-status-chip ${source.state === 'ok' ? 'ok' : source.state === 'fail' ? 'fail' : ''}">${escapeHtml(source.label)}${typeof source.count === 'number' ? ` · ${source.count}` : ''}</span>`).join('')}</div>` : ''}</div></div>`; }
function getEffectiveSearchQuery(){ const parts = [libraryQuery, filterType, filterRegion, filterCat, filterTheme, filterCollection, filterLanguage].map(value => (value || '').trim()).filter(Boolean); return uniqueValues(parts).join(' '); }
function refreshBlendedDiscovery(forceLive = false){ const effectiveQuery = getEffectiveSearchQuery(); externalDiscovery = effectiveQuery ? buildExternalDiscovery(effectiveQuery) : []; if (!sourceMode || !effectiveQuery) { if (!effectiveQuery) { liveResults = []; liveStatus = {state:'idle', message:'', sources:[]}; } return Promise.resolve([]); } if (forceLive || localResults.length < 24 || liveResults.length === 0) { return maybeFetchLiveResults(effectiveQuery); } return Promise.resolve(liveResults); }
function renderLibrary() { const effectiveQuery = getEffectiveSearchQuery(); const types = uniqueValues(RECORDS.map(record => record.type)).sort(); const regions = uniqueValues(RECORDS.map(record => record.region)).sort(); const cats = uniqueValues(RECORDS.map(record => record.cat)).sort(); const themeOptions = buildFacetOptions(localResults, record => [...record.themes, ...record.concepts], 10); const collectionOptions = buildFacetOptions(localResults, record => [record.collection], 8); const languageOptions = buildFacetOptions(localResults, record => record.language, 8); const displayedLive = sourceMode ? liveResults.filter(item => getResultMode(item) === 'live') : []; const displayedExternal = sourceMode ? liveResults.filter(item => getResultMode(item) === 'external_handoff') : []; const displayedLocal = filterDisplayedRecords(localResults); const relatedSearches = getRelatedSearchSuggestions(effectiveQuery || libraryQuery || filterTheme || filterCollection || filterLanguage, 18); const collectionSuggestions = getCollectionSuggestions(effectiveQuery || libraryQuery || filterTheme || filterCollection, 8); const hasFilter = filterType || filterRegion || filterCat || filterTheme || filterCollection || filterLanguage || libraryQuery; const localOnlyCount = displayedLocal.length; const liveOnlyCount = displayedLive.length; const handoffCount = displayedExternal.length; const totalDisplayed = displayedLive.length + displayedLocal.length + displayedExternal.length; return `<div class="page active"><div class="library-layout"><aside class="sidebar">${hasFilter ? `<button class="clear-btn" id="clearBtn" type="button">Clear all filters</button>` : ''}<div class="sidebar-section"><div class="sidebar-label">Record type</div>${types.map(type => `<label class="filter-opt"><input type="radio" name="type" value="${escapeHtml(type)}" ${filterType === type ? 'checked' : ''}/><span>${escapeHtml(type)}</span></label>`).join('')}</div><div class="sidebar-section"><div class="sidebar-label">Region</div>${regions.map(region => `<label class="filter-opt"><input type="radio" name="region" value="${escapeHtml(region)}" ${filterRegion === region ? 'checked' : ''}/><span>${escapeHtml(region)}</span></label>`).join('')}</div><div class="sidebar-section"><div class="sidebar-label">Category</div>${cats.map(cat => `<label class="filter-opt"><input type="radio" name="cat" value="${escapeHtml(cat)}" ${filterCat === cat ? 'checked' : ''}/><span>${escapeHtml(cat)}</span></label>`).join('')}</div>${collectionOptions.length ? `<div class="sidebar-section"><div class="sidebar-label">Collection</div>${collectionOptions.map(option => `<label class="filter-opt"><input type="radio" name="collection" value="${escapeHtml(option.value)}" ${filterCollection === option.value ? 'checked' : ''}/><span>${escapeHtml(option.value)} (${option.count})</span></label>`).join('')}</div>` : ''}${themeOptions.length ? `<div class="sidebar-section"><div class="sidebar-label">Theme</div>${themeOptions.map(option => `<label class="filter-opt"><input type="radio" name="theme" value="${escapeHtml(option.value)}" ${filterTheme === option.value ? 'checked' : ''}/><span>${escapeHtml(option.value)} (${option.count})</span></label>`).join('')}</div>` : ''}${languageOptions.length ? `<div class="sidebar-section"><div class="sidebar-label">Language</div>${languageOptions.map(option => `<label class="filter-opt"><input type="radio" name="language" value="${escapeHtml(option.value)}" ${filterLanguage === option.value ? 'checked' : ''}/><span>${escapeHtml(option.value)} (${option.count})</span></label>`).join('')}</div>` : ''}</aside><div class="main-results"><div class="search-bar"><input type="text" id="mainSearch" value="${escapeHtml(libraryQuery)}" placeholder="Search the local archive index, live sources, and source handoffs…" autocomplete="off"/><button id="localSearchBtn" type="button">Search</button><button class="secondary ${sourceMode ? 'live-on' : 'live-off'}" id="sourceSearchBtn" type="button">${sourceMode ? 'Live sources on' : 'Live sources off'}</button></div><div class="results-meta"><span>${totalDisplayed} total result${totalDisplayed !== 1 ? 's' : ''}${effectiveQuery ? ` for “${escapeHtml(effectiveQuery)}”` : ''}</span><span class="meta-separator" aria-hidden="true">|</span><span>${liveOnlyCount} live</span><span class="meta-separator" aria-hidden="true">|</span><span>${localOnlyCount} local</span><span class="meta-separator" aria-hidden="true">|</span><span>${handoffCount} external</span><span class="meta-separator" aria-hidden="true">|</span><span>${RELATED_SEARCH_INDEX.length.toLocaleString()} related searches</span></div>${renderLiveStatus()}<div class="results-stack">${displayedLive.length ? `<section class="results-section"><div class="results-section-title"><h3>Live results</h3><span>Results from live APIs including CORE</span></div><div class="card-grid">${displayedLive.map(renderCard).join('')}</div></section>` : ``}${displayedLocal.length ? `<section class="results-section"><div class="results-section-title"><h3>Local archive results</h3><span>Records from the local archive index</span></div><div class="card-grid">${displayedLocal.map(renderCard).join('')}</div></section>` : `<div class="empty"><h3>No local match yet</h3><p>No local archive records matched this search.</p></div>`}${displayedExternal.length ? `<section class="results-section"><div class="results-section-title"><h3>External results</h3><span>Source handoffs and external discovery links</span></div><div class="card-grid">${displayedExternal.map(renderCard).join('')}</div></section>` : ``}${relatedSearches.length ? `<section class="results-section"><div class="results-section-title"><h3>Related Searches</h3><span>${RELATED_SEARCH_INDEX.length.toLocaleString()} discovery routes</span></div>${renderRelatedSearchTags(relatedSearches)}</section>` : ''}${collectionSuggestions.length ? `<section class="results-section"><div class="results-section-title"><h3>Collection Pathways</h3><span>${COLLECTIONS.length} editorial browse routes</span></div><div class="coll-grid">${collectionSuggestions.map(renderCollectionCard).join('')}</div></section>` : ''}</div></div></div></div>`; }
function applyLibraryQuery(value, clearSources = true) { libraryQuery = value.trim(); localResults = searchLocalRecords(getEffectiveSearchQuery() || libraryQuery); if (clearSources) { liveResults = []; externalDiscovery = []; liveStatus = {state:'idle', message: getEffectiveSearchQuery() ? 'Local-first results loaded. Live fallback is blending API and handoff results.' : '', sources:[]}; } refreshBlendedDiscovery(true); }
function bindCardEvents() {
  document.querySelectorAll(".card[data-id]").forEach(card => {
    const open = () => {
      const mode = card.dataset.mode || "local";
      const url = card.dataset.url;
      if (mode === "external_handoff" && url) {
        openExternal(url);
        return;
      }
      navigate("record", card.dataset.id);
    };

    card.addEventListener("click", event => {
      if (event.target instanceof Element && event.target.closest("a,button,[data-stop-card-open=\"true\"]")) return;
      open();
    });

    card.addEventListener("keydown", event => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        open();
      }
    });
  });
}
function bindEvents() { document.querySelectorAll('[data-page]').forEach(element => { element.addEventListener('click', event => { const page = element.dataset.page; if (!page) return; event.preventDefault(); if (element.dataset.collection) { filterType = ''; filterRegion = ''; filterCat = ''; filterTheme = ''; filterLanguage = ''; filterCollection = element.dataset.collection; libraryQuery = ''; localResults = searchLocalRecords(getEffectiveSearchQuery()); liveResults = []; externalDiscovery = []; liveStatus = {state:'idle', message:'', sources:[]}; refreshBlendedDiscovery(true); } navigate(page); }); }); const hamburger = document.getElementById('hamburger'); const navMobile = document.getElementById('navMobile'); if (hamburger && navMobile) hamburger.addEventListener('click', () => navMobile.classList.toggle('open')); document.querySelectorAll('.suggestion[data-q], .related-search[data-related]').forEach(element => { element.addEventListener('click', () => { applyLibraryQuery(element.dataset.q || element.dataset.related || ''); navigate('library'); }); }); const heroInput = document.getElementById('heroSearch'); const heroButton = document.getElementById('heroSearchBtn'); if (heroInput && heroButton) { const submitHero = async () => { const submittedTerm = heroInput.value; await logSearchTerm(submittedTerm); applyLibraryQuery(submittedTerm); currentPage = 'library'; selectedRecordId = null; navigate('library'); requestAnimationFrame(() => { render(); const mainSearchAfter = document.getElementById('mainSearch'); if (mainSearchAfter) mainSearchAfter.value = libraryQuery; }); }; heroButton.addEventListener('click', () => { submitHero(); }); heroInput.addEventListener('keydown', event => { if (event.key === 'Enter') submitHero(); }); } const mainSearch = document.getElementById('mainSearch'); const localSearchBtn = document.getElementById('localSearchBtn'); const sourceSearchBtn = document.getElementById('sourceSearchBtn'); if (mainSearch && localSearchBtn) { const submitSearch = async () => { const submittedTerm = mainSearch.value; await logSearchTerm(submittedTerm); applyLibraryQuery(submittedTerm); render(); }; localSearchBtn.addEventListener('click', () => { submitSearch(); }); mainSearch.addEventListener('keydown', event => { if (event.key === 'Enter') submitSearch(); }); mainSearch.addEventListener('input', () => { clearTimeout(debounceTimer); debounceTimer = window.setTimeout(() => { applyLibraryQuery(mainSearch.value); render(); }, 260); }); } if (sourceSearchBtn) { sourceSearchBtn.addEventListener('click', () => { sourceMode = !sourceMode; if (sourceMode) { refreshBlendedDiscovery(true); } else { liveResults = []; externalDiscovery = []; liveStatus = {state:'idle', message:'Live fallback is off. Showing local archive records only.', sources:[]}; } render(); }); } document.querySelectorAll('input[name="type"], input[name="region"], input[name="cat"], input[name="theme"], input[name="collection"], input[name="language"]').forEach(input => { input.addEventListener('change', () => { const checked = document.querySelector('input[name="type"]:checked'); filterType = checked ? checked.value : ''; const checkedRegion = document.querySelector('input[name="region"]:checked'); filterRegion = checkedRegion ? checkedRegion.value : ''; const checkedCat = document.querySelector('input[name="cat"]:checked'); filterCat = checkedCat ? checkedCat.value : ''; const checkedTheme = document.querySelector('input[name="theme"]:checked'); filterTheme = checkedTheme ? checkedTheme.value : ''; const checkedCollection = document.querySelector('input[name="collection"]:checked'); filterCollection = checkedCollection ? checkedCollection.value : ''; const checkedLanguage = document.querySelector('input[name="language"]:checked'); filterLanguage = checkedLanguage ? checkedLanguage.value : ''; localResults = searchLocalRecords(getEffectiveSearchQuery()); refreshBlendedDiscovery(true); render(); }); }); const clearBtn = document.getElementById('clearBtn'); if (clearBtn) { clearBtn.addEventListener('click', () => { filterType = ''; filterRegion = ''; filterCat = ''; filterTheme = ''; filterCollection = ''; filterLanguage = ''; libraryQuery = ''; localResults = [...RECORDS]; liveResults = []; externalDiscovery = []; liveStatus = {state:'idle', message:'', sources:[]}; render(); }); } bindCardEvents(); document.querySelectorAll('[data-media-root] img').forEach(image => { image.addEventListener('error', () => { const mediaRoot = image.closest('[data-media-root]'); if (mediaRoot) mediaRoot.classList.add('hidden'); }, {once:true}); }); }
function syncRouteFromHash() { const route = parseHash(); currentPage = route.page; selectedRecordId = route.recordId; if (currentPage === 'record' && selectedRecordId && !getRecordByIdAny(selectedRecordId)) { currentPage = 'library'; selectedRecordId = null; } document.querySelectorAll('.nav-link').forEach(link => { link.classList.toggle('active', link.dataset.page === currentPage); }); render(); window.scrollTo({top:0, behavior:'auto'}); }

window.addEventListener("hashchange", syncRouteFromHash);

function initArchiveApp() {
  if (!window.location.hash) {
    navigate("home");
    return;
  }
  syncRouteFromHash();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initArchiveApp);
} else {
  initArchiveApp();
}
