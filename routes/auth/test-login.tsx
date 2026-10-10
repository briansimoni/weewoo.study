import { HttpError, page } from "fresh";
import { getKv } from "../../lib/kv.ts";
import { refreshSeedStreak, SEED_USERS } from "../../lib/seed.ts";
import { StreakStore } from "../../lib/streak_store.ts";
import { UserStore } from "../../lib/user_store.ts";
import { AppHandlers, AppProps } from "../_middleware.ts";

/**
 * Test-only login for E2E tests and for humans on branch previews, where
 * Auth0 rejects the callback URL. Signs in as a seed user without OAuth.
 *
 * Guards (all must hold, otherwise 404):
 * - STAGE is DEV or TEST (never PROD, never unset);
 * - the user ID is a seed user ("seed|…") that exists in this database.
 * test.weewoo.study runs STAGE=TEST with real accounts, but it is never seeded,
 * so no account there can be signed into this way.
 */
export function testLoginEnabled(stage = Deno.env.get("STAGE")): boolean {
  return stage === "DEV" || stage === "TEST";
}

const SEED_USER_IDS = new Set<string>(SEED_USERS.map((u) => u.user_id));

async function existingSeedUsers() {
  const users = await UserStore.make();
  const found = [];
  for (const { user_id } of SEED_USERS) {
    const user = await users.getUser(user_id);
    if (user) found.push(user);
  }
  return found;
}

/** Only allow same-site relative redirects. */
function safeNext(value: FormDataEntryValue | string | null): string {
  const next = typeof value === "string" ? value : "";
  return next.startsWith("/") && !next.startsWith("//") ? next : "/profile";
}

export const handler: AppHandlers = {
  async GET(ctx) {
    if (!testLoginEnabled()) throw new HttpError(404);
    const users = await existingSeedUsers();
    const next = safeNext(new URL(ctx.req.url).searchParams.get("next"));
    return page({ users, next });
  },

  async POST(ctx) {
    if (!testLoginEnabled()) throw new HttpError(404);
    const form = await ctx.req.formData();
    const userId = String(form.get("user_id") ?? "");
    if (!SEED_USER_IDS.has(userId)) throw new HttpError(404);
    const user = await (await UserStore.make()).getUser(userId);
    if (!user) throw new HttpError(404);

    // Seeded streaks expire after two days; previews outlive them.
    await refreshSeedStreak(await getKv(), user.user_id);
    const streak = await (await StreakStore.make()).get(user.user_id);
    ctx.state.session = {
      session_id: crypto.randomUUID(),
      user_id: user.user_id,
      display_name: user.display_name,
      name: user.display_name,
      streakDays: streak?.days ?? 0,
      test_login: true,
    };
    return new Response(null, {
      status: 303,
      headers: { location: safeNext(form.get("next")) },
    });
  },
};

interface TestLoginProps extends AppProps {
  data: {
    users: { user_id: string; display_name: string }[];
    next: string;
  };
}

export default function TestLogin(props: TestLoginProps) {
  const { users, next } = props.data;
  return (
    <div class="flex justify-center">
      <div class="card shadow-xl p-6 max-w-md w-full">
        <h1 class="text-3xl text-center mb-2">Test login</h1>
        <p class="mb-6 text-center text-sm opacity-70">
          Test environments only. Sign in as a seed user without Auth0.
        </p>
        {users.length === 0
          ? (
            <p class="text-center">
              No seed users in this database. Run <code>deno task seed</code>
              {" "}
              locally, or use a branch preview.
            </p>
          )
          : (
            <ul class="flex flex-col gap-2">
              {users.map((user) => (
                <li key={user.user_id}>
                  <form method="post">
                    <input type="hidden" name="user_id" value={user.user_id} />
                    <input type="hidden" name="next" value={next} />
                    <button
                      type="submit"
                      class="btn btn-outline w-full"
                      data-testid={`login-${user.user_id}`}
                    >
                      {user.display_name}
                      <span class="opacity-60 text-xs">{user.user_id}</span>
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          )}
      </div>
    </div>
  );
}
