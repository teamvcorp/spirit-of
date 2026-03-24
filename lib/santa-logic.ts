/** Returns the start of the current Santa year (Dec 26 of the previous calendar year, or Dec 26 of this year if we're on/past it). */
export function getYearStart(): Date {
  const today = new Date();
  const thisYearDec26 = new Date(today.getFullYear(), 11, 26);
  return today >= thisYearDec26
    ? thisYearDec26
    : new Date(today.getFullYear() - 1, 11, 26);
}

/**
 * Meter percentage: nice votes / days elapsed since Dec 26, as a fraction of 365.
 * Denominator = days elapsed since Dec 26 (capped at 365), so early in the year
 * every day matters equally.
 */
export function getMeterStats(votes: { isPositive: boolean; date: string | Date }[]): number {
  const yearStart = getYearStart();
  const today = new Date();

  // Only votes within this Santa year
  const yearVotes = votes.filter(v => new Date(v.date) >= yearStart);

  // Days elapsed since Dec 26 (including today), minimum 1, max 365
  const msPerDay = 1000 * 60 * 60 * 24;
  const daysElapsed = Math.min(
    365,
    Math.max(1, Math.floor((today.getTime() - yearStart.getTime()) / msPerDay) + 1)
  );

  const niceVotes = yearVotes.filter(v => v.isPositive).length;
  return Math.round((niceVotes / daysElapsed) * 100);
}

/**
 * Shop access: child must have a NICE vote recorded for today specifically.
 * Compares using UTC date strings to match how votes are stored (UTC midnight).
 */
export function canShopToday(votes: { isPositive: boolean; date: string | Date }[]): boolean {
  const todayUTC = new Date().toISOString().slice(0, 10); // "YYYY-MM-DD" in UTC
  const todayVote = votes.find(v => new Date(v.date).toISOString().slice(0, 10) === todayUTC);
  return todayVote?.isPositive ?? false;
}

export const isShopLocked = () => {
  const today = new Date();
  const year = today.getFullYear();
  const lockoutDate = new Date(year, 11, 11); // Dec 11th
  const unlockDate = new Date(year, 11, 26);  // Dec 26th
  return today > lockoutDate && today < unlockDate;
};