import { getDb, ObjectId } from "@/lib/mongodb";
import { NextResponse } from "next/server";
import { rateLimit } from "@/lib/rate-limit";
import { logError } from "@/lib/log-error";

export async function POST(req: Request) {
  try {
    let body: { childId?: unknown; pin?: unknown };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ success: false }, { status: 400 });
    }

    const childId = typeof body.childId === "string" ? body.childId : "";
    const pin = typeof body.pin === "string" ? body.pin : "";

    if (!childId || !pin || !ObjectId.isValid(childId)) {
      return NextResponse.json({ success: false }, { status: 400 });
    }

    // Throttle brute-force: a 4-digit PIN is only 10k combos, so cap attempts.
    const limit = await rateLimit(`pin:${childId}`, 5, 15 * 60);
    if (!limit.allowed) {
      return NextResponse.json(
        { success: false, reason: "locked", message: "Too many attempts. Try again in a few minutes." },
        { status: 429 },
      );
    }

    const db = await getDb();
    const child = await db.collection("children").findOne({ _id: new ObjectId(childId) }, { projection: { parentId: 1 } });
    if (!child) return NextResponse.json({ success: false }, { status: 404 });

    const parent = await db.collection("users").findOne(
      { _id: new ObjectId(child.parentId) },
      { projection: { parentPin: 1 } },
    );
    if (!parent?.parentPin) {
      return NextResponse.json({ success: false, reason: "no_pin" });
    }

    return NextResponse.json({ success: parent.parentPin === pin });
  } catch (e) {
    await logError("POST /api/pin/verify", e);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
