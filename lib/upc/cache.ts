import { getDb } from "@/lib/mongodb";
import type { UpcResult } from "./types";

const CACHE_COLLECTION = "upcCache";
/** External lookups are cached for 60 days — product metadata rarely changes. */
const CACHE_TTL_SECONDS = 60 * 24 * 60 * 60;

let indexesEnsured = false;

/**
 * Idempotently ensure the indexes the pipeline relies on:
 *  - TTL index so cached lookups self-expire
 *  - unique-sparse index on `toys.gtin` so an approved toy can never be published twice
 *  - index on `toyRequests.gtin14` for fast dedupe of pending requests
 * Safe to call on every request; the work only happens once per process.
 */
export async function ensureUpcIndexes(): Promise<void> {
  if (indexesEnsured) return;
  const db = await getDb();
  await Promise.all([
    db.collection(CACHE_COLLECTION).createIndex(
      { fetchedAt: 1 },
      { expireAfterSeconds: CACHE_TTL_SECONDS, name: "upc_cache_ttl" },
    ),
    db.collection(CACHE_COLLECTION).createIndex({ gtin14: 1 }, { unique: true, name: "upc_cache_gtin" }),
    db.collection("toys").createIndex(
      { gtin: 1 },
      { unique: true, sparse: true, name: "toys_gtin_unique" },
    ),
    db.collection("toyRequests").createIndex({ gtin14: 1 }, { name: "toy_requests_gtin" }),
    db.collection("toyRequests").createIndex({ status: 1, createdAt: -1 }, { name: "toy_requests_status" }),
  ]);
  indexesEnsured = true;
}

interface CacheDoc {
  gtin14: string;
  result: UpcResult;
  fetchedAt: Date;
}

export async function readCache(gtin14: string): Promise<UpcResult | null> {
  const db = await getDb();
  const doc = await db.collection<CacheDoc>(CACHE_COLLECTION).findOne({ gtin14 });
  if (!doc) return null;
  return {
    ...doc.result,
    provenance: { ...doc.result.provenance, cacheHit: true },
  };
}

export async function writeCache(gtin14: string, result: UpcResult): Promise<void> {
  const db = await getDb();
  await db.collection<CacheDoc>(CACHE_COLLECTION).updateOne(
    { gtin14 },
    { $set: { gtin14, result, fetchedAt: new Date() } },
    { upsert: true },
  );
}
