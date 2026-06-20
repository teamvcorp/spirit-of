import { getDb } from "@/lib/mongodb";

let indexEnsured = false;

async function ensureIndex(db: Awaited<ReturnType<typeof getDb>>) {
  if (indexEnsured) return;
  // Keep error logs for 90 days, then auto-expire.
  await db.collection("errorLogs").createIndex(
    { at: 1 },
    { expireAfterSeconds: 90 * 24 * 60 * 60, name: "error_logs_ttl" },
  );
  indexEnsured = true;
}

/**
 * Central error sink. Logs to the server console AND persists to the `errorLogs`
 * collection so issues can be reviewed and fixed shortly after they happen.
 * Never throws — logging must not break the request it's reporting on.
 */
export async function logError(
  context: string,
  error: unknown,
  meta: Record<string, unknown> = {},
): Promise<void> {
  const message = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? error.stack : undefined;
  console.error(`[${context}]`, error);
  try {
    const db = await getDb();
    await ensureIndex(db);
    await db.collection("errorLogs").insertOne({
      context,
      message: message.slice(0, 2000),
      stack: stack?.slice(0, 6000) ?? null,
      meta,
      at: new Date(),
    });
  } catch (e) {
    console.error("[logError] failed to persist error", e);
  }
}
