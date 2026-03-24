import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { childId, pin } = await req.json();

  if (!childId || !pin) {
    return NextResponse.json({ success: false });
  }

  const child = await prisma.child.findUnique({
    where: { id: childId },
    include: { parent: { select: { parentPin: true } } },
  });

  if (!child?.parent?.parentPin) {
    return NextResponse.json({ success: false, reason: "no_pin" });
  }

  return NextResponse.json({ success: child.parent.parentPin === pin });
}
