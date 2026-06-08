# UPC Lookup Providers — Setup & Keys

The toy-request feature runs a UPC verification + enrichment pipeline
([lib/upc/](../lib/upc/)). This doc lists the optional data providers, where to
get each key, and what they cost.

## ✅ You do NOT need to pay for anything right now

The pipeline works with **zero API keys**:

- **UPCitemdb free trial** is used automatically (no key required) to fetch toy
  names, images, and prices. It's rate-limited but fully functional.
- **GS1 verification** falls back to a built-in prefix-table check, so the admin
  queue still shows whether a barcode is a real, licensed GS1 number (it's just
  marked "GS1 unverified" instead of "GS1 verified").

So you can launch today for free. Add the keys below later, whenever budget
allows, to improve data quality and raise rate limits.

## Where the keys go

Add any keys to the `.env` file in the project root **and** to your hosting
provider's environment variables (e.g. Vercel → Project → Settings →
Environment Variables) for production. Use these exact names:

| Provider | Env var(s) | Sign-up link | Cost | Notes |
|---|---|---|---|---|
| **UPCitemdb** | `UPCITEMDB_KEY` | https://www.upcitemdb.com/ | Free trial works with **no key**; paid plans for higher volume | Primary lookup: name, images, price. Skip the key to use the free trial endpoint. |
| **Go-UPC** | `GO_UPC_KEY` | https://go-upc.com/api | Free tier + paid plans | Good image coverage. Token is used as a Bearer token. **Best free option to add first.** |
| **Barcode Lookup** | `BARCODE_LOOKUP_KEY` | https://www.barcodelookup.com/api | Paid (per-lookup plans) | Broad catalog, strong images. Add later for deeper coverage. |
| **Verified by GS1** | `GS1_VERIFY_URL` + `GS1_API_KEY` | https://www.gs1.org/services/verified-by-gs1 | Membership-based | Authoritative brand/licensee data. Requires a GS1 membership through your national GS1 office (e.g. GS1 US). Only needed for the authoritative "GS1 verified" badge. |

## Recommended order (cheapest first)

1. **Launch with nothing** — free UPCitemdb trial + GS1 prefix check.
2. **Add `GO_UPC_KEY`** when you can — has a usable free tier and good images.
3. **Add `UPCITEMDB_KEY`** if you start hitting the trial rate limit.
4. **Add `BARCODE_LOOKUP_KEY`** for broader coverage (paid).
5. **Pursue GS1 membership** only if you want the authoritative verification badge.

## Example `.env`

```
# All optional — the pipeline works with none of these set.
# GO_UPC_KEY=your_token_here
# UPCITEMDB_KEY=...
# BARCODE_LOOKUP_KEY=...
# GS1_VERIFY_URL=...
# GS1_API_KEY=...
```

> ⚠️ Keep real keys out of git. Put production keys only in your host's
> environment-variable panel, not in a committed file.

## How the fallback chain behaves

Providers are tried in priority order (UPCitemdb → Barcode Lookup → Go-UPC) and
the pipeline stops at the first result with a name plus an image or brand.
Disabled providers (no key) are skipped automatically. See
[lib/upc/providers/index.ts](../lib/upc/providers/index.ts).
