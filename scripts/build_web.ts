/**
 * Build the web app's Lambda package: .lambda/web/web.zip.
 *
 *   deno task build:web            builds the app first (deno task build)
 *   deno task build:web --no-app   reuse the existing _fresh/ build
 *   deno task build:web --host     also compile for this machine, to try the
 *                                  executable locally (no zip)
 *
 * The package is one executable: the production server build, its npm
 * dependencies and the Deno runtime, with the static files (`_fresh/client`)
 * embedded. The server finds those files relative to its own location, one
 * directory up from the server code, so the layout here mirrors `_fresh/`:
 *
 *   .lambda/web/server/main.js   the bundle (stands in for _fresh/server/)
 *   .lambda/web/client/          a copy of _fresh/client/
 */
import { buildPackage, deno, emptyDir } from "./lambda_package.ts";

const DIR = ".lambda/web";
const flags = new Set(Deno.args);

async function copyDir(from: string, to: string) {
  await Deno.mkdir(to, { recursive: true });
  for await (const entry of Deno.readDir(from)) {
    if (entry.isDirectory) {
      await copyDir(`${from}/${entry.name}`, `${to}/${entry.name}`);
    } else {
      await Deno.copyFile(`${from}/${entry.name}`, `${to}/${entry.name}`);
    }
  }
}

if (!flags.has("--no-app")) await deno(["task", "build"]);

await emptyDir(DIR);
await copyDir("_fresh/client", `${DIR}/client`);

// The entry point is generated because it imports the build output, which
// doesn't exist when the repository is type-checked.
const entry = `${DIR}/entry.ts`;
await Deno.writeTextFile(
  entry,
  `import { startWeb } from "../../lambda/web.ts";\n` +
    `await startWeb(() => import("../../_fresh/server.js"));\n`,
);

const options = {
  entry,
  dir: DIR,
  bundle: "server/main.js",
  include: ["client"],
};
if (flags.has("--host")) {
  await buildPackage({ ...options, target: Deno.build.target });
} else {
  await buildPackage({ ...options, zip: "web.zip" });
}
