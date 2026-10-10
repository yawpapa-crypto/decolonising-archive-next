import { EXTRA_CODES, EXTRA_ROWS } from "./i18n-extra";
export const LANGS = [
  { code: "en", name: "English", native: "English" },
  { code: "tw", name: "Akan (Twi)", native: "Akan (Twi)" },
  { code: "yo", name: "Yoruba", native: "Yorùbá" },
  { code: "ig", name: "Igbo", native: "Igbo" },
  { code: "ha", name: "Hausa", native: "Hausa" },
  { code: "sw", name: "Swahili", native: "Kiswahili" },
  { code: "zu", name: "Zulu", native: "isiZulu" },
  { code: "fr", name: "French", native: "Français" },
  { code: "ee", name: "Ewe", native: "Eʋegbe" },
  { code: "gaa", name: "Ga", native: "Ga" },
  { code: "am", name: "Amharic", native: "አማርኛ" },
  { code: "ar", name: "Arabic", native: "العربية" },
  { code: "pt", name: "Portuguese", native: "Português" },
  { code: "af", name: "Afrikaans", native: "Afrikaans" },
  { code: "sn", name: "Shona", native: "chiShona" },
  { code: "so", name: "Somali", native: "Soomaali" },
] as const;
export type LangCode = (typeof LANGS)[number]["code"];

