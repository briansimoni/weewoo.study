import z from "zod";
import { AppHandlers } from "../../_middleware.ts";
import { QuestionStore } from "../../../lib/question_store.ts";

export const handler: AppHandlers = {
  POST: async (req) => {
    const questionStore = await QuestionStore.make();
    const body = await req.json();
    const schema = z.object({
      questionId: z.string(),
      thumbs: z.enum(["up", "down"]),
      reason: z.string().max(1000),
    });
    const submission = schema.parse(body);
    const { questionId, thumbs, reason } = submission;
    await questionStore.reportQuestion({
      question_id: questionId,
      thumbs,
      reason,
    });
    return new Response(null, {
      status: 200,
    });
  },
};
