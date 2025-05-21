import z from "zod";
import { AppHandlers } from "../../_middleware.ts";
import { QuestionStore } from "../../../lib/question_store.ts";

export const handler: AppHandlers = {
  POST: async (req, ctx) => {
    const questionStore = await QuestionStore.make();
    const body = await req.json();
    const schema = z.object({
      questionId: z.string(),
      thumbs: z.enum(["up", "down"]),
      reason: z.string().max(1000),
    });
    const submission = schema.parse(body);
    const { questionId, thumbs, reason } = submission;
    
    // Extract the user_id from the session if available
    const user_id = ctx.state.session?.user_id;
    
    await questionStore.reportQuestion({
      question_id: questionId,
      thumbs,
      reason,
      user_id, // Include user_id if available (undefined otherwise)
    });
    return new Response(null, {
      status: 200,
    });
  },
};
