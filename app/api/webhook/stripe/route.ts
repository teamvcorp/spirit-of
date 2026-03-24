import Stripe from 'stripe';
import { sendOrderConfirmation, sendFinalList, sendMagicTipNotification } from "@/lib/mail";
import { prisma } from "@/lib/prisma";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2026-02-25.clover' });

export async function POST(req: Request) {
  const body = await req.text();
  const signature = req.headers.get('stripe-signature')!;
  
  let event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err) {
    return new Response(`Webhook Error`, { status: 400 });
  }

  if (event.type === 'payment_intent.succeeded') {
    const pi = event.data.object as Stripe.PaymentIntent;
    const meta = pi.metadata ?? {};

    if (meta.type === 'PHYSICAL_CARDS') {
      const email = meta.recipientEmail || pi.receipt_email;
      if (email) await sendOrderConfirmation(email, '20x Physical Magic Cards');
    }

    if (meta.type === 'WALLET_TOPUP') {
      const userId = meta.userId;
      // Use pi.amount (authoritative Stripe amount) not metadata to prevent tampering
      const amountInCents = pi.amount;
      if (userId && amountInCents > 0) {
        await prisma.user.update({
          where: { id: userId },
          data: { walletBalance: { increment: amountInCents } },
        });
      }
    }

    if (meta.type === 'CHRISTMAS_FINALIZE') {
      const userId = meta.userId;
      const chargeAmountCents = parseInt(meta.chargeAmountCents ?? '0', 10);

      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          children: {
            include: { wishlist: { select: { id: true, name: true, pointCost: true } } },
          },
        },
      });

      if (user && !user.isChristmasLocked) {
        const totalCostCents = user.children.reduce((sum, child) => {
          return sum + child.wishlist.reduce((s, toy) => s + toy.pointCost * 100, 0);
        }, 0);
        const walletDeduction = Math.max(0, totalCostCents - chargeAmountCents);

        await prisma.user.update({
          where: { id: userId },
          data: {
            isChristmasLocked: true,
            finalizedAt: new Date(),
            walletBalance: { decrement: walletDeduction },
          },
        });

        const recipientEmail = meta.recipientEmail || pi.receipt_email;
        if (user.shippingAddress && recipientEmail) {
          await sendFinalList(
            recipientEmail,
            user.shippingAddress,
            user.children.map((c) => ({ name: c.name, items: c.wishlist }))
          );
        }
      }
    }

    if (meta.type === 'MAGIC_TIP') {
      const referralCode = meta.code;
      const amountCents = parseInt(meta.amountCents ?? '0', 10);
      const message = meta.message ?? '';

      if (referralCode && amountCents > 0) {
        const parent = await prisma.user.findUnique({
          where: { referralCode },
          select: { id: true, email: true, children: { select: { name: true }, take: 1 } },
        });

        if (parent) {
          await prisma.user.update({
            where: { id: parent.id },
            data: { walletBalance: { increment: amountCents } },
          });
          const firstName = parent.children[0]?.name ?? 'your child';
          await sendMagicTipNotification(parent.email, firstName, amountCents, message);
        }
      }
    }

    if (meta.type === 'CHILD_REGISTRATION') {
      const { parentId, childName } = meta;
      if (parentId && childName) {
        await prisma.child.create({
          data: { name: childName, parentId, magicPoints: 0 },
        });
        const parent = await prisma.user.findUnique({
          where: { id: parentId },
          select: { referralCode: true },
        });
        if (!parent?.referralCode) {
          const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
          const seg = () => Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
          const code = `FAM-${seg()}-${seg()}`;
          await prisma.user.update({
            where: { id: parentId },
            data: { referralCode: code },
          });
        }
      }
    }
  }

  return new Response('Success', { status: 200 });
}