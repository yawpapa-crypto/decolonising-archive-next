export type RecordFieldSourceType =
  | "source_institution"
  | "ared_editorial"
  | "community"
  | "machine_suggested"
  | "imported_dataset"
  | "user_contribution";

export type RecordFieldTransformationType =
  | "unchanged"
  | "cleaned"
  | "normalised"
  | "translated"
  | "expanded"
  | "inferred"
  | "reclassified"
  | "manually_added";

export interface RecordField {
  id: string;
  recordId: string;
  fieldKey: string;
  displayLabel: string;
  value: string;
  rawValue: string;
  valueType: string;
  sourceType: RecordFieldSourceType;
  sourceName: string;
  sourceRecordId: string;
  sourceUrl: string;
  transformationType: RecordFieldTransformationType;
  transformationNote: string;
  confidence: "low" | "medium" | "high";
  reviewStatus: string;
  reviewedBy: string;
  reviewedAt: string;
  createdAt: string;
  updatedAt: string;
}
