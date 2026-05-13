export type NormalizeRightsOptions = {
  /** When true, treat vague “open access” text as OA hint without implying CC. */
  openAccessHint?: boolean;
  /** e.g. DOAB catalogue metadata licence (CC0), not the book/item. */
  metadataLicence?: string;
  accessDefault?: string;
  rightsDefault?: string;
};

export type NormalizedRights = {
  rightsLabel: string;
  licenceLabel?: string;
  accessLabel: string;
  reviewLabel: string;
  caution?: string;
  canDisplayAsCreativeCommons: boolean;
  canDisplayAsPublicDomain: boolean;
};

const CC_URL =
  /creativecommons\.org\/(?:licenses\/|publicdomain\/)(?:zero|mark|by-nc-nd|by-nc-sa|by-nc|by-nd|by-sa|by)/i;
const CC_TEXT =
  /\b(cc\s*0|cc0|cc\s*by-nc-nd|cc\s*by-nc-sa|cc\s*by-nc|cc\s*by-nd|cc\s*by-sa|cc\s*by\b|creative\s+commons\s+attribution)/i;

function strip(s: unknown): string {
  return String(s ?? "")
    .replace(/\s+/g, " ")
    .trim();
}

function detectExplicitCreativeCommons(rawRights: string, rawLicence: string): {
  tag: string | null;
  licenceLabel: string | undefined;
} {
  const blob = `${rawRights} ${rawLicence}`.trim();
  if (!blob) return { tag: null, licenceLabel: undefined };
  if (!CC_URL.test(blob) && !CC_TEXT.test(blob)) return { tag: null, licenceLabel: undefined };

  const lower = blob.toLowerCase();
  if (/creativecommons\.org\/publicdomain\/zero|(^|\b)cc0\b|cc\s*0\b/i.test(blob)) {
    return { tag: "CC0", licenceLabel: "CC0 1.0" };
  }
  if (/by-nc-nd|creativecommons\.org\/licenses\/by-nc-nd/i.test(lower)) {
    return { tag: "CC BY-NC-ND", licenceLabel: "Creative Commons Attribution-NonCommercial-NoDerivatives" };
  }
  if (/by-nc-sa|creativecommons\.org\/licenses\/by-nc-sa/i.test(lower)) {
    return { tag: "CC BY-NC-SA", licenceLabel: "Creative Commons Attribution-NonCommercial-ShareAlike" };
  }
  if (/by-nc\b|creativecommons\.org\/licenses\/by-nc(?!-)/i.test(lower)) {
    return { tag: "CC BY-NC", licenceLabel: "Creative Commons Attribution-NonCommercial" };
  }
  if (/by-nd|creativecommons\.org\/licenses\/by-nd/i.test(lower)) {
    return { tag: "CC BY-ND", licenceLabel: "Creative Commons Attribution-NoDerivatives" };
  }
  if (/by-sa|creativecommons\.org\/licenses\/by-sa/i.test(lower)) {
    return { tag: "CC BY-SA", licenceLabel: "Creative Commons Attribution-ShareAlike" };
  }
  if (/by\b|creativecommons\.org\/licenses\/by|creative\s+commons\s+attribution/i.test(lower)) {
    return { tag: "CC BY", licenceLabel: "Creative Commons Attribution" };
  }
  return { tag: null, licenceLabel: undefined };
}

function pdJurisdictionOnly(sourceId: string): boolean {
  return sourceId === "project_gutenberg";
}

/**
 * Separates metadata licence, item licence, access, and reuse guidance.
 * Never claims Creative Commons unless an explicit CC licence string/URL is present.
 */
