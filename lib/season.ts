import type { Db } from "mongodb";
import { ObjectId } from "@/lib/mongodb";
import { sendFinalList } from "@/lib/mail";

/* eslint-disable @typescript-eslint/no-explicit-any */
function toToyId(item: any): string {
  return typeof item === "string" ? item : item.toyId;
}

/**
 * December auto-finalize. For every family that hasn't locked yet and has at
 * least one wished item:
 *   - the wallet balance is applied to cover the gift cost, capped at the cost
 *     so the parent is NEVER overcharged; any leftover wallet stays put (it
 *     rolls over to next year — we never clear it),
 *   - the wish lists lock, and
 *   - the admin gets the #finallist email (all kids' toys + shipping address).
 * Idempotent: already-locked families are skipped.
 */
export async function finalizeAllFamilies(db: Db): Promise<{ finalized: number }> {
  const users = await db.collection("users").find({ isChristmasLocked: { $ne: true } }).toArray();
  let finalized = 0;

  for (const user of users) {
    const children = await db.collection("children").find({ parentId: user._id.toString() }).toArray();

    const toyIds = children.flatMap((c) => (c.wishlist ?? []).map((it: any) => new ObjectId(toToyId(it))));
    if (toyIds.length === 0) continue; // nothing wished — skip

    const toys = await db.collection("toys").find({ _id: { $in: toyIds } }).toArray();
    const toyMap = Object.fromEntries(toys.map((t) => [t._id.toString(), t]));

    const childItems = children.map((c) => ({
      name: c.name,
      items: (c.wishlist ?? [])
        .map((it: any) => {
          const id = toToyId(it);
          const t = toyMap[id];
          return t ? { id, name: t.name, pointCost: t.pointCost } : null;
        })
        .filter(Boolean) as Array<{ id: string; name: string; pointCost: number }>,
    }));

    const totalCents = childItems.reduce((s, c) => s + c.items.reduce((ss, i) => ss + i.pointCost * 100, 0), 0);
    // Wallet covers up to the cost — never more, so there's no overcharge.
    const walletDeduction = Math.min(user.walletBalance ?? 0, totalCents);

    await db.collection("users").updateOne(
      { _id: user._id },
      { $set: { isChristmasLocked: true, finalizedAt: new Date() }, $inc: { walletBalance: -walletDeduction } },
    );

    try {
      await sendFinalList(user.email, user.shippingAddress ?? "", childItems);
    } catch (e) {
      console.error("[season] finalize email failed for", user.email, e);
    }
    finalized++;
  }

  return { finalized };
}

/**
 * January 1 reset — the new year begins. For every finalized (locked) family:
 *   - unlock the wish lists,
 *   - clear each child's wish list,
 *   - reset Magic Points to zero, and
 *   - wipe the Naughty-Nice meter (this year's daily votes).
 * The wallet balance is intentionally left untouched, so any leftover funds
 * carry into the new year. Idempotent: only locked families are processed, so
 * it can run safely every day in January without wiping fresh new-year activity.
 */
export async function resetAllFamilies(db: Db): Promise<{ unlocked: number }> {
  const lockedUsers = await db
    .collection("users")
    .find({ isChristmasLocked: true }, { projection: { _id: 1 } })
    .toArray();
  if (lockedUsers.length === 0) return { unlocked: 0 };

  const parentIds = lockedUsers.map((u) => u._id.toString());
  const children = await db
    .collection("children")
    .find({ parentId: { $in: parentIds } }, { projection: { _id: 1 } })
    .toArray();
  const childIds = children.map((c) => c._id.toString());

  // Fresh start: empty wish lists, zero points, reset the reset marker.
  await db.collection("children").updateMany(
    { parentId: { $in: parentIds } },
    { $set: { wishlist: [], magicPoints: 0, lastReset: new Date() } },
  );

  // Wipe the Naughty-Nice meter (daily behavior votes).
  if (childIds.length > 0) {
    await db.collection("dailyVotes").deleteMany({ childId: { $in: childIds } });
  }

  // Unlock — wallet balance is left as-is so leftover funds roll over.
  const res = await db.collection("users").updateMany(
    { isChristmasLocked: true },
    { $set: { isChristmasLocked: false, finalizedAt: null } },
  );
  return { unlocked: res.modifiedCount };
}
