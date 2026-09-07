import { assertEquals, assertStringIncludes } from "@std/assert";
import { App, page } from "fresh";
import { h } from "preact";
import Support, { handler as supportHandler } from "./support.tsx";
import LoggedOut, { handler as loggedOutHandler } from "./auth/logged-out.tsx";
import Practice, { handler as practiceHandler } from "./emt/practice/index.tsx";
import type { AppState } from "./_middleware.ts";

Deno.test("support handler passes query data to its page component", async () => {
  const app = new App<Record<string, unknown>>({ mode: "development" }).route(
    "/support",
    {
      handler: supportHandler,
      component: (props) => h(Support, props as Parameters<typeof Support>[0]),
    },
  );
  const response = await app.handler()(
    new Request("http://localhost/support?success=true"),
  );

  assertEquals(response.status, 200);
  assertStringIncludes(
    await response.text(),
    "Your message has been sent successfully!",
  );
});

Deno.test("support handler renders error data and escapes it", async () => {
  const app = new App<Record<string, unknown>>({ mode: "development" }).route(
    "/support",
    {
      handler: supportHandler,
      component: (props) => h(Support, props as Parameters<typeof Support>[0]),
    },
  );
  const response = await app.handler()(
    new Request("http://localhost/support?error=%3Cfailed%3E"),
  );

  assertEquals(response.status, 200);
  const html = await response.text();
  assertStringIncludes(html, "&lt;failed");
  assertEquals(html.includes("<failed>"), false);
});

Deno.test("logged-out handler renders page without data and clears session state", async () => {
  const app = new App<AppState>({ mode: "development" });
  app.use(async (ctx) => {
    ctx.state.session = { session_id: "test-session" };
    const response = await ctx.next();
    assertEquals(ctx.state.session, undefined);
    return response;
  });
  app.route("/auth/logged-out", {
    handler: loggedOutHandler,
    component: LoggedOut,
  });
  const response = await app.handler()(
    new Request("http://localhost/auth/logged-out"),
  );

  assertEquals(response.status, 200);
  assertStringIncludes(
    await response.text(),
    "You have successfully logged out.",
  );
});

Deno.test("practice handler renders page without data for an authenticated session", async () => {
  const app = new App<AppState>({ mode: "development" });
  app.use((ctx) => {
    ctx.state.session = { session_id: "test-session" };
    return ctx.next();
  });
  app.route("/emt/practice", {
    handler: practiceHandler,
    component: Practice,
  });
  const response = await app.handler()(
    new Request("http://localhost/emt/practice"),
  );

  assertEquals(response.status, 200);
  assertStringIncludes(response.headers.get("content-type") ?? "", "text/html");
  await response.text();
});

Deno.test("practice handler preserves unauthorized response", async () => {
  const app = new App<AppState>({ mode: "development" }).route(
    "/emt/practice",
    {
      handler: practiceHandler,
      component: Practice,
    },
  );
  const response = await app.handler()(
    new Request("http://localhost/emt/practice"),
  );

  assertEquals(response.status, 401);
  assertEquals(await response.text(), "Unauthorized");
});

Deno.test("page data response preserves status and headers during rendering", async () => {
  const app = new App({ mode: "development" }).route("/page", {
    handler: {
      GET: () =>
        page({ message: "page data" }, {
          status: 422,
          headers: { "X-Page-Test": "preserved" },
        }),
    },
    component: ({ data }) => {
      assertEquals(data, { message: "page data" });
      return h("p", null, (data as { message: string }).message);
    },
  });
  const response = await app.handler()(new Request("http://localhost/page"));

  assertEquals(response.status, 422);
  assertEquals(response.headers.get("X-Page-Test"), "preserved");
  assertStringIncludes(await response.text(), "<p>page data</p>");
});
