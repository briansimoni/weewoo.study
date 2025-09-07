import dayjs from "dayjs";
import { Attempt, AttemptStore } from "../../lib/attempt_store.ts";
import { Category } from "../../lib/categories.ts";
import { Question, QuestionStore } from "../../lib/question_store.ts";
import { Streak, StreakStore } from "../../lib/streak_store.ts";
import { UserStore } from "../../lib/user_store.ts";
import { AppHandlers } from "../_middleware.ts";
import { z, ZodError } from "npm:zod";

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
      JSON.stringify({
        ...question,
        timestamp_started: new Date().toISOString(),
      }),
      {
        headers: {
          "Content-Type": "application/json",
        },
      },
    );
  },

  async POST(req, ctx) {
    const questionStore = await QuestionStore.make();
    const body = await req.json();
    const schema = z.object({
      questionId: z.string(),
      answer: z.number(),
      timestamp_started: z.string(),
    });
    let submission: typeof schema._type;
    try {
      submission = schema.parse(body);
    } catch (error) {
      // todo: write middleware for this
      if (error instanceof ZodError) {
        return new Response(
          JSON.stringify({
            validation_error: error.issues,
          }),
          {
            status: 400,
          },
        );
      }
      throw error;
    }

    const { questionId, answer, timestamp_started } = submission;
    const question = await questionStore.getQuestionById(questionId);
    // In QuestionStore2, correct_answer is a number index
    const selectedAnswerIndex = answer;
    const isCorrect = question.correct_answer === selectedAnswerIndex;

    let streak: Streak | undefined;

    // if you're logged in let's update your stats
    const user_id = ctx.state.session?.user_id;
    if (user_id) {
      const userStore = await UserStore.make();
      const attemptStore = await AttemptStore.make();
      const [user, previousAttempts] = await Promise.all([
        userStore.getUser(user_id),
        attemptStore.listByQuestionId({ user_id, question_id: question.id }),
      ]);
      if (!user) {
        throw new Error("User not found");
      }

      const timestamp_submitted = new Date().toISOString();
      const attempt: Attempt = {
        attempt_id: timestamp_submitted,
        user_id,
        question_id: question.id,
        category: question.category as Category,
        timestamp_started,
        timestamp_submitted,
        is_correct: isCorrect,
        selected_choice_index: answer,
        attempt_number_for_question: previousAttempts.length === 0
          ? 1
          : previousAttempts.length + 1,
        response_time_ms: dayjs(timestamp_submitted).diff(
          dayjs(timestamp_started),
        ),
      } as const;

      if (isCorrect) {
        const streakStore = await StreakStore.make();
        streak = await streakStore.update(user.user_id);
        ctx.state.session!.streakDays = streak.days;
      }

      // Update both overall stats and category-specific stats
      await Promise.all([
        userStore.updateUser(
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
        ),
        attemptStore.addAttempt(attempt),
      ]);
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
