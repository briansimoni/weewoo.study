import { getKv } from "../../lib/kv.ts";
import { AppHandlers, AppProps } from "../_middleware.ts";

async function list(prefix: string) {
  const kv = await getKv();
  const entries = [];
  const list = kv.list({ prefix: [prefix] });
  for await (const entry of list) {
    entries.push({ key: entry.key, value: entry.value });
  }
  return entries;
}

export const handler: AppHandlers = {
  async GET(req, ctx) {
    if (ctx.state.session?.user_id !== "auth0|67b28845f4ba32d0be58bc46") {
      throw new Error("Unauthorized access.");
    }
    if (new URL(req.url).searchParams.get("throw")) {
      throw new Error("Test error");
    }
    const users = await list("users");
    const sessions = await list("sessions");
    const leaderboard = await list("leaderboard");
    const emt = await list("emt");
    const streak = await list("streaks");
    const products = await list("products");
    const variants = await list("variants");
    return ctx.render({
      session: ctx.state.session,
      users,
      sessions,
      leaderboard,
      emt,
      streak,
      products,
      variants,
    });
  },

  async POST(req, ctx) {
    if (ctx.state.session?.user_id !== "auth0|67b28845f4ba32d0be58bc46") {
      throw new Error("Unauthorized access.");
    }
    const kv = await getKv();
    const form = await req.formData();
    const action = form.get("action");
    const key = JSON.parse(form.get("key") as string);

    if (action === "delete") {
      await kv.delete(key);
    } else if (action === "update") {
      const value = form.get("value");
      try {
        // Parse the value back to its original form (object/array/etc)
        const parsedValue = JSON.parse(value as string);
        await kv.set(key, parsedValue);
      } catch (_e) {
        // If parsing fails, store as plain string
        await kv.set(key, value);
      }
    }

    return new Response(null, {
      status: 303,
      headers: { Location: "/admin/debug" },
    });
  },
};

interface DebugProps extends AppProps {
  data: {
    session: any;
    users: { key: Deno.KvKey; value: unknown }[];
    sessions: { key: Deno.KvKey; value: unknown }[];
    leaderboard: { key: Deno.KvKey; value: unknown }[];
    emt: { key: Deno.KvKey; value: unknown }[];
    streak: { key: Deno.KvKey; value: unknown }[];
    products: { key: Deno.KvKey; value: unknown }[];
    variants: { key: Deno.KvKey; value: unknown }[];
  };
}

export default function Debug(props: DebugProps) {
  const { leaderboard, users, sessions, emt, streak, products, variants } =
    props.data;

  function renderTable(
    title: string,
    data: { key: Deno.KvKey; value: unknown }[],
  ) {
    return (
      <div class="card bg-base-200 shadow-md p-4 my-4">
        <h2 class="text-lg font-bold">{title}</h2>
        <h4>length {data.length}</h4>
        <table class="table w-full">
          <thead>
            <tr>
              <th>Key</th>
              <th>Value</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {data.map((entry) => (
              <tr key={JSON.stringify(entry.key)}>
                <td>
                  <pre class="text-xs">{JSON.stringify(entry.key)}</pre>
                </td>
                <td>
                  <form method="POST" class="flex gap-2">
                    <input
                      type="text"
                      name="value"
                      defaultValue={JSON.stringify(entry.value)}
                      class="input input-sm input-bordered w-full"
                    />
                    <br />
                    <input
                      type="hidden"
                      name="key"
                      value={JSON.stringify(entry.key)}
                    />
                    <button
                      type="submit"
                      name="action"
                      value="update"
                      class="btn btn-sm btn-primary"
                    >
                      Update
                    </button>
                  </form>
                </td>
                <td>
                  <form method="POST">
                    <input
                      type="hidden"
                      name="key"
                      value={JSON.stringify(entry.key)}
                    />
                    <button
                      type="submit"
                      name="action"
                      value="delete"
                      class="btn btn-sm btn-error"
                    >
                      Delete
                    </button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div class="container mx-auto p-4">
      <h1 class="text-2xl font-bold mb-4">Debug Page</h1>
      <h4>session</h4>
      <pre>
        {JSON.stringify(props.data.session, null, 2)}
      </pre>
      {renderTable("Users", users)}
      {renderTable("Sessions", sessions)}
      {renderTable("Streaks", streak)}
      {renderTable("Leaderboard", leaderboard)}
      {renderTable("EMT Data", emt)}
      {renderTable("Products", products)}
      {renderTable("Variants", variants)}
    </div>
  );
}
