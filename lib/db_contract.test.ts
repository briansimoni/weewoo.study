import { CONTRACT_CASES } from "./db_contract.ts";

for (const contractCase of CONTRACT_CASES) {
  if (contractCase.strictExpiry) continue;
  Deno.test(`Deno KV: ${contractCase.name}`, async () => {
    using kv = await Deno.openKv(":memory:");
    await contractCase.run(kv);
  });
}
