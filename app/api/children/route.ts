import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getDb } from "@/lib/mongodb";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const yearStart = new Date();
  yearStart.setMonth(11); yearStart.setDate(26);
  if (new Date() < yearStart) yearStart.setFullYear(yearStart.getFullYear() - 1);
  yearStart.setHours(0, 0, 0, 0);

  const db = await getDb();
  const user = await db.collection("users").findOne({ email: session.user.email });

  if (!user) {
    return NextResponse.json({ children: [], hasPin: false, walletBalance: 0, isChristmasLocked: false, shippingAddress: '', referralCode: null });
  }

  const childrenRaw = await db.collection("children")
    .find({ parentId: user._id.toString() })
    .sort({ name: 1 })
    .toArray();

  const children = await Promise.all(childrenRaw.map(async (c) => {
    const votes = await db.collection("dailyVotes")
      .find({ childId: c._id.toString(), date: { $gte: yearStart } })
      .sort({ date: -1 })
      .toArray();
    return {
      id: c._id.toString(),
      name: c.name,
      parentId: c.parentId,
      magicPoints: c.magicPoints,
      lastReset: c.lastReset,
      votes: votes.map(v => ({ id: v._id.toString(), date: v.date, isPositive: v.isPositive, childId: v.childId })),
    };
  }));

  return NextResponse.json({
    children,
    hasPin: !!user.parentPin,
    walletBalance: user.walletBalance ?? 0,
    isChristmasLocked: user.isChristmasLocked ?? false,
    shippingAddress: user.shippingAddress ?? '',
    referralCode: user.referralCode ?? null,
  });
}
