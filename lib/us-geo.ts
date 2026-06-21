// US-only geofence helpers. Single source of truth for which countries/regions
// Spirit of Santa serves (50 states + DC + USD-using territories with US domestic
// shipping). See the sign-up (IP) and shipping-address gates that consume these.

export const US_ONLY_MESSAGE =
  "Spirit of Santa is only available in the United States and its territories.";

// ISO-3166 alpha-2 country codes Vercel reports for served regions. Territories
// report as their own code (PR, GU, …), not "US", so they must be listed explicitly.
export const US_COUNTRY_CODES = new Set([
  "US", // United States
  "PR", // Puerto Rico
  "GU", // Guam
  "VI", // US Virgin Islands
  "AS", // American Samoa
  "MP", // Northern Mariana Islands
]);

// USPS state/region abbreviations valid in a shipping address: 50 states + DC + territories.
export const US_REGION_CODES = new Set([
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA",
  "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD",
  "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
  "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC",
  "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY",
  "DC", // District of Columbia
  "PR", "GU", "VI", "AS", "MP", // territories
]);

/**
 * IP-gate decision. Fails open: unknown/missing country (local dev, no geo header,
 * some VPNs) is allowed — the shipping-address gate is the authoritative check.
 * Only a positively-detected non-US country is blocked.
 */
export function countryAllowed(code?: string | null): boolean {
  if (!code) return true;
  return US_COUNTRY_CODES.has(code.trim().toUpperCase());
}

/** True when `code` is a recognized US state, DC, or territory abbreviation. */
export function isUsState(code: string): boolean {
  return US_REGION_CODES.has(code.trim().toUpperCase());
}

/**
 * Lenient check that a free-form shipping address looks like a US address:
 * it must contain both a US ZIP and a recognized state/territory token. Kept
 * lenient to avoid false rejections of valid US addresses.
 */
export function isUsShippingAddress(address: string): boolean {
  if (!address || !/\b\d{5}(-\d{4})?\b/.test(address)) return false;
  // Match standalone, already-uppercase 2-letter tokens on the original text so
  // we don't pull "ND" out of "London" or "WI" out of "Downing".
  const tokens = address.match(/\b[A-Z]{2}\b/g);
  if (!tokens) return false;
  return tokens.some((t) => US_REGION_CODES.has(t));
}

/** Reads Vercel's geo country header (ISO-2, uppercased) or null when absent. */
export function ipCountryFromHeaders(h: Headers): string | null {
  const code = h.get("x-vercel-ip-country");
  return code ? code.trim().toUpperCase() : null;
}
