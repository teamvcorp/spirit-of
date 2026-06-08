import type { Gs1Block } from "./types";

/**
 * GS1 prefix table (subset). The first 3 digits of an EAN-13 identify the GS1
 * Member Organisation that licensed the number — not the country of manufacture,
 * but a strong signal that the barcode is a real, licensed GS1 number.
 */
const GS1_PREFIX_RANGES: { start: number; end: number; region: string }[] = [
  { start: 0, end: 19, region: "GS1 US & Canada" },
  { start: 20, end: 29, region: "Restricted / in-store use" },
  { start: 30, end: 39, region: "GS1 US (drugs)" },
  { start: 40, end: 49, region: "Restricted / in-store use" },
  { start: 50, end: 59, region: "GS1 US (coupons)" },
  { start: 60, end: 139, region: "GS1 US & Canada" },
  { start: 200, end: 299, region: "Restricted / in-store use" },
  { start: 300, end: 379, region: "GS1 France" },
  { start: 380, end: 380, region: "GS1 Bulgaria" },
  { start: 400, end: 440, region: "GS1 Germany" },
  { start: 450, end: 459, region: "GS1 Japan" },
  { start: 460, end: 469, region: "GS1 Russia" },
  { start: 471, end: 471, region: "GS1 Taiwan" },
  { start: 480, end: 480, region: "GS1 Philippines" },
  { start: 489, end: 489, region: "GS1 Hong Kong" },
  { start: 490, end: 499, region: "GS1 Japan" },
  { start: 500, end: 509, region: "GS1 UK" },
  { start: 520, end: 521, region: "GS1 Greece" },
  { start: 540, end: 549, region: "GS1 Belgium & Luxembourg" },
  { start: 560, end: 560, region: "GS1 Portugal" },
  { start: 570, end: 579, region: "GS1 Denmark" },
  { start: 600, end: 601, region: "GS1 South Africa" },
  { start: 690, end: 699, region: "GS1 China" },
  { start: 700, end: 709, region: "GS1 Norway" },
  { start: 729, end: 729, region: "GS1 Israel" },
  { start: 730, end: 739, region: "GS1 Sweden" },
  { start: 750, end: 750, region: "GS1 Mexico" },
  { start: 754, end: 755, region: "GS1 Canada" },
  { start: 760, end: 769, region: "GS1 Switzerland" },
  { start: 770, end: 771, region: "GS1 Colombia" },
  { start: 789, end: 790, region: "GS1 Brazil" },
  { start: 800, end: 839, region: "GS1 Italy" },
  { start: 840, end: 849, region: "GS1 Spain" },
  { start: 850, end: 850, region: "GS1 Cuba" },
  { start: 858, end: 858, region: "GS1 Slovakia" },
  { start: 859, end: 859, region: "GS1 Czech Republic" },
  { start: 869, end: 869, region: "GS1 Turkey" },
  { start: 870, end: 879, region: "GS1 Netherlands" },
  { start: 880, end: 880, region: "GS1 South Korea" },
  { start: 885, end: 885, region: "GS1 Thailand" },
  { start: 888, end: 888, region: "GS1 Singapore" },
  { start: 890, end: 890, region: "GS1 India" },
  { start: 893, end: 893, region: "GS1 Vietnam" },
  { start: 899, end: 899, region: "GS1 Indonesia" },
  { start: 900, end: 919, region: "GS1 Austria" },
  { start: 930, end: 939, region: "GS1 Australia" },
  { start: 940, end: 949, region: "GS1 New Zealand" },
  { start: 955, end: 955, region: "GS1 Malaysia" },
  { start: 958, end: 958, region: "GS1 Macau" },
];

function lookupPrefixRegion(prefix3: number): string | null {
  const hit = GS1_PREFIX_RANGES.find((r) => prefix3 >= r.start && prefix3 <= r.end);
  return hit ? hit.region : null;
}

interface Gs1ApiResponse {
  brandName?: string;
  companyName?: string;
  licenseeName?: string;
}

/**
 * Stage 3: verify the GTIN against GS1.
 *
 * If real GS1 credentials are configured (GS1_VERIFY_URL + GS1_API_KEY), we call
 * the authoritative Verified-by-GS1 service. Otherwise we degrade gracefully to a
 * prefix-table check, which still confirms the number falls inside a licensed GS1
 * range and tells us the issuing Member Organisation — flagged `degraded: true`.
 */
export async function gs1Verify(gtin14: string): Promise<Gs1Block> {
  // EAN-13 form is the last 13 digits of the GTIN-14.
  const ean13 = gtin14.slice(1);
  const prefix3 = Number(ean13.slice(0, 3));
  const prefixStr = ean13.slice(0, 3);
  const prefixRegion = lookupPrefixRegion(prefix3);

  const apiUrl = process.env.GS1_VERIFY_URL;
  const apiKey = process.env.GS1_API_KEY;

  if (apiUrl && apiKey) {
    try {
      const res = await fetch(`${apiUrl}?gtin=${gtin14}`, {
        headers: { Authorization: `Bearer ${apiKey}`, Accept: "application/json" },
        signal: AbortSignal.timeout(5000),
      });
      if (res.ok) {
        const data = (await res.json()) as Gs1ApiResponse;
        return {
          verified: true,
          licenseeName: data.licenseeName ?? data.companyName ?? null,
          brand: data.brandName ?? null,
          prefix: prefixStr,
          prefixRegion,
          source: "verified-by-gs1",
          degraded: false,
        };
      }
      // 404 from GS1 means the number isn't licensed — not verified, but authoritative.
      if (res.status === 404) {
        return {
          verified: false,
          licenseeName: null,
          brand: null,
          prefix: prefixStr,
          prefixRegion,
          source: "verified-by-gs1",
          degraded: false,
        };
      }
    } catch {
      // Fall through to prefix-table degradation below.
    }
  }

  // Degraded path: a recognised GS1 prefix is reasonable evidence of a real number.
  const inLicensedRange = prefixRegion !== null && !prefixRegion.startsWith("Restricted");
  return {
    verified: inLicensedRange,
    licenseeName: null,
    brand: null,
    prefix: prefixStr,
    prefixRegion,
    source: prefixRegion ? "prefix-table" : "none",
    degraded: true,
  };
}
