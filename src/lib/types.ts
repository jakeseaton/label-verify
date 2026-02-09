export type FileClassification = "label" | "application" | "unrecognized";

export type ProcessingStatus = "uploading" | "classifying" | "extracted" | "error";

export interface ExtractedFields {
  brandName?: string;
  classType?: string;
  abv?: string;
  netContents?: string;
  producerName?: string;
  producerAddress?: string;
  countryOfOrigin?: string;
  beverageType?: string;
  governmentWarning?: string;
}

export interface ProcessedFile {
  id: string;
  file: File;
  previewUrl: string;
  status: ProcessingStatus;
  classification: FileClassification;
  extractedFields: ExtractedFields;
  confidence: number;
  error?: string;
}

export interface ClassifyResponse {
  classification: FileClassification;
  confidence: number;
  extractedFields: ExtractedFields;
}

// --- Phase 2: Matching & Verification ---

export type FieldStatus = "match" | "needs_review" | "mismatch" | "not_found";

export interface FieldVerification {
  field: string;
  label: string;
  appValue?: string;
  labelValue?: string;
  status: FieldStatus;
  explanation?: string;
}

export type PairStatus = "pass" | "needs_review" | "fail" | "unmatched";

export interface MatchedPair {
  id: string;
  label?: ProcessedFile;
  application?: ProcessedFile;
  pairStatus: PairStatus;
  matchConfidence: number;
  verifications: FieldVerification[];
  issueCount: number;
  reviewCount: number;
}
