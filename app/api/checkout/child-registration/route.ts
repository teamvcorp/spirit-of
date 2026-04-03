import Stripe from "stripe";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getDb } from "@/lib/mongodb";
import { NextResponse } from "next/server";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2026-02-25.clover" });

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { childName, promoCode } = await req.json();
  const trimmedName = (childName ?? "").trim();
  if (!trimmedName) {
    return NextResponse.json({ error: "Child name is required" }, { status: 400 });
  }

  const db = await getDb();
  const parent = await db.collection("users").findOne({ email: session.user.email });
  if (!parent) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const nameConflict = await db.collection("children").findOne({
    parentId: parent._id.toString(),
    name: { $regex: new RegExp(`^${trimmedName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
  });
  if (nameConflict) {
    return NextResponse.json({
      error: `You already have a child named "${trimmedName}". If they share a name, enter a nickname instead (e.g. "${trimmedName} Jr" or "${trimmedName}-Bear").`,
    }, { status: 400 });
  }

  if ((promoCode ?? "").trim().toLowerCase() === "1freechild") {
    if (parent.usedFreeChildPromo) {
      return NextResponse.json({ error: "This promo code has already been used by your family." }, { status: 400 });
    }
    await db.collection("children").insertOne({
      name: trimmedName,
      parentId: parent._id.toString(),
      magicPoints: 0,
      wishlist: [],
      lastReset: new Date(),
    });
    // Generate referral code if first child
    if (!parent.referralCode) {
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      const seg = () => Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
      const code = `FAM-${seg()}-${seg()}`;
      await db.collection("users").updateOne(
        { _id: parent._id },
        { $set: { usedFreeChildPromo: true, referralCode: code } }
      );
    } else {
      await db.collection("users").updateOne(
        { _id: parent._id },
        { $set: { usedFreeChildPromo: true } }
      );
    }
    return NextResponse.json({ success: true });
  }

  const paymentIntent = await stripe.paymentIntents.create({
    amount: 500,
    currency: "usd",
    receipt_email: parent.email,
    metadata: {
      type: "CHILD_REGISTRATION",
      parentId: parent._id.toString(),
      childName: trimmedName,
    },
  });

  return NextResponse.json({ clientSecret: paymentIntent.client_secret });
}
