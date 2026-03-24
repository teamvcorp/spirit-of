# Do The Thing - Focus Timer

An ADHD-friendly focus app powered by AI. Break any goal into actionable steps, track progress, get nudged back on task, and stay accountable - all without signup required.

---

## Tech Stack

### Runtime Dependencies

| Package | Version | Purpose |
|---|---|---|
| `next` | 16.2.1 | App Router, RSC, API routes |
| `react` / `react-dom` | 19.2.4 | UI  React 19 with concurrent features |
| `next-auth` | ^5.0.0-beta.30 | Auth v5 beta  JWT sessions, Credentials provider |
| `@google/generative-ai` | ^0.24.1 | Gemini SDK  generates task breakdowns (Gemini 2.x Flash) |
| `@vercel/blob` | ^2.3.1 | Serverless JSON file storage for users and sessions |
| `bcryptjs` | ^3.0.3 | Password hashing (cost factor 12) |
| `stripe` | ^20.4.1 | Checkout sessions, subscription webhooks |
| `framer-motion` | ^12.38.0 | All animations, drag-and-drop (Reorder), gesture handling |
| `lucide-react` | ^0.577.0 | Icons |
| `react-hot-toast` | ^2.6.0 | Toast notifications |
| `qrcode.react` | ^4.2.0 | SVG QR code for desktop-to-mobile widget |

### Dev Dependencies

| Package | Purpose |
|---|---|
| `tailwindcss` ^4, `@tailwindcss/postcss` | Utility CSS  v4 with `@import "tailwindcss"` (no config file) |
| `typescript` ^5 | Type safety |
| `eslint` ^9, `eslint-config-next` | Linting |
| `babel-plugin-react-compiler` 1.0.0 | Experimental React Compiler (auto-memoization) |

---

## Project Structure

```
app/
    layout.tsx                 # Root layout: fonts, SessionProvider, Toaster, InstallPrompt, PWA meta
    page.tsx                   # Entire client app (~1100 lines, single-page)
    globals.css                # Tailwind v4 @import, CSS vars, text-size-adjust
    api/
        auth/[...nextauth]/route.ts   # NextAuth catch-all
        auth/register/route.ts        # POST  user registration
        breakdown/route.ts            # POST  Gemini AI task/step generation
        session/route.ts              # GET/POST/DELETE  Blob session persistence
        stripe/
            checkout/route.ts         # POST  create Stripe checkout session
            webhook/route.ts          # POST  handle subscription events
components/
    AuthModal.tsx              # Sign in / sign up / account modal (dynamic, ssr:false)
    InstallPrompt.tsx          # PWA install banner  Android native + iOS instructions
    QRCodeWidget.tsx           # Desktop hover widget for mobile QR handoff
lib/
    users.ts                   # Vercel Blob CRUD for user records
types/
    next-auth.d.ts             # Session/JWT augmentation (subscriptionStatus, language)
auth.ts                        # NextAuth v5  Credentials provider, JWT/session callbacks
next.config.ts                 # reactCompiler: true
public/
    manifest.json              # PWA manifest
    sw.js                      # Service worker
    icon.svg                   # App icon (SVG, maskable)
```

---

## Features

### Core Task Management
- **Goal input**  Type or speak a goal; AI breaks it into 7 ADHD-friendly steps (step 1 is always a 10-second micro-win)
- **Voice input**  Mic button triggers `SpeechRecognition` / `webkitSpeechRecognition`
- **Multi-goal detection**  Input with `,`, `;`, `and`, `also` triggers AI to split into separate goals automatically
- **Goal queue**  Goals exceeding the slot limit go into a persistent "Queued Goals" panel (localStorage)
- **Goal limit**  Free: 3 goals; Pro: 3 goals per weekday
- **Day tabs (Pro)**  MonSun selector; each day has its own Blob-stored list
- **Step completion**  Circular checkbox; triggers thumbs-up celebration overlay
- **Step delete / Goal delete**  Individual trash icons
- **Goal collapse**  Click goal name to animate-collapse its step list
- **Goal rephrase**  Simpler / Detailed buttons regenerate all 7 steps
- **Step hints**  Sparkles button generates 3 micro-instructions for one step (toggleable)

### Inline Editing
- **Double-click** (desktop) or **500ms long press** (mobile) on any step text  inline input edit mode
- Enter or blur to save; Escape to cancel
- Long press is cancelled by pointer movement (safe for drag and scroll)

### Drag-and-Drop Reordering
- Framer Motion `Reorder.Group` / `Reorder.Item`
- `dragListener={false}`  drag only starts from the GripVertical handle icon
- `useDragControls()` per item (requires one component instance per step)
- `touch-none` on handle prevents scroll conflicts on mobile

### Notifications and Feedback
- **Thumbs-up overlay**  Giant animated overlay for 1.8s on step completion
- **Inactivity reminder**  After 60s on a selected incomplete step: banner slides down + SpeechSynthesis voice nudge
- **Voice phrases**  Random selection from phrases like "Hey, still there?", prefers friendly voices (Samantha, Karen, Daniel, Google US)
- **Swipe to dismiss**  drag="x" with 80px threshold on reminder banner
- **Toasts**  react-hot-toast, dark themed, bottom-center

