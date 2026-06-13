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
| ~~**UPCitemdb**~~ | _removed_ | https://www.upcitemdb.com/ | — | **REMOVED as a provider** (unexpected billing). The provider file `upcitemdb.ts` remains but is no longer wired into the chain. Cancel any plan in your UPCitemdb account to stop charges. |
| **Go-UPC** | `GO_UPC_KEY` | https://go-upc.com/api | Free for ~150 lookups/mo | **Primary** — tried first for its better images. When the 150/mo limit is hit it returns a 429 and falls through to Barcode Lookup (if configured). Bearer token. |
| **Barcode Lookup** | `BARCODE_LOOKUP_KEY` | https://www.barcodelookup.com/api | Paid (per-lookup plans) | Optional fallback after Go-UPC. Only used if a key is set. |
| **Verified by GS1** | `GS1_VERIFY_URL` + `GS1_API_KEY` | https://www.gs1.org/services/verified-by-gs1 | Membership-based | Authoritative brand/licensee data. Requires a GS1 membership through your national GS1 office (e.g. GS1 US). Only needed for the authoritative "GS1 verified" badge. |

## Recommended order (cheapest first)

1. **Go-UPC** (`GO_UPC_KEY`) is the primary provider — free for ~150 lookups/mo, good images.
2. **Add `BARCODE_LOOKUP_KEY`** (paid) only if you need a fallback beyond Go-UPC's monthly quota.
3. **Pursue GS1 membership** only if you want the authoritative verification badge.
4. _(UPCitemdb was removed due to unexpected billing — see the table above.)_

## Example `.env`

```
# GO_UPC_KEY is the primary provider (free ~150/mo).
GO_UPC_KEY=your_token_here
# BARCODE_LOOKUP_KEY=...   # optional paid fallback
# GS1_VERIFY_URL=...
# GS1_API_KEY=...
# UPCITEMDB_KEY — removed; do not set (provider is no longer wired in)
```

> ⚠️ Keep real keys out of git. Put production keys only in your host's
> environment-variable panel, not in a committed file.

## How the fallback chain behaves

Providers are tried in priority order (**Go-UPC → Barcode Lookup**) and the
pipeline stops at the first result with a name plus an image or brand. When
Go-UPC's free monthly quota (~150) is used up it returns a 429, which the chain
treats as "no result" and falls through to Barcode Lookup (if a key is set). If
no provider returns data, the request still goes through as "verified, no data"
and the admin fills in the details by hand. Disabled providers (no key) are
skipped automatically, and results are cached for 60 days so repeat scans of the
same product don't spend the Go-UPC quota again. See
[lib/upc/providers/index.ts](../lib/upc/providers/index.ts).
