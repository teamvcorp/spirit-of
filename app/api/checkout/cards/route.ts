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

  const session = await stripe.checkout.sessions.create({
    line_items: [{
      price_data: {
        currency: 'usd',
        product_data: { 
          name: 'Pack of 20 Printed Magic Referral Cards',
          description: 'High-quality gold-foil cards delivered to your door.'
        },
        unit_amount: 1000, // $10.00
      },
      quantity: 1,
    }],
    mode: 'payment',
    success_url: `${process.env.NEXT_PUBLIC_DOMAIN}/parent?success=true`,
    cancel_url: `${process.env.NEXT_PUBLIC_DOMAIN}/parent?canceled=true`,
    customer_email: email ?? undefined,
    metadata: { userId: userId ?? '', type: 'PHYSICAL_CARDS' }
  });

  return NextResponse.json({ url: session.url });
}