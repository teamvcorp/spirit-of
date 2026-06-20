"use server"
import { getDb, ObjectId } from "@/lib/mongodb";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { sendVerificationEmail } from "@/lib/mail";
import { logError } from "@/lib/log-error";
import { verifyCaptcha } from "@/lib/captcha";
import { getChildAllowance } from "@/lib/allowance";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getYearStart } from "@/lib/santa-logic";

export async function toggleWishlistItem(childId: string, toyId: string, add: boolean) {
  if (!ObjectId.isValid(childId) || !ObjectId.isValid(toyId)) return { error: "Invalid item." };
  const db = await getDb();
  if (add) {
    // Only add if not already present (handles both old string format and new object format)
    const alreadyOn = await db.collection("children").findOne({
      _id: new ObjectId(childId),
      $or: [{ wishlist: toyId }, { "wishlist.toyId": toyId }],
    });
    if (alreadyOn) return { success: true };

    // Behavior-driven allowance cap: the wishlist total can't exceed what the
    // child has earned (unlocked budget share + deed/bonus points). Skipped when
    // the family has no Christmas plan.
    const info = await getChildAllowance(db, childId);
    if (info?.hasPlan) {
      const toy = await db.collection("toys").findOne({ _id: new ObjectId(toyId) }, { projection: { pointCost: 1 } });
      const cost = toy?.pointCost ?? 0;
      if (info.wishlistTotal + cost > info.allowance) {
        const remaining = Math.max(0, info.allowance - info.wishlistTotal);
        return { error: `Not enough magic points yet — only ${remaining} left in your allowance. Earn more with nice votes and good deeds!` };
      }
    }

    await db.collection("children").updateOne(
      { _id: new ObjectId(childId) },
      { $push: { wishlist: { toyId, addedAt: new Date(), lockedIn: false } } } as any
    );
    return { success: true };
  } else {
    // Remove new-format item only if not locked
    await db.collection("children").updateOne(
      { _id: new ObjectId(childId) },
      { $pull: { wishlist: { toyId, lockedIn: { $ne: true } } } } as any
    );
    // Also remove legacy string-format entry (backward compat, strings are never locked)
    await db.collection("children").updateOne(
      { _id: new ObjectId(childId) },
      { $pull: { wishlist: toyId } } as any
    );
    return { success: true };
  }
}

export async function lockWishlistItem(childId: string, toyId: string) {
  const db = await getDb();
  await db.collection("children").updateOne(
    { _id: new ObjectId(childId), "wishlist.toyId": toyId },
    {
      $set: {
        "wishlist.$.lockedIn": true,
        "wishlist.$.lockedAt": new Date(),
        "wishlist.$.lockReason": "manual",
      },
    }
  );
  return { success: true };
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

/**
 * Free deed confirmation (no tip). A good deed counts as nice behavior, so it
 * records a nice vote for the child today — but awards NO points. Points now
 * come only from tips (deed reward = money tipped), handled in the webhook.
 */
export async function confirmDeed(code: string, note: string = "") {
  if (!code || typeof code !== "string") return { error: "Missing code." };

  const db = await getDb();
  const deed = await db.collection("goodDeeds").findOne({ code, isConfirmed: false });
  if (!deed) return { error: "This deed code is invalid or has already been used." };

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  const dbSession = db.client.startSession();
  try {
    await dbSession.withTransaction(async () => {
      await db.collection("goodDeeds").updateOne(
        { code },
        { $set: { isConfirmed: true, neighborNote: note } },
        { session: dbSession }
      );
      // A confirmed deed registers a nice vote for that day.
      await db.collection("dailyVotes").updateOne(
        { childId: deed.childId, date: today },
        { $set: { isPositive: true, childId: deed.childId, date: today } },
        { upsert: true, session: dbSession }
      );
    });
  } finally {
    await dbSession.endSession();
  }
  return { success: true };
}

export async function registerUser(
  email: string,
  password: string,
  captchaToken?: string,
  captchaAnswer?: string,
) {
  if (!verifyCaptcha(captchaToken, captchaAnswer)) {
    return { error: "Please solve the math question to prove you're human.", captchaFailed: true };
  }

  const normalized = (email ?? "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
    return { error: "Please enter a valid email address." };
  }
  if (!password || password.length < 6) {
    return { error: "Password must be at least 6 characters." };
  }

  const db = await getDb();
  const existing = await db.collection("users").findOne({ email: normalized });
  if (existing) return { error: "An account with that email already exists — try logging in." };

  const hashed = await bcrypt.hash(password, 12);
  const verificationToken = randomBytes(24).toString("hex");
  await db.collection("users").insertOne({
    email: normalized,
    password: hashed,
    parentPin: null,
    stripeId: null,
    walletBalance: 0,
    referralCode: null,
    shippingAddress: null,
    isChristmasLocked: false,
    finalizedAt: null,
    usedFreeChildPromo: false,
    emailVerified: false,
    verificationToken,
    createdAt: new Date(),
  });

  // Soft verification: send the confirmation link, but never block signup if email fails.
  try {
    const domain = process.env.NEXT_PUBLIC_DOMAIN ?? "https://spiritofsanta.com";
    await sendVerificationEmail(normalized, verificationToken, domain);
  } catch (e) {
    await logError("registerUser sendVerificationEmail", e, { email: normalized });
  }

  return { success: true };
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

  // Send Points is a parent BONUS on top of the behavior-unlocked allowance —
  // it adds to the child's magicPoints (and thus their allowance). The real
  // spending limit is now the per-child wishlist allowance cap, so there's no
  // separate allocation cap here.
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