### Persistence
- **Anonymous**  UUID in localStorage mapped to `/sessions/anon/<uuid>.json` in Blob
- **Authenticated (free)**  `/sessions/user/<uid>/tasks.json`
- **Authenticated (Pro)**  `/sessions/user/<uid>/<weekday>.json`
- **Debounced save**  localStorage updates immediately; Blob write debounced 1s
- **Fallback**  on Blob failure, loads from `localStorage("adhd-focus-session")`
- **Pending goals**  persisted in `localStorage("adhd-pending-goals")`

### Auth
- NextAuth v5, Credentials-only (email + bcrypt password)
- JWT strategy  stateless, no session table
- Language selection at signup (20 languages; passed to all AI prompts)
- `subscriptionStatus` and `language` embedded in JWT; refreshed from Blob on session update
- User records stored as `users/<sha256(email)>.json` in Blob

### Stripe / Pro Subscription
- Server-side checkout session creation (requires auth)
- Stripe Customer created/reused per user (stored in Blob)
- Webhook handles `subscription.created/updated/deleted`  updates Blob user record
- On return from checkout: `?upgraded=true` triggers `updateSession()` to refresh JWT
- Feature-flagged with `NEXT_PUBLIC_STRIPE_ENABLED=true`

### PWA
- **Manifest**  `display: standalone`, `theme_color: #4a5c2a`, portrait orientation
- **Service worker**  network-first with cache fallback; API routes always bypass cache
- **Android**  native `beforeinstallprompt`  top sliding banner with Install button
- **iOS Safari**  UA detection  2.5s delay  bottom sliding step-by-step instructions
- **Dismiss memory**  7-day TTL in localStorage; skips if already running standalone
- **No-zoom on rotation**  `-webkit-text-size-adjust: 100%` in CSS; proper Viewport export

### Android Icons

Android uses icons defined in `public/manifest.json`. Three PNG icons are required alongside the SVG fallback:

| File | Size | `purpose` | Usage |
|---|---|---|---|
| `public/icon.svg` | any | `any` | SVG fallback; used by Chrome on modern Android |
| `public/icon-192.png` | 192×192 | `any` | Home screen icon (standard launcher) |
| `public/icon-512.png` | 512×512 | `any` | Splash screen & Play Store listing |
| `public/icon-512-maskable.png` | 512×512 | `maskable` | Adaptive icon  Android 8+ clips to shape (circle, squircle, etc.) |

