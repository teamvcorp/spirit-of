import Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2026-02-25.clover" });

export async function POST(req: Request) {
  const { code, amountCents, message, senderEmail } = await req.json();

  if (!code || typeof code !== "string") {
    return NextResponse.json({ error: "Missing code" }, { status: 400 });
  }
  if (!amountCents || amountCents < 100) {
    return NextResponse.json({ error: "Minimum tip is $1.00" }, { status: 400 });
  }

  const parent = await prisma.user.findUnique({
    where: { referralCode: code.trim().toUpperCase() },
    select: { children: { select: { name: true }, take: 1 } },
  });

  if (!parent) {
    return NextResponse.json({ error: "Invalid code" }, { status: 404 });
  }

  const familyName = parent.children[0]?.name ? `${parent.children[0].name}'s Family` : "a Family";

  const paymentIntent = await stripe.paymentIntents.create({
    amount: amountCents,
    currency: "usd",
    receipt_email: senderEmail || undefined,
    metadata: {
      type: "MAGIC_TIP",
      code: code.trim().toUpperCase(),
      amountCents: String(amountCents),
      message: (message ?? "").slice(0, 500),
    },
  });

  return NextResponse.json({ clientSecret: paymentIntent.client_secret });
}
