import { QuestionStore } from "../../lib/question_store.ts";
import { UserStore } from "../../lib/user_store.ts";
import { updateStreak } from "../../lib/utils.ts";
import { AppHandlers } from "../_middleware.ts";
import { z } from "npm:zod";

export const handler: AppHandlers = {
  // get a question
  async GET() {
    const questionStore = await QuestionStore.make();
    const question = await questionStore.getRandomQuestion();
    return new Response(
      JSON.stringify(question),
      {
        headers: {
          "Content-Type": "application/json",
        },
      },
    );
  },

  // answer a question
  async POST(req, ctx) {
    const questionStore = await QuestionStore.make();
    const body = await req.json();
    const schema = z.object({
      questionId: z.string(),
      answer: z.string(),
    });
    const submission = schema.parse(body);
    const { questionId, answer } = submission;
    const question = await questionStore.getQuestion(questionId);
    const isCorrect = question?.correct_answer === answer;

    // if you're logged in let's update your stats
    const user_id = ctx.state.session?.user_id;
    if (user_id) {
      const userStore = await UserStore.make();
      const user = await userStore.getUser(user_id);
      if (!user) {
        throw new Error("User not found");
      }

      if (isCorrect) {
        updateStreak(user);
      }

      await userStore.updateUser({
        ...user,
        stats: {
          ...user.stats,
          questions_answered: user.stats.questions_answered + 1,
          questions_correct: user.stats.questions_correct + (isCorrect ? 1 : 0),
        },
      });
    }

    return new Response(
      JSON.stringify({
        question,
        correct: isCorrect,
        selectedAnswer: answer,
      }),
      {
        headers: {
          "Content-Type": "application/json",
        },
      },
    );
  },
};