export function normalizeRights(
  rawRights: unknown,
  rawLicence: unknown,
  sourceId: string,
  options: NormalizeRightsOptions = {}
): NormalizedRights {
  const r = strip(rawRights);
  const l = strip(rawLicence);
  const accessDefault = options.accessDefault || "External link only";
  const metaLic = strip(options.metadataLicence);

  if (pdJurisdictionOnly(sourceId)) {
    return {
      rightsLabel: "Public domain or permission-based, jurisdiction check required",
      accessLabel: "Free online",
      reviewLabel: "Jurisdiction check required",
      caution:
        "Copyright status may differ outside the United States. Do not mark as globally public domain.",
      canDisplayAsCreativeCommons: false,
      canDisplayAsPublicDomain: false,
    };
  }

  const cc = detectExplicitCreativeCommons(r, l);
  if (cc.tag === "CC0") {
    return {
      rightsLabel: "CC0",
      licenceLabel: cc.licenceLabel,
      accessLabel: "Free online",
      reviewLabel: "Source licence supplied",
      canDisplayAsCreativeCommons: true,
      canDisplayAsPublicDomain: true,
    };
  }
  if (cc.tag === "CC BY") {
    return {
      rightsLabel: "CC BY",
      licenceLabel: cc.licenceLabel,
      accessLabel: "Free online",
      reviewLabel: "Source licence supplied",
      canDisplayAsCreativeCommons: true,
      canDisplayAsPublicDomain: false,
    };
  }
  if (cc.tag === "CC BY-SA") {
    return {
      rightsLabel: "CC BY-SA",
      licenceLabel: cc.licenceLabel,
      accessLabel: "Free online",
      reviewLabel: "Source licence supplied",
      canDisplayAsCreativeCommons: true,
      canDisplayAsPublicDomain: false,
    };
  }
  if (cc.tag === "CC BY-NC") {
    return {
      rightsLabel: "CC BY-NC",
      licenceLabel: cc.licenceLabel,
      accessLabel: "Free online",
      reviewLabel: "Source licence supplied",
      canDisplayAsCreativeCommons: true,
      canDisplayAsPublicDomain: false,
    };
  }
  if (cc.tag === "CC BY-ND") {
    return {
      rightsLabel: "CC BY-ND",
      licenceLabel: cc.licenceLabel,
      accessLabel: "Free online",
      reviewLabel: "Source licence supplied",
      canDisplayAsCreativeCommons: true,
      canDisplayAsPublicDomain: false,
    };
  }
  if (cc.tag === "CC BY-NC-SA") {
    return {
      rightsLabel: "CC BY-NC-SA",
      licenceLabel: cc.licenceLabel,
      accessLabel: "Free online",
      reviewLabel: "Source licence supplied",
      canDisplayAsCreativeCommons: true,
      canDisplayAsPublicDomain: false,
    };
  }
  if (cc.tag === "CC BY-NC-ND") {
    return {
      rightsLabel: "CC BY-NC-ND",
      licenceLabel: cc.licenceLabel,
      accessLabel: "Free online",
      reviewLabel: "Source licence supplied",
      canDisplayAsCreativeCommons: true,
      canDisplayAsPublicDomain: false,
    };
  }

  const openAccessish =
    options.openAccessHint || /\bopen\s*access\b/i.test(`${r} ${l}`);

  if (/\bpublic\s+domain\b/i.test(`${r} ${l}`) && !cc.tag) {
    return {
      rightsLabel: r || "Public domain (confirm at source)",
      licenceLabel: l || undefined,
      accessLabel: options.accessDefault?.includes("Free") ? options.accessDefault : "Free online",
      reviewLabel: "Licence check required",
      caution: "Public domain claims vary by item and jurisdiction. Confirm at the source before reuse.",
      canDisplayAsCreativeCommons: false,
      canDisplayAsPublicDomain: false,
    };
  }

  if (openAccessish && !cc.tag) {
    const caution =
      sourceId === "doab"
        ? "DOAB catalogue metadata is CC0; book reuse rights come from each record’s licence fields only."
        : metaLic
          ? `Metadata licence (${metaLic}) may differ from item reuse rights.`
          : undefined;
    return {
      rightsLabel: options.rightsDefault || "Open access, licence check required",
      licenceLabel: l || undefined,
      accessLabel: options.accessDefault?.includes("Free") ? options.accessDefault : "Free online",
      reviewLabel: "Licence check required",
      caution,
      canDisplayAsCreativeCommons: false,
      canDisplayAsPublicDomain: false,
    };
  }

  if (r || l) {
    return {
      rightsLabel: r || "Check source",
      licenceLabel: l || undefined,
      accessLabel: accessDefault.includes("Free") ? accessDefault : "Free online",
      reviewLabel: "Source metadata partial",
      caution: "Reuse rights must be confirmed on the original record.",
      canDisplayAsCreativeCommons: false,
      canDisplayAsPublicDomain: false,
    };
  }

  return {
    rightsLabel: "Check source",
    accessLabel: "External link only",
    reviewLabel: "Licence check required",
    canDisplayAsCreativeCommons: false,
    canDisplayAsPublicDomain: false,
  };
}
