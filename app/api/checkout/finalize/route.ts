import Stripe from 'stripe';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { getDb, ObjectId } from '@/lib/mongodb';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2026-02-25.clover' });

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { shippingAddress } = await req.json();

  if (!shippingAddress?.trim()) {
    return NextResponse.json({ error: 'Shipping address is required' }, { status: 400 });
  }

  const db = await getDb();
  const user = await db.collection("users").findOne({ email: session.user.email });
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });
  if (user.isChristmasLocked) return NextResponse.json({ error: 'Already finalized' }, { status: 400 });

  const children = await db.collection("children").find({ parentId: user._id.toString() }).toArray();
  const toyIds = children.flatMap(c => (c.wishlist ?? []).map((id: string) => new ObjectId(id)));
  const toys = toyIds.length > 0
    ? await db.collection("toys").find({ _id: { $in: toyIds } }).toArray()
    : [];
  const toyMap = Object.fromEntries(toys.map(t => [t._id.toString(), t]));

  const totalCostCents = children.reduce((sum, child) =>
    sum + (child.wishlist ?? []).reduce((s: number, toyId: string) => s + ((toyMap[toyId]?.pointCost ?? 0) * 100), 0), 0);
  const chargeAmountCents = Math.max(0, totalCostCents - (user.walletBalance ?? 0));

  if (chargeAmountCents < 50) {
    return NextResponse.json({ error: 'Nothing to charge — use wallet-only finalize' }, { status: 400 });
  }

  await db.collection("users").updateOne({ _id: user._id }, { $set: { shippingAddress } });

  const paymentIntent = await stripe.paymentIntents.create({
    amount: chargeAmountCents,
    currency: 'usd',
    receipt_email: user.email,
    metadata: {
      type: 'CHRISTMAS_FINALIZE',
      userId: user._id.toString(),
      chargeAmountCents: String(chargeAmountCents),
      recipientEmail: user.email,
    },
  });

  return NextResponse.json({ clientSecret: paymentIntent.client_secret });
}
