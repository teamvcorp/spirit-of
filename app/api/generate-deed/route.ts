import { prisma } from "@/lib/prisma";
import { generateMagicCode } from "@/lib/utils"; // That function we wrote earlier
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { childId } = await req.json();
  const code = generateMagicCode();

  const deed = await prisma.goodDeed.create({
    data: {
      code: code,
      childId: childId,
      isConfirmed: false,
    }
  });

  return NextResponse.json({ code: deed.code });
}