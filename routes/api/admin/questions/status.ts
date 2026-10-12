import { AppHandlers } from "../../../_middleware.ts";
import { QuestionStore } from "../../../../lib/question_store.ts";
import { statusChangeSchema } from "../../../../lib/question_review.ts";

/**
 * Changes a question's status: `published` puts it in practice, anything else
 * takes it out (QuestionStore.setStatus).
 */
export const handler: AppHandlers = {
  async POST(ctx) {
    const parsed = statusChangeSchema.safeParse(
      await ctx.req.json().catch(() => undefined),
    );
    if (!parsed.success) {
      return Response.json({ error: parsed.error.message }, { status: 400 });
    }
    const { questionId, scope, status, review } = parsed.data;
    const store = await QuestionStore.make(undefined, scope);
    const question = await store.getQuestionById(questionId).catch(() => null);
    if (!question) {
      return Response.json({ error: "Question not found" }, { status: 404 });
    }
    if (
      review.explanation_per_choice &&
      review.explanation_per_choice.length !== question.choices.length
    ) {
      return Response.json(
        { error: "explanation_per_choice needs one entry per choice" },
        { status: 400 },
      );
    }
    const updated = await store.setStatus(questionId, status, review);
    return Response.json({ success: true, question: updated });
  },
};
