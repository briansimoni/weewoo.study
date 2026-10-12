import Zod from "zod";
import { AppHandlers } from "../../../_middleware.ts";
import { getKv } from "../../../../lib/kv.ts";
import { migrateQuestions } from "../../../../lib/question_migration.ts";

const bodySchema = Zod.object({
  // A dry run unless the caller says otherwise.
  dry_run: Zod.boolean().default(true),
});

/**
 * Runs the 2026-10 question migration (lib/question_migration.ts) and returns
 * a report per scope. `{"dry_run": false}` writes; anything else only reports.
 */
export const handler: AppHandlers = {
  async POST(ctx) {
    const parsed = bodySchema.safeParse(
      await ctx.req.json().catch(() => ({})),
    );
    if (!parsed.success) {
      return Response.json({ error: parsed.error.message }, { status: 400 });
    }
    const dryRun = parsed.data.dry_run;
    const reports = await migrateQuestions(await getKv(), { dryRun });
    return Response.json({ dry_run: dryRun, reports });
  },
};
