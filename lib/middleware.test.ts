import { assertEquals, assertMatch } from "@std/assert";
import { assertSpyCalls, stub } from "@std/testing/mock";
import type { Context } from "fresh";
import type { AppHandler, AppState } from "../routes/_middleware.ts";
import { SessionStore } from "./session_store.ts";
import { handler as adminPageMiddleware } from "../routes/admin/_middleware.ts";
import { handler as adminApiMiddleware } from "../routes/api/admin/_middleware.ts";
import { handler as emtMiddleware } from "../routes/emt/_middleware.ts";

// Import the logger with an empty environment so even a production shell cannot
// configure CloudWatch or read credentials. No .env or application entrypoint is loaded.
const modules = await (async () => {
  using _env = stub(Deno.env, "get", () => undefined);
  using _osRelease = stub(Deno, "osRelease", () => "10.0.0");
  return {
    middleware: await import("../routes/_middleware.ts"),
    logger: await import("./logger.ts"),
  };
})();

const remoteAddr: Deno.NetAddr = {
  transport: "tcp",
  hostname: "192.0.2.1",
  port: 1234,
};

function context(req: Request, state: AppState = {}): Context<AppState> {
  return {
    req,
    url: new URL(req.url),
    state,
    info: { remoteAddr },
  } as Context<AppState>;
}

function run(
  ctx: Context<AppState>,
  middlewares: AppHandler[],
  terminal: () => Promise<Response> = () => Promise.resolve(new Response("ok")),
): Promise<Response> {
  let index = 0;
  ctx.next = () => {
    const middleware = middlewares[index++];
    return middleware ? Promise.resolve(middleware(ctx)) : terminal();
  };
  return ctx.next();
}

async function withSessionStore(
  test: (kv: Deno.Kv) => Promise<void>,
): Promise<void> {
  using kv = await Deno.openKv(":memory:");
  const store = await SessionStore.make(kv);
  using _make = stub(SessionStore, "make", () => Promise.resolve(store));
  using _info = stub(modules.logger.log, "info");
  using _error = stub(modules.logger.log, "error");
  await test(kv);
}

for (
  const [name, gate, path] of [
    ["admin pages", adminPageMiddleware, "/admin"],
    ["admin API", adminApiMiddleware, "/api/admin/kv/export"],
  ] as const
) {
  Deno.test(`${name} rejects anonymous and non-admin users and admits the admin`, async () => {
    await withSessionStore(async (kv) => {
      using _env = stub(Deno.env, "get", () => undefined);
      await kv.set(["sessions", "user"], {
        session_id: "user",
        user_id: "other",
      });
      await kv.set(["sessions", "admin"], {
        session_id: "admin",
        user_id: "auth0|67b28845f4ba32d0be58bc46",
      });
      for (
        const [cookie, expectedStatus] of [
          ["", 401],
          ["app_session=user", 401],
          ["app_session=admin", 200],
        ] as const
      ) {
        let reachedRoute = false;
        const ctx = context(
          new Request(`https://example.test${path}`, {
            headers: cookie ? { cookie } : {},
          }),
        );
        const response = await run(ctx, [
          ...modules.middleware.handler,
          ...gate,
        ], () => {
          reachedRoute = true;
          return Promise.resolve(new Response("protected"));
        });
        assertEquals(response.status, expectedStatus);
        assertEquals(reachedRoute, expectedStatus === 200);
        assertEquals(
          await response.text(),
          expectedStatus === 200 ? "protected" : "Unauthorized",
        );
      }
    });
  });
}

Deno.test("admin API admits ADMIN_API_TOKEN bearers; admin pages don't", async () => {
  const token = "t".repeat(40);
  const cases: [string | undefined, string, AppHandler[], number][] = [
    [token, `Bearer ${token}`, adminApiMiddleware, 200],
    [token, `Bearer ${token}x`, adminApiMiddleware, 401],
    [token, token, adminApiMiddleware, 401],
    [token, `Bearer ${token}`, adminPageMiddleware, 401],
    // Token auth is off when the variable is unset or too short.
    [undefined, "Bearer undefined", adminApiMiddleware, 401],
    ["short", "Bearer short", adminApiMiddleware, 401],
  ];
  await withSessionStore(async () => {
    for (const [configured, authorization, gate, expectedStatus] of cases) {
      using _env = stub(
        Deno.env,
        "get",
        (key: string) => key === "ADMIN_API_TOKEN" ? configured : undefined,
      );
      let reachedRoute = false;
      const response = await run(
        context(
          new Request("https://example.test/api/admin/product/1", {
            headers: { authorization },
          }),
        ),
        [...modules.middleware.handler, ...gate],
        () => {
          reachedRoute = true;
          return Promise.resolve(new Response("protected"));
        },
      );
      assertEquals(response.status, expectedStatus, authorization);
      assertEquals(reachedRoute, expectedStatus === 200);
      await response.text();
    }
  });
});

