import Stripe from "stripe";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getDb } from "@/lib/mongodb";
import { summarizePlan, type ChristmasPlan } from "@/lib/christmas-plan";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2026-02-25.clover" });

/**
 * Make a Christmas-plan payment, wallet-first.
 *
 * The wallet is the source of truth for funds. We first apply any wallet money
 * that hasn't already been counted toward the budget ("recognizable" = wallet
 * balance minus what's already attributed to the plan). That money is NOT
 * drained from the wallet — it stays there to buy the gifts at finalize; we just
 * recognize it as a contribution toward the budget. Only the remaining shortfall
 * is charged to the card via Stripe (which then tops up the wallet too).
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
  if (summary.remainingCents <= 0) {
    return NextResponse.json({ error: "Your budget is already fully funded." }, { status: 400 });
  }

  const requested = body.amountCents != null ? Math.round(Number(body.amountCents)) : summary.installmentCents;
  if (!Number.isFinite(requested) || requested < 1) {
    return NextResponse.json({ error: "Enter a valid amount." }, { status: 400 });
  }
  const amount = Math.min(requested, summary.remainingCents);

  // Wallet money not yet attributed to the budget.
  const walletBalance = user.walletBalance ?? 0;
  const recognizable = Math.max(0, walletBalance - summary.parentPaidCents - summary.communityCents);
  const fromWallet = Math.min(amount, recognizable);
  const fromStripe = amount - fromWallet;

  // Apply the wallet-recognized portion immediately (no card, no wallet drain).
  if (fromWallet > 0) {
    await db.collection("users").updateOne(
      { _id: user._id, "christmasPlan.year": { $exists: true } },
      { $inc: { "christmasPlan.parentPaidCents": fromWallet } },
    );
  }

  if (fromStripe <= 0) {
    return NextResponse.json({ done: true, fromWalletCents: fromWallet, fromStripeCents: 0 });
  }

  // Charge the card for the shortfall; the webhook credits wallet + parentPaidCents.
  const paymentIntent = await stripe.paymentIntents.create({
    amount: fromStripe,
    currency: "usd",
    receipt_email: session.user.email,
    metadata: { type: "CHRISTMAS_PLAN_PAYMENT", userId: user._id.toString(), amountInCents: String(fromStripe) },
  });

  return NextResponse.json({
    done: false,
    clientSecret: paymentIntent.client_secret,
    fromWalletCents: fromWallet,
    fromStripeCents: fromStripe,
  });
}
