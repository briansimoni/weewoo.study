import { assert, assertEquals, assertFalse } from "@std/assert";
import type { Db, DbListOptions, DbListSelector } from "./db.ts";

/**
 * The behavior every `Db` backend must share, as a list of test cases. Each
 * backend's test file runs them against its own database (`db_contract.test.ts`
 * for Deno KV, `dynamo_kv.test.ts` for DynamoDB), so the stores behave the
 * same on both. Every case uses its own key prefix, so cases can share one
 * database.
 */
export interface ContractCase {
  name: string;
  /**
   * Needs entries to disappear the moment they expire. DynamoKv guarantees
   * that; Deno KV removes expired entries some time later.
   */
  strictExpiry?: boolean;
  run: (db: Db) => Promise<void>;
}

async function keys(
  db: Db,
  selector: DbListSelector,
  options?: DbListOptions,
) {
  const result: Deno.KvKey[] = [];
  for await (const entry of db.list(selector, options)) result.push(entry.key);
  return result;
}

export const CONTRACT_CASES: ContractCase[] = [
  {
    name: "get returns null for a missing key",
    async run(db) {
      const entry = await db.get(["users", "c1-missing"]);
      assertEquals(entry.value, null);
      assertEquals(entry.versionstamp, null);
    },
  },
  {
    name: "set then get round-trips values",
    async run(db) {
      const value = {
        text: "hello",
        count: 3,
        ratio: 0.25,
        flag: false,
        list: ["a", 1, { nested: true }],
        empty: "",
        nothing: null,
      };
      const result = await db.set(["users", "c2"], value);
      assert(result.ok);
      const entry = await db.get(["users", "c2"]);
      assertEquals(entry.value, value);
      assert(entry.versionstamp);

      await db.set(["emt", "global_question_count"], 7);
      assertEquals((await db.get(["emt", "global_question_count"])).value, 7);
      await db.set(["emt", "global_question_index", 0], "abc");
      assertEquals(
        (await db.get(["emt", "global_question_index", 0])).value,
        "abc",
      );
    },
  },
  {
    name: "undefined object properties are dropped",
    async run(db) {
      await db.set(["users", "c3"], { a: 1, b: undefined });
      const entry = await db.get<{ a: number; b?: number }>(["users", "c3"]);
      assertEquals(entry.value?.a, 1);
      assertEquals(entry.value?.b, undefined);
    },
  },
  {
    name: "set overwrites and changes the versionstamp",
    async run(db) {
      await db.set(["users", "c4"], 1);
      const first = await db.get(["users", "c4"]);
      await db.set(["users", "c4"], 2);
      const second = await db.get(["users", "c4"]);
      assertEquals(second.value, 2);
      assert(first.versionstamp !== second.versionstamp);
    },
  },
  {
    name: "delete removes the entry and ignores missing keys",
    async run(db) {
      await db.set(["users", "c5"], 1);
      await db.delete(["users", "c5"]);
      assertEquals((await db.get(["users", "c5"])).value, null);
      await db.delete(["users", "c5"]);
    },
  },
  {
    name: "an expired entry reads as missing",
    strictExpiry: true,
    async run(db) {
      await db.set(["sessions", "c6"], "soon gone", { expireIn: 1000 });
      assertEquals((await db.get(["sessions", "c6"])).value, "soon gone");
      await new Promise((resolve) => setTimeout(resolve, 2100));
      const entry = await db.get(["sessions", "c6"]);
      assertEquals(entry.value, null);
      assertEquals(entry.versionstamp, null);
      // A claim on the expired key succeeds, as in the Stripe webhook.
      const claim = await db.atomic()
        .check({ key: ["sessions", "c6"], versionstamp: null })
        .set(["sessions", "c6"], "again")
        .commit();
      assert(claim.ok);
    },
  },
  {
    name: "list returns the entries under a prefix in key order",
    async run(db) {
      await db.set(["variants", "c7", "b"], 2);
      await db.set(["variants", "c7", "a"], 1);
      await db.set(["variants", "c7", "c"], 3);
      await db.set(["variants", "c7-other", "a"], 9);
      await db.set(["variants", "c7"], "the prefix itself");

      const entries = [];
      for await (
        const entry of db.list<number>({ prefix: ["variants", "c7"] })
      ) {
        entries.push(entry);
      }
      assertEquals(entries.map((e) => e.key), [
        ["variants", "c7", "a"],
        ["variants", "c7", "b"],
        ["variants", "c7", "c"],
      ]);
      assertEquals(entries.map((e) => e.value), [1, 2, 3]);
      assert(entries.every((e) => e.versionstamp));
    },
  },
  {
    name: "list matches whole key parts, not string prefixes",
    async run(db) {
      await db.set(["products", "c8"], 1);
      await db.set(["products", "c8x"], 2);
      await db.set(["attempts", "by_question_id", "c8", "q1", "t1"], 1);
      await db.set(["attempts", "by_question_id", "c8", "q10", "t1"], 2);
      assertEquals(
        await keys(db, { prefix: ["attempts", "by_question_id", "c8", "q1"] }),
        [["attempts", "by_question_id", "c8", "q1", "t1"]],
      );
      assertEquals(await keys(db, { prefix: ["products", "c8"] }), []);
    },
  },
  {
    name: "list orders number parts numerically, with reverse and limit",
    async run(db) {
      const prefix = ["leaderboard", "c9"];
      for (const [score, user] of [[2, "b"], [10, "a"], [9, "c"], [10, "z"]]) {
        await db.set([...prefix, score, user], user);
      }
      assertEquals(await keys(db, { prefix }), [
        [...prefix, 2, "b"],
        [...prefix, 9, "c"],
        [...prefix, 10, "a"],
        [...prefix, 10, "z"],
      ]);
      assertEquals(await keys(db, { prefix }, { reverse: true, limit: 2 }), [
        [...prefix, 10, "z"],
        [...prefix, 10, "a"],
      ]);
      assertEquals(await keys(db, { prefix }, { limit: 1 }), [
        [...prefix, 2, "b"],
      ]);
    },
  },
  {
    name: "list honors start (inclusive) and end (exclusive)",
    async run(db) {
      const prefix = ["attempts", "by_attempt_id", "c10"];
      const days = ["2026-01-01", "2026-01-02", "2026-01-03", "2026-01-04"];
      for (const day of days) await db.set([...prefix, day], day);

      assertEquals(
        await keys(db, { prefix, start: [...prefix, "2026-01-02"] }),
        days.slice(1).map((day) => [...prefix, day]),
      );
      assertEquals(
        await keys(db, { prefix, start: [...prefix, "2026-01-02T12:00"] }),
        days.slice(2).map((day) => [...prefix, day]),
      );
      assertEquals(
        await keys(db, { prefix, end: [...prefix, "2026-01-03"] }),
        days.slice(0, 2).map((day) => [...prefix, day]),
      );
    },
  },
  {
    name: "list works for a prefix shorter than the partition key",
    async run(db) {
      await db.set(["stripe_events", "c11-b"], 2);
      await db.set(["stripe_events", "c11-a"], 1);
      await db.set(["attempts", "by_attempt_id", "c11", "t1"], 1);
      const events = (await keys(db, { prefix: ["stripe_events"] }))
        .filter((key) => String(key[1]).startsWith("c11"));
      assertEquals(events, [
        ["stripe_events", "c11-a"],
        ["stripe_events", "c11-b"],
      ]);
      const attempts = (await keys(db, { prefix: ["attempts"] }))
        .filter((key) => key[2] === "c11");
      assertEquals(attempts, [["attempts", "by_attempt_id", "c11", "t1"]]);
    },
  },
  {
    name: "list with an empty prefix returns every entry",
    async run(db) {
      await db.set(["users", "c12"], 1);
      await db.set(["sessions", "c12"], 1);
      const all = await keys(db, { prefix: [] });
      assert(all.some((key) => key[0] === "users" && key[1] === "c12"));
      assert(all.some((key) => key[0] === "sessions" && key[1] === "c12"));
      const sorted = [...all].sort((a, b) =>
        JSON.stringify(a) < JSON.stringify(b) ? -1 : 1
      );
      assertEquals(all.length, sorted.length);
    },
  },
  {
    name: "list skips expired entries",
    strictExpiry: true,
    async run(db) {
      await db.set(["variants", "c13", "keep"], 1);
      await db.set(["variants", "c13", "gone"], 2, { expireIn: 1000 });
      await new Promise((resolve) => setTimeout(resolve, 2100));
      assertEquals(await keys(db, { prefix: ["variants", "c13"] }), [
        ["variants", "c13", "keep"],
      ]);
    },
  },
  {
    name: "atomic applies every mutation",
    async run(db) {
      await db.set(["users", "c14-old"], 1);
      const result = await db.atomic()
        .set(["users", "c14-a"], "a")
        .set(["products", "c14-b"], "b")
        .delete(["users", "c14-old"])
        .commit();
      assert(result.ok);
      assertEquals((await db.get(["users", "c14-a"])).value, "a");
      assertEquals((await db.get(["products", "c14-b"])).value, "b");
      assertEquals((await db.get(["users", "c14-old"])).value, null);
    },
  },
  {
    name: "atomic with no operations commits",
    async run(db) {
      assert((await db.atomic().commit()).ok);
    },
  },
  {
    name: "a check for a missing key fails once the key exists",
    async run(db) {
      const create = () =>
        db.atomic()
          .check({ key: ["users", "c16"], versionstamp: null })
          .set(["users", "c16"], "first")
          .commit();
      assert((await create()).ok);
      assertFalse((await create()).ok);
      assertEquals((await db.get(["users", "c16"])).value, "first");
    },
  },
  {
    name: "a stale check fails and writes nothing",
    async run(db) {
      await db.set(["users", "c17"], 1);
      const stale = await db.get(["users", "c17"]);
      await db.set(["users", "c17"], 2);

      const result = await db.atomic()
        .check(stale)
        .set(["users", "c17"], 3)
        .set(["users", "c17-side"], "should not exist")
        .commit();
      assertFalse(result.ok);
      assertEquals((await db.get(["users", "c17"])).value, 2);
      assertEquals((await db.get(["users", "c17-side"])).value, null);

      const fresh = await db.get(["users", "c17"]);
      assert(
        (await db.atomic().check(fresh).set(["users", "c17"], 3).commit()).ok,
      );
    },
  },
  {
    name: "a check guards keys the commit does not write",
    async run(db) {
      await db.set(["emt", "c18-count"], 1);
      const count = await db.get(["emt", "c18-count"]);
      const ok = await db.atomic()
        .check(count)
        .set(["emt", "c18-item", 0], "x")
        .commit();
      assert(ok.ok);

      await db.set(["emt", "c18-count"], 2);
      const failed = await db.atomic()
        .check(count)
        .set(["emt", "c18-item", 1], "y")
        .commit();
      assertFalse(failed.ok);
      assertEquals((await db.get(["emt", "c18-item", 1])).value, null);
    },
  },
  {
    name: "later mutations of a key win within one commit",
    async run(db) {
      const key = ["leaderboard", "c19", 5, "user"];
      await db.set(key, "old");
      assert((await db.atomic().delete(key).set(key, "new").commit()).ok);
      assertEquals((await db.get(key)).value, "new");
      assert((await db.atomic().set(key, "newer").delete(key).commit()).ok);
      assertEquals((await db.get(key)).value, null);
    },
  },
  {
    name: "concurrent checked increments never lose an update",
    async run(db) {
      const key = ["emt", "c20-counter"];
      await db.set(key, 0);
      const increment = async () => {
        for (let attempt = 0; attempt < 50; attempt++) {
          const current = await db.get<number>(key);
          const result = await db.atomic()
            .check(current)
            .set(key, (current.value ?? 0) + 1)
            .commit();
          if (result.ok) return;
          await new Promise((resolve) =>
            setTimeout(resolve, Math.random() * 20 * (attempt + 1))
          );
        }
        throw new Error("increment never committed");
      };
      await Promise.all(Array.from({ length: 8 }, increment));
      assertEquals((await db.get(key)).value, 8);
    },
  },
];
