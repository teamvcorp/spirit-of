import { fetchJson, toCents, type Provider, type ProviderResult } from "./types";

interface BarcodeLookupProduct {
  title?: string;
  product_name?: string;
  brand?: string;
  description?: string;
  category?: string;
  images?: string[];
  stores?: { price?: string; currency_code?: string }[];
}
interface BarcodeLookupResponse {
  products?: BarcodeLookupProduct[];
}

/** Barcode Lookup — broad catalog, requires BARCODE_LOOKUP_KEY. */
export const barcodelookup: Provider = {
  name: "barcodelookup",
  isEnabled: () => !!process.env.BARCODE_LOOKUP_KEY,
  async lookup(lookupCode): Promise<ProviderResult | null> {
    const key = process.env.BARCODE_LOOKUP_KEY!;
    const url = `https://api.barcodelookup.com/v3/products?barcode=${lookupCode}&formatted=y&key=${key}`;
    const { ok, data } = await fetchJson(url, {}, 7000);
    if (!ok) return null;

    const product = (data as BarcodeLookupResponse).products?.[0];
    if (!product) return null;

    const store = product.stores?.find((s) => s.price);
    return {
      name: (product.title || product.product_name)?.trim() || null,
      brand: product.brand?.trim() || null,
      description: product.description?.trim() || null,
      category: product.category?.split(">").pop()?.trim() || product.category?.trim() || null,
      images: (product.images ?? []).filter((u) => typeof u === "string" && u.startsWith("http")),
      msrpCents: toCents(store?.price),
      currency: store?.currency_code ?? "USD",
      source: "barcodelookup",
    };
  },
};
