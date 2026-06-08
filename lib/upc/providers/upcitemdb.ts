import { fetchJson, toCents, type Provider, type ProviderResult } from "./types";

interface UpcItemDbItem {
  title?: string;
  brand?: string;
  description?: string;
  category?: string;
  images?: string[];
  lowest_recorded_price?: number;
  offers?: { price?: number | string }[];
  currency?: string;
}
interface UpcItemDbResponse {
  code?: string;
  items?: UpcItemDbItem[];
}

/**
 * UPCitemdb — the free trial endpoint works without an API key (rate-limited),
 * which makes it a reliable first-choice provider. If UPCITEMDB_KEY is set we use
 * the higher-limit production endpoint instead.
 */
export const upcitemdb: Provider = {
  name: "upcitemdb",
  isEnabled: () => true,
  async lookup(lookupCode): Promise<ProviderResult | null> {
    const key = process.env.UPCITEMDB_KEY;
    const url = key
      ? `https://api.upcitemdb.com/prod/v1/lookup?upc=${lookupCode}`
      : `https://api.upcitemdb.com/prod/trial/lookup?upc=${lookupCode}`;
    const headers: Record<string, string> = key ? { user_key: key, key_type: "3scale" } : {};

    const { ok, data } = await fetchJson(url, { headers });
    if (!ok) return null;

    const res = data as UpcItemDbResponse;
    const item = res.items?.[0];
    if (!item) return null;

    const offerPrice = item.offers?.find((o) => o.price != null)?.price;
    return {
      name: item.title?.trim() || null,
      brand: item.brand?.trim() || null,
      description: item.description?.trim() || null,
      category: item.category?.trim() || null,
      images: (item.images ?? []).filter((u) => typeof u === "string" && u.startsWith("http")),
      msrpCents: toCents(item.lowest_recorded_price ?? offerPrice),
      currency: item.currency ?? "USD",
      source: "upcitemdb",
    };
  },
};
