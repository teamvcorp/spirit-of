import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
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

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: {
      children: {
        include: {
          votes: {
            where: { date: { gte: yearStart } },
            orderBy: { date: "desc" },
          },
        },
        orderBy: { name: "asc" },
      },
    },
  });

  return NextResponse.json({
    children: user?.children ?? [],
    hasPin: !!user?.parentPin,
  });
}
