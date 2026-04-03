import { getDb, ObjectId } from "@/lib/mongodb";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { NextResponse } from "next/server";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ toyId: string }> }
) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { toyId } = await params;
  const db = await getDb();
  await db.collection("toys").deleteOne({ _id: new ObjectId(toyId) });
  return NextResponse.json({ ok: true });
}
