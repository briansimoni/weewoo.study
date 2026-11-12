/**
 * Open the AWS console for the app's resources in the default browser.
 *
 *   deno task console                 the test table's items
 *   deno task console prod            the prod table's items
 *   deno task console test logs       the stage's CloudWatch log group
 *   deno task console --print         print the URL instead of opening it
 *
 * You must be signed in to AWS account 502859415194 in that browser.
 */
const REGION = "us-east-1";
const STAGES = {
  test: { table: "weewoo-study-test", logGroup: "/weewoo-study/test" },
  prod: { table: "weewoo-study-prod", logGroup: "/weewoo-study/production" },
} as const;
const PAGES = ["table", "logs"] as const;

type Stage = keyof typeof STAGES;
type Page = (typeof PAGES)[number];

export function consoleUrl(stage: Stage, page: Page): string {
  const base = `https://${REGION}.console.aws.amazon.com`;
  if (page === "logs") {
    // The CloudWatch console wants "/" in the log group name as "$252F".
    const group = STAGES[stage].logGroup.replaceAll("/", "$252F");
    return `${base}/cloudwatch/home?region=${REGION}#logsV2:log-groups/log-group/${group}`;
  }
  return `${base}/dynamodbv2/home?region=${REGION}#item-explorer?table=${
    STAGES[stage].table
  }`;
}

function openCommand(url: string): [string, string[]] {
  switch (Deno.build.os) {
    case "windows":
      // rundll32 takes the URL as is; `cmd /c start` would split it at "&".
      return ["rundll32", ["url.dll,FileProtocolHandler", url]];
    case "darwin":
      return ["open", [url]];
    default:
      return ["xdg-open", [url]];
  }
}

if (import.meta.main) {
  const print = Deno.args.includes("--print");
  const [stage = "test", page = "table"] = Deno.args.filter((arg) =>
    !arg.startsWith("--")
  );
  if (!(stage in STAGES) || !PAGES.includes(page as Page)) {
    console.error(
      "usage: deno task console [test|prod] [table|logs] [--print]",
    );
    Deno.exit(2);
  }
  const url = consoleUrl(stage as Stage, page as Page);
  console.log(url);
  if (!print) {
    const [command, args] = openCommand(url);
    const { success } = await new Deno.Command(command, { args }).output();
    if (!success) {
      console.error("Could not open a browser; open the URL above yourself.");
      Deno.exit(1);
    }
  }
}
