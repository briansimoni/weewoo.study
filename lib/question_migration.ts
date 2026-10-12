import {
  type Scope,
  SCOPES,
  type StoredQuestion,
  withQuestionDefaults,
} from "./question_store.ts";

/** What the 2026-10 question migration found (and did) in one scope. */
export interface QuestionMigrationReport {
  scope: Scope;
  /** Question records read. */
  scanned: number;
  /** Records given the new fields (or that would be, in a dry run). */
  migrated: number;
  /** Records that already had them. */
  current: number;
  /**
   * Records that count as published but aren't in the served indexes. The
   * migration leaves them alone; they need a look.
   */
  unindexed: string[];
}

/**
 * Gives every stored question the fields added in 2026-10 (status, tags,
 * references, version), with the defaults `withQuestionDefaults` uses on read:
 * existing questions were all served, so they become published, version 1.
 * Idempotent: records that have the fields are left alone, so it can run
 * again safely. With `dryRun` it only reports.
 */
export async function migrateQuestions(
  kv: Deno.Kv,
  { dryRun }: { dryRun: boolean },
): Promise<QuestionMigrationReport[]> {
  const reports: QuestionMigrationReport[] = [];
  for (const scope of SCOPES) {
    const report: QuestionMigrationReport = {
      scope,
      scanned: 0,
      migrated: 0,
      current: 0,
      unindexed: [],
    };
    for await (
      const entry of kv.list<StoredQuestion>({
        prefix: [scope, "question_content"],
      })
    ) {
      report.scanned++;
      const question = entry.value;
      const indexed = (await kv.get([
        scope,
        "global_question_map",
        question.id,
      ])).value !== null;
      if ((question.status ?? "published") === "published" && !indexed) {
        report.unindexed.push(question.id);
      }

      const needsFields = question.status === undefined ||
        question.tags === undefined || question.references === undefined ||
        question.version === undefined;
      if (!needsFields) {
        report.current++;
        continue;
      }
      report.migrated++;
      if (dryRun) continue;

      const updated = withQuestionDefaults(question);
      const result = await kv.atomic()
        .check(entry)
        .set([scope, "question_content", question.id], updated)
        .set(
          [scope, "category_question_content", question.category, question.id],
          updated,
        )
        .commit();
      if (!result.ok) {
        throw new Error(
          `Question ${question.id} changed during the migration; run it again`,
        );
      }
    }
    reports.push(report);
  }
  return reports;
}
