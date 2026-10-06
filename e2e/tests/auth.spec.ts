import { expect, test } from "@playwright/test";
import { loginAs } from "./helpers.ts";

test("practice requires login", async ({ request }) => {
  const res = await request.get("/emt/practice", { maxRedirects: 0 });
  expect(res.status()).toBe(302);
  expect(res.headers()["location"]).toContain("/auth/login");
});

test("admin pages are blocked for non-admin users", async ({ page }) => {
  await loginAs(page, "seed|expert");
  const res = await page.goto("/admin");
  expect(res?.status()).toBe(401);
});

test("test login only accepts seed users", async ({ request }) => {
  const res = await request.post("/auth/test-login", {
    form: { user_id: "auth0|67b28845f4ba32d0be58bc46" },
    maxRedirects: 0,
  });
  expect(res.status()).toBe(404);
});
