import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code")?.trim().toUpperCase();

  if (!code) {
    return NextResponse.json({ found: false, error: "No code provided" }, { status: 400 });
  }

  const parent = await prisma.user.findUnique({
    where: { referralCode: code },
    select: {
      children: { select: { name: true }, orderBy: { id: "asc" }, take: 1 },
    },
  });

  if (!parent) {
    return NextResponse.json({ found: false, error: "Code not found" }, { status: 404 });
  }

  const familyName = parent.children[0]?.name
    ? `${parent.children[0].name}'s family`
    : "this family";

  return NextResponse.json({ found: true, familyName, code });
}
