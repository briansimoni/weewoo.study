import { useSignal } from "@preact/signals";
import Counter from "../islands/Counter.tsx";
import { getKv } from "../lib/kv.ts";
import { FreshContext } from "$fresh/server.ts";
import { Question, QuestionStore } from "../lib/question_store.ts";

export default async function handler(req: Request, _ctx: FreshContext) {
  const kv = await getKv();

  const questionStore = new QuestionStore(kv);
  const questions = await questionStore.listQuestions();
  return <Home questions={questions} />;
}

function Home(props: { questions: Question[] }) {
  const { questions } = props;
  const count = useSignal(3);
  return (
    <div class="px-4 py-8 mx-auto bg-[#86efac]">
      <div class="max-w-screen-md mx-auto flex flex-col items-center justify-center">
        <img
          class="my-6"
          src="/logo.svg"
          width="128"
          height="128"
          alt="the Fresh logo: a sliced lemon dripping with juice"
        />
        <h1 class="text-4xl font-bold">Welcome to Fresh</h1>
        <p class="my-4">
          Try updating this message in the
          <code class="mx-2">./routes/index.tsx</code> file, and refresh.
        </p>
        <Counter count={count} />
        <br />
        <div>
          {questions.map((q) => <QuestionComponent question={q} />)}

          {
            /* {props.questions.map((question) => (
            <div>
              <h2>{question.question}</h2>
              <ul>
                {question.choices.map((choice) => <li>{choice}</li>)}
              </ul>
              <p>{question.explanation}</p>
            </div>
          ))} */
          }
        </div>
      </div>
    </div>
  );
}

function QuestionComponent(props: { question: Question }) {
  const { question } = props;
  return (
    <div>
      <h2>{question.question}</h2>
      <ul>
        {question.choices.map((choice) => <li>{choice}</li>)}
      </ul>
      <p>{question.explanation}</p>
    </div>
  );
}
