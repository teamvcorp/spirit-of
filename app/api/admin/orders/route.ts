import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { getDb, ObjectId } from "@/lib/mongodb";

export type OrderItem = {
  childId: string;
  childName: string;
  parentEmail: string;
  shippingAddress: string;
  toyId: string;
  toyName: string;
  toyImage: string;
  pointCost: number;
  lockedAt: string | null;
  lockReason: string;
};

export async function GET() {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const db = await getDb();

    // Get all children that have at least one locked wishlist item
    const childrenRaw = await db
      .collection("children")
      .find({ "wishlist.lockedIn": true })
      .project({ name: 1, parentId: 1, wishlist: 1 })
      .toArray();

    if (childrenRaw.length === 0) return NextResponse.json({ orders: [] });

    // Collect all toy IDs from locked items
    const lockedToyIds: ObjectId[] = [];
    for (const child of childrenRaw) {
      for (const item of child.wishlist ?? []) {
        if (typeof item !== 'string' && item.lockedIn && item.toyId) {
          lockedToyIds.push(new ObjectId(item.toyId));
        }
      }
    }

    const [toys, parents] = await Promise.all([
      lockedToyIds.length > 0
        ? db.collection("toys").find({ _id: { $in: lockedToyIds } }).toArray()
        : Promise.resolve([]),
      db.collection("users")
        .find({ _id: { $in: childrenRaw.map(c => new ObjectId(c.parentId)) } })
        .project({ email: 1, shippingAddress: 1 })
        .toArray(),
    ]);

    const toyMap = Object.fromEntries(toys.map(t => [t._id.toString(), t]));
    const parentMap = Object.fromEntries(parents.map(p => [p._id.toString(), p]));

    const orders: OrderItem[] = [];

    for (const child of childrenRaw) {
      const parent = parentMap[child.parentId];
      for (const item of child.wishlist ?? []) {
        if (typeof item !== 'string' && item.lockedIn && item.toyId) {
          const toy = toyMap[item.toyId];
          orders.push({
            childId: child._id.toString(),
            childName: child.name,
            parentEmail: parent?.email ?? '—',
            shippingAddress: parent?.shippingAddress ?? '',
            toyId: item.toyId,
            toyName: toy?.name ?? item.toyId,
            toyImage: toy?.image ?? '',
            pointCost: toy?.pointCost ?? 0,
            lockedAt: item.lockedAt ? new Date(item.lockedAt).toISOString() : null,
            lockReason: item.lockReason ?? 'manual',
          });
        }
      }
    }

    // Sort: manual locks first, then by lockedAt descending
    orders.sort((a, b) => {
      if (a.lockReason === 'manual' && b.lockReason !== 'manual') return -1;
      if (a.lockReason !== 'manual' && b.lockReason === 'manual') return 1;
      return (b.lockedAt ?? '').localeCompare(a.lockedAt ?? '');
    });

    return NextResponse.json({ orders });
  } catch (e) {
    console.error("GET /api/admin/orders error:", e);
    return NextResponse.json({ error: "Failed to load orders" }, { status: 500 });
  }
}
