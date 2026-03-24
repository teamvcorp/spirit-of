import { prisma } from "@/lib/prisma";
import { generateMagicCode } from "@/lib/utils";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { childId, count = 8 } = await req.json();

  const child = await prisma.child.findFirst({
    where: {
      id: childId,
      parent: { email: session.user.email },
    },
  });

  if (!child) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const safeCount = Math.min(Math.max(1, count), 20);
  const codes: string[] = [];

  for (let i = 0; i < safeCount; i++) {
    const code = generateMagicCode();
    await prisma.goodDeed.create({
      data: { code, childId: child.id, isConfirmed: false },
    });
    codes.push(code);
  }

  return NextResponse.json({ codes, childName: child.name });
}
