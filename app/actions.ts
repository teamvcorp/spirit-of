"use server"
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function submitDailyVote(childId: string, isPositive: boolean) {
  // Normalize to midnight UTC so one-per-day is enforced correctly
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  await prisma.dailyVote.upsert({
    where: { childId_date: { childId, date: today } },
    update: { isPositive },
    create: { childId, isPositive, date: today },
  });
}

export async function confirmDeed(formData: FormData) {
  const code = formData.get('code') as string;
  const note = (formData.get('note') as string) ?? '';

  if (!code) return;

  const deed = await prisma.goodDeed.findUnique({
    where: { code },
    include: { child: { include: { parent: true } } },
  });

  if (!deed || deed.isConfirmed) return;

  await prisma.$transaction([
    prisma.goodDeed.update({
      where: { code },
      data: { isConfirmed: true, neighborNote: note },
    }),
    prisma.child.update({
      where: { id: deed.childId },
      data: { magicPoints: { increment: deed.pointsEarned } },
    }),
  ]);
}

export async function registerUser(email: string, password: string) {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) redirect('/login');
  const hashed = await bcrypt.hash(password, 12);
  await prisma.user.create({ data: { email, password: hashed } });
}

export async function addChild(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return { error: "Not authenticated" };

  const name = formData.get("name") as string;

  const parent = await prisma.user.findUnique({
    where: { email: session.user.email }
  });

  if (!parent) return { error: "Parent not found" };

  await prisma.child.create({
    data: {
      name: name,
      parentId: parent.id,
      magicPoints: 0,
    }
  });
}

export async function setParentPin(pin: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return { error: "Unauthorized" };

  await prisma.user.update({
    where: { email: session.user.email },
    data: { parentPin: pin },
  });

  return { success: true };
}