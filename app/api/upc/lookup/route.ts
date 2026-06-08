import { getDb, ObjectId } from "@/lib/mongodb";
import { NextResponse } from "next/server";
import { enrichUpc } from "@/lib/upc/enrich";
import { checkDuplicate } from "@/lib/upc/dedupe";
import { ensureUpcIndexes } from "@/lib/upc/cache";

/**
 * Preview step of the request flow: run the full UPC pipeline and a read-only
 * dedupe check so the UI can show "this is the toy!" (or "it's already in the
 * workshop") before the child/parent commits to sending it to the elves.
 *
 * Gated by a valid childId so it isn't an open enrichment proxy.
 */
export async function POST(req: Request) {
  let body: { code?: string; childId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const code = body.code?.toString().trim();
  const childId = body.childId?.toString();
  if (!code) return NextResponse.json({ error: "Enter the barcode number." }, { status: 400 });
  if (!childId || !ObjectId.isValid(childId)) {
    return NextResponse.json({ error: "Missing child." }, { status: 400 });
  }

  const db = await getDb();
  const child = await db.collection("children").findOne({ _id: new ObjectId(childId) }, { projection: { _id: 1 } });
  if (!child) return NextResponse.json({ error: "Child not found." }, { status: 404 });

  await ensureUpcIndexes();

  const result = await enrichUpc(code);

  let duplicate = { isDuplicate: false, matchType: null as string | null, existingToyId: null as string | null, existingRequestId: null as string | null };
  if (result.ok && result.gtin14) {
    duplicate = await checkDuplicate(db, result.gtin14);
  }

  return NextResponse.json({ result, duplicate });
}
