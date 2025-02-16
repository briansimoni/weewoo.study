import { FreshContext, Handlers, PageProps } from "$fresh/server.ts";
import { getKv } from "../../../lib/kv.ts";
import { Question, QuestionStore } from "../../../lib/question_store.ts";

export const handler: Handlers = {
  async POST(req: Request, ctx: FreshContext) {
    const kv = await getKv();
    const questionStore = new QuestionStore(kv);
    const formData = await req.formData();
    const questionId = formData.get("questionId") as string;
    const answer = formData.get("answer") as string;
    const question = await questionStore.getQuestion(questionId);
    const isCorrect = question?.correct_answer === answer;

    return ctx.render({ question, correct: isCorrect, selectedAnswer: answer });
  },

  async GET(_req: Request, ctx: FreshContext) {
    const kv = await getKv();
    const questionStore = new QuestionStore(kv);
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
    <div class="max-w-md mx-auto p-6 border border-gray-300 rounded-lg bg-white font-sans">
      <h1 class="text-center text-blue-500 text-2xl font-bold mb-4">
        {correct === undefined
          ? "Practice Question 🚑"
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
  const letters = ["A", "B", "C", "D"];

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
            <label
              key={i}
              class={`block ${isSelected ? "text-blue-600" : "text-gray-900"}`}
            >
              <input
                type="radio"
                name="answer"
                value={choice}
                required
                checked={isSelected}
                disabled={isDisabled}
                class="mr-2"
              />
              {letters[i]}) {choice}
            </label>
          );
        })}
      </div>

      {!answered && (
        <button
          type="submit"
          class="mt-4 py-3 px-6 bg-red-600 text-white rounded-lg hover:bg-red-700 text-xl"
        >
          Submit Answer
        </button>
      )}
    </form>
  );
}

function Feedback(
  { correct, explanation }: { correct: boolean; explanation: string },
) {
  const color = correct ? "text-green-600" : "text-red-600";

  return (
    <div class="mt-6">
      <p class={`font-bold text-xl ${color}`}>
        {correct ? "🎉 Correct! Great job!" : "👎 Keep practicing!"}
      </p>
      <div class="mt-4">
        <p class="text-lg mb-4">
          <strong>Explanation:</strong> {explanation}
        </p>
        <a href="/emt/practice">
          <button class="py-3 px-6 bg-blue-700 text-white rounded-lg hover:bg-blue-800 text-xl">
            Next Question →
          </button>
        </a>
      </div>
    </div>
  );
}
