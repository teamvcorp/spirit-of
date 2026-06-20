import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { sendVoteReminders } from "@/lib/vote-reminders";
import { logError } from "@/lib/log-error";

/** Daily cron (Vercel) — sends vote-reminder emails per each parent's preference. */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const db = await getDb();
    const result = await sendVoteReminders(db);
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    await logError("GET /api/cron/vote-reminders", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
