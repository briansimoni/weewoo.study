/**
 * Credentials for AWS SDK clients.
 *
 * On Deno Deploy the app signs requests with the IAM user's key pair from the
 * environment. On Lambda the environment holds the execution role's temporary
 * credentials, which also need `AWS_SESSION_TOKEN`: return undefined there so
 * the SDK's default provider reads all three.
 */
export function awsCredentials():
  | { accessKeyId: string; secretAccessKey: string }
  | undefined {
  if (Deno.env.get("AWS_SESSION_TOKEN")) return undefined;
  return {
    accessKeyId: Deno.env.get("AWS_ACCESS_KEY_ID") || "",
    secretAccessKey: Deno.env.get("AWS_SECRET_ACCESS_KEY") || "",
  };
}
