import { useSignal } from "@preact/signals";
import Counter from "../islands/Counter.tsx";
import { getKv } from "../lib/kv.ts";
import { FreshContext } from "$fresh/server.ts";
import { Question } from "../lib/questions.ts";

export default async function handler(req: Request, _ctx: FreshContext) {
  console.log("getting stuff");
  const kv = await getKv();
  const jokes = (await kv.get<string[]>(["jokes"])).value;

  await kv.get<string[]>(["jokes"]);

  const entries = kv.list<Question>({ prefix: ["emt"] });
  const questions: Question[] = [];
  for await (const entry of entries) {
    questions.push(entry.value);
    console.log(entry.value);
  }
  return <Home jokes={jokes ?? []} questions={questions} />;
}

function Home(props: { jokes: string[]; questions: Question[] }) {
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
        <ul>
          {props.jokes.map((joke) => (
            <li>{joke}</li>
          ))}
          <li>lol</li>
        </ul>
        <Counter count={count} />
        <br />
        <div>
          {props.questions.map((question) => (
            <div>
              <h2>{question.question}</h2>
              <ul>
                {question.choices.map((choice) => (
                  <li>{choice}</li>
                ))}
              </ul>
              <p>{question.explanation}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
