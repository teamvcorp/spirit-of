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

  const checkoutSession = await stripe.checkout.sessions.create({
    line_items: [{
      price_data: {
        currency: 'usd',
        product_data: {
          name: 'Magic Points Wallet Top-Up',
          description: `Add $${amountInCents / 100} of Magic Points to your wallet`,
        },
        unit_amount: amountInCents,
      },
      quantity: 1,
    }],
    mode: 'payment',
    success_url: `${process.env.NEXT_PUBLIC_DOMAIN}/parent?wallet=funded`,
    cancel_url: `${process.env.NEXT_PUBLIC_DOMAIN}/parent?wallet=canceled`,
    customer_email: session.user.email,
    metadata: { userId: user.id, type: 'WALLET_TOPUP', amountInCents: String(amountInCents) },
  });

  return NextResponse.json({ url: checkoutSession.url });
}
