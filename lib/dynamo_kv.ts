import {
  type AttributeValue,
  DynamoDBClient,
  type DynamoDBClientConfig,
} from "@aws-sdk/client-dynamodb";
import {
  DeleteCommand,
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  QueryCommand,
  ScanCommand,
  TransactWriteCommand,
  type TransactWriteCommandInput,
} from "@aws-sdk/lib-dynamodb";
import type {
  Db,
  DbAtomic,
  DbCheck,
  DbCommitError,
  DbCommitResult,
  DbEntry,
  DbEntryMaybe,
  DbKey,
  DbListOptions,
  DbListSelector,
  DbSetOptions,
} from "./db.ts";

/**
 * `Db` on a single DynamoDB table. Each KV entry is one item:
 *
 * | Attribute | Holds                                                        |
 * | --------- | ------------------------------------------------------------ |
 * | `pk`      | The leading key parts, encoded (see `partitionDepth`).       |
 * | `sk`      | The remaining key parts, encoded; `-` when there are none.   |
 * | `key`     | The original key array.                                      |
 * | `value`   | The value, as native DynamoDB types.                         |
 * | `v`       | Versionstamp: a new random ID on every write.                |
 * | `ttl`     | Expiry in epoch seconds (the table's TTL attribute), if any. |
 *
 * DynamoDB deletes expired items lazily (it can take days), so reads treat an
 * item whose `ttl` has passed as missing.
 */

type Part = string | number;

/** DynamoDB allows 100 items in one transaction. */
const MAX_TRANSACTION_ITEMS = 100;
const SEPARATOR = "!";
const EMPTY_SORT_KEY = "-";

/**
 * How many leading key parts form the partition key, by keyspace (the first
 * key part). Listing a prefix at least this long is a Query; a shorter one is
 * a full-table Scan, so only admin tools and the seeder do that.
 */
const PARTITION_DEPTH: Record<string, number> = {
  // [scope, kind, ...]: one partition per kind of question data.
  emt: 2,
  advanced: 2,
  medic: 2,
  // ["attempts", index, userId, ...]: one partition per user and index.
  attempts: 3,
  leaderboard: 2,
  variants: 2,
  stripe_variants: 2,
  // Read by full key only, so every entry gets its own partition.
  sessions: 2,
  streaks: 2,
  stripe_events: 2,
};

/** Partition key length for the keyspace a key or prefix belongs to. */
function keyspaceDepth(key: DbKey): number {
  return typeof key[0] === "string" ? PARTITION_DEPTH[key[0]] ?? 1 : 1;
}

export function partitionDepth(key: DbKey): number {
  return Math.min(keyspaceDepth(key), key.length);
}

/**
 * Encode key parts so that string order equals Deno KV's key order: strings
 * as is, numbers as the hex of their IEEE 754 bits with the sign flipped.
 */
export function encodeParts(parts: readonly Deno.KvKeyPart[]): string {
  return parts.map((part) => {
    if (typeof part === "string") return `s${part}${SEPARATOR}`;
    if (typeof part === "number") return `x${encodeNumber(part)}${SEPARATOR}`;
    throw new TypeError(
      `Unsupported key part ${String(part)}: only strings and numbers`,
    );
  }).join("");
}

function encodeNumber(value: number): string {
  if (Number.isNaN(value)) throw new TypeError("NaN is not a valid key part");
  const view = new DataView(new ArrayBuffer(8));
  view.setFloat64(0, value);
  let bits = view.getBigUint64(0);
  // Positive numbers sort above negatives; negatives sort in reverse.
  bits = value < 0 || Object.is(value, -0)
    ? ~bits & 0xffffffffffffffffn
    : bits | 0x8000000000000000n;
  return bits.toString(16).padStart(16, "0");
}

function itemKey(key: DbKey) {
  const depth = partitionDepth(key);
  return {
    pk: encodeParts(key.slice(0, depth)),
    sk: encodeParts(key.slice(depth)) || EMPTY_SORT_KEY,
  };
}

interface Item {
  pk: string;
  sk: string;
  key: Part[];
  value: unknown;
  v: string;
  ttl?: number;
}

function nowSeconds() {
  return Math.floor(Date.now() / 1000);
}

function isLive(item: Item) {
  return item.ttl === undefined || item.ttl > nowSeconds();
}

function buildItem(key: DbKey, value: unknown, options?: DbSetOptions): Item {
  const item: Item = {
    ...itemKey(key),
    key: key as Part[],
    value,
    v: crypto.randomUUID(),
  };
  if (options?.expireIn !== undefined) {
    item.ttl = Math.ceil((Date.now() + options.expireIn) / 1000);
  }
  return item;
}

function hasPrefix(key: Part[], prefix: DbKey) {
  return key.length > prefix.length &&
    prefix.every((part, i) => key[i] === part);
}

