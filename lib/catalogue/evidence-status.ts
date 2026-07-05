import type { EvidenceStatus } from "./types";

export const EVIDENCE_STATUS_LABELS: Record<EvidenceStatus, string> = {
  unverified: "UNVERIFIED",
  research_lead: "RESEARCH LEAD",
  source_located: "SOURCE LOCATED",
  source_checked: "SOURCE CHECKED",
  partially_verified: "PARTIALLY VERIFIED",
  verified: "VERIFIED",
  disputed: "DISPUTED",
  community_review_required: "COMMUNITY REVIEW REQUIRED",
  rights_review_required: "RIGHTS REVIEW REQUIRED",
};

export const EVIDENCE_STATUS_DESCRIPTIONS: Record<EvidenceStatus, string> = {
  unverified: "No source evidence has been assessed for this record yet.",
  research_lead:
    "Structured research placeholder identifying an area that still needs documentation.",
  source_located:
    "At least one source has been identified; claims have not yet been independently checked.",
  source_checked: "Primary source has been reviewed against catalogue fields.",
  partially_verified: "Some claims are confirmed; other details remain uncertain.",
  verified: "Claims meet ARED verification requirements with authoritative evidence.",
  disputed: "Sources disagree or claims conflict with available evidence.",
  community_review_required:
    "Community authority or cultural permission must be confirmed before publication changes.",
  rights_review_required:
    "Rights, reproduction or custody conditions require further review.",
};

export const EVIDENCE_BADGE_CLASS: Record<EvidenceStatus, string> = {
  unverified: "evidence-unverified",
  research_lead: "evidence-research-lead",
  source_located: "evidence-source-located",
  source_checked: "evidence-source-checked",
  partially_verified: "evidence-partial",
  verified: "evidence-verified",
  disputed: "evidence-disputed",
  community_review_required: "evidence-community",
  rights_review_required: "evidence-rights",
};

export function evidenceStatusLabel(status: EvidenceStatus): string {
  return EVIDENCE_STATUS_LABELS[status] ?? status.toUpperCase();
}

export const CATALOGUE_PUBLIC_EXPLANATION =
  "This catalogue combines verified museum object records with documented historical entries on Ghanaian graphic design and visual culture. Museum objects are checked against accession-level sources. Historical entries cite published accounts, institutions and scholarship — with ARED interpretation clearly labelled.";

export const CATALOGUE_HOMEPAGE_TEXT =
  "Objects, makers, symbols, print cultures and public images across Ghanaian history. Browse eight subcollections — from Akan goldweights and Fante Asafo flags to independence symbols, popular signage and digital design. Each record separates source facts from ARED analysis.";
