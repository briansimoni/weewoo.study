/**
 * Build the background-job package and upload it to a stage's Lambda
 * functions (infra/jobs.tf).
 *
 *   deno task deploy:jobs test
 *   deno task deploy:jobs prod --confirm-prod
 *   deno task deploy:jobs test --no-build     upload the existing .lambda/jobs.zip
 *
 * Uses the AWS CLI with the credentials in the environment (`AWS_PROFILE`).
 */
const REGION = "us-east-1";
const ZIP = ".lambda/jobs.zip";
const FUNCTIONS = {
  test: ["weewoo-study-test-weekly-report"],
  prod: ["weewoo-study-prod-weekly-report", "weewoo-study-prod-ses-events"],
} as const;

async function run(command: string, args: string[], quiet = false) {
  const { success } = await new Deno.Command(command, {
    args,
    stdout: quiet ? "null" : "inherit",
    stderr: "inherit",
  }).output();
  if (!success) {
    console.error(`${command} ${args.slice(0, 2).join(" ")} failed`);
    Deno.exit(1);
  }
}

const flags = new Set(Deno.args.filter((arg) => arg.startsWith("--")));
const [stage] = Deno.args.filter((arg) => !arg.startsWith("--"));
if (stage !== "test" && stage !== "prod") {
  console.error(
    "usage: deno task deploy:jobs <test|prod> [--no-build] [--confirm-prod]",
  );
  Deno.exit(2);
}
if (stage === "prod" && !flags.has("--confirm-prod")) {
  console.error("Refusing to deploy prod jobs without --confirm-prod");
  Deno.exit(2);
}

if (!flags.has("--no-build")) {
  await run(Deno.execPath(), ["task", "build:jobs"]);
}

for (const name of FUNCTIONS[stage]) {
  console.log(`uploading ${ZIP} to ${name}`);
  await run("aws", [
    "lambda",
    "update-function-code",
    "--region",
    REGION,
    "--function-name",
    name,
    "--zip-file",
    `fileb://${ZIP}`,
  ], true);
  await run("aws", [
    "lambda",
    "wait",
    "function-updated",
    "--region",
    REGION,
    "--function-name",
    name,
  ]);
}
console.log(`deployed: ${FUNCTIONS[stage].join(", ")}`);
