import { getDb } from "@/lib/mongodb";

let indexEnsured = false;

async function ensureIndex(db: Awaited<ReturnType<typeof getDb>>) {
  if (indexEnsured) return;
  await db.collection("rateLimits").createIndex(
    { expiresAt: 1 },
    { expireAfterSeconds: 0, name: "rate_limit_ttl" },
  );
  indexEnsured = true;
}

export interface RateLimitResult {
  allowed: boolean;
  count: number;
  max: number;
}

/**
 * Fixed-window rate limiter backed by MongoDB (TTL-expiring counters).
 * `key` should identify the actor + action (e.g. `pin:<childId>` or `admin:<ip>`).
 * Fails open (allows) if the datastore is unreachable, so it can't take the app down.
 */
export async function rateLimit(key: string, max: number, windowSeconds: number): Promise<RateLimitResult> {
  try {
    const db = await getDb();
    await ensureIndex(db);
    const now = new Date();
    const doc = await db.collection("rateLimits").findOneAndUpdate(
      { key },
      {
        $inc: { count: 1 },
        $setOnInsert: { key, expiresAt: new Date(now.getTime() + windowSeconds * 1000) },
      },
      { upsert: true, returnDocument: "after" },
    );
    const count = doc?.count ?? 1;
    return { allowed: count <= max, count, max };
  } catch {
    return { allowed: true, count: 0, max };
  }
}

/** Best-effort client IP from proxy headers (Vercel sets x-forwarded-for). */
export function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}
