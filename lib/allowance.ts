import type { Db } from "mongodb";
import { ObjectId } from "@/lib/mongodb";
import { getYearStart, computeAllowance } from "@/lib/santa-logic";
import { getChristmasYear, normalizeSplits, type ChristmasPlan } from "@/lib/christmas-plan";

export interface ChildAllowance {
  hasPlan: boolean;
  allowance: number; // points; effectively unlimited when no plan
  unlockedShare: number;
  kidBudgetPts: number;
  wishlistTotal: number; // sum of wishlisted toys' pointCost
  magicPoints: number;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function toToyId(it: any): string {
  return typeof it === "string" ? it : it.toyId;
}

/**
 * Resolve a child's spendable allowance and current wishlist total, the single
 * source of truth for the behavior-driven budget cap. Reused by the wishlist
 * guard (toggleWishlistItem) and the children APIs.
 *
 * When the family has no active Christmas plan, the cap isn't enforced
 * (`hasPlan: false`, allowance effectively unlimited) to keep prior behavior.
 */
export async function getChildAllowance(db: Db, childId: string): Promise<ChildAllowance | null> {
  if (!ObjectId.isValid(childId)) return null;
  const child = await db.collection("children").findOne({ _id: new ObjectId(childId) });
  if (!child) return null;
  const magicPoints = child.magicPoints ?? 0;

  // Current wishlist total (sum of toy point costs).
  const wishlist: any[] = child.wishlist ?? [];
  const toyObjIds = wishlist
    .map(toToyId)
    .filter((id: string) => ObjectId.isValid(id))
    .map((id: string) => new ObjectId(id));
  const toys = toyObjIds.length ? await db.collection("toys").find({ _id: { $in: toyObjIds } }).toArray() : [];
  const toyMap = Object.fromEntries(toys.map((t) => [t._id.toString(), t]));
  const wishlistTotal = wishlist.reduce((s, it) => s + (toyMap[toToyId(it)]?.pointCost ?? 0), 0);

  const noPlan: ChildAllowance = {
    hasPlan: false,
    allowance: Number.MAX_SAFE_INTEGER,
    unlockedShare: 0,
    kidBudgetPts: 0,
    wishlistTotal,
    magicPoints,
  };

  if (!child.parentId || !ObjectId.isValid(child.parentId)) return noPlan;
  const parent = await db.collection("users").findOne(
    { _id: new ObjectId(child.parentId) },
    { projection: { christmasPlan: 1 } },
  );
  const plan = parent?.christmasPlan as ChristmasPlan | undefined;
  if (!plan || plan.year !== getChristmasYear()) return noPlan;

  // Resolve this child's % share of the family budget (even split by default).
  const siblings = await db.collection("children")
    .find({ parentId: child.parentId })
    .project({ _id: 1 })
    .toArray();
  const childIds = siblings.map((s) => s._id.toString());
  const splits = normalizeSplits(plan.splits, childIds);
  const pct = splits[childId] ?? 100 / Math.max(1, childIds.length);

  // Nice votes recorded this Santa year.
  const niceVotes = await db.collection("dailyVotes").countDocuments({
    childId,
    isPositive: true,
    date: { $gte: getYearStart() },
  });

  const { kidBudgetPts, unlockedShare, allowance } = computeAllowance({
    budgetCents: plan.budgetCents,
    pct,
    niceVotes,
    magicPoints,
  });

  return { hasPlan: true, allowance, unlockedShare, kidBudgetPts, wishlistTotal, magicPoints };
}
