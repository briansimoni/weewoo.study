import Zod from "zod";
import { AppHandlers } from "../../../_middleware.ts";
import { parseScope, QuestionStore } from "../../../../lib/question_store.ts";

/** The question's bank, from `?scope=` (default EMT). */
function storeFor(req: Request) {
  const param = new URL(req.url).searchParams.get("scope");
  return QuestionStore.make(undefined, parseScope(param) ?? "emt");
}

const updateQuestionSchema = Zod.object({
  question: Zod.string().min(1),
  choices: Zod.array(Zod.string().min(1)),
  correct_answer: Zod.number().min(0),
  explanation: Zod.string().min(1),
  category: Zod.string().min(1),
});

export const handler: AppHandlers = {
  async GET(ctx) {
    const questionId = ctx.params.id;

    if (!questionId) {
      return new Response(JSON.stringify({ error: "Missing question ID" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    try {
      const questionStore = await storeFor(ctx.req);
      const question = await questionStore.getQuestionById(questionId);

      return new Response(JSON.stringify(question), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return new Response(JSON.stringify({ error: message }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }
  },

  async PUT(ctx) {
    const req = ctx.req;
    const questionId = ctx.params.id;

    if (!questionId) {
      return new Response(JSON.stringify({ error: "Missing question ID" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    try {
      const body = await req.json();
      const updateData = updateQuestionSchema.parse(body);

      // Validate that correct_answer is within bounds of choices array
      if (
        updateData.correct_answer < 0 ||
        updateData.correct_answer >= updateData.choices.length
      ) {
        return new Response(
          JSON.stringify({ error: "Correct answer index is out of bounds" }),
          { status: 400, headers: { "Content-Type": "application/json" } },
        );
      }

      const questionStore = await storeFor(ctx.req);

      // First get the existing question
      const existingQuestion = await questionStore.getQuestionById(questionId);

      // Update the question with new data
      const updatedQuestion = await questionStore.updateQuestion({
        ...existingQuestion,
        ...updateData,
      });

      return new Response(JSON.stringify(updatedQuestion), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const status = message.includes("not found") ? 404 : 400;

      return new Response(JSON.stringify({ error: message }), {
        status,
        headers: { "Content-Type": "application/json" },
      });
    }
  },

  async DELETE(ctx) {
    const questionId = ctx.params.id;

    if (!questionId) {
      return new Response(JSON.stringify({ error: "Missing question ID" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    try {
      const questionStore = await storeFor(ctx.req);

      // Verify the question exists before attempting to delete it
      await questionStore.getQuestionById(questionId);
      // Delete the question
      await questionStore.delete(questionId);
      await questionStore.deleteQuestionReports(questionId);

      return new Response(
        JSON.stringify({
          success: true,
          message: "Question deleted successfully",
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const status = message.includes("not found") ? 404 : 500;

      return new Response(JSON.stringify({ error: message }), {
        status,
        headers: { "Content-Type": "application/json" },
      });
    }
  },
};
