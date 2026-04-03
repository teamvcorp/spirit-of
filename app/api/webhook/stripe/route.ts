import Stripe from 'stripe';
import { sendOrderConfirmation, sendFinalList, sendMagicTipNotification } from "@/lib/mail";
import { getDb, ObjectId } from "@/lib/mongodb";

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
    const db = await getDb();

    // Idempotency guard
    try {
      await db.collection("processedEvents").insertOne({ _id: pi.id as any });
    } catch {
      return new Response('Already processed', { status: 200 });
    }

    if (meta.type === 'PHYSICAL_CARDS') {
      const email = meta.recipientEmail || pi.receipt_email;
      if (email) await sendOrderConfirmation(email, '20x Physical Magic Cards');
    }

    if (meta.type === 'WALLET_TOPUP') {
      const userId = meta.userId;
      const amountInCents = pi.amount;
      if (userId && amountInCents > 0) {
        await db.collection("users").updateOne(
          { _id: new ObjectId(userId) },
          { $inc: { walletBalance: amountInCents } }
        );
      }
    }

    if (meta.type === 'CHRISTMAS_FINALIZE') {
      const userId = meta.userId;
      const chargeAmountCents = parseInt(meta.chargeAmountCents ?? '0', 10);

      const user = await db.collection("users").findOne({ _id: new ObjectId(userId) });

      if (user && !user.isChristmasLocked) {
        const children = await db.collection("children").find({ parentId: userId }).toArray();
        const allToyIds = children.flatMap(c => (c.wishlist ?? []).map((id: string) => new ObjectId(id)));
        const toys = allToyIds.length > 0
          ? await db.collection("toys").find({ _id: { $in: allToyIds } }).toArray()
          : [];
        const toyMap = Object.fromEntries(toys.map(t => [t._id.toString(), t]));

        const totalCostCents = children.reduce((sum, child) =>
          sum + (child.wishlist ?? []).reduce((s: number, toyId: string) => s + ((toyMap[toyId]?.pointCost ?? 0) * 100), 0), 0);
        const walletDeduction = Math.max(0, totalCostCents - chargeAmountCents);

        await db.collection("users").updateOne(
          { _id: new ObjectId(userId) },
          {
            $set: { isChristmasLocked: true, finalizedAt: new Date() },
            $inc: { walletBalance: -walletDeduction },
          }
        );

        const recipientEmail = meta.recipientEmail || pi.receipt_email;
        if (user.shippingAddress && recipientEmail) {
          try {
            const childrenWithItems = children.map(c => ({
              name: c.name,
              items: (c.wishlist ?? []).map((id: string) => toyMap[id]).filter(Boolean).map((t: any) => ({ id: t._id.toString(), name: t.name, pointCost: t.pointCost })),
            }));
            await sendFinalList(recipientEmail, user.shippingAddress, childrenWithItems);
          } catch (err) {
            console.error('[webhook] CHRISTMAS_FINALIZE sendFinalList failed for', userId, err);
          }
        }
      }
    }

    if (meta.type === 'MAGIC_TIP') {
      const referralCode = meta.code;
      const amountCents = parseInt(meta.amountCents ?? '0', 10);
      const message = meta.message ?? '';

      if (referralCode && amountCents > 0) {
        const parent = await db.collection("users").findOne({ referralCode });

        if (parent) {
          await db.collection("users").updateOne(
            { _id: parent._id },
            { $inc: { walletBalance: amountCents } }
          );
          const firstChild = await db.collection("children").findOne(
            { parentId: parent._id.toString() },
            { sort: { _id: 1 }, projection: { name: 1 } }
          );
          const firstName = firstChild?.name ?? 'your child';
          await sendMagicTipNotification(parent.email, firstName, amountCents, message);
        }
      }
    }

    if (meta.type === 'CHILD_REGISTRATION') {
      const { parentId, childName } = meta;
      if (parentId && childName) {
        const alreadyExists = await db.collection("children").findOne({
          parentId,
          name: { $regex: new RegExp(`^${childName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
        });
        if (!alreadyExists) {
          await db.collection("children").insertOne({
            name: childName,
            parentId,
            magicPoints: 0,
            wishlist: [],
            lastReset: new Date(),
          });
        }
        const parent = await db.collection("users").findOne({ _id: new ObjectId(parentId) });
        if (parent && !parent.referralCode) {
          const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
          const seg = () => Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
          const code = `FAM-${seg()}-${seg()}`;
          await db.collection("users").updateOne(
            { _id: new ObjectId(parentId) },
            { $set: { referralCode: code } }
          );
        }
      }
    }
  }

  return new Response('Success', { status: 200 });
}