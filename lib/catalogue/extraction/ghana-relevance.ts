/** Determine whether a museum object belongs in the Ghana visual history catalogue */

const GHANA_KEYWORDS =
  /\b(ghana|gold coast|asante|ashanti|akan|fante|asafo|adinkra|kente|ewe|twi|ga people|ga-dangme|kumasi|accra|elmina|cape coast|keta|volta|fanteland|brong|dagomba|nsodie|mfrankaa|posuban)\b/i;

export function isGhanaRelevant(fields: {
  title?: string;
  culture?: string;
  country?: string;
  region?: string;
  locale?: string;
  period?: string;
  classification?: string;
  medium?: string;
  objectName?: string;
}): boolean {
  const blob = [
    fields.title,
    fields.culture,
    fields.country,
    fields.region,
    fields.locale,
    fields.period,
    fields.classification,
    fields.objectName,
  ]
    .filter(Boolean)
    .join(" ");

  // Reject Met search noise with no geographic or cultural attribution
  if (!fields.culture?.trim() && !fields.country?.trim() && !GHANA_KEYWORDS.test(fields.title ?? ""))
    return false;

  if (GHANA_KEYWORDS.test(blob)) return true;

  // Akan material culture attributed to Côte d'Ivoire still belongs in Ghana-region research
  if (/\bakan\b/i.test(fields.culture ?? "") && /gold\s*weight|goldweight|brass|textile|cloth|wrapper|kente|adinkra/i.test(blob))
    return true;

  return false;
}

export function inferVisualSystem(text: string): { id: string; label: string } {
  const t = text.toLowerCase();
  if (/asafo|flag|posuban|mfrankaa|frankaa/.test(t))
    return { id: "V2", label: "Memory, proverb and performance" };
  if (/adinkra|kente|textile|cloth|weav|wrapper|strip/.test(t))
    return { id: "V3", label: "Cloth, pattern and social identity" };
  if (/goldweight|gold weight|brass weight|proverb/.test(t))
    return { id: "V1", label: "Land, cosmology and authority" };
  if (/stamp|banknote|coin|currency|postage|coat of arms|flag of ghana|national/.test(t))
    return { id: "V5", label: "Independence and state visual identity" };
  if (/poster|sign|cinema|music|record|magazine|newspaper|print|cartoon|photograph|advertisement|calendar/.test(t))
    return { id: "V6", label: "Popular and everyday graphics" };
  if (/digital|website|broadcast/.test(t))
    return { id: "V7", label: "Digital, diasporic and contemporary design" };
  if (/map|colonial|mission|schoolbook|gazette/.test(t))
    return { id: "V4", label: "Print, colonial rule and public culture" };
  return { id: "V1", label: "Land, cosmology and authority" };
}

export function inferPeriod(dateStart: string, dateEnd: string): { id: string; label: string } {
  const start = parseInt(dateStart, 10);
  if (Number.isNaN(start)) return { id: "P1", label: "Visual systems before colonial rule" };
  if (start < 1471) return { id: "P1", label: "Visual systems before colonial rule" };
  if (start < 1874) return { id: "P2", label: "Coastal contact and transcultural exchange, c. 1471–1874" };
  if (start < 1945) return { id: "P3", label: "Colonial print and institutional design, 1874–1945" };
  if (start < 1966) return { id: "P4", label: "Anticolonial and independence visual culture, 1945–1966" };
  if (start < 1992) return { id: "P5", label: "Post-independence public and popular graphics, 1966–1992" };
  return { id: "P6", label: "Democratic, digital and diasporic design, 1992–present" };
}
