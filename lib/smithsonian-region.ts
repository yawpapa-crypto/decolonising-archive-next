/** Infer archive region labels for Smithsonian EDAN records (Africa, Global South, diaspora). */
export function inferSmithsonianRegion(fields: {
  place?: string[];
  culture?: string[];
  title?: string;
  description?: string;
  unitCode?: string;
}): string {
  const haystack = [
    ...(fields.place || []),
    ...(fields.culture || []),
    fields.title || "",
    fields.description || "",
    fields.unitCode || "",
  ]
    .join(" ")
    .toLowerCase();

  if (
    /south africa|zimbabwe|namibia|botswana|lesotho|eswatini|swaziland|mozambique|madagascar|zulu|xhosa|ndebele|sotho|pretoria|johannesburg|cape town/.test(
      haystack,
    )
  ) {
    return "Southern Africa";
  }
  if (
    /west africa|ghana|nigeria|benin|mali|senegal|ivory coast|côte|burkina|liberia|sierra leone|guinea|togo|akan|yoruba|ashanti|lagos|accra|dakar/.test(
      haystack,
    )
  ) {
    return "West Africa";
  }
  if (
    /east africa|kenya|tanzania|uganda|ethiopia|somalia|rwanda|burundi|swahili|horn of africa|nairobi|addis/.test(
      haystack,
    )
  ) {
    return "East Africa";
  }
  if (/central africa|congo|cameroon|gabon|chad|kinshasa|drc/.test(haystack)) {
    return "Central Africa";
  }
  if (/north africa|egypt|morocco|algeria|tunisia|libya|sudan|maghreb|cairo/.test(haystack)) {
    return "North Africa";
  }
  if (/africa|african|pan-african|pan africa/.test(haystack)) {
    return "Pan-Africa";
  }

  if (
    /southeast asia|indonesia|thailand|vietnam|viet nam|malaysia|singapore|philippines|cambodia|laos|myanmar|burma|brunei|java|bali|javanese|khmer/.test(
      haystack,
    )
  ) {
    return "Southeast Asia";
  }
  if (
    /south asia|india|pakistan|bangladesh|sri lanka|nepal|bhutan|tamil|bengal/.test(haystack)
  ) {
    return "South Asia";
  }
  if (
    /pacific|polynesia|melanesia|micronesia|fiji|samoa|tonga|hawaii|hawai|aotearoa|new zealand|papua|guam|vanuatu|oceania|tarawa|maori|māori/.test(
      haystack,
    )
  ) {
    return "Pacific";
  }
  if (/australia|aboriginal|torres strait|first nations/.test(haystack)) {
    return "Pacific";
  }
  if (/caribbean|latin america|diaspora|african american|afro-/.test(haystack)) {
    return "Diaspora";
  }

  return "Global South / Comparative";
}
