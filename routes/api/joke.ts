import { FreshContext, Handlers } from "$fresh/server.ts";
import { getKv } from "../../lib/kv.ts";

const kv = await getKv();

// Jokes courtesy of https://punsandoneliners.com/randomness/programmer-jokes/
const JOKES = [
  "Why do Java developers often wear glasses? They can't C#.",
  "A SQL query walks into a bar, goes up to two tables and says “can I join you?”",
  "Wasn't hard to crack Forrest Gump's password. 1forrest1.",
  "I love pressing the F5 key. It's refreshing.",
  "Called IT support and a chap from Australia came to fix my network connection.  I asked “Do you come from a LAN down under?”",
  "There are 10 types of people in the world. Those who understand binary and those who don't.",
  "Why are assembly programmers often wet? They work below C level.",
  "My favourite computer based band is the Black IPs.",
  "What programme do you use to predict the music tastes of former US presidential candidates? An Al Gore Rhythm.",
  "An SEO expert walked into a bar, pub, inn, tavern, hostelry, public house.",
];

export const handler: Handlers = {
  async GET(_req: Request, ctx: FreshContext) {
    const jokes = (await kv.get<string[]>(["jokes"])).value!;
    const randomIndex = Math.floor(Math.random() * jokes.length);
    const body = jokes[randomIndex];
    const r = new Response(
      JSON.stringify({
        body,
      })
    );
    r.headers.set("content-type", "application/json");
    return r;
  },

  async POST(req: Request, ctx: FreshContext) {
    const { joke } = await req.json();
    const jokes = (await kv.get<string[]>(["jokes"])).value;
    if (!jokes) {
      return new Response("OK");
    }
    jokes.push(joke);
    await kv.set(["jokes"], jokes);
    return new Response("OK");
  },
};
