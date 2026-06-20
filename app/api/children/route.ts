import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getDb } from "@/lib/mongodb";
import { NextResponse } from "next/server";
import { normalizeWishlistItem } from "@/lib/utils";
import { getChristmasYear, summarizePlan, type ChristmasPlan } from "@/lib/christmas-plan";

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
    return NextResponse.json({ children: [], hasPin: false, walletBalance: 0, isChristmasLocked: false, shippingAddress: '', referralCode: null, christmasPlan: null });
  }

  const childrenRaw = await db.collection("children")
    .find({ parentId: user._id.toString() })
    .sort({ name: 1 })
    .toArray();

  // Fire-and-forget: auto-lock wishlist items that have been on the list for 30+ days
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  db.collection("children").updateMany(
    {},
    { $set: { "wishlist.$[elem].lockedIn": true, "wishlist.$[elem].lockedAt": new Date(), "wishlist.$[elem].lockReason": "30day" } },
    { arrayFilters: [{ "elem.addedAt": { $lte: thirtyDaysAgo }, "elem.lockedIn": { $ne: true }, "elem.toyId": { $exists: true } }] }
  ).catch((e: unknown) => console.error("[auto-lock]", e));

  const children = await Promise.all(childrenRaw.map(async (c) => {
    const votes = await db.collection("dailyVotes")
      .find({ childId: c._id.toString(), date: { $gte: yearStart } })
      .sort({ date: -1 })
      .toArray();
    const wishlistItems = (c.wishlist ?? []).map(normalizeWishlistItem);
    return {
      id: c._id.toString(),
      name: c.name,
      parentId: c.parentId,
      magicPoints: c.magicPoints,
      lastReset: c.lastReset,
      votes: votes.map(v => ({ id: v._id.toString(), date: v.date, isPositive: v.isPositive, childId: v.childId })),
      wishlistItems,
    };
  }));

  const christmasYear = getChristmasYear();
  const rawPlan = user.christmasPlan as ChristmasPlan | undefined;
  const christmasPlan = rawPlan && rawPlan.year === christmasYear ? summarizePlan(rawPlan) : null;

  return NextResponse.json({
    children,
    hasPin: !!user.parentPin,
    walletBalance: user.walletBalance ?? 0,
    isChristmasLocked: user.isChristmasLocked ?? false,
    shippingAddress: user.shippingAddress ?? '',
    referralCode: user.referralCode ?? null,
    christmasPlan,
  });
}
