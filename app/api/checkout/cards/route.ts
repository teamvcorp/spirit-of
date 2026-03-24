import Stripe from 'stripe';
import { NextResponse } from 'next/server';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2026-02-25.clover' });

export async function POST(req: Request) {
  let userId: string | undefined;
  let email: string | undefined;
  try {
    const body = await req.json();
    userId = body.userId;
    email = body.email;
  } catch {
    // body is optional
  }

  const paymentIntent = await stripe.paymentIntents.create({
    amount: 1000, // $10.00
    currency: 'usd',
    receipt_email: email ?? undefined,
    metadata: { type: 'PHYSICAL_CARDS', userId: userId ?? '', recipientEmail: email ?? '' },
  });

  return NextResponse.json({ clientSecret: paymentIntent.client_secret });
}