Deno.test("EMT redirects anonymous requests using ctx.req and admits sessions", async () => {
  await withSessionStore(async (kv) => {
    await kv.set(["sessions", "user"], {
      session_id: "user",
      user_id: "other",
    });
    for (const cookie of ["", "app_session=user"]) {
      let reachedRoute = false;
      const response = await run(
        context(
          new Request("https://example.test:8443/emt/practice?mode=exam", {
            headers: cookie ? { cookie } : {},
          }),
        ),
        [...modules.middleware.handler, ...emtMiddleware],
        () => {
          reachedRoute = true;
          return Promise.resolve(new Response("practice"));
        },
      );
      assertEquals(response.status, cookie ? 200 : 302);
      assertEquals(reachedRoute, !!cookie);
      assertEquals(
        response.headers.get("location"),
        cookie ? null : "https://example.test:8443/auth/login",
      );
      await response.text();
    }
  });
});

Deno.test("missing session cookies are expired without bypassing auth on asset-like URLs", async () => {
  await withSessionStore(async () => {
    const response = await run(
      context(
        new Request("https://example.test/admin/missing.css", {
          headers: { cookie: "app_session=deleted" },
        }),
      ),
      [...modules.middleware.handler, ...adminPageMiddleware],
    );
    assertEquals(response.status, 401);
    assertMatch(
      response.headers.get("set-cookie")!,
      /app_session=;.*Expires=Thu, 01 Jan 1970/,
    );
    await response.text();
  });
});

Deno.test("session updates persist and new sessions set a cookie", async () => {
  await withSessionStore(async (kv) => {
    const ctx = context(new Request("https://example.test/auth/callback"));
    const response = await run(ctx, modules.middleware.handler, () => {
      ctx.state.session = { session_id: "new", user_id: "other" };
      return Promise.resolve(new Response("signed in"));
    });
    assertEquals((await kv.get(["sessions", "new"])).value, ctx.state.session);
    assertMatch(response.headers.get("set-cookie")!, /app_session=new;/);
    await response.text();
  });
});

Deno.test("clearing an existing session expires its cookie", async () => {
  await withSessionStore(async (kv) => {
    await kv.set(["sessions", "user"], {
      session_id: "user",
      user_id: "other",
    });
    const ctx = context(
      new Request("https://example.test/auth/logout", {
        headers: { cookie: "app_session=user" },
      }),
    );
    const response = await run(ctx, modules.middleware.handler, () => {
      delete ctx.state.session;
      return Promise.resolve(new Response("signed out"));
    });
    assertMatch(
      response.headers.get("set-cookie")!,
      /app_session=;.*Expires=Thu, 01 Jan 1970/,
    );
    await response.text();
  });
});

Deno.test("logging reads info.remoteAddr and preferences read ctx.req", async () => {
  using _info = stub(modules.logger.log, "info");
  using _error = stub(modules.logger.log, "error");
  const ctx = context(
    new Request("https://example.test/", {
      headers: {
        cookie: `preferences=${btoa(JSON.stringify({ theme: "dark" }))}`,
      },
    }),
  );
  const response = await run(ctx, modules.middleware.handler.slice(0, 2));
  assertEquals(ctx.state.preferences, { theme: "dark" });
  assertSpyCalls(_info, 1);
  assertEquals(_info.calls[0].args[1]?.ip, remoteAddr);
  await response.text();

  const invalid = context(
    new Request("https://example.test/", {
      headers: { cookie: "preferences=not-base64!" },
    }),
  );
  const invalidResponse = await run(
    invalid,
    modules.middleware.handler.slice(0, 2),
  );
  assertEquals(invalid.state.preferences, undefined);
  assertEquals(invalidResponse.status, 200);
  assertSpyCalls(_error, 1);
  await invalidResponse.text();
});
