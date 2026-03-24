import Stripe from 'stripe';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2026-02-25.clover' });

const ALLOWED_AMOUNTS = [1000, 2500, 5000, 10000]; // cents: $10, $25, $50, $100

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

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const paymentIntent = await stripe.paymentIntents.create({
    amount: amountInCents,
    currency: 'usd',
    receipt_email: session.user.email,
    metadata: { type: 'WALLET_TOPUP', userId: user.id, amountInCents: String(amountInCents) },
  });

  return NextResponse.json({ clientSecret: paymentIntent.client_secret });
}
