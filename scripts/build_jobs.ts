/**
 * Build the background-job Lambda package: .lambda/jobs.zip.
 *
 *   deno task build:jobs
 *
 * See scripts/lambda_package.ts for how the package is made.
 */
import { buildPackage } from "./lambda_package.ts";

const DIR = ".lambda";

// Only this build's own files: .lambda/web/ belongs to build_web.ts.
for (const file of ["main.js", "bootstrap", "bootstrap.exe", "jobs.zip"]) {
  await Deno.remove(`${DIR}/${file}`).catch(() => {});
}
await Deno.mkdir(DIR, { recursive: true });

await buildPackage({
  entry: "lambda/main.ts",
  dir: DIR,
  bundle: "main.js",
  zip: "jobs.zip",
});
