import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { sendFinalList } from '@/lib/mail';

// GET — returns finalize summary (wishlist totals, wallet balance, amount to charge)
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: {
      walletBalance: true,
      shippingAddress: true,
      isChristmasLocked: true,
      children: {
        select: {
          id: true,
          name: true,
          wishlist: { select: { id: true, name: true, pointCost: true } },
        },
      },
    },
  });

  if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const totalCostCents = user.children.reduce((sum, child) => {
    return sum + child.wishlist.reduce((s, toy) => s + toy.pointCost * 100, 0);
  }, 0);

  const chargeAmountCents = Math.max(0, totalCostCents - user.walletBalance);

  return NextResponse.json({
    children: user.children,
    walletBalance: user.walletBalance,
    totalCostCents,
    chargeAmountCents,
    shippingAddress: user.shippingAddress ?? '',
    isChristmasLocked: user.isChristmasLocked,
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

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: {
      children: {
        include: { wishlist: { select: { id: true, name: true, pointCost: true } } },
      },
    },
  });

  if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (user.isChristmasLocked) return NextResponse.json({ error: 'Already finalized' }, { status: 400 });

  const totalCostCents = user.children.reduce((sum, child) => {
    return sum + child.wishlist.reduce((s, toy) => s + toy.pointCost * 100, 0);
  }, 0);

  if (user.walletBalance < totalCostCents) {
    return NextResponse.json({ error: 'Insufficient wallet balance — use Stripe checkout' }, { status: 400 });
  }

  // Deduct from wallet and lock
  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: {
        shippingAddress,
        isChristmasLocked: true,
        finalizedAt: new Date(),
        walletBalance: { decrement: totalCostCents },
      },
    }),
  ]);

  // Send final list email
  await sendFinalList(
    session.user.email,
    shippingAddress,
    user.children.map((c) => ({ name: c.name, items: c.wishlist }))
  );

  return NextResponse.json({ success: true });
}
