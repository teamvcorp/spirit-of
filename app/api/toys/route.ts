import { getDb } from "@/lib/mongodb";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const db = await getDb();
    const toys = await db.collection("toys").find().sort({ name: 1 }).toArray();
    return NextResponse.json({
      toys: toys.map((t) => ({ id: t._id.toString(), name: t.name, description: t.description, image: t.image, price: t.pointCost })),
    });
  } catch (e) {
    console.error("GET /api/toys error:", e);
    return NextResponse.json({ error: "Failed to load toys" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { name, description, image, pointCost } = await req.json();
  if (!name || !description || !pointCost) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const db = await getDb();
  const result = await db.collection("toys").insertOne({
    name, description, image: image ?? "", pointCost: Number(pointCost),
  });

  return NextResponse.json({ toy: { id: result.insertedId.toString(), name, description, image: image ?? "", pointCost: Number(pointCost) } }, { status: 201 });
}
