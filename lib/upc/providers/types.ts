/** Common shape every provider normalizes its response into. */
export interface ProviderResult {
  name: string | null;
  brand: string | null;
  description: string | null;
  category: string | null;
  images: string[];
  msrpCents: number | null;
  currency: string | null;
  source: string;
}

export interface Provider {
  name: string;
  /** Only providers whose required env keys are present are tried. */
  isEnabled(): boolean;
  /** Look up by the best UPC/EAN form (12 or 13 digits). Throws on transport errors. */
  lookup(lookupCode: string): Promise<ProviderResult | null>;
}

/** A provider result is only "sufficient" if it has a name plus an image or brand. */
export function isSufficient(r: ProviderResult | null): r is ProviderResult {
  return !!r && !!r.name && (r.images.length > 0 || !!r.brand);
}

export async function fetchJson(
  url: string,
  init: RequestInit = {},
  timeoutMs = 6000,
): Promise<{ ok: boolean; status: number; data: unknown }> {
  const res = await fetch(url, {
    ...init,
    signal: AbortSignal.timeout(timeoutMs),
    headers: { Accept: "application/json", ...(init.headers ?? {}) },
  });
  let data: unknown = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  return { ok: res.ok, status: res.status, data };
}

/** Best-effort conversion of a price string/number to integer cents. */
export function toCents(price: unknown): number | null {
  if (price == null) return null;
  const num = typeof price === "string" ? parseFloat(price.replace(/[^0-9.]/g, "")) : Number(price);
  if (!Number.isFinite(num) || num <= 0) return null;
  return Math.round(num * 100);
}
