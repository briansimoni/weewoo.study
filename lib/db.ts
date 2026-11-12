/**
 * The storage interface every store uses. It is the subset of `Deno.Kv` the
 * app relies on, so a `Deno.Kv` satisfies it as is (local runs and unit tests)
 * and `DynamoKv` in `lib/dynamo_kv.ts` implements it on DynamoDB (AWS).
 *
 * Keep it small: anything added here has to work on both backends. The
 * behavior both must share is pinned down by `lib/db_contract.ts`.
 */
export type DbKey = Deno.KvKey;
export type DbEntry<T> = Deno.KvEntry<T>;
export type DbEntryMaybe<T> = Deno.KvEntryMaybe<T>;
export type DbCommitResult = Deno.KvCommitResult;
export type DbCommitError = Deno.KvCommitError;
export type DbCheck = Deno.AtomicCheck;
export type DbListSelector = Deno.KvListSelector;

export interface DbSetOptions {
  /** Milliseconds until the entry expires. Expired entries read as missing. */
  expireIn?: number;
}

export interface DbListOptions {
  limit?: number;
  reverse?: boolean;
}

export interface DbAtomic {
  /** Fail the commit unless each entry still has the given versionstamp. */
  check(...checks: DbCheck[]): this;
  set(key: DbKey, value: unknown, options?: DbSetOptions): this;
  delete(key: DbKey): this;
  /** `ok: false` means a check failed or the write lost a race: retry. */
  commit(): Promise<DbCommitResult | DbCommitError>;
}

export interface Db {
  get<T = unknown>(key: DbKey): Promise<DbEntryMaybe<T>>;
  set(
    key: DbKey,
    value: unknown,
    options?: DbSetOptions,
  ): Promise<DbCommitResult>;
  delete(key: DbKey): Promise<void>;
  /** Entries under a prefix, in key order. The prefix itself is not listed. */
  list<T = unknown>(
    selector: DbListSelector,
    options?: DbListOptions,
  ): AsyncIterable<DbEntry<T>>;
  atomic(): DbAtomic;
  close(): void;
}
