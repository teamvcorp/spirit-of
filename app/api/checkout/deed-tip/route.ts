import Stripe from "stripe";
import { getDb, ObjectId } from "@/lib/mongodb";
import { NextResponse } from "next/server";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { logError } from "@/lib/log-error";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2026-02-25.clover" });
const MAX_CENTS = 1_000_000; // $10,000

/**
 * Tip on a child's good-deed card. The tip becomes the child's points (1pt=$1)
 * and the family's money (wallet + budget offset) — applied in the webhook.
 */
export async function POST(req: Request) {
  try {
    const limit = await rateLimit(`deedtip:${clientIp(req)}`, 20, 10 * 60);
    if (!limit.allowed) {
      return NextResponse.json({ error: "Too many requests — please wait a moment." }, { status: 429 });
    }

    let body: { code?: unknown; amountCents?: unknown; note?: unknown; senderEmail?: unknown };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid request." }, { status: 400 });
    }

    const code = typeof body.code === "string" ? body.code.trim() : "";
    if (!code || code.length > 64) {
      return NextResponse.json({ error: "Missing deed code." }, { status: 400 });
    }
    const amountCents = Math.round(Number(body.amountCents));
    if (!Number.isInteger(amountCents) || amountCents < 100 || amountCents > MAX_CENTS) {
      return NextResponse.json({ error: "Enter an amount between $1 and $10,000." }, { status: 400 });
    }
    const note = typeof body.note === "string" ? body.note.slice(0, 500) : "";
    const senderEmail = typeof body.senderEmail === "string" ? body.senderEmail.slice(0, 200) : "";

    const db = await getDb();
    const deed = await db.collection("goodDeeds").findOne({ code, isConfirmed: false }, { projection: { childId: 1 } });
    if (!deed) {
      return NextResponse.json({ error: "This deed code is invalid or has already been used." }, { status: 404 });
    }
    const child = await db.collection("children").findOne(
      { _id: new ObjectId(deed.childId) },
      { projection: { parentId: 1 } },
    );
    if (!child) return NextResponse.json({ error: "Child not found." }, { status: 404 });

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountCents,
      currency: "usd",
      receipt_email: senderEmail || undefined,
      metadata: {
        type: "DEED_TIP",
        code,
        childId: deed.childId,
        parentId: child.parentId,
        amountCents: String(amountCents),
        note,
      },
    });

    return NextResponse.json({ clientSecret: paymentIntent.client_secret });
  } catch (e) {
    await logError("POST /api/checkout/deed-tip", e);
    return NextResponse.json({ error: "Something went wrong starting your tip." }, { status: 500 });
  }
}
