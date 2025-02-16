import { FreshContext, Handlers } from "$fresh/server.ts";
import { getKv } from "../../../lib/kv.ts";
import { Question, QuestionStore } from "../../../lib/question_store.ts";

export const handler: Handlers = {
  async POST(req: Request, _ctx: FreshContext) {
    const kv = await getKv();
    const questionStore = new QuestionStore(kv);
    const formData = await req.formData();
    const questionId = formData.get("questionId") as string;
    const answer = formData.get("answer") as string;
    const question = await questionStore.getQuestion(questionId);
    const isCorrect = question?.correct_answer === answer;

    return new Response("", {
      status: 303,
      headers: {
        Location: isCorrect ? "/emt/practice?correct=true" : "/emt/practice",
      },
    });
  },
};

export default async function (_req: Request, _ctx: FreshContext) {
  const kv = await getKv();

  const questionStore = new QuestionStore(kv);
  const question = await questionStore.getRandomQuestion();
  return <QuestionPage question={question} />;
}

type Letters = {
  [key: number]: string;
};

const letters: Letters = {
  0: "A",
  1: "B",
  2: "C",
  3: "D",
};

function QuestionPage(props: { question: Question }) {
  const { question } = props;
  return (
    <div
      class="app-container"
      style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 400px; margin: 0 auto; padding: 20px; border: 1px solid #ccc; border-radius: 10px; background-color: #fff;"
    >
      <div
        class="header"
        style="text-align: center; font-size: 1.5em; margin-bottom: 20px; color: #007BFF;"
      >
        <a href="/" style="text-decoration: none; color: #007BFF;">
          EMS Test Prep 🚑
        </a>
      </div>
      <div
        class="progress-bar"
        style="height: 10px; background-color: #e0e0e0; border-radius: 5px; margin-bottom: 20px;"
      >
        <div
          class="progress-bar-fill"
          style="width: 60%; height: 100%; background-color: #28a745; border-radius: 5px;"
        >
        </div>
      </div>
      <form
        method="POST"
        action="/emt/practice"
        style="display: flex; flex-direction: column; gap: 15px;"
      >
        <input type="hidden" name="questionId" value={question.id} />
        <div class="question" style="font-size: 1.2em; margin-bottom: 20px;">
          {question.question}
        </div>
        <div class="answers">
          {question.choices.map((choice, i) => (
            <label key={i} style="display: block; margin: 10px 0;">
              <input type="radio" name="answer" value={choice} required />
              <span style="margin-left: 10px;">{letters[i]}) {choice}</span>
            </label>
          ))}
        </div>
        <button
          type="submit"
          class="submit-button"
          style="padding: 15px; background-color: #dc3545; color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 1.2em; transition: background-color 0.3s;"
        >
          Submit Answer
        </button>
      </form>
    </div>
  );
}
