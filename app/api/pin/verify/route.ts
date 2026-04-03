import { getDb, ObjectId } from "@/lib/mongodb";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { childId, pin } = await req.json();

  if (!childId || !pin) {
    return NextResponse.json({ success: false });
  }

  const db = await getDb();
  const child = await db.collection("children").findOne({ _id: new ObjectId(childId) });
  if (!child) return NextResponse.json({ success: false });

  const parent = await db.collection("users").findOne({ _id: new ObjectId(child.parentId) });
  if (!parent?.parentPin) {
    return NextResponse.json({ success: false, reason: "no_pin" });
  }

  return NextResponse.json({ success: parent.parentPin === pin });
}
