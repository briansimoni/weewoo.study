import { AppHandlers } from "../../../../_middleware.ts";
import { QuestionStore, SCOPES } from "../../../../../lib/question_store.ts";
import Zod from "zod";

export const handler: AppHandlers = {
  // resolve the report
  POST: async (ctx) => {
    const req = ctx.req;
    const resolveQuestionSchema = Zod.object({
      questionId: Zod.string().min(1),
      reportId: Zod.string().min(1),
      scope: Zod.enum(SCOPES).default("emt"),
    });

    const { questionId, reportId, scope } = resolveQuestionSchema.parse(
      await req.json(),
    );

    try {
      const store = await QuestionStore.make(undefined, scope);

      await store.resolveReport({ questionId, reportId });

      return new Response(
        JSON.stringify({ success: true }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      );
    } catch (_error: unknown) {
      return new Response(null, {
        status: 500,
      });
    }
  },
};
