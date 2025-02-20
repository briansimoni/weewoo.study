import { FreshContext } from "$fresh/server.ts";
import { getKv } from "../lib/kv.ts";
import { AppHandlers, AppProps } from "./_middleware.ts";
import leaderboard from "./leaderboard.tsx";

async function list(prefix: string) {
  const kv = await getKv();
  const entries = [];
  const list = kv.list({ prefix: [prefix] });
  for await (const entry of list) {
    console.log(entry);
    entries.push({ key: entry.key, value: entry.value });
  }
  return entries;
}

export const handler: AppHandlers = {
  async GET(req, ctx) {
    const users = await list("users");
    const leaderboard = await list("leaderboard");
    const emt = await list("emt");
    return ctx.render({ session: ctx.state.session, users, leaderboard, emt });
  },
};

interface DebugProps extends AppProps {
  data: {
    session: any;
    users: {
      key: Deno.KvKey;
      value: unknown;
    }[];
    leaderboard: {
      key: Deno.KvKey;
      value: unknown;
    }[];
    emt: {
      key: Deno.KvKey;
      value: unknown;
    }[];
  };
}

export default function Debug(props: DebugProps) {
  if (props.data.session?.user_id !== "auth0|67b28845f4ba32d0be58bc46") {
    throw new Error("you a bitch");
  }

  const { leaderboard, users, emt } = props.data;
  return (
    <div>
      <h1>Debug</h1>
      <pre>{JSON.stringify({ state: props.state, leaderboard, users, emt }, null, 2)}</pre>
    </div>
  );
}
