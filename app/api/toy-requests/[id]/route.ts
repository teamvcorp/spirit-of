import { getDb, ObjectId } from "@/lib/mongodb";
import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { addToyToWishlist } from "@/lib/wishlist";

interface WantedBy {
  childId: string;
}

/**
 * Admin review action for a toy request.
 *   approve -> create the catalog toy (linked to its GTIN so it can never be
 *              published twice), set the final price, and auto-add it to every
 *              requesting child's wishlist.
 *   reject  -> mark rejected with a reason.
 */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  if (!ObjectId.isValid(id)) return NextResponse.json({ error: "Invalid id." }, { status: 400 });

  let body: {
    action?: string;
    name?: string;
    description?: string;
    image?: string;
    finalPointCost?: number | string;
    finalPriceCents?: number | string;
    rejectionReason?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const db = await getDb();
  const request = await db.collection("toyRequests").findOne({ _id: new ObjectId(id) });
  if (!request) return NextResponse.json({ error: "Request not found." }, { status: 404 });
  if (request.status !== "pending") {
    return NextResponse.json({ error: `Request already ${request.status}.` }, { status: 409 });
  }

  // ── Reject ─────────────────────────────────────────────────────────────
  if (body.action === "reject") {
    await db.collection("toyRequests").updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          status: "rejected",
          reviewedAt: new Date(),
          reviewedBy: "admin",
          rejectionReason: body.rejectionReason?.toString().trim() || "Not a fit for the workshop.",
        },
      },
    );
    return NextResponse.json({ ok: true, status: "rejected" });
  }

  // ── Approve ──────────────────────────────────────────────────────────────
  if (body.action === "approve") {
    const name = (body.name?.toString().trim() || request.product?.name || "").trim();
    const description = (body.description?.toString().trim() || request.product?.description || "").trim();
    const image = (body.image?.toString().trim() || request.product?.images?.[0] || "").trim();
    const finalPointCost = Number(body.finalPointCost);
    const finalPriceCents = body.finalPriceCents != null ? Number(body.finalPriceCents) : null;

    if (!name) return NextResponse.json({ error: "A name is required to publish." }, { status: 400 });
    if (!Number.isFinite(finalPointCost) || finalPointCost <= 0) {
      return NextResponse.json({ error: "Set a valid point cost before approving." }, { status: 400 });
    }

    // Create the catalog toy. The unique sparse index on `gtin` guards against
    // double-publishing if two admins approve duplicates at the same time.
    let publishedToyId: string;
    try {
      const inserted = await db.collection("toys").insertOne({
        name,
        description,
        image,
        pointCost: finalPointCost,
        gtin: request.gtin14,
        priceCents: finalPriceCents,
        sourceRequestId: id,
        createdAt: new Date(),
      });
      publishedToyId = inserted.insertedId.toString();
    } catch (e: unknown) {
      // Duplicate key -> a toy with this GTIN already exists; reuse it.
      if (e && typeof e === "object" && "code" in e && (e as { code?: number }).code === 11000) {
        const existing = await db.collection("toys").findOne({ gtin: request.gtin14 }, { projection: { _id: 1 } });
        if (!existing) throw e;
        publishedToyId = existing._id.toString();
      } else {
        throw e;
      }
    }

    await db.collection("toyRequests").updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          status: "approved",
          finalPointCost,
          finalPriceCents,
          publishedToyId,
          reviewedAt: new Date(),
          reviewedBy: "admin",
          "product.name": name,
          "product.description": description,
        },
      },
    );

    // Auto-add the published toy to every requesting child's wishlist.
    const wanted: WantedBy[] = request.wantedBy ?? [];
    await Promise.all(
      wanted
        .filter((w) => w.childId && ObjectId.isValid(w.childId))
        .map((w) => addToyToWishlist(db, w.childId, publishedToyId).catch((err) => console.error("[approve wishlist]", err))),
    );

    return NextResponse.json({ ok: true, status: "approved", toyId: publishedToyId });
  }

  return NextResponse.json({ error: "Unknown action." }, { status: 400 });
}
