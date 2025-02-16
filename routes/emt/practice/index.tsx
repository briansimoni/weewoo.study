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
    <div
      class="app-container"
      style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 400px; margin: 0 auto; padding: 20px; border: 1px solid #ccc; border-radius: 10px; background-color: #fff;"
    >
      <h1 style="text-align: center; color: #007BFF;">
        {correct === undefined
          ? "Practice Test 🚑"
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
      style={`display: flex; flex-direction: column; gap: 15px;`}
    >
      <input type="hidden" name="questionId" value={question.id} />
      <div class="question" style="font-size: 1.2em; margin-bottom: 20px;">
        {question.question}
      </div>
      <div class="answers">
        {question.choices.map((choice, i) => {
          const isSelected = selectedAnswer === choice;
          const isDisabled = answered;

          return (
            <label
              key={i}
              style={`display: block; margin: 10px 0; color: ${
                isSelected ? "blue" : "black"
              };`}
            >
              <input
                type="radio"
                name="answer"
                value={choice}
                required
                checked={isSelected}
                disabled={isDisabled}
              />
              <span style="margin-left: 10px;">
                {letters[i]} {choice}
              </span>
            </label>
          );
        })}
      </div>

      {!answered && (
        <button
          type="submit"
          class="submit-button"
          style="padding: 15px; background-color: #dc3545; color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 1.2em; transition: background-color 0.3s;"
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
  const color = correct ? "green" : "red";

  return (
    <div style="margin-top: 20px;">
      <p style={`color: ${color}; font-weight: bold; font-size: 1.5em;`}>
        {correct ? "🎉 Correct! Great job!" : "👎 Keep practicing!"}
      </p>
      <div class="explanation" style="margin-top: 20px;">
        <p style="font-size: 1.1em; margin-bottom: 10px;">
          <strong>Explanation:</strong> {explanation}
        </p>
        <a href="/emt/practice">
          <button style="padding: 15px; background-color: rgb(53, 59, 220); color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 1.2em; transition: background-color 0.3s;">
            Next Question →
          </button>
        </a>
      </div>
    </div>
  );
}
