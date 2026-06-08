import { normalizeAndValidate } from "./validate";
import { gs1Verify } from "./gs1";
import { multiLookup } from "./providers";
import { readCache, writeCache } from "./cache";
import type { ProviderResult } from "./providers/types";
import type { ProductBlock, UpcResult } from "./types";

const MAX_DESC = 600;

/** Pick the first non-empty value across provider results in priority order. */
function firstOf<T>(results: ProviderResult[], pick: (r: ProviderResult) => T | null | undefined): T | null {
  for (const r of results) {
    const v = pick(r);
    if (v != null && v !== "" && !(Array.isArray(v) && v.length === 0)) return v;
  }
  return null;
}

/** Stage 5 — merge provider results field-by-field, preferring higher-priority sources. */
function mergeProducts(results: ProviderResult[], gs1Brand: string | null): ProductBlock {
  const images = firstOf(results, (r) => (r.images.length ? r.images : null)) ?? [];
  const description = firstOf(results, (r) => r.description);
  return {
    name: firstOf(results, (r) => r.name),
    brand: gs1Brand ?? firstOf(results, (r) => r.brand),
    description: description ? description.slice(0, MAX_DESC) : null,
    category: firstOf(results, (r) => r.category),
    images,
    msrpCents: firstOf(results, (r) => r.msrpCents),
    currency: firstOf(results, (r) => r.currency) ?? "USD",
  };
}

/** Heuristic only — the admin always sets the real point cost on approval. */
function suggestPointCost(msrpCents: number | null): number | null {
  if (msrpCents == null) return null;
  return Math.max(10, Math.round(msrpCents / 100));
}

/**
 * Full pipeline: normalize → validate → cache-read → GS1 → multi-API lookup →
 * merge → cache-write. Returns the structured UpcResult. Never throws — all
 * failures are captured in `result.errors` so the caller/admin can act on them.
 *
 * Dedupe against the live catalog and pending requests is intentionally NOT here
 * (it needs request context); the route layer fills the dedupe block.
 */
export async function enrichUpc(raw: string): Promise<UpcResult> {
  const now = () => new Date().toISOString();
  const v = normalizeAndValidate(raw);

  const base: UpcResult = {
    ok: false,
    input: { raw, detectedFormat: v.detectedFormat },
    gtin14: v.gtin14,
    validation: { formatValid: v.formatValid, checksumValid: v.checksumValid, checkDigit: v.checkDigit },
    gs1: { verified: false, licenseeName: null, brand: null, prefix: null, prefixRegion: null, source: "none", degraded: true },
    product: { name: null, brand: null, description: null, category: null, images: [], msrpCents: null, currency: null },
    pricing: { suggestedPointCost: null, finalPointCost: null, finalPriceCents: null },
    provenance: { sources: [], fallbackUsed: false, cacheHit: false, fetchedAt: now() },
    status: "invalid",
    errors: [],
  };

  // Stage 1 — fail fast on bad input, never touch the network.
  if (!v.ok || !v.gtin14 || !v.lookupCode) {
    base.errors.push({
      stage: "validate",
      code: v.formatValid ? "BAD_CHECKSUM" : "BAD_FORMAT",
      message: v.error ?? "Invalid barcode.",
      retryable: false,
    });
    return base;
  }

  // Stage 2 — cache read (serves repeat scans and retries with zero API calls).
  const cached = await readCache(v.gtin14);
  if (cached) return cached;

  // Stage 3 — GS1 verification (authoritative if configured, prefix-based otherwise).
  let gs1Brand: string | null = null;
  try {
    base.gs1 = await gs1Verify(v.gtin14);
    gs1Brand = base.gs1.brand;
  } catch (e) {
    base.errors.push({ stage: "gs1", code: "GS1_ERROR", message: e instanceof Error ? e.message : String(e), retryable: true });
  }

  // Stage 4 — multi-API lookup with fallback priority.
  let merged: ProductBlock = base.product;
  try {
    const lookup = await multiLookup(v.lookupCode);
    base.provenance.sources = [...lookup.sources, ...(base.gs1.source !== "none" ? ["gs1"] : [])];
    base.provenance.fallbackUsed = lookup.fallbackUsed;
    for (const err of lookup.errors) {
      base.errors.push({ stage: "lookup", code: "PROVIDER_ERROR", message: `${err.provider}: ${err.message}`, retryable: true });
    }
    // Stage 5 — merge.
    merged = mergeProducts(lookup.results, gs1Brand);
  } catch (e) {
    base.errors.push({ stage: "lookup", code: "LOOKUP_FAILED", message: e instanceof Error ? e.message : String(e), retryable: true });
  }

  base.product = merged;
  base.pricing.suggestedPointCost = suggestPointCost(merged.msrpCents);
  base.ok = true;
  base.status = merged.name ? "enriched" : "verified_no_data";
  base.provenance.fetchedAt = now();

  // Stage 6 — cache write (only successful, validated lookups).
  try {
    await writeCache(v.gtin14, base);
  } catch (e) {
    base.errors.push({ stage: "cache", code: "CACHE_WRITE_FAILED", message: e instanceof Error ? e.message : String(e), retryable: false });
  }

  return base;
}
