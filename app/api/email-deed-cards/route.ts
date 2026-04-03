import { getDb } from "@/lib/mongodb";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { sendFamilyReferralCards } from "@/lib/mail";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { referralCode } = await req.json();
  const db = await getDb();

  const parent = await db.collection("users").findOne({ referralCode });
  if (!parent || parent.email !== session.user.email) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const firstChild = await db.collection("children").findOne(
    { parentId: parent._id.toString() },
    { sort: { _id: 1 }, projection: { name: 1 } }
  );

  const familyName = firstChild?.name
    ? `${firstChild.name}'s`
    : "Your";

  const domain = "https://spiritofsanta.com";
  await sendFamilyReferralCards(parent.email, familyName, referralCode, domain);

  return NextResponse.json({ success: true });
}
