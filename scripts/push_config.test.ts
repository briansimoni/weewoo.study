import { assertEquals } from "@std/assert";
import { isPushed } from "./push_config.ts";

Deno.test("isPushed keeps app settings and skips what Lambda or Terraform provide", () => {
  for (const key of ["STRIPE_API_KEY", "CLIENT_SECRET", "ADMIN_EMAIL"]) {
    assertEquals(isPushed(key), true, key);
  }
  for (
    const key of [
      "AWS_ACCESS_KEY_ID",
      "AWS_SECRET_ACCESS_KEY",
      "AWS_REGION",
      "STAGE",
      "DYNAMODB_TABLE",
      "CONFIG_PATH",
      "ORIGIN_SECRET",
      "KV_PATH",
      "SEED_ON_EMPTY",
      "DENO_DEPLOYMENT_ID",
    ]
  ) {
    assertEquals(isPushed(key), false, key);
  }
});
