import { getDb } from "@/lib/mongodb";
import { NextResponse } from "next/server";
import { logError } from "@/lib/log-error";

/** Mark an account's email confirmed via its one-time verification token. */
export async function POST(req: Request) {
  try {
    let body: { token?: unknown };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ ok: false }, { status: 400 });
    }

    const token = typeof body.token === "string" ? body.token : "";
    if (!token || token.length < 16 || token.length > 128) {
      return NextResponse.json({ ok: false, reason: "invalid" }, { status: 400 });
    }

    const db = await getDb();
    const user = await db.collection("users").findOneAndUpdate(
      { verificationToken: token },
      { $set: { emailVerified: true, verifiedAt: new Date() }, $unset: { verificationToken: "" } },
    );
    if (!user) {
      // Token already used or never existed.
      return NextResponse.json({ ok: false, reason: "invalid" }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    await logError("POST /api/verify-email", e);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