function errorName(error: unknown) {
  return error instanceof Error ? error.name : "";
}

export interface DynamoKvOptions {
  table: string;
  /** DynamoDB Local or another non-AWS endpoint. */
  endpoint?: string;
  region?: string;
  credentials?: DynamoDBClientConfig["credentials"];
}

export class DynamoKv implements Db {
  constructor(
    private client: DynamoDBDocumentClient,
    private table: string,
  ) {}

  static make(options: DynamoKvOptions) {
    const client = new DynamoDBClient({
      endpoint: options.endpoint,
      region: options.region,
      credentials: options.credentials,
    });
    return new DynamoKv(
      DynamoDBDocumentClient.from(client, {
        marshallOptions: { removeUndefinedValues: true },
      }),
      options.table,
    );
  }

  async get<T = unknown>(key: DbKey): Promise<DbEntryMaybe<T>> {
    const { Item: item } = await this.client.send(
      new GetCommand({
        TableName: this.table,
        Key: itemKey(key),
        ConsistentRead: true,
      }),
    );
    if (!item || !isLive(item as Item)) {
      return { key, value: null, versionstamp: null };
    }
    return { key, value: item.value as T, versionstamp: item.v };
  }

  async set(
    key: DbKey,
    value: unknown,
    options?: DbSetOptions,
  ): Promise<DbCommitResult> {
    const item = buildItem(key, value, options);
    await this.client.send(
      new PutCommand({ TableName: this.table, Item: item }),
    );
    return { ok: true, versionstamp: item.v };
  }

  async delete(key: DbKey): Promise<void> {
    await this.client.send(
      new DeleteCommand({ TableName: this.table, Key: itemKey(key) }),
    );
  }

  async *list<T = unknown>(
    selector: DbListSelector,
    options?: DbListOptions,
  ): AsyncGenerator<DbEntry<T>> {
    if (!("prefix" in selector)) {
      throw new TypeError("DynamoKv.list needs a prefix");
    }
    const { prefix } = selector;
    const start = "start" in selector ? selector.start : undefined;
    const end = "end" in selector ? selector.end : undefined;
    const limit = options?.limit ?? Infinity;
    if (limit <= 0) return;

    // A prefix shorter than its keyspace's partition key spans partitions.
    const depth = prefix.length === 0 ? Infinity : keyspaceDepth(prefix);
    const items = prefix.length >= depth
      ? this.query(prefix, depth, { start, end, reverse: options?.reverse })
      : this.scan(prefix, options?.reverse);

    const startKey = start && encodeParts(start);
    const endKey = end && encodeParts(end);
    let count = 0;
    for await (const item of items) {
      if (!isLive(item) || !hasPrefix(item.key, prefix)) continue;
      const encoded = encodeParts(item.key);
      if (startKey && encoded < startKey) continue;
      if (endKey && encoded >= endKey) continue;
      yield {
        key: item.key,
        value: item.value as T,
        versionstamp: item.v,
      };
      if (++count >= limit) return;
    }
  }

  /** Items of one partition whose sort key falls in the selector's range. */
  private async *query(
    prefix: DbKey,
    depth: number,
    range: { start?: DbKey; end?: DbKey; reverse?: boolean },
  ): AsyncGenerator<Item> {
    const within = encodeParts(prefix.slice(depth));
    const low = range.start ? encodeParts(range.start.slice(depth)) : within;
    const high = range.end ? encodeParts(range.end.slice(depth)) : `${within}￿`;
    let cursor: Record<string, unknown> | undefined;
    do {
      const page = await this.client.send(
        new QueryCommand({
          TableName: this.table,
          ConsistentRead: true,
          ScanIndexForward: !range.reverse,
          KeyConditionExpression: "pk = :pk AND sk BETWEEN :low AND :high",
          ExpressionAttributeValues: {
            ":pk": encodeParts(prefix.slice(0, depth)),
            // Below every sort key: they start with "-", "s" or "x".
            ":low": low || SEPARATOR,
            ":high": high,
          },
          ExclusiveStartKey: cursor,
        }),
      );
      yield* (page.Items ?? []) as Item[];
      cursor = page.LastEvaluatedKey;
    } while (cursor);
  }

  /**
   * Every item under a prefix shorter than its partition key, in key order.
   * This reads the whole table into memory: it is for admin tools, backups
   * and the seeder only.
   */
  private async *scan(prefix: DbKey, reverse?: boolean): AsyncGenerator<Item> {
    const items: Item[] = [];
    const pkPrefix = encodeParts(prefix);
    let cursor: Record<string, unknown> | undefined;
    do {
      const page = await this.client.send(
        new ScanCommand({
          TableName: this.table,
          ConsistentRead: true,
          ...(pkPrefix && {
            FilterExpression: "begins_with(pk, :prefix)",
            ExpressionAttributeValues: { ":prefix": pkPrefix },
          }),
          ExclusiveStartKey: cursor,
        }),
      );
      items.push(...(page.Items ?? []) as Item[]);
      cursor = page.LastEvaluatedKey;
    } while (cursor);

    const order = reverse ? -1 : 1;
    const encoded = new Map(items.map((i) => [i, encodeParts(i.key)]));
    items.sort((a, b) => {
      const x = encoded.get(a)!;
      const y = encoded.get(b)!;
      return x < y ? -order : x > y ? order : 0;
    });
    yield* items;
  }

