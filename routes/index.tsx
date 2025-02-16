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
  return (
    <div class="px-4 py-8 mx-auto bg-[#86efac]">
      <div class="max-w-screen-md mx-auto flex flex-col items-center justify-center">
        <img
          class="my-6"
          src="/ambulance.svg"
          width="128"
          height="128"
          alt="ambulance logo"
        />
        <h1 class="text-4xl font-bold">Welcome to AmbuLOL</h1>
        {/* styled button link to /emt/practice */}
        <a
          href="/emt/practice"
          class="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
        >
          Practice
        </a>
      </div>
    </div>
  );
}
