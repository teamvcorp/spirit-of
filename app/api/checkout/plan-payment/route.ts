import Stripe from "stripe";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getDb } from "@/lib/mongodb";
import { summarizePlan, type ChristmasPlan } from "@/lib/christmas-plan";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2026-02-25.clover" });

/**
 * Create a PaymentIntent for one Christmas-plan installment (or any amount up
 * to what the parent still owes). On success the webhook credits the wallet and
 * advances the plan's parentPaidCents.
 */
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { amountCents?: number | string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const db = await getDb();
  const user = await db.collection("users").findOne({ email: session.user.email });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const plan = user.christmasPlan as ChristmasPlan | undefined;
  if (!plan) return NextResponse.json({ error: "No Christmas plan set up yet." }, { status: 400 });

  const summary = summarizePlan(plan);
  // Default to the computed installment; allow a custom amount but never more than owed.
  const requested = body.amountCents != null ? Math.round(Number(body.amountCents)) : summary.installmentCents;
  if (!Number.isFinite(requested) || requested < 100) {
    return NextResponse.json({ error: "Minimum payment is $1.00." }, { status: 400 });
  }
  if (summary.remainingCents <= 0) {
    return NextResponse.json({ error: "Your budget is already fully funded." }, { status: 400 });
  }
  const amountInCents = Math.min(requested, summary.remainingCents);

  const paymentIntent = await stripe.paymentIntents.create({
    amount: amountInCents,
    currency: "usd",
    receipt_email: session.user.email,
    metadata: { type: "CHRISTMAS_PLAN_PAYMENT", userId: user._id.toString(), amountInCents: String(amountInCents) },
  });

  return NextResponse.json({ clientSecret: paymentIntent.client_secret, amountInCents });
}
