import { getDb } from "@/lib/mongodb";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { buildPlan, getChristmasYear, getPlanDeadline, summarizePlan, type ChristmasPlan } from "@/lib/christmas-plan";

const MIN_BUDGET_CENTS = 100; // $1
const MAX_BUDGET_CENTS = 10_000_00; // $10,000

/** Create or update the family's Christmas budget plan. */
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { budgetCents?: number | string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const budgetCents = Math.round(Number(body.budgetCents));
  if (!Number.isFinite(budgetCents) || budgetCents < MIN_BUDGET_CENTS || budgetCents > MAX_BUDGET_CENTS) {
    return NextResponse.json({ error: "Enter a budget between $1 and $10,000." }, { status: 400 });
  }

  const db = await getDb();
  const user = await db.collection("users").findOne({ email: session.user.email });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const year = getChristmasYear();
  const existing = user.christmasPlan as ChristmasPlan | undefined;

  // Editing the budget within the same cycle preserves money already contributed;
  // a new cycle (or first-ever plan) starts the contribution counters at zero.
  const plan: ChristmasPlan =
    existing && existing.year === year
      ? {
          ...existing,
          budgetCents,
          deadline: getPlanDeadline(year).toISOString(),
          updatedAt: new Date().toISOString(),
        }
      : buildPlan(budgetCents);

  await db.collection("users").updateOne({ _id: user._id }, { $set: { christmasPlan: plan } });

  return NextResponse.json({ plan: summarizePlan(plan) });
}

/** Cancel the plan (removes the spending cap). */
export async function DELETE() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const db = await getDb();
  await db.collection("users").updateOne(
    { email: session.user.email },
    { $unset: { christmasPlan: "" } },
  );
  return NextResponse.json({ ok: true });
}
