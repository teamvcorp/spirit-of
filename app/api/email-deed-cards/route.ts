import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { sendFamilyReferralCards } from "@/lib/mail";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { referralCode } = await req.json();

  const parent = await prisma.user.findUnique({
    where: { referralCode },
    include: { children: { take: 1, orderBy: { id: "asc" } } },
  });

  if (!parent || parent.email !== session.user.email) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const familyName = parent.children[0]?.name
    ? `${parent.children[0].name}'s`
    : "Your";

  const domain = process.env.NEXT_PUBLIC_DOMAIN ?? `https://${process.env.VERCEL_URL ?? "localhost:3000"}`;
  await sendFamilyReferralCards(parent.email, familyName, referralCode, domain);

  return NextResponse.json({ success: true });
}
