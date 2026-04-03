import Stripe from 'stripe';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { getDb } from '@/lib/mongodb';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2026-02-25.clover' });

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email ?? undefined;

  let shippingAddress = '';
  try {
    const body = await req.json();
    shippingAddress = body.shippingAddress?.trim() ?? '';
  } catch { /* ok */ }

  if (!shippingAddress) {
    return NextResponse.json({ error: 'Shipping address is required' }, { status: 400 });
  }

  // Save address to user profile
  if (email) {
    const db = await getDb();
    await db.collection('users').updateOne(
      { email },
      { $set: { shippingAddress } }
    );
  }

  const paymentIntent = await stripe.paymentIntents.create({
    amount: 1000, // $10.00
    currency: 'usd',
    receipt_email: email,
    metadata: { type: 'PHYSICAL_CARDS', recipientEmail: email ?? '' },
  });

  return NextResponse.json({ clientSecret: paymentIntent.client_secret });
}