import { getDb } from "@/lib/mongodb";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { normalizeSplits } from "@/lib/christmas-plan";
import { logError } from "@/lib/log-error";

/** Save the per-child budget split percentages (normalized to 100). */
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let body: { splits?: Record<string, unknown> };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
    }

    const db = await getDb();
    const user = await db.collection("users").findOne({ email: session.user.email });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
    if (!user.christmasPlan) return NextResponse.json({ error: "Set a budget first." }, { status: 400 });

    // Only accept splits for this parent's actual children.
    const kids = await db.collection("children")
      .find({ parentId: user._id.toString() })
      .project({ _id: 1 })
      .toArray();
    const childIds = kids.map((k) => k._id.toString());

    const rawSplits: Record<string, number> = {};
    for (const id of childIds) {
      const v = Number((body.splits ?? {})[id]);
      if (Number.isFinite(v) && v >= 0) rawSplits[id] = v;
    }
    const splits = normalizeSplits(rawSplits, childIds);

    await db.collection("users").updateOne(
      { _id: user._id },
      { $set: { "christmasPlan.splits": splits } },
    );

    return NextResponse.json({ splits });
  } catch (e) {
    await logError("POST /api/christmas-plan/splits", e);
    return NextResponse.json({ error: "Couldn't save the split." }, { status: 500 });
  }
}
