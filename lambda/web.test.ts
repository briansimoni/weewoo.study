import { assertEquals } from "@std/assert";
import { loadConfig } from "./web.ts";

Deno.test("loadConfig copies every page of parameters into the environment", async () => {
  const pages = [
    {
      Parameters: [
        { Name: "/weewoo-study/test/STRIPE_API_KEY", Value: "sk_test_1" },
        { Name: "/weewoo-study/test/STAGE", Value: "from-ssm" },
      ],
      NextToken: "page-2",
    },
    { Parameters: [{ Name: "/weewoo-study/test/CLIENT_ID", Value: "abc" }] },
  ];
  const requests: unknown[] = [];
  const client = {
    send: (command: { input: unknown }) => {
      requests.push(command.input);
      return Promise.resolve(pages[requests.length - 1]);
    },
  };
  // STAGE is already set (by Terraform on Lambda) and must win.
  const env = new Map([["STAGE", "TEST"]]);

  const loaded = await loadConfig(
    "/weewoo-study/test",
    client as unknown as Parameters<typeof loadConfig>[1],
    env,
  );

  assertEquals(loaded, ["STRIPE_API_KEY", "CLIENT_ID"]);
  assertEquals(Object.fromEntries(env), {
    STAGE: "TEST",
    STRIPE_API_KEY: "sk_test_1",
    CLIENT_ID: "abc",
  });
  assertEquals(requests, [
    { Path: "/weewoo-study/test", WithDecryption: true, NextToken: undefined },
    { Path: "/weewoo-study/test", WithDecryption: true, NextToken: "page-2" },
  ]);
});
