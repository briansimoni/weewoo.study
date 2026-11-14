/**
 * Build the background-job Lambda package: .lambda/jobs.zip.
 *
 *   deno task build:jobs
 *
 * lambda/main.ts is bundled into one file and compiled, with the Deno
 * runtime, into a Linux executable named `bootstrap`, which is what Lambda's
 * `provided.al2023` runtime starts. Bundling first matters: compiling the
 * entry point directly embeds the project's whole node_modules (about 400 MB,
 * over Lambda's 250 MB limit).
 *
 * The zip is written here rather than with a zip tool so that `bootstrap`
 * keeps its executable bit when built on Windows.
 */
import JSZip from "jszip";

// Must match `architectures` in infra/jobs.tf.
const TARGET = "aarch64-unknown-linux-gnu";
const OUT = ".lambda";

async function deno(args: string[], cwd?: string) {
  const { success } = await new Deno.Command(Deno.execPath(), {
    args,
    cwd,
    stdout: "inherit",
    stderr: "inherit",
  }).output();
  if (!success) {
    console.error(`deno ${args[0]} failed`);
    Deno.exit(1);
  }
}

await Deno.remove(OUT, { recursive: true }).catch(() => {});
await Deno.mkdir(OUT, { recursive: true });

await deno([
  "bundle",
  "--platform",
  "deno",
  "--output",
  `${OUT}/main.js`,
  "lambda/main.ts",
]);

// Compiled from inside the output directory with --no-config, so nothing of
// the project besides the bundle is embedded.
await deno([
  "compile",
  "--no-config",
  "--no-check",
  "--allow-env",
  "--allow-net",
  "--allow-sys",
  "--allow-read",
  "--target",
  TARGET,
  "--output",
  "bootstrap",
  "main.js",
], OUT);

const zip = new JSZip();
zip.file("bootstrap", await Deno.readFile(`${OUT}/bootstrap`), {
  unixPermissions: "755",
  // A fixed date keeps the zip byte-identical for identical code.
  date: new Date("2000-01-01T00:00:00Z"),
});
const bytes = await zip.generateAsync({
  type: "uint8array",
  platform: "UNIX",
  compression: "DEFLATE",
  compressionOptions: { level: 6 },
});
await Deno.writeFile(`${OUT}/jobs.zip`, bytes);
console.log(
  `${OUT}/jobs.zip: ${(bytes.length / 1024 / 1024).toFixed(1)} MB (${TARGET})`,
);