type Row = [string, ...string[]]; // English, then tw, yo, ig, ha, sw, zu, fr
const ROWS: Row[] = [
  ["For You", "Ma wo", "Fún Ọ", "Maka Gị", "Naka", "Kwako", "Kuwe", "Pour vous"],
  ["Explore", "Hwehwɛ mu", "Ṣàwárí", "Chọpụta", "Bincika", "Gundua", "Hlola", "Explorer"],
  ["Help", "Mmoa", "Ìrànlọ́wọ́", "Enyemaka", "Taimako", "Msaada", "Usizo", "Aide"],
  ["Sign in", "Hyɛn mu", "Wọlé", "Banye", "Shiga", "Ingia", "Ngena", "Se connecter"],
  ["Log in", "Hyɛn mu", "Wọlé", "Banye", "Shiga", "Ingia", "Ngena", "Se connecter"],
  ["Create account", "Bue akontaabu", "Ṣẹ̀dá àkọọ́lẹ̀", "Mepụta akaụntụ", "Ƙirƙiri asusu", "Fungua akaunti", "Dala i-akhawunti", "Créer un compte"],
  ["Save", "Kora so", "Fipamọ́", "Chekwaa", "Ajiye", "Hifadhi", "Londoloza", "Enregistrer"],
  ["Saved", "Akora so", "A ti fipamọ́", "Echekwara", "An ajiye", "Imehifadhiwa", "Kulondoloziwe", "Enregistré"],
  ["Display", "Ahwɛ", "Ìfihàn", "Ngosi", "Nuni", "Onyesho", "Ukubukeka", "Affichage"],
  ["Make yourself comfortable", "Tena nea ɛyɛ wo dɛ", "Ṣe ara rẹ ní ìrọ̀rùn", "Mee ka ị nwee ntụsara ahụ", "Ka ji daɗi", "Jisikie huru", "Zizwe usekhaya", "Mettez-vous à l’aise"],
  ["Night mode", "Anadwo kwan", "Ipò òru", "Ọnọdụ abalị", "Yanayin dare", "Hali ya usiku", "Imodi yobusuku", "Mode nuit"],
  ["Reduce motion", "Te nneyɛe so", "Dín ìrìn kù", "Belata mmegharị", "Rage motsi", "Punguza mwendo", "Nciphisa ukunyakaza", "Réduire les animations"],
  ["Larger text", "Kyerɛw kɛse", "Ọ̀rọ̀ tó tóbi", "Ederede buru ibu", "Manyan rubutu", "Maandishi makubwa", "Umbhalo omkhulu", "Texte plus grand"],
  ["Higher contrast", "Nsɛmfua pa", "Ìyàtọ̀ gíga", "Ọdịiche dị elu", "Babban bambanci", "Utofautishaji wa juu", "Ukuhlukanisa okuphezulu", "Contraste élevé"],
  ["Language", "Kasa", "Èdè", "Asụsụ", "Harshe", "Lugha", "Ulimi", "Langue"],
  ["Keep this for later", "Kora yei nkyɛn", "Fi èyí pamọ́ fún ẹ̀yìn", "Debe nke a maka ọzọ", "Ajiye wannan don daga baya", "Hifadhi hii kwa baadaye", "Gcina lokhu kamuva", "Gardez ceci pour plus tard"],
  ["Build your own collection", "Yɛ w’ankasa nkyekyɛmu", "Ṣe àkójọ tìrẹ", "Mepụta nchịkọta nke gị", "Gina tarin ka naka", "Jenga mkusanyiko wako", "Akha iqoqo lakho", "Créez votre collection"],
  ["Already have an account?", "Wowɔ akontaabu dedaw?", "Ṣé o ti ní àkọọ́lẹ̀?", "Ị nwere akaụntụ?", "Kana da asusu?", "Una akaunti tayari?", "Unayo i-akhawunti kakade?", "Vous avez déjà un compte ?"],
  ["Keep browsing", "Kɔ so hwehwɛ", "Tẹ̀síwájú láti wò", "Gaa n’ihu na-ele", "Ci gaba da bincike", "Endelea kuvinjari", "Qhubeka ubhekisisa", "Continuer à explorer"],
  ["Make this yours", "Yɛ yei wo dea", "Ṣe èyí ní tìrẹ", "Mee nke a nke gị", "Mai da wannan naka", "Fanya hii yako", "Yenze lokhu kube okwakho", "Faites-en le vôtre"],
  ["Personalise For You", "Yɛ For You ma wo", "Ṣe For You ní tìrẹ", "Mee For You nke gị", "Keɓance For You", "Binafsisha For You", "Enza For You okwakho", "Personnaliser For You"],
  ["Your library", "Wo nhoma fie", "Ilé ìkàwé rẹ", "Ọbá akwụkwọ gị", "Laburaren ka", "Maktaba yako", "Umtapo wakho wezincwadi", "Votre bibliothèque"],
  ["Copy citation", "Twa nkyerɛwde", "Ṣàdàkọ ìtọ́kasí", "Detuo ntụaka", "Kwafi nassoshi", "Nakili nukuu", "Kopisha inkomba", "Copier la citation"],
  ["Citation copied", "Wɔatwa nkyerɛwde", "A ti ṣàdàkọ ìtọ́kasí", "Edetuola ntụaka", "An kwafi nassoshi", "Nukuu imenakiliwa", "Inkomba ikopishiwe", "Citation copiée"],
  ["Newsletter", "Nsɛmma krataa", "Ìwé ìròyìn", "Akwụkwọ akụkọ", "Wasiƙa", "Jarida", "Incwadi yezindaba", "Lettre d’information"],
  ["Close", "To mu", "Tì", "Mechie", "Rufe", "Funga", "Vala", "Fermer"],
  ["Selected by ARED", "ARED ayi", "ARED yàn", "ARED họpụtara", "ARED ta zaɓa", "Zilizochaguliwa na ARED", "Ikhethwe i-ARED", "Sélection ARED"],
  ["Trending searches", "Nhwehwɛmu a ɛrekɔ so", "Àwárí tó gbajúmọ̀", "Ọchụchọ na-aga ọsọ", "Binciken da ke tashe", "Utafutaji maarufu", "Ukusesha okuthandwayo", "Recherches tendances"],
];
const COL: Record<string, number> = { tw: 1, yo: 2, ig: 3, ha: 4, sw: 5, zu: 6, fr: 7 };
const DICT: Record<string, Map<string, string>> = {};
for (const code of Object.keys(COL)) { const m = new Map<string, string>(); for (const r of ROWS) if (r[COL[code]]) m.set(r[0], r[COL[code]]); DICT[code] = m; }
export function lookup(code: string, english: string): string | undefined { return DICT[code]?.get(english); }

EXTRA_CODES.forEach((code, i) => { const m = new Map<string, string>(); for (const r of EXTRA_ROWS) if (r[i + 1]) m.set(r[0], r[i + 1]); DICT[code] = m; });
export const RTL = new Set(["ar"]);
