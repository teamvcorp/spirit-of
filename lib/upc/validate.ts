import type { DetectedFormat } from "./types";

export interface NormalizeResult {
  ok: boolean;
  /** Canonical 14-digit GTIN — the identity key used for dedupe and caching. */
  gtin14: string | null;
  /** Best 12/13-digit form for provider APIs that expect a UPC/EAN. */
  lookupCode: string | null;
  detectedFormat: DetectedFormat;
  formatValid: boolean;
  checksumValid: boolean;
  checkDigit: number | null;
  error: string | null;
}

/** Strip everything that isn't a digit (spaces, dashes, leading apostrophes from scanners). */
function digitsOnly(raw: string): string {
  return (raw ?? "").replace(/\D/g, "");
}

/**
 * Expand an 8-digit UPC-E code to its 12-digit UPC-A equivalent.
 * Layout: [number-system][d1..d6][check]. The 6th data digit selects the pattern.
 */
function expandUpcE(upce: string): string | null {
  if (upce.length !== 8) return null;
  const ns = upce[0];
  // UPC-E only defines number systems 0 and 1.
  if (ns !== "0" && ns !== "1") return null;
  const d = upce.slice(1, 7); // 6 data digits
  const check = upce[7];
  const last = d[5];

  let mfgAndProduct: string;
  switch (last) {
    case "0":
    case "1":
    case "2":
      mfgAndProduct = `${d[0]}${d[1]}${last}0000${d[2]}${d[3]}${d[4]}`;
      break;
    case "3":
      mfgAndProduct = `${d[0]}${d[1]}${d[2]}00000${d[3]}${d[4]}`;
      break;
    case "4":
      mfgAndProduct = `${d[0]}${d[1]}${d[2]}${d[3]}00000${d[4]}`;
      break;
    default: // 5-9
      mfgAndProduct = `${d[0]}${d[1]}${d[2]}${d[3]}${d[4]}0000${last}`;
      break;
  }
  return `${ns}${mfgAndProduct}${check}`; // 12 digits
}

/**
 * GS1 mod-10 check-digit calculation over the data digits (all but the last digit).
 * Weights alternate 3,1 from the rightmost data digit.
 */
export function computeCheckDigit(dataDigits: string): number {
  let sum = 0;
  // Weight the rightmost data digit by 3, then alternate.
  for (let i = 0; i < dataDigits.length; i++) {
    const digit = Number(dataDigits[dataDigits.length - 1 - i]);
    sum += digit * (i % 2 === 0 ? 3 : 1);
  }
  return (10 - (sum % 10)) % 10;
}

/** Left-pad any valid GTIN form (8/12/13/14) to a canonical 14-digit GTIN. */
function toGtin14(code: string): string {
  return code.padStart(14, "0");
}

/**
 * Stage 0 + Stage 1 of the pipeline: normalize input to a canonical GTIN-14,
 * detect the source format, and verify format + GS1 mod-10 checksum.
 * Pure and synchronous — never touches the network, so it can fail fast.
 */
export function normalizeAndValidate(raw: string): NormalizeResult {
  const fail = (detectedFormat: DetectedFormat, error: string): NormalizeResult => ({
    ok: false,
    gtin14: null,
    lookupCode: null,
    detectedFormat,
    formatValid: false,
    checksumValid: false,
    checkDigit: null,
    error,
  });

  const digits = digitsOnly(raw);
  if (!digits) return fail("UNKNOWN", "No digits found in the code.");

  let canonical: string; // 12/13/14-digit form before GTIN-14 padding
  let detectedFormat: DetectedFormat;
  let lookupCode: string;

  switch (digits.length) {
    case 8: {
      const expanded = expandUpcE(digits);
      if (!expanded) return fail("UPC-E", "Not a valid 8-digit UPC-E code.");
      detectedFormat = "UPC-E";
      canonical = expanded; // 12 digits
      lookupCode = expanded;
      break;
    }
    case 12:
      detectedFormat = "UPC-A";
      canonical = digits;
      lookupCode = digits;
      break;
    case 13:
      detectedFormat = "EAN-13";
      canonical = digits;
      lookupCode = digits;
      break;
    case 14:
      detectedFormat = "GTIN-14";
      canonical = digits;
      // Providers prefer the 13-digit form; drop a single leading zero if present.
      lookupCode = digits.startsWith("0") ? digits.slice(1) : digits;
      break;
    default:
      return fail(
        "UNKNOWN",
        `A toy barcode is 12 or 13 digits — this one has ${digits.length}.`,
      );
  }

  const checkDigit = Number(canonical[canonical.length - 1]);
  const expected = computeCheckDigit(canonical.slice(0, -1));
  const checksumValid = checkDigit === expected;

  return {
    ok: checksumValid,
    gtin14: toGtin14(canonical),
    lookupCode,
    detectedFormat,
    formatValid: true,
    checksumValid,
    checkDigit,
    error: checksumValid ? null : "That barcode's check digit doesn't add up — double-check the number.",
  };
}
