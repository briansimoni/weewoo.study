/**
 * Runs the Fresh web app as a Lambda function behind an HTTP API and
 * CloudFront (infra/web.tf).
 *
 * `deno task build:web` generates the real entry point, which calls
 * `startWeb` with the production build (`_fresh/server.js`), then bundles and
 * compiles it into the function's `bootstrap` executable. The build is passed
 * in, rather than imported here, so this file type-checks without a build.
 */
import { GetParametersByPathCommand, SSMClient } from "@aws-sdk/client-ssm";
import { type FetchHandler, httpApiHandler } from "./http.ts";
import { serveLambda } from "./runtime.ts";

/**
 * Copy the stage's settings from Parameter Store into the environment, where
 * the app reads them: the parameter `/weewoo-study/test/STRIPE_API_KEY`
 * becomes `STRIPE_API_KEY`. Variables that are already set (by Terraform, or
 * the execution role's credentials) are left alone.
 */
export async function loadConfig(
  path: string,
  client: Pick<SSMClient, "send"> = new SSMClient({}),
  env: Pick<Deno.Env, "get" | "set"> = Deno.env,
): Promise<string[]> {
  const loaded: string[] = [];
  let nextToken: string | undefined;
  do {
    const page = await client.send(
      new GetParametersByPathCommand({
        Path: path,
        WithDecryption: true,
        NextToken: nextToken,
      }),
    );
    for (const parameter of page.Parameters ?? []) {
      const name = parameter.Name?.split("/").pop();
      if (!name || parameter.Value === undefined) continue;
      if (env.get(name) !== undefined) continue;
      env.set(name, parameter.Value);
      loaded.push(name);
    }
    nextToken = page.NextToken;
  } while (nextToken);
  return loaded;
}

export async function startWeb(
  loadServer: () => Promise<{ default: { fetch: FetchHandler } }>,
): Promise<void> {
  const api = Deno.env.get("AWS_LAMBDA_RUNTIME_API");
  if (!api) {
    console.error("AWS_LAMBDA_RUNTIME_API is not set: not running on Lambda");
    Deno.exit(1);
  }

  // Settings must be in the environment before the app's modules load: they
  // read it at import time (the Stripe key check in main.ts, for one).
  const configPath = Deno.env.get("CONFIG_PATH");
  if (configPath) {
    const loaded = await loadConfig(configPath);
    console.log(JSON.stringify({
      level: "info",
      message: "loaded settings from Parameter Store",
      path: configPath,
      count: loaded.length,
    }));
  }

  const { default: server } = await loadServer();
  await serveLambda({
    api,
    handler: httpApiHandler(server.fetch, {
      originSecret: Deno.env.get("ORIGIN_SECRET") || undefined,
    }),
    onError: (error, requestId) =>
      console.error(JSON.stringify({
        level: "error",
        message: "request failed outside the app",
        requestId,
        error: String(error),
      })),
  });
}