**`purpose` values explained:**
- `any` — displayed as-is; the OS does not clip or reshape the image.
- `maskable` — the image must have a "safe zone" of at least 40% padding around the centre so the OS can crop it into any adaptive shape without cutting off content. Use [maskable.app](https://maskable.app) to verify the safe zone visually.

**How Android picks the icon:**
1. Chrome / WebAPK prefers the largest `maskable` icon available for the home screen adaptive slot.
2. Falls back to the largest `any` PNG (`icon-512.png`) if no maskable icon is present.
3. The SVG (`icon.svg`, `sizes: "any"`) is used by newer Chromium builds that support SVG icons natively.

**`manifest.json` snippet (current):**
```json
"icons": [
  { "src": "/icon.svg",              "sizes": "any",      "type": "image/svg+xml", "purpose": "any" },
  { "src": "/icon-192.png",          "sizes": "192x192",  "type": "image/png",     "purpose": "any" },
  { "src": "/icon-512.png",          "sizes": "512x512",  "type": "image/png",     "purpose": "any" },
  { "src": "/icon-512-maskable.png", "sizes": "512x512",  "type": "image/png",     "purpose": "maskable" }
]
```

**`app/layout.tsx` `icons` metadata (current):**
```ts
icons: {
  icon: [
    { url: "/icon.svg",     type: "image/svg+xml" },
    { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
    { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
  ],
  apple: [{ url: "/icon-192.png", sizes: "192x192", type: "image/png" }],
},
```

> The `apple` entry only affects iOS `<link rel="apple-touch-icon">` tags; it has no effect on Android. Android icon resolution is driven entirely by `manifest.json`.

**Generating / replacing icons:**
1. Start from a 1024×1024 source SVG or PNG.
2. Export `icon-192.png` at 192×192 and `icon-512.png` at 512×512 (no padding needed for `any`).
3. For `icon-512-maskable.png`: add ~20% padding on all sides so the logo fits inside the safe zone; export at 512×512.
4. Drop all files in `public/` and redeploy — no code changes needed.

### Desktop
- **QR Code widget**  fixed top-left, hidden on mobile (`hidden lg:block`); hover to expand from pill to full QR panel pointing to `window.location.origin`

---

## API Routes

### `POST /api/breakdown`
`
Input:  { prompt, isExpand?, rawPrompt?, language? }
Output: string[]   // 7 steps, 3 hints, or custom

Modes:
  default         7 ADHD steps from goal
  isExpand: true  3 micro-instructions for one step
  rawPrompt: true  sends prompt verbatim (rephrase + multi-goal splitting)
`
- Dynamically lists Gemini models; prefers `gemini-2.5-flash`  `gemini-2.0-flash`  `gemini-2.5-pro`
- No auth required

### `GET /api/session?userId=<uid>&day=<weekday>` or `?id=<anonUUID>`
`
Output: { goals: Goal[] }
`

### `POST /api/session`
`
Input:  { userId?, day?, id?, goals: Goal[], isPro? }
Output: { ok: true }
Enforces goal limits (3 free / 3 pro)
`

### `DELETE /api/session?userId=<uid>&day=<weekday>` or `?id=<anonUUID>`

### `POST /api/auth/register`
`
Input:  { email, password, language? }
Output: { ok: true } or { error }
Validates: @ in email, password >= 8 chars, uniqueness via Blob allowOverwrite: false
`

### `POST /api/stripe/checkout`
`
Auth:   Required (NextAuth session)
Output: { url }   Stripe hosted checkout
`

### `POST /api/stripe/webhook`
`
Validates: stripe-signature header
Handles:   subscription.created / updated / deleted  updates Blob user record
`

---

## Data Models

`	ypescript
type Step = {
  id: string;            // crypto.randomUUID()
  text: string;
  completed: boolean;
  hints?: string[];      // 3 micro-instructions, optional
};

type Goal = {
  id: string;
  prompt: string;
  steps: Step[];
};

type UserRecord = {
  id: string;
  email: string;
  passwordHash: string;           // bcrypt cost 12
  subscriptionStatus: "free" | "active";
  language: string;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  createdAt: string;              // ISO timestamp
};
`

---

## Environment Variables

| Variable | Where Used | Purpose |
|---|---|---|
| `GOOGLE_GENERATIVE_AI_API_KEY` | `api/breakdown` | Gemini API key |
| `BLOB_READ_WRITE_TOKEN` | auto  `@vercel/blob` | Vercel Blob storage token |
| `AUTH_SECRET` | auto  NextAuth v5 | JWT signing secret (>= 32 chars) |
| `NEXTAUTH_URL` | `api/stripe/checkout`, NextAuth | Base URL for redirects |
| `STRIPE_SECRET_KEY` | `api/stripe/*` | Stripe server key |
| `STRIPE_PRICE_ID` | `api/stripe/checkout` | Recurring price ID (`price_...`) |
| `STRIPE_WEBHOOK_SECRET` | `api/stripe/webhook` | Webhook signature secret (`whsec_...`) |
| `NEXT_PUBLIC_STRIPE_ENABLED` | `components/AuthModal` | Client feature flag  shows Upgrade button |

---

## Key Architecture Decisions

1. **No database**  all data is JSON files in Vercel Blob. User lookup uses `sha256(email)` as path key.
2. **Stateless auth**  JWT only; subscription status refreshed from Blob on session update trigger.
3. **Anonymous-first**  full functionality without signup; localStorage UUID maps to Blob session.
4. **Single-page app**  `app/page.tsx` is one large client component. No routing.
5. **Dynamic imports**  `AuthModal`, `QRCodeWidget` are `ssr: false` to avoid hydration issues with browser APIs.
6. **React Compiler**  `reactCompiler: true` in `next.config.ts` for auto-memoization.
7. **Tailwind v4**  uses `@import "tailwindcss"` in CSS, no `tailwind.config.js` required.
8. **No rate limiting**  `/api/breakdown` and `/api/session` have no server-side rate limiting.

---

## UI Conventions

- **Color palette**  bg: `zinc-950`, brand: `violet-500/600`, cards: `zinc-900/zinc-800`, completion: `emerald-500`, danger: `red-400`
- **Max width**  all content `max-w-md mx-auto`
- **Fixed bottom input**  gradient fade `bg-linear-to-t from-zinc-950`
- **Mobile button visibility**  `opacity-100 sm:opacity-0 sm:group-hover:opacity-100` (always visible on touch, hover-reveal on desktop)
- **Animations**  spring physics throughout; `AnimatePresence` for mount/unmount
- **Selected step**  violet left accent bar + `bg-violet-500/20` + violet border

---

## Local Development

`ash
npm install
cp .env.local.example .env.local
# fill in your keys
npm run dev
`

### Stripe webhook (local)
`ash
stripe listen --forward-to localhost:3000/api/stripe/webhook
# copy whsec_... into STRIPE_WEBHOOK_SECRET
`

---

## Deployment (Vercel)

1. Push to GitHub, import in Vercel dashboard
2. Add all env vars in Vercel project settings
3. Create a Blob store  copy `BLOB_READ_WRITE_TOKEN`
4. Generate `AUTH_SECRET`: `openssl rand -base64 32`
5. Set `NEXTAUTH_URL` to your production domain
6. Add Stripe webhook endpoint: `https://yourdomain.com/api/stripe/webhook`
