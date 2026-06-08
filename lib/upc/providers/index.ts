import { isSufficient, type Provider, type ProviderResult } from "./types";
import { upcitemdb } from "./upcitemdb";
import { barcodelookup } from "./barcodelookup";
import { goupc } from "./goupc";

/**
 * Stage 4 — fallback priority chain. Providers are tried in order; the first
 * "sufficient" result (name + image-or-brand) wins. Insufficient or null results
 * are collected so the merge stage can still backfill individual fields.
 */
const PROVIDER_PRIORITY: Provider[] = [upcitemdb, barcodelookup, goupc];

export interface MultiLookupResult {
  results: ProviderResult[];
  sources: string[];
  fallbackUsed: boolean;
  errors: { provider: string; message: string }[];
}

/** One automatic retry per provider for transient transport failures. */
async function lookupWithRetry(provider: Provider, code: string): Promise<ProviderResult | null> {
  try {
    return await provider.lookup(code);
  } catch {
    try {
      return await provider.lookup(code);
    } catch (e) {
      throw e instanceof Error ? e : new Error(String(e));
    }
  }
}

export async function multiLookup(lookupCode: string): Promise<MultiLookupResult> {
  const results: ProviderResult[] = [];
  const sources: string[] = [];
  const errors: { provider: string; message: string }[] = [];
  let fallbackUsed = false;
  let primaryAttempted = false;

  for (const provider of PROVIDER_PRIORITY) {
    if (!provider.isEnabled()) continue;
    const isPrimaryThisRound = !primaryAttempted;
    primaryAttempted = true;

    let result: ProviderResult | null = null;
    try {
      result = await lookupWithRetry(provider, lookupCode);
    } catch (e) {
      errors.push({ provider: provider.name, message: e instanceof Error ? e.message : String(e) });
      continue;
    }

    if (result) {
      results.push(result);
      sources.push(provider.name);
      if (isSufficient(result)) {
        if (!isPrimaryThisRound) fallbackUsed = true;
        break; // good enough — stop walking the chain
      }
      // Not sufficient on its own; keep going but remember a fallback contributed.
      if (!isPrimaryThisRound) fallbackUsed = true;
    }
  }

  return { results, sources, fallbackUsed, errors };
}
