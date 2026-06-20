import type { Db } from "mongodb";
import { sendVoteReminder } from "@/lib/mail";
import { logError } from "@/lib/log-error";

/**
 * Send vote-reminder emails based on each parent's preference.
 *   - daily  : every day, but skipped if they've already voted today.
 *   - weekly : roughly every 7 days (spaced from their last reminder).
 * Designed to run once a day from a cron; idempotent within a day via
 * `lastVoteReminderAt`.
 */
export async function sendVoteReminders(db: Db): Promise<{ sent: number }> {
  const domain = process.env.NEXT_PUBLIC_DOMAIN ?? "https://spiritofsanta.com";
  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setUTCHours(0, 0, 0, 0);
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const parents = await db.collection("users").find({ voteReminder: { $in: ["daily", "weekly"] } }).toArray();
  let sent = 0;

  for (const u of parents) {
    if (!u.email) continue;
    const kids = await db.collection("children")
      .find({ parentId: u._id.toString() })
      .project({ name: 1 })
      .toArray();
    if (kids.length === 0) continue;

    const last = u.lastVoteReminderAt ? new Date(u.lastVoteReminderAt) : null;

    if (u.voteReminder === "daily") {
      if (last && last >= todayStart) continue; // already reminded today
      // Don't nag parents who already voted today.
      const kidIds = kids.map((k) => k._id.toString());
      const votedToday = await db.collection("dailyVotes").findOne({ childId: { $in: kidIds }, date: { $gte: todayStart } });
      if (votedToday) continue;
    } else {
      // weekly
      if (last && last > weekAgo) continue;
    }

    try {
      await sendVoteReminder(u.email, kids.map((k) => k.name), domain);
      await db.collection("users").updateOne({ _id: u._id }, { $set: { lastVoteReminderAt: now } });
      sent++;
    } catch (e) {
      await logError("sendVoteReminder", e, { email: u.email });
    }
  }

  return { sent };
}
