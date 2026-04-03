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
      const children = await db.collection("children")
        .find({ parentId: u._id.toString() })
        .project({ name: 1, magicPoints: 1, wishlist: 1 })
        .sort({ name: 1 })
        .toArray();

      return {
        id: u._id.toString(),
        email: u.email,
        createdAt: u.createdAt,
        walletBalance: u.walletBalance ?? 0,
        shippingAddress: u.shippingAddress ?? '',
        referralCode: u.referralCode ?? '',
        isChristmasLocked: u.isChristmasLocked ?? false,
        children: children.map((c: any) => ({
          id: c._id.toString(),
          name: c.name,
          magicPoints: c.magicPoints ?? 0,
          wishlistCount: (c.wishlist ?? []).length,
        })),
        _count: { children: children.length },
      };
    }));

    return NextResponse.json({ users });
  } catch (e) {
    console.error("GET /api/admin/users error:", e);
    return NextResponse.json({ error: "Failed to load users" }, { status: 500 });
  }
}
