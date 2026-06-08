import type { Db } from "mongodb";
import { ObjectId } from "@/lib/mongodb";

/**
 * Add a toy to a child's wishlist if it isn't already there. Mirrors the
 * idempotent add logic in app/actions.ts (handles legacy string entries too)
 * so it can be reused from route handlers.
 */
export async function addToyToWishlist(db: Db, childId: string, toyId: string): Promise<void> {
  const alreadyOn = await db.collection("children").findOne({
    _id: new ObjectId(childId),
    $or: [{ wishlist: toyId }, { "wishlist.toyId": toyId }],
  });
  if (alreadyOn) return;
  await db.collection("children").updateOne(
    { _id: new ObjectId(childId) },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    { $push: { wishlist: { toyId, addedAt: new Date(), lockedIn: false } } } as any,
  );
}
