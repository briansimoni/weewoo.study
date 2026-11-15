/**
 * Shared steps of the Lambda package builds (build_jobs.ts, build_web.ts):
 * bundle an entry point, compile it with the Deno runtime into a Linux
 * executable named `bootstrap` (what Lambda's `provided.al2023` runtime
 * starts), and zip it.
 *
 * Bundling first matters: compiling an entry point directly embeds the
 * project's whole node_modules (about 400 MB, over Lambda's 250 MB limit).
 * The zip is written here rather than with a zip tool so that `bootstrap`
 * keeps its executable bit when built on Windows.
 */
import JSZip from "jszip";

// Must match the functions' `architectures` in infra/.
export const LAMBDA_TARGET = "aarch64-unknown-linux-gnu";

export async function deno(args: string[], cwd?: string) {
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

export async function emptyDir(dir: string) {
  await Deno.remove(dir, { recursive: true }).catch(() => {});
  await Deno.mkdir(dir, { recursive: true });
}

export interface PackageOptions {
  /** Entry point to bundle, relative to the project root. */
  entry: string;
  /** Output directory, emptied by the caller. */
  dir: string;
  /** Where the bundle goes inside `dir`. */
  bundle: string;
  /** Paths inside `dir` to embed in the executable as files. */
  include?: string[];
  /** `--target` for `deno compile`; the Lambda target by default. */
  target?: string;
  /** Name of the zip written into `dir`; no zip when omitted. */
  zip?: string;
}

export async function buildPackage(options: PackageOptions) {
  const { dir, bundle } = options;
  const target = options.target ?? LAMBDA_TARGET;

  await deno([
    "bundle",
    "--platform",
    "deno",
    "--output",
    `${dir}/${bundle}`,
    options.entry,
  ]);

  // Compiled from inside the output directory with --no-config, so nothing of
  // the project besides the bundle (and `include`) is embedded.
  await deno([
    "compile",
    "--no-config",
    "--no-check",
    "--allow-env",
    "--allow-net",
    "--allow-sys",
    "--allow-read",
    ...(options.include ?? []).flatMap((path) => ["--include", path]),
    "--target",
    target,
    "--output",
    "bootstrap",
    bundle,
  ], dir);

  if (!options.zip) return;
  const zip = new JSZip();
  zip.file("bootstrap", await Deno.readFile(`${dir}/bootstrap`), {
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
  await Deno.writeFile(`${dir}/${options.zip}`, bytes);
  console.log(
    `${dir}/${options.zip}: ${
      (bytes.length / 1024 / 1024).toFixed(1)
    } MB (${target})`,
  );
}
