import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";

export async function DELETE(
  _: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { userId } = await params;

  const children = await prisma.child.findMany({
    where: { parentId: userId },
    select: { id: true },
  });
  const childIds = children.map((c) => c.id);

  await prisma.$transaction([
    prisma.dailyVote.deleteMany({ where: { childId: { in: childIds } } }),
    prisma.goodDeed.deleteMany({ where: { childId: { in: childIds } } }),
    prisma.child.deleteMany({ where: { parentId: userId } }),
    prisma.user.delete({ where: { id: userId } }),
  ]);

  return NextResponse.json({ ok: true });
}

export async function PATCH(
  _: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { userId } = await params;

  const tempPassword = "Santa-" + randomBytes(4).toString("hex").toUpperCase();
  const hashed = await bcrypt.hash(tempPassword, 12);

  await prisma.user.update({
    where: { id: userId },
    data: { password: hashed },
  });

  return NextResponse.json({ tempPassword });
}
