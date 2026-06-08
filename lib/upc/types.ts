/**
 * Structured result schema for the UPC verification & enrichment pipeline.
 * Every stage writes into one of these blocks so the admin (and the UI) can see
 * exactly what was verified, where the data came from, and how confident we are.
 */

export type DetectedFormat = "UPC-A" | "UPC-E" | "EAN-13" | "GTIN-14" | "UNKNOWN";

export type PipelineStage =
  | "normalize"
  | "validate"
  | "cache"
  | "gs1"
  | "lookup"
  | "merge";

export type PipelineStatus =
  | "enriched" // validated + product data found
  | "verified_no_data" // validated (and GS1-checked) but no provider returned product data
  | "invalid"; // failed format/checksum — never hit the network

export interface PipelineError {
  stage: PipelineStage;
  code: string;
  message: string;
  retryable: boolean;
}

export interface ValidationBlock {
  formatValid: boolean;
  checksumValid: boolean;
  checkDigit: number | null;
}

export interface Gs1Block {
  verified: boolean;
  licenseeName: string | null;
  brand: string | null;
  prefix: string | null;
  prefixRegion: string | null;
  source: string; // "verified-by-gs1" | "prefix-table" | "none"
  degraded: boolean; // true when authoritative GS1 lookup was unavailable
}

export interface ProductBlock {
  name: string | null;
  brand: string | null;
  description: string | null;
  category: string | null;
  images: string[];
  msrpCents: number | null;
  currency: string | null;
}

export interface PricingBlock {
  /** Heuristic suggestion derived from MSRP. The admin always sets the final values. */
  suggestedPointCost: number | null;
  finalPointCost: number | null;
  finalPriceCents: number | null;
}

export interface ProvenanceBlock {
  sources: string[]; // which providers/services contributed
  fallbackUsed: boolean; // true if a non-primary provider supplied the data
  cacheHit: boolean;
  fetchedAt: string; // ISO timestamp
}

export interface UpcResult {
  ok: boolean;
  input: { raw: string; detectedFormat: DetectedFormat };
  gtin14: string | null;
  validation: ValidationBlock;
  gs1: Gs1Block;
  product: ProductBlock;
  pricing: PricingBlock;
  provenance: ProvenanceBlock;
  status: PipelineStatus;
  errors: PipelineError[];
}
