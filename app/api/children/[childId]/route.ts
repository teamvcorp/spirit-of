import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getYearStart } from "@/lib/santa-logic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ childId: string }> }
) {
  const { childId } = await params;
  const yearStart = getYearStart();

  // UTC start/end of today for a reliable "today's vote" query
  const todayStart = new Date();
  todayStart.setUTCHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setUTCHours(23, 59, 59, 999);

  const [child, todayVote] = await Promise.all([
    prisma.child.findUnique({
      where: { id: childId },
      include: {
        votes: {
          where: { date: { gte: yearStart } },
          orderBy: { date: "desc" },
        },
        parent: { select: { parentPin: true } },
        wishlist: { select: { id: true } },
      },
    }),
    prisma.dailyVote.findFirst({
      where: {
        childId,
        isPositive: true,
        date: { gte: todayStart, lte: todayEnd },
      },
    }),
  ]);

  if (!child) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { parent, wishlist, ...childData } = child;
  return NextResponse.json({
    child: childData,
    hasPin: !!parent?.parentPin,
    canShopToday: !!todayVote,
    wishlistIds: wishlist.map((t) => t.id),
  });
}
