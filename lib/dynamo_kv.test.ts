import { assert, assertEquals, assertThrows } from "@std/assert";
import { CONTRACT_CASES } from "./db_contract.ts";
import { encodeParts, partitionDepth } from "./dynamo_kv.ts";

Deno.test("encodeParts orders numbers numerically", () => {
  const numbers = [-1000, -2.5, -1, 0, 0.5, 1, 2, 9, 10, 100, 1e21];
  const encoded = numbers.map((n) => encodeParts([n]));
  assertEquals([...encoded].sort(), encoded);
});

Deno.test("encodeParts orders shorter keys before their extensions", () => {
  assert(encodeParts(["a"]) < encodeParts(["a", "b"]));
  assert(encodeParts(["a", "b"]) < encodeParts(["ab"]));
  assert(encodeParts(["2026-01-01"]) < encodeParts(["2026-01-02"]));
});

Deno.test("encodeParts rejects unsupported key parts", () => {
  assertThrows(() => encodeParts([true]), TypeError);
  assertThrows(() => encodeParts([1n]), TypeError);
  assertThrows(() => encodeParts([NaN]), TypeError);
});

Deno.test("partitionDepth groups keys by keyspace", () => {
  assertEquals(partitionDepth(["users", "u1"]), 1);
  assertEquals(partitionDepth(["sessions", "s1"]), 2);
  assertEquals(partitionDepth(["emt", "question_content", "q1"]), 2);
  assertEquals(partitionDepth(["emt", "global_question_count"]), 2);
  assertEquals(partitionDepth(["attempts", "by_attempt_id", "u1", "t1"]), 3);
  assertEquals(partitionDepth(["attempts"]), 1);
  assertEquals(partitionDepth(["jokes", "j1"]), 1);
});

// The contract runs against a real DynamoDB API: DynamoDB Local in CI
// (DYNAMODB_ENDPOINT), or AWS itself with DYNAMODB_TEST_AWS=1 and credentials
// in the environment. Either way it creates its own table and deletes it.
const endpoint = Deno.env.get("DYNAMODB_ENDPOINT");
const useAws = Deno.env.get("DYNAMODB_TEST_AWS") === "1";

Deno.test({
  name: "DynamoKv meets the Db contract",
  ignore: !endpoint && !useAws,
  // The AWS SDK keeps sockets and timers alive between calls.
  sanitizeResources: false,
  sanitizeOps: false,
  async fn(t) {
    const {
      CreateTableCommand,
      DeleteTableCommand,
      DynamoDBClient,
      waitUntilTableExists,
    } = await import("@aws-sdk/client-dynamodb");
    const { DynamoKv } = await import("./dynamo_kv.ts");

    const config = endpoint
      ? {
        endpoint,
        region: "us-east-1",
        credentials: { accessKeyId: "local", secretAccessKey: "local" },
      }
      : {};
    const client = new DynamoDBClient(config);
    const table = `weewoo-study-contract-${crypto.randomUUID().slice(0, 8)}`;

    await client.send(
      new CreateTableCommand({
        TableName: table,
        BillingMode: "PAY_PER_REQUEST",
        AttributeDefinitions: [
          { AttributeName: "pk", AttributeType: "S" },
          { AttributeName: "sk", AttributeType: "S" },
        ],
        KeySchema: [
          { AttributeName: "pk", KeyType: "HASH" },
          { AttributeName: "sk", KeyType: "RANGE" },
        ],
      }),
    );
    try {
      await waitUntilTableExists({ client, maxWaitTime: 120 }, {
        TableName: table,
      });
      const db = DynamoKv.make({ table, ...config });
      for (const contractCase of CONTRACT_CASES) {
        await t.step(contractCase.name, () => contractCase.run(db));
      }
      db.close();
    } finally {
      await client.send(new DeleteTableCommand({ TableName: table }));
      client.destroy();
    }
  },
});
