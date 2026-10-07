import { assert, assertEquals, assertStringIncludes } from "@std/assert";
import { App } from "fresh";
import { h } from "preact";
import TestLogin, { handler, testLoginEnabled } from "./test-login.tsx";
import type { AppState } from "../_middleware.ts";
import { setKv } from "../../lib/kv.ts";
import { seed } from "../../lib/seed.ts";

const ADMIN_USER_ID = "auth0|67b28845f4ba32d0be58bc46";

/** Run fn with STAGE set and getKv() pointed at a fresh in-memory database. */
async function withEnv(
  stage: string | undefined,
  options: { seeded: boolean },
  fn: (
    app: App<AppState>,
    captured: { session?: AppState["session"] },
  ) => Promise<void>,
) {
  const previousStage = Deno.env.get("STAGE");
  if (stage === undefined) Deno.env.delete("STAGE");
  else Deno.env.set("STAGE", stage);
  const kv = await Deno.openKv(":memory:");
  setKv(kv);
  try {
    if (options.seeded) await seed(kv, { stage: "TEST" });
    const captured: { session?: AppState["session"] } = {};
    const app = new App<AppState>({ mode: "development" });
    app.use(async (ctx) => {
      const response = await ctx.next();
      captured.session = ctx.state.session;
      return response;
    });
    app.route("/auth/test-login", {
      handler,
      component: (props) =>
        h(TestLogin, props as Parameters<typeof TestLogin>[0]),
    });
    await fn(app, captured);
  } finally {
    setKv(null);
    kv.close();
    if (previousStage === undefined) Deno.env.delete("STAGE");
    else Deno.env.set("STAGE", previousStage);
  }
}

function post(fields: Record<string, string>) {
  return new Request("http://localhost/auth/test-login", {
    method: "POST",
    body: new URLSearchParams(fields),
  });
}

Deno.test("testLoginEnabled only for DEV and TEST", () => {
  assertEquals(testLoginEnabled("DEV"), true);
  assertEquals(testLoginEnabled("TEST"), true);
  assertEquals(testLoginEnabled("PROD"), false);
  assertEquals(testLoginEnabled(undefined), false);
  assertEquals(testLoginEnabled(""), false);
});

for (const stage of ["PROD", undefined]) {
  Deno.test(`test login is unreachable when STAGE=${stage}`, async () => {
    await withEnv(stage, { seeded: true }, async (app, captured) => {
      const get = await app.handler()(
        new Request("http://localhost/auth/test-login"),
      );
      assertEquals(get.status, 404);
      await get.body?.cancel();

      const res = await app.handler()(post({ user_id: "seed|expert" }));
      assertEquals(res.status, 404);
      await res.body?.cancel();
      assertEquals(captured.session, undefined);
    });
  });
}

Deno.test("test login refuses non-seed users, including the admin", async () => {
  await withEnv("TEST", { seeded: true }, async (app, captured) => {
    for (const user_id of [ADMIN_USER_ID, "auth0|someone", ""]) {
      const res = await app.handler()(post({ user_id }));
      assertEquals(res.status, 404, user_id);
      await res.body?.cancel();
      assertEquals(captured.session, undefined);
    }
  });
});

Deno.test("test login refuses seed users missing from the database", async () => {
  // e.g. test.weewoo.study: STAGE=TEST but never seeded.
  await withEnv("TEST", { seeded: false }, async (app, captured) => {
    const res = await app.handler()(post({ user_id: "seed|expert" }));
    assertEquals(res.status, 404);
    await res.body?.cancel();
    assertEquals(captured.session, undefined);
  });
});

Deno.test("test login signs in a seed user and redirects safely", async () => {
  await withEnv("TEST", { seeded: true }, async (app, captured) => {
    const res = await app.handler()(
      post({ user_id: "seed|expert", next: "/emt/practice" }),
    );
    assertEquals(res.status, 303);
    assertEquals(res.headers.get("location"), "/emt/practice");
    assertEquals(captured.session?.user_id, "seed|expert");
    assertEquals(captured.session?.streakDays, 45);
    assert(captured.session?.session_id);

    // Off-site redirects fall back to /profile.
    for (const next of ["//evil.example", "https://evil.example", ""]) {
      const r = await app.handler()(post({ user_id: "seed|regular", next }));
      assertEquals(r.headers.get("location"), "/profile", next);
    }
  });
});

Deno.test("test login page lists the seed users", async () => {
  await withEnv("DEV", { seeded: true }, async (app) => {
    const res = await app.handler()(
      new Request("http://localhost/auth/test-login?next=/shop"),
    );
    assertEquals(res.status, 200);
    const html = await res.text();
    assertStringIncludes(html, 'data-testid="login-seed|expert"');
    assertStringIncludes(html, 'value="/shop"');
  });
});
