import Stripe from 'stripe';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { getDb } from '@/lib/mongodb';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2026-02-25.clover' });

const ALLOWED_AMOUNTS = [1000, 2500, 5000, 10000];

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let amountInCents: number;
  try {
    const body = await req.json();
    amountInCents = Number(body.amount);
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  if (!ALLOWED_AMOUNTS.includes(amountInCents)) {
    return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
  }

  const db = await getDb();
  const user = await db.collection("users").findOne({ email: session.user.email });
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const paymentIntent = await stripe.paymentIntents.create({
    amount: amountInCents,
    currency: 'usd',
    receipt_email: session.user.email,
    metadata: { type: 'WALLET_TOPUP', userId: user._id.toString(), amountInCents: String(amountInCents) },
  });

  return NextResponse.json({ clientSecret: paymentIntent.client_secret });
}
