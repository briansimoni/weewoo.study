/**
 * Test login (routes/auth/test-login.tsx) and the seed admin only work in test
 * environments: STAGE is DEV or TEST, never PROD, never unset.
 */
export function testLoginEnabled(stage = Deno.env.get("STAGE")): boolean {
  return stage === "DEV" || stage === "TEST";
}
