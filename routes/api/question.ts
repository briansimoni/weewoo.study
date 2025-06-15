import { Question, QuestionStore } from "../../lib/question_store.ts";
import { Streak, StreakStore } from "../../lib/streak_store.ts";
import { UserStore } from "../../lib/user_store.ts";
import { AppHandlers } from "../_middleware.ts";
import { z } from "npm:zod";

export interface QuestionPostResponse {
  question: Question;
  correct: boolean;
  selectedAnswer: number;
  streak?: Streak;
}

export const handler: AppHandlers = {
  // get a question
  async GET() {
    const questionStore = await QuestionStore.make();
    // remove the correct_answer field from the question so you can't just right-click and inspect to find the answer
    const { correct_answer: _correct_answer, ...question } = await questionStore
      .getRandom();
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
  // TODO: return JSON when there is an error. This could be done with middleware
  async POST(req, ctx) {
    const questionStore = await QuestionStore.make();
    const body = await req.json();
    const schema = z.object({
      questionId: z.string(),
      answer: z.number(),
    });
    const submission = schema.parse(body);
    const { questionId, answer } = submission;
    const question = await questionStore.getQuestionById(questionId);
    // In QuestionStore2, correct_answer is a number index
    const selectedAnswerIndex = answer;
    const isCorrect = question.correct_answer === selectedAnswerIndex;

    let streak: Streak | undefined;

    // if you're logged in let's update your stats
    const user_id = ctx.state.session?.user_id;
    if (user_id) {
      const userStore = await UserStore.make();
      const user = await userStore.getUser(user_id);
      if (!user) {
        throw new Error("User not found");
      }

      if (isCorrect) {
        const streakStore = await StreakStore.make();
        streak = await streakStore.update(user.user_id);
        ctx.state.session!.streakDays = streak.days;
      }

      // Update both overall stats and category-specific stats
      await userStore.updateUser(
        {
          ...user,
          stats: {
            ...user.stats,
            questions_answered: user.stats.questions_answered + 1,
            questions_correct: user.stats.questions_correct +
              (isCorrect ? 1 : 0),
          },
        },
        question?.category,
        isCorrect,
      );
    }

    return new Response(
      JSON.stringify({
        question,
        correct: isCorrect,
        selectedAnswer: answer,
        streak,
      }),
      {
        headers: {
          "Content-Type": "application/json",
        },
      },
    );
  },
};
