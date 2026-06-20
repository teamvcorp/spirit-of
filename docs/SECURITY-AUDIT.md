# Pre-Launch Security Audit — API Endpoints

Audited every route under `app/api/`. Below: what was fixed in this pass,
the per-endpoint status, and the accepted risks / recommendations to review
before going fully live.

## ✅ Fixed in this pass

| # | Severity | Issue | Fix |
|---|---|---|---|
| 1 | **Critical** | `POST /api/generate-deed` was **unauthenticated** and let anyone forge Good Deed codes (and thus Magic Points) for any child. It was also dead code (called nowhere). | **Endpoint deleted.** The authenticated `generate-deeds` (plural, with parent-ownership check) is the real one. |
| 2 | **High** | `POST /api/pin/verify` — 4-digit parent PIN, **no rate limiting**, so it was brute-forceable (10k combos) for any known childId. Also threw a 500 on malformed `childId`. | Added **rate limiting** (5 attempts / 15 min per child, `429` when exceeded), `ObjectId.isValid` guard, typed input parsing, and error logging. |
| 3 | **High (bug)** | `POST /api/checkout/finalize` assumed the **legacy string** wishlist format and called `new ObjectId(item)` on `{toyId}` objects → crash / wrong totals for current data. | Normalized via `toToyId()` to support both formats; wrapped in try/catch + logging. |
| 4 | Medium | Malformed IDs caused unhandled 500s in `children/[childId]`, `admin/users/[userId]` (DELETE & PATCH). | Added `ObjectId.isValid` guards returning 400/404. |
| 5 | Medium | Public donation endpoints (`magic-tip`, `magic-general`) had weak validation (no integer/upper-bound check, unsafe body parse) and no abuse limiting. | Integer coercion, $1–$10,000 bounds, typed parsing, **per-IP rate limit** (20 / 10 min), error logging. |
| 6 | Medium | `POST /api/admin/auth` (admin login) had **no rate limiting** → password brute-force. | Per-IP rate limit (10 / 15 min) + typed password check. |
| 7 | Medium | Failures in the **Stripe webhook** money path were not recorded. | Wrapped handler in try/catch → `logError` (signature + handler), returns 500 so Stripe retries. |

New shared utilities: [lib/rate-limit.ts](../lib/rate-limit.ts) (MongoDB TTL-backed, fails open) and [lib/log-error.ts](../lib/log-error.ts) (writes to `errorLogs`, 90-day TTL).

## Per-endpoint status

| Endpoint | Auth | Notes |
|---|---|---|
| `admin/auth` | shared password + cookie | Now rate-limited. |
| `admin/orders`, `admin/users`, `admin/users/[userId]`, `toys` POST/DELETE, `toy-requests` GET/[id], `upload` | admin cookie ✓ | OK. ID guards added. |
| `auth/[...nextauth]` | NextAuth (bcrypt) | OK. |
| `children` GET, `finalize`, `checkout/*` (cards/child-registration/finalize/portal/topup/plan-payment), `christmas-plan` (+pay), `email-deed-cards`, `generate-deeds` | parent session + ownership ✓ | OK. |
| `webhook/stripe` | Stripe signature ✓ | Now logs failures. |
| `cron/season` | `CRON_SECRET` bearer ✓ | OK. |
| `children/[childId]` GET, `upc/lookup`, `magic/lookup` | **none (by design)** | Sessionless kid/donor flows — see accepted risks. |
| `magic-tip`, `magic-general` | none (public donations) | Now validated + rate-limited. |
| `pin/verify` | none (kid → parent gate) | Now rate-limited + guarded. |

## ⚠️ Accepted risks & recommendations (review before/after launch)

1. **Sessionless kid dashboard (`children/[childId]`, `upc/lookup`, `pin/verify`).** Kids don't log in; the child's Mongo `ObjectId` acts as a capability in the URL. ObjectIds are semi-guessable. *Recommendation:* issue a random per-child access token (stored on the child, used in the URL) instead of the raw ObjectId. Not blocking for launch, but plan it.
2. **Parent PIN stored in plaintext** (`users.parentPin`, compared with `===`). Rate limiting now blocks brute force; still, *recommendation:* hash the PIN in `setParentPin` like passwords.
3. **Admin is a single shared password.** Use a long, random `ADMIN_PASSWORD`. Consider per-admin accounts later.
4. **Stripe webhook idempotency vs. partial failure:** the idempotency marker is inserted *before* processing, so if a handler throws mid-way, a Stripe retry is skipped as "already processed." Low frequency, but consider moving the marker to after successful processing, or making each handler independently idempotent.
5. **`upload`** trusts the client MIME type and uses the raw filename in the blob key. Low risk (admin-only, public blob storage). *Optional:* sanitize the filename.

## Required environment variables (must be set in production)

`MONGODB_URI`, `NEXTAUTH_SECRET`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`,
`ADMIN_PASSWORD`, `CRON_SECRET` (for the season cron), `BLOB_READ_WRITE_TOKEN`
(Vercel Blob), `RESEND_API_KEY` (email), `GO_UPC_KEY` (UPC lookups), and
`NEXT_PUBLIC_DOMAIN`. Missing any of these degrades or breaks the related flow.

## Error visibility

All caught errors now flow through `logError(context, error, meta)` →
**`errorLogs` collection** (90-day TTL). Review there to triage issues quickly.
*Recommendation:* add a small admin "Errors" tab that reads this collection.
