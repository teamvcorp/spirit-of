import { getDb } from "@/lib/mongodb";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { logError } from "@/lib/log-error";

const ALLOWED = ["off", "daily", "weekly"] as const;

/** Save the parent's vote-reminder frequency preference. */
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let body: { frequency?: unknown };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
    }

    const frequency = String(body.frequency) as (typeof ALLOWED)[number];
    if (!ALLOWED.includes(frequency)) {
      return NextResponse.json({ error: "Invalid frequency." }, { status: 400 });
    }

    const db = await getDb();
    await db.collection("users").updateOne(
      { email: session.user.email },
      { $set: { voteReminder: frequency } },
    );

    return NextResponse.json({ ok: true, frequency });
  } catch (e) {
    await logError("POST /api/vote-reminder", e);
    return NextResponse.json({ error: "Couldn't save your preference." }, { status: 500 });
  }
}
