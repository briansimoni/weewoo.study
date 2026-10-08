/**
 * Read-only smoke test against a running deployment. Makes GET requests only.
 *
 *   deno task smoke http://localhost:8000
 *   deno task smoke https://test-weewoo-study--my-branch.briansimoni.deno.net --empty-db
 *
 * --empty-db skips checks that need KV data (questions, products). Branch
 * previews start with an empty database.
 */

const args = Deno.args.filter((a) => !a.startsWith("--"));
const emptyDb = Deno.args.includes("--empty-db");
const base = (args[0] ?? "http://localhost:8000").replace(/\/$/, "");

type Check = { path: string; expect: number[]; needsData?: boolean };

const checks: Check[] = [
  { path: "/", expect: [200] },
  { path: "/about", expect: [200] },
  { path: "/shop", expect: [200] },
  { path: "/leaderboard", expect: [200] },
  { path: "/support", expect: [200] },
  { path: "/cart", expect: [200] },
  { path: "/robots.txt", expect: [200] },
  { path: "/auth/logged-out", expect: [200] },
  { path: "/emt/practice", expect: [302] },
  { path: "/profile", expect: [302, 401] },
  { path: "/admin", expect: [302, 401, 403] },
  { path: "/api/question", expect: [200], needsData: true },
  { path: "/this-page-does-not-exist", expect: [404] },
];

let failures = 0;
const fail = (msg: string) => {
  failures++;
  console.log(`FAIL ${msg}`);
};

async function get(path: string) {
  const res = await fetch(base + path, { redirect: "manual" });
  const body = await res.text();
  return { status: res.status, body };
}

// A wrong preview URL returns Deno Deploy's own 404 for every path.
const probe = await get("/");
if (probe.status === 404 && probe.body.includes("DEPLOYMENT_NOT_FOUND")) {
  console.log(
    `FAIL no deployment at ${base}. Preview URLs use the branch name with ` +
      "'/' removed, e.g. feat/x -> https://test-weewoo-study--featx.briansimoni.deno.net. " +
      "If the branch alias is missing, use the build's revision URL: " +
      "https://test-weewoo-study-<build id>.briansimoni.deno.net (build ID from the deploy commit status).",
  );
  Deno.exit(1);
}

const pages = new Map<string, string>();
for (const check of checks) {
  if (emptyDb && check.needsData) {
    console.log(`skip ${check.path} (--empty-db)`);
    continue;
  }
  try {
    const { status, body } = await get(check.path);
    pages.set(check.path, body);
    if (check.expect.includes(status)) {
      console.log(`ok   ${status} ${check.path}`);
    } else {
      fail(`${status} ${check.path} (expected ${check.expect.join("|")})`);
    }
  } catch (error) {
    fail(`${check.path}: ${error}`);
  }
}

// A product detail page, if the shop lists any.
const productPath = pages.get("/shop")?.match(/href="(\/shop\/[^"]+)"/)?.[1];
if (productPath) {
  const { status, body } = await get(productPath);
  pages.set(productPath, body);
  status === 200
    ? console.log(`ok   ${status} ${productPath}`)
    : fail(`${status} ${productPath}`);
} else if (!emptyDb) {
  fail("no product links on /shop");
}

// Every client asset referenced by the fetched pages must load.
const assets = new Set<string>();
for (const body of pages.values()) {
  for (const m of body.matchAll(/["'](\/assets\/[^"'?\s]+\.(?:js|css))/g)) {
    assets.add(m[1]);
  }
}
for (const asset of assets) {
  const res = await fetch(base + asset);
  await res.body?.cancel();
  if (res.status !== 200) fail(`${res.status} asset ${asset}`);
}
console.log(`assets checked: ${assets.size}`);
if (assets.size === 0) fail("no /assets/ references found (build problem?)");

console.log(failures === 0 ? "RESULT: PASS" : `RESULT: FAIL (${failures})`);
Deno.exit(failures === 0 ? 0 : 1);
