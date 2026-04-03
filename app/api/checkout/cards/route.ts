import Stripe from 'stripe';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2026-02-25.clover' });

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email ?? undefined;

  const paymentIntent = await stripe.paymentIntents.create({
    amount: 1000, // $10.00
    currency: 'usd',
    receipt_email: email,
    metadata: { type: 'PHYSICAL_CARDS', recipientEmail: email ?? '' },
  });

  return NextResponse.json({ clientSecret: paymentIntent.client_secret });
}