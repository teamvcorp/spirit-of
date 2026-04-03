import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { getDb } from "@/lib/mongodb";

export async function GET() {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const db = await getDb();
    const usersRaw = await db.collection("users").find().sort({ createdAt: -1 }).toArray();

    const users = await Promise.all(usersRaw.map(async (u) => {
      const childCount = await db.collection("children").countDocuments({ parentId: u._id.toString() });
      return {
        id: u._id.toString(),
        email: u.email,
        createdAt: u.createdAt,
        _count: { children: childCount },
      };
    }));

    return NextResponse.json({ users });
  } catch (e) {
    console.error("GET /api/admin/users error:", e);
    return NextResponse.json({ error: "Failed to load users" }, { status: 500 });
  }
}
