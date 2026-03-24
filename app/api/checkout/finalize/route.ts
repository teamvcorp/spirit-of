import Stripe from 'stripe';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2026-02-25.clover' });

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { shippingAddress } = await req.json();

  if (!shippingAddress?.trim()) {
    return NextResponse.json({ error: 'Shipping address is required' }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: { children: { include: { wishlist: { select: { pointCost: true } } } } },
  });
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });
  if (user.isChristmasLocked) return NextResponse.json({ error: 'Already finalized' }, { status: 400 });

  // Compute amount server-side — never trust the client
  const totalCostCents = user.children.reduce((sum, child) =>
    sum + child.wishlist.reduce((s, toy) => s + toy.pointCost * 100, 0), 0);
  const chargeAmountCents = Math.max(0, totalCostCents - user.walletBalance);

  if (chargeAmountCents < 50) {
    return NextResponse.json({ error: 'Nothing to charge — use wallet-only finalize' }, { status: 400 });
  }

  // Save address so the webhook can use it
  await prisma.user.update({ where: { id: user.id }, data: { shippingAddress } });

  const paymentIntent = await stripe.paymentIntents.create({
    amount: chargeAmountCents,
    currency: 'usd',
    receipt_email: user.email,
    metadata: {
      type: 'CHRISTMAS_FINALIZE',
      userId: user.id,
      chargeAmountCents: String(chargeAmountCents),
      recipientEmail: user.email,
    },
  });

  return NextResponse.json({ clientSecret: paymentIntent.client_secret });
}
