import { getDb, ObjectId } from "@/lib/mongodb";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { enrichUpc } from "@/lib/upc/enrich";
import { checkDuplicate } from "@/lib/upc/dedupe";
import { ensureUpcIndexes } from "@/lib/upc/cache";
import { addToyToWishlist } from "@/lib/wishlist";

interface WantedBy {
  childId: string;
  childName: string;
  parentId: string;
  parentEmail: string;
  role: "child" | "parent";
  at: Date;
}

/**
 * Create a toy request. Runs the UPC pipeline, then the dedupe gate BEFORE the
 * request ever reaches the admin:
 *   - already in the catalog  -> just add it to the child's wishlist
 *   - already requested        -> attach this child to the existing pending request
 *   - brand new                -> create a pending request for admin review
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
  const child = await db.collection("children").findOne({ _id: new ObjectId(childId) });
  if (!child) return NextResponse.json({ error: "Child not found." }, { status: 404 });

  const parent = await db
    .collection("users")
    .findOne({ _id: new ObjectId(child.parentId) }, { projection: { email: 1, isChristmasLocked: 1 } });
  if (parent?.isChristmasLocked) {
    return NextResponse.json({ error: "This year's wishes are already finalized with Santa." }, { status: 403 });
  }

  await ensureUpcIndexes();
  const result = await enrichUpc(code);

  if (!result.ok || !result.gtin14) {
    return NextResponse.json({ status: "invalid", result }, { status: 422 });
  }

  const session = await getServerSession(authOptions);
  const role: "child" | "parent" = session?.user?.email ? "parent" : "child";
  const wantedBy: WantedBy = {
    childId,
    childName: child.name,
    parentId: child.parentId,
    parentEmail: parent?.email ?? "",
    role,
    at: new Date(),
  };

  // ── Dedupe gate ──────────────────────────────────────────────────────────
  const dup = await checkDuplicate(db, result.gtin14);

  if (dup.matchType === "catalog" && dup.existingToyId) {
    await addToyToWishlist(db, childId, dup.existingToyId);
    return NextResponse.json({
      status: "already_in_shop",
      toyId: dup.existingToyId,
      addedToWishlist: true,
      product: result.product,
    });
  }

  if (dup.matchType === "pending_request" && dup.existingRequestId) {
    await db.collection("toyRequests").updateOne(
      { _id: new ObjectId(dup.existingRequestId), "wantedBy.childId": { $ne: childId } },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { $push: { wantedBy } } as any,
    );
    return NextResponse.json({
      status: "already_requested",
      requestId: dup.existingRequestId,
      product: result.product,
    });
  }

  // ── New request ──────────────────────────────────────────────────────────
  const doc = {
    gtin14: result.gtin14,
    rawUpc: code,
    status: "pending" as const,
    product: result.product,
    gs1Verified: result.gs1.verified,
    gs1Degraded: result.gs1.degraded,
    suggestedPointCost: result.pricing.suggestedPointCost,
    finalPointCost: null as number | null,
    finalPriceCents: null as number | null,
    enrichment: result,
    wantedBy: [wantedBy],
    publishedToyId: null as string | null,
    createdAt: new Date(),
    reviewedAt: null as Date | null,
    reviewedBy: null as string | null,
    rejectionReason: null as string | null,
  };
  const insert = await db.collection("toyRequests").insertOne(doc);

  return NextResponse.json({
    status: "submitted",
    requestId: insert.insertedId.toString(),
    product: result.product,
  });
}

/** Admin: list toy requests for the review queue (pending first, newest first). */
export async function GET(req: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status"); // optional filter

  const db = await getDb();
  const query = status ? { status } : {};
  const requests = await db
    .collection("toyRequests")
    .find(query)
    .sort({ status: 1, createdAt: -1 })
    .limit(200)
    .toArray();

  return NextResponse.json({
    requests: requests.map((r) => ({
      id: r._id.toString(),
      gtin14: r.gtin14,
      rawUpc: r.rawUpc,
      status: r.status,
      product: r.product,
      gs1Verified: r.gs1Verified ?? false,
      gs1Degraded: r.gs1Degraded ?? true,
      suggestedPointCost: r.suggestedPointCost ?? null,
      finalPointCost: r.finalPointCost ?? null,
      wantedBy: (r.wantedBy ?? []).map((w: WantedBy) => ({
        childName: w.childName,
        parentEmail: w.parentEmail,
        role: w.role,
      })),
      requestedCount: (r.wantedBy ?? []).length,
      publishedToyId: r.publishedToyId ?? null,
      createdAt: r.createdAt,
      rejectionReason: r.rejectionReason ?? null,
    })),
  });
}