  atomic(): DbAtomic {
    return new DynamoAtomic(this.client, this.table);
  }

  close(): void {
    this.client.destroy();
  }
}

type Mutation =
  | { type: "set"; key: DbKey; item: Item }
  | { type: "delete"; key: DbKey };

class DynamoAtomic implements DbAtomic {
  private checks = new Map<string, DbCheck>();
  private mutations = new Map<string, Mutation>();
  private conflictingChecks = false;

  constructor(
    private client: DynamoDBDocumentClient,
    private table: string,
  ) {}

  private id(key: DbKey) {
    const { pk, sk } = itemKey(key);
    return `${pk}\n${sk}`;
  }

  check(...checks: DbCheck[]): this {
    for (const check of checks) {
      const id = this.id(check.key);
      const existing = this.checks.get(id);
      if (existing && existing.versionstamp !== check.versionstamp) {
        this.conflictingChecks = true;
      }
      this.checks.set(id, check);
    }
    return this;
  }

  // DynamoDB allows one operation per item in a transaction, so a later
  // mutation of the same key replaces the earlier one (the result is the same
  // as applying them in order).
  set(key: DbKey, value: unknown, options?: DbSetOptions): this {
    this.mutations.set(this.id(key), {
      type: "set",
      key,
      item: buildItem(key, value, options),
    });
    return this;
  }

  delete(key: DbKey): this {
    this.mutations.set(this.id(key), { type: "delete", key });
    return this;
  }

  async commit(): Promise<DbCommitResult | DbCommitError> {
    if (this.conflictingChecks) return { ok: false };
    // One versionstamp for the whole commit, as in Deno KV.
    const versionstamp = crypto.randomUUID();
    const items: NonNullable<TransactWriteCommandInput["TransactItems"]> = [];

    for (const [id, mutation] of this.mutations) {
      const condition = this.condition(this.checks.get(id));
      if (mutation.type === "set") {
        items.push({
          Put: {
            TableName: this.table,
            Item: { ...mutation.item, v: versionstamp },
            ...condition,
          },
        });
      } else {
        items.push({
          Delete: {
            TableName: this.table,
            Key: itemKey(mutation.key),
            ...condition,
          },
        });
      }
    }
    for (const [id, check] of this.checks) {
      if (this.mutations.has(id)) continue;
      items.push({
        ConditionCheck: {
          TableName: this.table,
          Key: itemKey(check.key),
          ...this.condition(check)!,
        },
      });
    }

    if (items.length === 0) return { ok: true, versionstamp };
    if (items.length > MAX_TRANSACTION_ITEMS) {
      throw new Error(
        `Transaction touches ${items.length} entries; DynamoDB allows ${MAX_TRANSACTION_ITEMS}`,
      );
    }

    try {
      await this.client.send(
        new TransactWriteCommand({ TransactItems: items }),
      );
    } catch (error) {
      if (isLostRace(error)) return { ok: false };
      throw error;
    }
    return { ok: true, versionstamp };
  }

  private condition(check: DbCheck | undefined) {
    if (!check) return undefined;
    if (check.versionstamp === null) {
      // Missing, or expired and not yet removed by DynamoDB.
      return {
        ConditionExpression: "attribute_not_exists(pk) OR #ttl <= :now",
        ExpressionAttributeNames: { "#ttl": "ttl" },
        ExpressionAttributeValues: { ":now": nowSeconds() },
      };
    }
    return {
      ConditionExpression: "v = :v",
      ExpressionAttributeValues: { ":v": check.versionstamp },
    };
  }
}

/** A failed check, or contention with a concurrent write: the caller retries. */
function isLostRace(error: unknown) {
  const name = errorName(error);
  if (
    name === "TransactionConflictException" ||
    name === "TransactionInProgressException"
  ) {
    return true;
  }
  if (name !== "TransactionCanceledException") return false;
  const reasons = (error as {
    CancellationReasons?: {
      Code?: string;
      Item?: Record<string, AttributeValue>;
    }[];
  }).CancellationReasons ?? [];
  const codes = reasons.map((reason) => reason.Code).filter((code) =>
    code && code !== "None"
  );
  return codes.length > 0 &&
    codes.every((code) =>
      code === "ConditionalCheckFailed" || code === "TransactionConflict"
    );
}
