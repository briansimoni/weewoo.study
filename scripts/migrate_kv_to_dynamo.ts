/**
 * Copy a Deno KV export into a DynamoDB table, for the move off Deno Deploy.
 *
 *   deno task admin test GET api/admin/kv/export > ../test-export.json
 *   deno run -A scripts/migrate_kv_to_dynamo.ts ../test-export.json weewoo-study-test
 *
 * AWS credentials and region come from the environment (`AWS_PROFILE`,
 * `AWS_REGION`). Keep the export out of the repo: it holds user data and
 * session tokens. The table must be empty unless `--allow-non-empty` is
 * given (entries are upserted, nothing is deleted). `--dry-run` only prints
 * what would be copied. Writing to `weewoo-study-prod` needs `--confirm-prod`.
 */
import { DynamoKv } from "../lib/dynamo_kv.ts";
import { isKvBackupBlob } from "../lib/kv_backup.ts";
import { migrateBackup, planEntry } from "../lib/kv_migration.ts";

const flags = new Set(Deno.args.filter((arg) => arg.startsWith("--")));
const [file, table] = Deno.args.filter((arg) => !arg.startsWith("--"));
if (!file || !table) {
  console.error(
    "usage: migrate_kv_to_dynamo.ts <export.json> <table> [--dry-run] [--allow-non-empty] [--confirm-prod]",
  );
  Deno.exit(2);
}
if (table.endsWith("-prod") && !flags.has("--confirm-prod")) {
  console.error(`Refusing to write to ${table} without --confirm-prod`);
  Deno.exit(2);
}

const blob: unknown = JSON.parse(await Deno.readTextFile(file));
if (!isKvBackupBlob(blob)) {
  console.error(`${file} is not a KV export`);
  Deno.exit(2);
}
console.log(`${blob.entries.length} entries in ${file}`);

if (flags.has("--dry-run")) {
  const counts: Record<string, number> = {};
  for (const { key, value } of blob.entries) {
    const decision = planEntry(key, value);
    const label = decision.action === "copy"
      ? `copy ${String(key[0])}`
      : `skip (${decision.reason})`;
    counts[label] = (counts[label] ?? 0) + 1;
  }
  console.table(counts);
  Deno.exit(0);
}

const db = DynamoKv.make({ table });
if (!flags.has("--allow-non-empty")) {
  for await (const entry of db.list({ prefix: [] }, { limit: 1 })) {
    console.error(
      `${table} is not empty (found ${
        JSON.stringify(entry.key)
      }); pass --allow-non-empty to upsert into it`,
    );
    Deno.exit(1);
  }
}

const summary = await migrateBackup(db, blob, {
  onProgress: (done, total) => console.log(`${done} / ${total}`),
});
console.log("copied:");
console.table(summary.copied);
console.log("skipped:");
console.table(summary.skipped);
db.close();
