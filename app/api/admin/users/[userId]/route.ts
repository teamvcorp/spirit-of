import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { getDb, ObjectId } from "@/lib/mongodb";
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
  const db = await getDb();

  const children = await db.collection("children").find({ parentId: userId }).project({ _id: 1 }).toArray();
  const childIds = children.map((c) => c._id.toString());

  await db.collection("dailyVotes").deleteMany({ childId: { $in: childIds } });
  await db.collection("goodDeeds").deleteMany({ childId: { $in: childIds } });
  await db.collection("children").deleteMany({ parentId: userId });
  await db.collection("users").deleteOne({ _id: new ObjectId(userId) });

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

  const db = await getDb();
  await db.collection("users").updateOne(
    { _id: new ObjectId(userId) },
    { $set: { password: hashed } }
  );

  return NextResponse.json({ tempPassword });
}
