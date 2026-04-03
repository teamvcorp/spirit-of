import { getDb, ObjectId } from "@/lib/mongodb";
import { NextResponse } from "next/server";
import { getYearStart } from "@/lib/santa-logic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ childId: string }> }
) {
  const { childId } = await params;
  const yearStart = getYearStart();

  const todayStart = new Date();
  todayStart.setUTCHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setUTCHours(23, 59, 59, 999);

  const db = await getDb();

  const [child, todayVote] = await Promise.all([
    db.collection("children").findOne({ _id: new ObjectId(childId) }),
    db.collection("dailyVotes").findOne({
      childId,
      isPositive: true,
      date: { $gte: todayStart, $lte: todayEnd },
    }),
  ]);

  if (!child) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const votes = await db.collection("dailyVotes")
    .find({ childId, date: { $gte: yearStart } })
    .sort({ date: -1 })
    .toArray();

  const parent = await db.collection("users").findOne(
    { _id: new ObjectId(child.parentId) },
    { projection: { parentPin: 1, isChristmasLocked: 1 } }
  );

  return NextResponse.json({
    child: {
      id: child._id.toString(),
      name: child.name,
      parentId: child.parentId,
      magicPoints: child.magicPoints,
      lastReset: child.lastReset,
      votes: votes.map(v => ({ id: v._id.toString(), date: v.date, isPositive: v.isPositive, childId: v.childId })),
    },
    hasPin: !!parent?.parentPin,
    canShopToday: !!todayVote,
    wishlistIds: child.wishlist ?? [],
    isChristmasLocked: parent?.isChristmasLocked ?? false,
  });
}
