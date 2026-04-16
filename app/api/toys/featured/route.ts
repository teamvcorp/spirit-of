import { getDb } from "@/lib/mongodb";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const db = await getDb();

    // Aggregate wishlist popularity: count how many children have each toy
    const popularity = await db
      .collection("children")
      .aggregate<{ _id: string; count: number }>([
        { $unwind: "$wishlist" },
        { $group: { _id: "$wishlist", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ])
      .toArray();

    const popularityMap = new Map(popularity.map((p) => [p._id, p.count]));

    const toys = await db.collection("toys").find().toArray();

    // Sort by popularity descending; toys with no wishlist entries get shuffled randomly as fallback
    const sorted = toys
      .map((t) => ({
        id: t._id.toString(),
        name: t.name,
        image: t.image,
        popularity: popularityMap.get(t._id.toString()) ?? 0,
      }))
      .sort((a, b) => {
        if (b.popularity !== a.popularity) return b.popularity - a.popularity;
        // Random tiebreaker for toys with equal (or zero) popularity
        return Math.random() - 0.5;
      });

    // Return only name + image (no points or popularity counts exposed)
    const featured = sorted.slice(0, 6).map(({ id, name, image }) => ({ id, name, image }));

    return NextResponse.json({ toys: featured });
  } catch (e) {
    console.error("GET /api/toys/featured error:", e);
    return NextResponse.json({ error: "Failed to load featured toys" }, { status: 500 });
  }
}
