export type RecordRightsSnapshot = {
  rightsStatus: string;
  licence: string;
  accessType: string;
  verificationStatus: string;
  culturalSensitivity: string;
  communityReviewStatus: string;
  sourceUrl: string;
  dateAccessed: string;
  citation: string;
};

type RecordRightsLike = Partial<RecordRightsSnapshot>;

export function snapshotRecordRights(record: RecordRightsLike | undefined): RecordRightsSnapshot {
  if (!record) {
    return {
      rightsStatus: "",
      licence: "",
      accessType: "",
      verificationStatus: "",
      culturalSensitivity: "",
      communityReviewStatus: "",
      sourceUrl: "",
      dateAccessed: "",
      citation: "",
    };
  }
  return {
    rightsStatus: record.rightsStatus ?? "",
    licence: record.licence ?? "",
    accessType: record.accessType ?? "",
    verificationStatus: record.verificationStatus ?? "",
    culturalSensitivity: record.culturalSensitivity ?? "",
    communityReviewStatus: record.communityReviewStatus ?? "",
    sourceUrl: record.sourceUrl ?? "",
    dateAccessed: record.dateAccessed ?? "",
    citation: record.citation ?? "",
  };
}

export function recordNeedsMetadataReview(snapshot: RecordRightsSnapshot) {
  if (!snapshot.citation.trim()) return true;
  if (!snapshot.rightsStatus.trim() || snapshot.rightsStatus === "Rights Unknown") return true;
  if (!snapshot.sourceUrl.trim()) return true;
  if (!snapshot.dateAccessed.trim()) return true;
  if (!snapshot.accessType.trim()) return true;
  if (!snapshot.verificationStatus.trim()) return true;
  return false;
}
