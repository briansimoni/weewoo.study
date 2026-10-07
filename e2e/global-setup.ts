/**
 * Fail fast when BASE_URL points at a deployment that doesn't exist, instead
 * of every test timing out. Deno Deploy answers unknown preview hosts with a
 * 404 and an x-deno-error DEPLOYMENT_NOT_FOUND header.
 */
export default async function globalSetup() {
  const baseURL = process.env.BASE_URL;
  if (!baseURL) return; // local run: Playwright's webServer starts the app
  const res = await fetch(new URL("/robots.txt", baseURL));
  await res.body?.cancel();
  if (res.headers.get("x-deno-error")?.includes("DEPLOYMENT_NOT_FOUND")) {
    throw new Error(
      `No deployment at ${baseURL}. Preview hosts use the branch name with "/" removed ` +
        "(feat/x -> featx), and a commit pushed to two branches may only be built for one.",
    );
  }
}
