import { fetchJson, toCents, type Provider, type ProviderResult } from "./types";

interface GoUpcResponse {
  product?: {
    name?: string;
    brand?: string;
    description?: string;
    category?: string;
    imageUrl?: string;
    region?: string;
  };
}

/** Go-UPC — good image coverage, requires GO_UPC_KEY (Bearer token). */
export const goupc: Provider = {
  name: "goupc",
  isEnabled: () => !!process.env.GO_UPC_KEY,
  async lookup(lookupCode): Promise<ProviderResult | null> {
    const key = process.env.GO_UPC_KEY!;
    const url = `https://go-upc.com/api/v1/code/${lookupCode}`;
    const { ok, data } = await fetchJson(url, { headers: { Authorization: `Bearer ${key}` } }, 7000);
    if (!ok) return null;

    const p = (data as GoUpcResponse).product;
    if (!p) return null;

    return {
      name: p.name?.trim() || null,
      brand: p.brand?.trim() || null,
      description: p.description?.trim() || null,
      category: p.category?.trim() || null,
      images: p.imageUrl && p.imageUrl.startsWith("http") ? [p.imageUrl] : [],
      msrpCents: toCents(undefined),
      currency: "USD",
      source: "goupc",
    };
  },
};
