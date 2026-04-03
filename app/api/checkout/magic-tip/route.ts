import Stripe from "stripe";
import { getDb } from "@/lib/mongodb";
import { NextResponse } from "next/server";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2026-02-25.clover" });

export async function POST(req: Request) {
  const { code, amountCents, message, senderEmail } = await req.json();

  if (!code || typeof code !== "string") {
    return NextResponse.json({ error: "Missing code" }, { status: 400 });
  }
  if (!amountCents || amountCents < 100) {
    return NextResponse.json({ error: "Minimum tip is $1.00" }, { status: 400 });
  }

  const db = await getDb();
  const parent = await db.collection("users").findOne({ referralCode: code.trim().toUpperCase() });

  if (!parent) {
    return NextResponse.json({ error: "Invalid code" }, { status: 404 });
  }

  const firstChild = await db.collection("children").findOne(
    { parentId: parent._id.toString() },
    { sort: { _id: 1 }, projection: { name: 1 } }
  );

  const familyName = firstChild?.name ? `${firstChild.name}'s Family` : "a Family";

  const paymentIntent = await stripe.paymentIntents.create({
    amount: amountCents,
    currency: "usd",
    receipt_email: senderEmail || undefined,
    metadata: {
      type: "MAGIC_TIP",
      code: code.trim().toUpperCase(),
      amountCents: String(amountCents),
      message: (message ?? "").slice(0, 500),
    },
  });

  return NextResponse.json({ clientSecret: paymentIntent.client_secret });
}
