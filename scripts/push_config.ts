/**
 * Copy settings from an env file into Parameter Store, where the web app on
 * Lambda reads them at startup (lambda/web.ts, `loadConfig`).
 *
 *   deno task config:push test ../weewoo-test.env
 *   deno task config:push test ../weewoo-test.env --dry-run
 *   deno task config:push prod ../weewoo-prod.env --confirm-prod
 *
 * Each `KEY=value` line becomes the encrypted parameter
 * `/weewoo-study/<stage>/KEY`. Existing parameters are overwritten; ones not
 * in the file are left alone. Keep the env file out of the repository. The
 * function reads its settings when it starts, so deploy (or change any
 * function setting) afterwards to make running copies pick them up.
 *
 * Skipped, because Lambda provides or Terraform sets them: AWS credentials
 * and region, STAGE, DYNAMODB_TABLE, CONFIG_PATH, ORIGIN_SECRET; and the
 * Deno-KV-only KV_PATH and SEED_ON_EMPTY.
 */
import { parse } from "@std/dotenv";

const REGION = "us-east-1";
const SKIP = new Set([
  "STAGE",
  "DYNAMODB_TABLE",
  "DYNAMODB_ENDPOINT",
  "CONFIG_PATH",
  "ORIGIN_SECRET",
  "KV_PATH",
  "SEED_ON_EMPTY",
]);

export function isPushed(key: string): boolean {
  return !SKIP.has(key) && !key.startsWith("AWS_") && !key.startsWith("DENO_");
}

if (import.meta.main) {
  const flags = new Set(Deno.args.filter((arg) => arg.startsWith("--")));
  const [stage, file] = Deno.args.filter((arg) => !arg.startsWith("--"));
  if ((stage !== "test" && stage !== "prod") || !file) {
    console.error(
      "usage: deno task config:push <test|prod> <env-file> [--dry-run] [--confirm-prod]",
    );
    Deno.exit(2);
  }
  if (stage === "prod" && !flags.has("--confirm-prod")) {
    console.error("Refusing to write prod settings without --confirm-prod");
    Deno.exit(2);
  }

  let text: string;
  try {
    text = await Deno.readTextFile(file);
  } catch (error) {
    if (!(error instanceof Deno.errors.NotFound)) throw error;
    console.error(
      `${file} does not exist. Create it with one KEY=value line per setting ` +
        `(the keys are listed under "Environment variables" in the README).`,
    );
    Deno.exit(2);
  }
  const entries = Object.entries(parse(text));
  for (const [key, value] of entries) {
    if (!isPushed(key)) {
      console.log(`skip   ${key}`);
      continue;
    }
    if (value === "") {
      console.log(`skip   ${key} (empty)`);
      continue;
    }
    if (flags.has("--dry-run")) {
      console.log(`would  ${key}`);
      continue;
    }
    // The value goes through a file, not the command line, so it does not
    // show up in the process list. Names are never printed with values.
    const input = await Deno.makeTempFile({ suffix: ".json" });
    try {
      await Deno.writeTextFile(
        input,
        JSON.stringify({
          Name: `/weewoo-study/${stage}/${key}`,
          Value: value,
          Type: "SecureString",
          Overwrite: true,
        }),
      );
      const { success, stderr } = await new Deno.Command("aws", {
        args: [
          "ssm",
          "put-parameter",
          "--region",
          REGION,
          "--cli-input-json",
          `file://${input}`,
        ],
        stdout: "null",
        stderr: "piped",
      }).output();
      if (!success) {
        console.error(`FAILED ${key}: ${new TextDecoder().decode(stderr)}`);
        Deno.exit(1);
      }
      console.log(`set    ${key}`);
    } finally {
      await Deno.remove(input);
    }
  }
}
