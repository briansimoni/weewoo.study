import { FreshContext, Handlers, PageProps } from "$fresh/server.ts";
import { Feedback } from "../../../islands/Feedback.tsx";
import { Question, QuestionStore } from "../../../lib/question_store.ts";
import { UserStore } from "../../../lib/user_store.ts";
import { AppHandlers } from "../../_middleware.ts";

export const handler: AppHandlers = {
  async POST(req, ctx) {
    const questionStore = await QuestionStore.make();
    const formData = await req.formData();
    const questionId = formData.get("questionId") as string;
    const answer = formData.get("answer") as string;
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
      await userStore.updateUser({
        ...user,
        stats: {
          ...user.stats,
          questions_answered: user.stats.questions_answered + 1,
          questions_correct: user.stats.questions_correct + (isCorrect ? 1 : 0),
        },
      });
    }

    return ctx.render({ question, correct: isCorrect, selectedAnswer: answer });
  },

  async GET(_req: Request, ctx: FreshContext) {
    const questionStore = await QuestionStore.make();
    const question = await questionStore.getRandomQuestion();
    return ctx.render({ question });
  },
};

type QuestionProps = {
  question: Question;
  correct?: boolean;
  selectedAnswer?: string;
};

export default function QuestionPage({ data }: PageProps<QuestionProps>) {
  const { question, correct, selectedAnswer } = data;
  const answered = typeof correct === "boolean";

  return (
    <div>
      <div class="max-w-md mx-auto p-6 border border-gray-300 rounded-lg bg-white font-sans">
        <h1 class="text-center text-blue-500 text-2xl font-bold mb-4">
          {correct === undefined
            ? "Practice Question"
            : correct
            ? "✅ Correct!"
            : "❌ Wrong!"}
        </h1>

        <QuestionForm
          question={question}
          selectedAnswer={selectedAnswer}
          answered={answered}
        />

        {answered && (
          <Feedback correct={correct} explanation={question.explanation} />
        )}
      </div>
    </div>
  );
}

// -------------------- COMPONENTS -------------------- //

function QuestionForm(
  { question, selectedAnswer, answered }: {
    question: Question;
    selectedAnswer?: string;
    answered: boolean;
  },
) {
  return (
    <form
      method="POST"
      action="/emt/practice"
      class="flex flex-col gap-4"
    >
      <input type="hidden" name="questionId" value={question.id} />
      <div class="text-lg mb-4">
        {question.question}
      </div>
      <div class="flex flex-col gap-2">
        {question.choices.map((choice, i) => {
          const isSelected = selectedAnswer === choice;
          const isDisabled = answered;

          return (
            <div class="form-control mb-4">
              <label class="label cursor-pointer">
                <input
                  type="radio"
                  class="radio"
                  value={choice}
                  name="answer"
                  required
                  checked={isSelected}
                  disabled={isDisabled}
                />
                <span class="label-text ml-2">{choice}</span>
              </label>
            </div>
          );
        })}
      </div>

      {!answered && (
        <button type="submit" class="btn btn-primary">Submit Answer</button>
      )}
    </form>
  );
}
