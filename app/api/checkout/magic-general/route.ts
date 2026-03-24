import Stripe from "stripe";
import { NextResponse } from "next/server";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2026-02-25.clover" });

export async function POST(req: Request) {
  const { amountCents, message, senderEmail } = await req.json();

  if (!amountCents || amountCents < 100) {
    return NextResponse.json({ error: "Minimum donation is $1.00" }, { status: 400 });
  }

  const paymentIntent = await stripe.paymentIntents.create({
    amount: amountCents,
    currency: "usd",
    receipt_email: senderEmail || undefined,
    metadata: {
      type: "MAGIC_GENERAL",
      message: (message ?? "").slice(0, 500),
    },
  });

  return NextResponse.json({ clientSecret: paymentIntent.client_secret });
}
