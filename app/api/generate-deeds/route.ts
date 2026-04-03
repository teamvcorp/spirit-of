import { getDb } from "@/lib/mongodb";
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
  const db = await getDb();

  const child = await db.collection("children").findOne({ _id: new (await import("mongodb")).ObjectId(childId) });
  if (!child) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Verify parent owns this child
  const parent = await db.collection("users").findOne({ email: session.user.email });
  if (!parent || child.parentId !== parent._id.toString()) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const safeCount = Math.min(Math.max(1, count), 20);
  const codes: string[] = [];

  for (let i = 0; i < safeCount; i++) {
    const code = generateMagicCode();
    await db.collection("goodDeeds").insertOne({
      code, childId: child._id.toString(), description: null, neighborNote: null, pointsEarned: 1, isConfirmed: false,
    });
    codes.push(code);
  }

  return NextResponse.json({ codes, childName: child.name });
}
