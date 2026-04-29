"use server"
import { getDb, ObjectId } from "@/lib/mongodb";
import bcrypt from "bcryptjs";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getYearStart } from "@/lib/santa-logic";

export async function toggleWishlistItem(childId: string, toyId: string, add: boolean) {
  const db = await getDb();
  if (add) {
    await db.collection("children").updateOne(
      { _id: new ObjectId(childId) },
      { $addToSet: { wishlist: toyId } }
    );
  } else {
    await db.collection("children").updateOne(
      { _id: new ObjectId(childId) },
      { $pull: { wishlist: toyId } } as any
    );
  }
}

export async function submitDailyVote(childId: string, isPositive: boolean) {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  const db = await getDb();
  await db.collection("dailyVotes").updateOne(
    { childId, date: today },
    { $set: { isPositive, childId, date: today } },
    { upsert: true }
  );
}

export async function confirmDeed(formData: FormData) {
  const code = formData.get('code') as string;
  const note = (formData.get('note') as string) ?? '';
  if (!code) return;

  const db = await getDb();
  const deed = await db.collection("goodDeeds").findOne({ code, isConfirmed: false });
  if (!deed) return;

  const session = db.client.startSession();
  try {
    await session.withTransaction(async () => {
      await db.collection("goodDeeds").updateOne(
        { code },
        { $set: { isConfirmed: true, neighborNote: note } },
        { session }
      );
      await db.collection("children").updateOne(
        { _id: new ObjectId(deed.childId) },
        { $inc: { magicPoints: deed.pointsEarned } },
        { session }
      );
    });
  } finally {
    await session.endSession();
  }
}

export async function registerUser(email: string, password: string) {
  const db = await getDb();
  const existing = await db.collection("users").findOne({ email });
  if (existing) redirect('/login');
  const hashed = await bcrypt.hash(password, 12);
  await db.collection("users").insertOne({
    email,
    password: hashed,
    parentPin: null,
    stripeId: null,
    walletBalance: 0,
    referralCode: null,
    shippingAddress: null,
    isChristmasLocked: false,
    finalizedAt: null,
    usedFreeChildPromo: false,
    createdAt: new Date(),
  });
}

export async function addChild(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return { error: "Not authenticated" };

  const name = formData.get("name") as string;
  const db = await getDb();
  const parent = await db.collection("users").findOne({ email: session.user.email });
  if (!parent) return { error: "Parent not found" };

  await db.collection("children").insertOne({
    name,
    parentId: parent._id.toString(),
    magicPoints: 0,
    wishlist: [],
    lastReset: new Date(),
  });
}

export async function setParentPin(pin: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return { error: "Unauthorized" };

  const db = await getDb();
  await db.collection("users").updateOne(
    { email: session.user.email },
    { $set: { parentPin: pin } }
  );
  return { success: true };
}

export async function sendMagicPoints(childId: string, points: number) {
  if (!Number.isInteger(points) || points < 1 || points > 1000) {
    return { error: "Invalid point amount" };
  }

  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return { error: "Unauthorized" };

  const costInCents = points * 100;
  const db = await getDb();

  const parent = await db.collection("users").findOne({ email: session.user.email });
  if (!parent) return { error: "Parent not found" };

  const child = await db.collection("children").findOne({
    _id: new ObjectId(childId),
    parentId: parent._id.toString(),
  });
  if (!child) return { error: "Child not found" };
  if (parent.walletBalance < costInCents) {
    return { error: "Insufficient wallet balance" };
  }

  const mongoSession = db.client.startSession();
  try {
    await mongoSession.withTransaction(async () => {
      await db.collection("users").updateOne(
        { _id: parent._id },
        { $inc: { walletBalance: -costInCents } },
        { session: mongoSession }
      );
      await db.collection("children").updateOne(
        { _id: new ObjectId(childId) },
        { $inc: { magicPoints: points } },
        { session: mongoSession }
      );
    });
  } finally {
    await mongoSession.endSession();
  }

  return { success: true };
}

export async function fillMissedDays(childId: string, mode: 'nice' | 'naughty' | 'half') {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return { error: "Unauthorized" };

  const db = await getDb();
  const parent = await db.collection("users").findOne({ email: session.user.email });
  if (!parent) return { error: "User not found" };

  // Verify child belongs to this parent
  const child = await db.collection("children").findOne({
    _id: new ObjectId(childId),
    parentId: parent._id.toString(),
  });
  if (!child) return { error: "Child not found" };

  const yearStart = getYearStart();

  // Only fill up to yesterday — today is still in progress
  const todayUTC = new Date();
  todayUTC.setUTCHours(0, 0, 0, 0);

  // Build list of every day from yearStart up to (but not including) today
  const allDays: Date[] = [];
  const cursor = new Date(yearStart);
  cursor.setUTCHours(0, 0, 0, 0);
  while (cursor < todayUTC) {
    allDays.push(new Date(cursor));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  if (allDays.length === 0) return { filled: 0 };

  // Find which days already have a vote
  const existingVotes = await db.collection("dailyVotes").find({
    childId,
    date: { $gte: yearStart, $lt: todayUTC },
  }).toArray();

  const votedDates = new Set(
    existingVotes.map((v) => new Date(v.date).toISOString().slice(0, 10))
  );

  const missedDays = allDays.filter(
    (d) => !votedDates.has(d.toISOString().slice(0, 10))
  );

  if (missedDays.length === 0) return { filled: 0 };

  const docs = missedDays.map((date, index) => {
    let isPositive: boolean;
    if (mode === 'nice') isPositive = true;
    else if (mode === 'naughty') isPositive = false;
    else isPositive = index % 2 === 0; // half & half: alternating
    return { childId, date, isPositive };
  });

  await db.collection("dailyVotes").insertMany(docs);
  return { filled: docs.length };
}