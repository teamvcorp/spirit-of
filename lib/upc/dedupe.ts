import type { Db } from "mongodb";

export interface DuplicateBlock {
  isDuplicate: boolean;
  matchType: "catalog" | "pending_request" | null;
  existingToyId: string | null;
  existingRequestId: string | null;
}

/**
 * The "verify it hasn't already been added" check that runs before anything
 * reaches the admin. The GTIN-14 is the canonical identity of a product, so we
 * match on it against both the live catalog and the pending request queue.
 */
export async function checkDuplicate(db: Db, gtin14: string): Promise<DuplicateBlock> {
  const existingToy = await db.collection("toys").findOne({ gtin: gtin14 }, { projection: { _id: 1 } });
  if (existingToy) {
    return {
      isDuplicate: true,
      matchType: "catalog",
      existingToyId: existingToy._id.toString(),
      existingRequestId: null,
    };
  }

  const pending = await db
    .collection("toyRequests")
    .findOne({ gtin14, status: "pending" }, { projection: { _id: 1 } });
  if (pending) {
    return {
      isDuplicate: true,
      matchType: "pending_request",
      existingToyId: null,
      existingRequestId: pending._id.toString(),
    };
  }

  return { isDuplicate: false, matchType: null, existingToyId: null, existingRequestId: null };
}
