/**
 * Christmas Budget Plan math.
 *
 * A parent sets an annual budget they can afford. The system spreads what the
 * parent still owes into equal monthly installments that complete by the
 * deadline (November 28 — just before the wish lists lock). November itself is
 * a valid payment month. Community good-deed contributions (Magic tips earned
 * through the kids' good deeds) reduce what the parent owes, so doing good
 * literally lowers the parent's monthly payment.
 *
 * Pure + dependency-free so it can run on both server and client.
 */

/** Budget must be fully funded by November 28 — just before the wish lists lock. */
export const PLAN_DEADLINE_MONTH = 10; // 0-indexed → November
export const PLAN_DEADLINE_DAY = 28;

export interface ChristmasPlan {
  year: number;
  budgetCents: number;
  deadline: string | Date;
  parentPaidCents: number;
  communityCents: number;
  /** Per-child share of the budget as a percentage (0–100), keyed by childId. */
  splits?: Record<string, number>;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

/**
 * Resolve each child's budget percentage. Children missing from `splits` (or when
 * no splits are set) default to an even share, and the result always sums to ~100.
 */
export function normalizeSplits(
  splits: Record<string, number> | undefined,
  childIds: string[],
): Record<string, number> {
  if (childIds.length === 0) return {};
  const even = 100 / childIds.length;
  const raw: Record<string, number> = {};
  for (const id of childIds) {
    const v = splits?.[id];
    raw[id] = typeof v === "number" && v >= 0 ? v : even;
  }
  const total = Object.values(raw).reduce((s, v) => s + v, 0);
  if (total <= 0) {
    const out: Record<string, number> = {};
    for (const id of childIds) out[id] = even;
    return out;
  }
  // Scale to sum to 100.
  const out: Record<string, number> = {};
  for (const id of childIds) out[id] = (raw[id] / total) * 100;
  return out;
}

export interface PlanSummary {
  year: number;
  budgetCents: number;
  deadline: string;
  parentPaidCents: number;
  communityCents: number;
  fundedCents: number; // parent + community
  remainingCents: number; // what the parent still owes
  installmentCount: number; // equal payments left until the deadline
  installmentCents: number; // size of each remaining payment
  nextDueDate: string | null;
  complete: boolean;
  budgetPoints: number; // budget expressed in Magic Points ($1 = 1 pt)
  splits: Record<string, number> | null; // raw per-child % (null = even split)
}

/**
 * The Christmas year we're currently saving for. The cycle resets on Dec 26
 * (matching the Santa-year boundary used elsewhere): before then we save for
 * this year's Christmas, after then for next year's.
 */
export function getChristmasYear(now: Date = new Date()): number {
  const y = now.getFullYear();
  const reset = new Date(y, 11, 26); // Dec 26
  return now >= reset ? y + 1 : y;
}

export function getPlanDeadline(year: number): Date {
  return new Date(year, PLAN_DEADLINE_MONTH, PLAN_DEADLINE_DAY);
}

/**
 * Number of monthly payments from `now` through the deadline month, inclusive
 * (so November counts as a payment month). Floored at 1 so we never divide by zero.
 */
export function monthsUntilDeadline(now: Date, deadline: Date): number {
  const months =
    (deadline.getFullYear() - now.getFullYear()) * 12 + (deadline.getMonth() - now.getMonth()) + 1;
  return Math.max(1, months);
}

/** Build a fresh plan record for a new budget (cents). */
export function buildPlan(budgetCents: number, now: Date = new Date()): ChristmasPlan {
  const year = getChristmasYear(now);
  return {
    year,
    budgetCents,
    deadline: getPlanDeadline(year).toISOString(),
    parentPaidCents: 0,
    communityCents: 0,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };
}

/** Derive the live, display-ready view of a stored plan. */
export function summarizePlan(plan: ChristmasPlan, now: Date = new Date()): PlanSummary {
  const parentPaidCents = plan.parentPaidCents ?? 0;
  const communityCents = plan.communityCents ?? 0;
  const fundedCents = parentPaidCents + communityCents;
  const remainingCents = Math.max(0, plan.budgetCents - fundedCents);

  const deadline = new Date(plan.deadline);
  const installmentCount = monthsUntilDeadline(now, deadline);
  const installmentCents = remainingCents > 0 ? Math.ceil(remainingCents / installmentCount) : 0;

  // Next payment is suggested for the 1st of next month, but never past the deadline.
  let nextDueDate: Date | null = null;
  if (remainingCents > 0) {
    const firstOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    nextDueDate = firstOfNextMonth > deadline ? deadline : firstOfNextMonth;
  }

  return {
    year: plan.year,
    budgetCents: plan.budgetCents,
    deadline: deadline.toISOString(),
    parentPaidCents,
    communityCents,
    fundedCents,
    remainingCents,
    installmentCount,
    installmentCents,
    nextDueDate: nextDueDate ? nextDueDate.toISOString() : null,
    complete: remainingCents === 0,
    budgetPoints: Math.floor(plan.budgetCents / 100),
    splits: plan.splits ?? null,
  };
}
