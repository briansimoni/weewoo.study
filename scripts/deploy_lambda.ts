/**
 * Build a Lambda package and upload it to a stage's functions.
 *
 *   deno task deploy:jobs test                 background jobs (infra/jobs.tf)
 *   deno task deploy:jobs prod --confirm-prod
 *   deno task deploy:web test                  the web app (infra/web.tf)
 *   deno task deploy:web test --no-build       upload the existing zip
 *
 * Uses the AWS CLI with the credentials in the environment (`AWS_PROFILE`).
 * Terraform creates the functions; this only replaces their code.
 */
const REGION = "us-east-1";

const PACKAGES = {
  jobs: {
    buildTask: "build:jobs",
    zip: ".lambda/jobs.zip",
    functions: {
      test: ["weewoo-study-test-weekly-report"],
      prod: ["weewoo-study-prod-weekly-report", "weewoo-study-prod-ses-events"],
    },
  },
  web: {
    buildTask: "build:web",
    zip: ".lambda/web/web.zip",
    functions: {
      test: ["weewoo-study-test-web"],
      prod: ["weewoo-study-prod-web"],
    },
  },
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
const [name, stage] = Deno.args.filter((arg) => !arg.startsWith("--"));
if (!(name in PACKAGES) || (stage !== "test" && stage !== "prod")) {
  console.error(
    "usage: deploy_lambda.ts <jobs|web> <test|prod> [--no-build] [--confirm-prod]",
  );
  Deno.exit(2);
}
if (stage === "prod" && !flags.has("--confirm-prod")) {
  console.error(`Refusing to deploy prod ${name} without --confirm-prod`);
  Deno.exit(2);
}
const pkg = PACKAGES[name as keyof typeof PACKAGES];

if (!flags.has("--no-build")) {
  await run(Deno.execPath(), ["task", pkg.buildTask]);
}

for (const fn of pkg.functions[stage]) {
  console.log(`uploading ${pkg.zip} to ${fn}`);
  await run("aws", [
    "lambda",
    "update-function-code",
    "--region",
    REGION,
    "--function-name",
    fn,
    "--zip-file",
    `fileb://${pkg.zip}`,
  ], true);
  await run("aws", [
    "lambda",
    "wait",
    "function-updated",
    "--region",
    REGION,
    "--function-name",
    fn,
  ]);
}
console.log(`deployed: ${pkg.functions[stage].join(", ")}`);
