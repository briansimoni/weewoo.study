import { expect, type Page, test } from "@playwright/test";
import { loginAs } from "./helpers.ts";

/**
 * The admin pages, as the seed admin (an admin only through the test login in
 * DEV/TEST). These also run against branch previews, so they never delete
 * anything and tolerate re-runs.
 */
test.beforeEach(async ({ page }) => {
  await loginAs(page, "seed|admin", "/admin");
});

async function openFirstQuestion(page: Page, scope = "emt") {
  await page.goto(`/admin/questions?scope=${scope}`);
  const link = page.getByRole("table").getByRole("link").first();
  const text = await link.textContent();
  await link.click();
  await page.waitForURL(/\/admin\/questions\/[^?]+\?scope=/);
  await page.waitForLoadState("networkidle");
  return text!;
}

test("the dashboard counts each question bank", async ({ page }) => {
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
  await expect(
    page.getByRole("navigation", { name: "Admin" })
      .getByRole("link", { name: "Dashboard" }),
  )
    .toHaveAttribute("aria-current", "page");
  await expect(page.getByText("EMT questions")).toBeVisible();
  await expect(page.getByText("Medic questions")).toBeVisible();
});

test("questions switch banks and filter by text and category", async ({ page }) => {
  await page.goto("/admin/questions?scope=advanced");
  const rows = page.getByRole("table").getByRole("row");
  await expect(rows.nth(1)).toContainText("(advanced #");
  await expect(
    page.getByRole("navigation", { name: "Question bank" })
      .getByRole("link", { name: "Advanced" }),
  ).toHaveAttribute("aria-current", "page");

  await page.goto("/admin/questions?scope=emt");
  await page.getByLabel("Category").selectOption("Shock");
  await page.getByRole("button", { name: "Filter" }).click();
  await page.waitForURL(/category=Shock/);
  await expect(page.getByTestId("question-count")).toContainText(" of ");
  for (const row of await rows.all()) {
    if (await row.locator("td").count()) {
      await expect(row).toContainText("Shock");
    }
  }

  await page.getByLabel("Search questions").fill("no question says this");
  await page.getByRole("button", { name: "Filter" }).click();
  await expect(page.getByText("No questions match these filters."))
    .toBeVisible();
  await page.getByRole("link", { name: "Clear" }).click();
  await expect(page.getByLabel("Search questions")).toHaveValue("");
});

test("an admin edits a question's explanation", async ({ page }) => {
  const text = await openFirstQuestion(page, "medic");
  await expect(page.getByText(text)).toBeVisible();

  const marker = `[Seed] Edited by E2E ${Date.now()}`;
  await page.getByRole("button", { name: "Edit Question" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Explanation").fill(marker);
  await dialog.getByRole("button", { name: "Save Changes" }).click();
  // The editor reloads the question (same ID: the text didn't change).
  await expect(page.getByText(marker, { exact: true })).toBeVisible({
    timeout: 10_000,
  });
  await expect(page).toHaveURL(/scope=medic/);
});

test("deleting asks for confirmation", async ({ page }) => {
  await openFirstQuestion(page);
  await page.getByRole("button", { name: "Delete Question" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByText("can't be undone")).toBeVisible();
  await dialog.getByRole("button", { name: "Cancel" }).click();
  await expect(dialog).toBeHidden();
});

test("an admin resolves a report from the reports page", async ({ page }) => {
  // File a fresh report, so there's always an open one to resolve.
  await openFirstQuestion(page);
  const questionId = new URL(page.url()).pathname.split("/").pop();
  const reason = `[Seed] E2E report ${Date.now()}`;
  const response = await page.request.post("/api/question/reports", {
    data: { questionId, thumbs: "down", reason },
  });
  expect(response.ok()).toBe(true);

  await page.goto("/admin/question-reports?scope=emt&status=open&kind=down");
  const card = page.getByTestId("report-card").filter({ hasText: reason });
  await expect(card).toBeVisible();
  await card.getByRole("button", { name: "Resolve" }).click();
  await expect(card.getByText("Resolved", { exact: true })).toBeVisible();

  await page.reload();
  await expect(page.getByTestId("report-card").filter({ hasText: reason }))
    .toHaveCount(0);
  await page.goto("/admin/question-reports?scope=emt&status=resolved&kind=all");
  await expect(page.getByTestId("report-card").filter({ hasText: reason }))
    .toBeVisible();
});

test("every admin page renders in the shell", async ({ page }) => {
  for (
    const path of [
      "/admin/question-reports",
      "/admin/questions/question-reports-stats",
      "/admin/question-generator",
      "/admin/users",
      "/admin/database",
    ]
  ) {
    const response = await page.goto(path);
    expect(response?.status(), path).toBe(200);
    await expect(page.getByRole("navigation", { name: "Admin" })).toBeVisible();
  }
});

test("the debug page is for the real admin only", async ({ page }) => {
  const response = await page.goto("/admin/debug");
  expect(response?.status()).toBe(403);
});

test("resetting a user's stats asks first", async ({ page }) => {
  // Other specs rely on the seed users' stats, so answer the reset here.
  const posted: string[] = [];
  await page.route("**/admin/users", (route) => {
    if (route.request().method() !== "POST") return route.fallback();
    posted.push(route.request().postData() ?? "");
    return route.fulfill({
      status: 303,
      headers: { location: "/admin/users" },
    });
  });
  await page.goto("/admin/users");
  const reset = page.getByRole("button", {
    name: "Reset stats for Seed Expert",
  });
  const dialog = page.getByRole("dialog", {
    name: "Reset Seed Expert's stats?",
  });

  await reset.click();
  await expect(dialog.getByText("can't be undone")).toBeVisible();
  await dialog.getByRole("button", { name: "Cancel" }).click();
  await expect(dialog).toBeHidden();

  // A click outside the dialog closes it without submitting.
  await reset.click();
  await expect(dialog).toBeVisible();
  await page.mouse.click(5, 5);
  await expect(dialog).toBeHidden();
  expect(posted).toEqual([]);

  await reset.click();
  await dialog.getByRole("button", { name: "Reset stats" }).click();
  await expect.poll(() => posted.length).toBe(1);
  expect(posted[0]).toContain("action=reset_stats");
  expect(posted[0]).toContain(`userId=${encodeURIComponent("seed|expert")}`);
});
