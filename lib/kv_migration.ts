import type { Db, DbKey, DbSetOptions } from "./db.ts";
import type { KvBackupBlob } from "./kv_backup.ts";

/**
 * Copy a KV export (`/api/admin/kv/export`) into another `Db`, for the move
 * from Deno KV to DynamoDB. Unlike `importKvUpsert`, it restores expiry (the
 * export doesn't carry it) and leaves out keys nothing reads.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

export type MigrationDecision =
  | { action: "copy"; options?: DbSetOptions }
  | { action: "skip"; reason: string };

/** What to do with one exported entry. */
export function planEntry(
  key: DbKey,
  value: unknown,
  now = Date.now(),
): MigrationDecision {
  const [keyspace, kind] = key;

  // Older layouts no current code reads (docs/data-model.md, "Legacy keys").
  if (keyspace === "jokes") return { action: "skip", reason: "legacy" };
  if (
    keyspace === "emt" && (kind === "questions" || kind === "question_count")
  ) {
    return { action: "skip", reason: "legacy" };
  }

  // SessionStore writes sessions with a 30-day expiry. Their age isn't in
  // the export, so they get a fresh 30 days.
  if (keyspace === "sessions") {
    return { action: "copy", options: { expireIn: 30 * DAY_MS } };
  }

  // StreakStore expires a streak at `expires_on`.
  if (keyspace === "streaks") {
    const expiresOn = Date.parse(
      (value as { expires_on?: string } | null)?.expires_on ?? "",
    );
    if (Number.isNaN(expiresOn) || expiresOn <= now) {
      return { action: "skip", reason: "expired streak" };
    }
    return { action: "copy", options: { expireIn: expiresOn - now } };
  }

  // Stripe idempotency records: keep finished ones for the usual 30 days,
  // and drop in-flight claims so Stripe's retry can run.
  if (keyspace === "stripe_events") {
    const status = (value as { status?: string } | null)?.status;
    if (status !== "done") {
      return { action: "skip", reason: "unfinished Stripe event" };
    }
    return { action: "copy", options: { expireIn: 30 * DAY_MS } };
  }

  return { action: "copy" };
}

export interface MigrationSummary {
  /** Entries written, by keyspace (the first key part). */
  copied: Record<string, number>;
  /** Entries left out, by reason. */
  skipped: Record<string, number>;
}

export async function migrateBackup(
  db: Db,
  blob: KvBackupBlob,
  options?: {
    concurrency?: number;
    now?: number;
    onProgress?: (done: number, total: number) => void;
  },
): Promise<MigrationSummary> {
  const summary: MigrationSummary = { copied: {}, skipped: {} };
  const concurrency = options?.concurrency ?? 16;
  const total = blob.entries.length;
  let next = 0;
  let done = 0;

  const worker = async () => {
    while (next < total) {
      const { key, value } = blob.entries[next++];
      const decision = planEntry(key, value, options?.now);
      if (decision.action === "skip") {
        summary.skipped[decision.reason] =
          (summary.skipped[decision.reason] ?? 0) + 1;
      } else {
        await db.set(key, value, decision.options);
        const keyspace = String(key[0]);
        summary.copied[keyspace] = (summary.copied[keyspace] ?? 0) + 1;
      }
      done += 1;
      if (done % 500 === 0 || done === total) {
        options?.onProgress?.(done, total);
      }
    }
  };
  await Promise.all(Array.from({ length: concurrency }, worker));
  return summary;
}
