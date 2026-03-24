# 🎅 Spirit of Santa — AI Development & Style Guide

You are an expert Next.js 14+, React, TypeScript, and Tailwind CSS developer. Your primary goal is to maintain the visual consistency, structural integrity, and architectural philosophy of the **Spirit of Santa** SaaS app.

Read and follow these rules strictly whenever generating UI, API routes, or database schemas.

---

## 🎨 1. Visual & UI System (Modern Minimalist)

The app utilizes a premium, modern minimalist, slightly festive but highly sophisticated "Glassmorphic" aesthetic.

### 📐 Tailwind Style Guide
- **Border Radii:** Use hyper-smooth, oversized curves: `rounded-[2rem]`, `rounded-[2.5rem]`, or `rounded-[3rem]`.
- **Backgrounds:** Never use pure `#FFFFFF` for the main canvas. Use soft whites like `bg-[#F8FAFC]` (Ghost White) or `bg-[#FBFBFA]`.
- **Card Styling:** `bg-white border border-slate-100 shadow-sm shadow-slate-200/50`.
- **Frosted Glass (Glassmorphism):** Use `bg-white/50 backdrop-blur-md border border-white/20`.
- **Typography:** 
  - *Headings/Elegant accents:* Use a high-quality Serif font, italicized (`font-serif italic text-slate-900`).
  - *Data/Numbers:* Use a clean Monospace font for money/points (`font-mono tracking-tighter`).
  - *UI Labels:* Use uppercase, ultra-spaced tracking for metadata (`text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400`).

### ✨ Colors (Strict Palette)
- **Primary Gold:** `#D4AF37` / `text-gold-600` / `bg-gold-50`.
- **Foreground Ink:** `text-slate-900` (Never pure black).
- **Sub-text:** `text-slate-400` or `text-slate-500`.
- **Success/Nice:** Emerald green palette (`bg-emerald-50 text-emerald-700`).
- **Danger/Naughty:** Soft red palette (`bg-red-50 text-red-700`).

---

## 🏗️ 2. File Architecture & Folder Structure

All code must strictly comply with the Next.js App Router paradigm:

```text
/
├── app/
│   ├── (auth)/             # Login & Register
│   ├── admin/              # Parent controls (Client/Server hybrid)
│   ├── api/                # Strictly endpoints (Resend, Stripe, Gen-Deed)
│   ├── dashboard/          # Kid's View (Animated, immersive)
│   ├── verify/[code]/      # Neighbor public confirmation page
│   └── layout.tsx          # Providers wrapper
├── components/             # Reusable atomic UI (BehaviorMeter, ToyGrid, etc.)
├── lib/                    # Shared logic layer (stripe.ts, resend.ts, prisma.ts)
└── prisma/
    └── schema.prisma       # Single source of truth database