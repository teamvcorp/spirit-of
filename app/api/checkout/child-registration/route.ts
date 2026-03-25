import Stripe from "stripe";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
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

  const parent = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true, email: true, usedFreeChildPromo: true },
  });
  if (!parent) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Prevent two children of the same parent from sharing a name (case-insensitive).
  // Parents with children who share a legal name should use a nickname (e.g. "Emma-Bear").
  const nameConflict = await prisma.child.findFirst({
    where: { parentId: parent.id, name: { equals: trimmedName, mode: 'insensitive' } },
    select: { id: true },
  });
  if (nameConflict) {
    return NextResponse.json({
      error: `You already have a child named "${trimmedName}". If they share a name, enter a nickname instead (e.g. "${trimmedName} Jr" or "${trimmedName}-Bear").`,
    }, { status: 400 });
  }

  // One-time promo: bypass the $5 fee
  if ((promoCode ?? "").trim().toLowerCase() === "1freechild") {
    if (parent.usedFreeChildPromo) {
      return NextResponse.json({ error: "This promo code has already been used by your family." }, { status: 400 });
    }
    await prisma.$transaction([
      prisma.child.create({ data: { name: trimmedName, parentId: parent.id, magicPoints: 0 } }),
      prisma.user.update({ where: { id: parent.id }, data: { usedFreeChildPromo: true } }),
    ]);
    return NextResponse.json({ success: true });
  }

  const paymentIntent = await stripe.paymentIntents.create({
    amount: 500, // $5.00
    currency: "usd",
    receipt_email: parent.email,
    metadata: {
      type: "CHILD_REGISTRATION",
      parentId: parent.id,
      childName: trimmedName,
    },
  });

  return NextResponse.json({ clientSecret: paymentIntent.client_secret });
}
