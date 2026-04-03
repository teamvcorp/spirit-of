import { getDb } from "@/lib/mongodb";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code")?.trim().toUpperCase();

  if (!code) {
    return NextResponse.json({ found: false, error: "No code provided" }, { status: 400 });
  }

  const db = await getDb();
  const parent = await db.collection("users").findOne({ referralCode: code });

  if (!parent) {
    return NextResponse.json({ found: false, error: "Code not found" }, { status: 404 });
  }

  const firstChild = await db.collection("children").findOne(
    { parentId: parent._id.toString() },
    { sort: { _id: 1 }, projection: { name: 1 } }
  );

  const familyName = firstChild?.name
    ? `${firstChild.name}'s family`
    : "this family";

  return NextResponse.json({ found: true, familyName, code });
}
