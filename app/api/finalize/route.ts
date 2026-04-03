import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { getDb, ObjectId } from '@/lib/mongodb';
import { NextResponse } from 'next/server';
import { sendFinalList } from '@/lib/mail';

// Helper: resolve wishlist toy IDs to toy documents
async function resolveWishlists(db: Awaited<ReturnType<typeof getDb>>, children: any[]) {
  const allToyIds = children.flatMap((c: any) => (c.wishlist ?? []).map((id: string) => new ObjectId(id)));
  const toys = allToyIds.length > 0
    ? await db.collection("toys").find({ _id: { $in: allToyIds } }).toArray()
    : [];
  const toyMap = Object.fromEntries(toys.map(t => [t._id.toString(), t]));

  return children.map((c: any) => ({
    id: c._id.toString(),
    name: c.name,
    wishlist: (c.wishlist ?? []).map((id: string) => {
      const t = toyMap[id];
      return t ? { id: t._id.toString(), name: t.name, pointCost: t.pointCost } : null;
    }).filter(Boolean) as Array<{ id: string; name: string; pointCost: number }>,
  }));
}

// GET — returns finalize summary (wishlist totals, wallet balance, amount to charge)
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const db = await getDb();
  const user = await db.collection("users").findOne({ email: session.user.email });
  if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const childrenRaw = await db.collection("children").find({ parentId: user._id.toString() }).toArray();
  const children = await resolveWishlists(db, childrenRaw);

  const totalCostCents = children.reduce((sum, child) => {
    return sum + child.wishlist.reduce((s, toy) => s + toy.pointCost * 100, 0);
  }, 0);

  const chargeAmountCents = Math.max(0, totalCostCents - (user.walletBalance ?? 0));

  return NextResponse.json({
    children,
    walletBalance: user.walletBalance ?? 0,
    totalCostCents,
    chargeAmountCents,
    shippingAddress: user.shippingAddress ?? '',
    isChristmasLocked: user.isChristmasLocked ?? false,
  });
}

// POST — execute finalize when wallet covers everything (no Stripe needed)
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { shippingAddress } = await req.json();
  if (!shippingAddress?.trim()) {
    return NextResponse.json({ error: 'Shipping address is required' }, { status: 400 });
  }

  const db = await getDb();
  const user = await db.collection("users").findOne({ email: session.user.email });
  if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (user.isChristmasLocked) return NextResponse.json({ error: 'Already finalized' }, { status: 400 });

  const childrenRaw = await db.collection("children").find({ parentId: user._id.toString() }).toArray();
  const children = await resolveWishlists(db, childrenRaw);

  const totalCostCents = children.reduce((sum, child) => {
    return sum + child.wishlist.reduce((s, toy) => s + toy.pointCost * 100, 0);
  }, 0);

  if ((user.walletBalance ?? 0) < totalCostCents) {
    return NextResponse.json({ error: 'Insufficient wallet balance — use Stripe checkout' }, { status: 400 });
  }

  // Deduct from wallet and lock
  await db.collection("users").updateOne(
    { _id: user._id },
    {
      $set: { shippingAddress, isChristmasLocked: true, finalizedAt: new Date() },
      $inc: { walletBalance: -totalCostCents },
    }
  );

  // Send final list email — if this fails, roll back
  try {
    await sendFinalList(
      session.user.email,
      shippingAddress,
      children.map((c) => ({ name: c.name, items: c.wishlist }))
    );
  } catch (err) {
    console.error('[finalize] sendFinalList failed, rolling back:', err);
    await db.collection("users").updateOne(
      { _id: user._id },
      {
        $set: { isChristmasLocked: false, finalizedAt: null },
        $inc: { walletBalance: totalCostCents },
      }
    );
    return NextResponse.json(
      { error: 'Your list could not be sent right now. Your account has been unlocked — please try again.' },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
