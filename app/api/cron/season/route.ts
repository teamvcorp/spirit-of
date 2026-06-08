import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { finalizeAllFamilies, resetAllFamilies } from "@/lib/season";

/**
 * Seasonal automation, run daily by Vercel Cron (see vercel.json).
 *   - In December → auto-finalize every family (lock lists, apply wallet, email admin).
 *   - In January  → unlock every family for the new year.
 * Both operations are idempotent, so running daily simply catches any stragglers.
 *
 * Secured with CRON_SECRET: Vercel sends it as `Authorization: Bearer <secret>`.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = await getDb();
  const month = new Date().getMonth(); // 0-indexed

  if (month === 11) {
    const result = await finalizeAllFamilies(db);
    return NextResponse.json({ ran: "finalize", ...result });
  }
  if (month === 0) {
    const result = await resetAllFamilies(db);
    return NextResponse.json({ ran: "reset", ...result });
  }

  return NextResponse.json({ ran: "none" });
}
