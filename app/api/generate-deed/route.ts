import { getDb } from "@/lib/mongodb";
import { generateMagicCode } from "@/lib/utils";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { childId } = await req.json();
  const code = generateMagicCode();

  const db = await getDb();
  await db.collection("goodDeeds").insertOne({
    code,
    childId,
    description: null,
    neighborNote: null,
    pointsEarned: 1,
    isConfirmed: false,
  });

  return NextResponse.json({ code });
}