import Stripe from "stripe";
import { NextResponse } from "next/server";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { logError } from "@/lib/log-error";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2026-02-25.clover" });

const MAX_CENTS = 1_000_000; // $10,000 sanity cap

export async function POST(req: Request) {
  try {
    const limit = await rateLimit(`donate:${clientIp(req)}`, 20, 10 * 60);
    if (!limit.allowed) {
      return NextResponse.json({ error: "Too many requests — please wait a moment." }, { status: 429 });
    }

    let body: { amountCents?: unknown; message?: unknown; senderEmail?: unknown };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid request." }, { status: 400 });
    }

    const amountCents = Math.round(Number(body.amountCents));
    if (!Number.isInteger(amountCents) || amountCents < 100 || amountCents > MAX_CENTS) {
      return NextResponse.json({ error: "Enter an amount between $1 and $10,000." }, { status: 400 });
    }
    const message = typeof body.message === "string" ? body.message.slice(0, 500) : "";
    const senderEmail = typeof body.senderEmail === "string" ? body.senderEmail.slice(0, 200) : "";

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountCents,
      currency: "usd",
      receipt_email: senderEmail || undefined,
      metadata: { type: "MAGIC_GENERAL", message },
    });

    return NextResponse.json({ clientSecret: paymentIntent.client_secret });
  } catch (e) {
    await logError("POST /api/checkout/magic-general", e);
    return NextResponse.json({ error: "Something went wrong starting your donation." }, { status: 500 });
  }
}
