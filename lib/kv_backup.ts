export interface KvBackupEntry {
  key: Deno.KvKey;
  value: unknown;
}

export interface KvBackupBlob {
  entries: KvBackupEntry[];
}

export type KvImportPhase = "scan_existing" | "delete_existing" | "write_new";

export interface KvImportProgress {
  phase: KvImportPhase;
  processed: number;
  total: number;
}

export interface ImportKvReplaceOptions {
  onProgress?: (progress: KvImportProgress) => void;
  progressInterval?: number;
}

export async function exportKv(kv: Deno.Kv): Promise<KvBackupBlob> {
  const entries: KvBackupEntry[] = [];
  for await (const entry of kv.list<unknown>({ prefix: [] })) {
    entries.push({
      key: entry.key,
      value: entry.value,
    });
  }
  return { entries };
}

export async function importKvReplace(
  kv: Deno.Kv,
  blob: KvBackupBlob,
  options?: ImportKvReplaceOptions,
): Promise<void> {
  const onProgress = options?.onProgress;
  const progressInterval = options?.progressInterval ?? 250;
  const existingKeys: Deno.KvKey[] = [];
  let scanned = 0;
  for await (const entry of kv.list({ prefix: [] })) {
    existingKeys.push(entry.key);
    scanned += 1;
    if (onProgress && scanned % progressInterval === 0) {
      onProgress({
        phase: "scan_existing",
        processed: scanned,
        total: scanned,
      });
    }
  }

  if (onProgress) {
    onProgress({
      phase: "scan_existing",
      processed: scanned,
      total: scanned,
    });
  }

  let deleted = 0;
  for (const key of existingKeys) {
    await kv.delete(key);
    deleted += 1;
    if (onProgress && deleted % progressInterval === 0) {
      onProgress({
        phase: "delete_existing",
        processed: deleted,
        total: existingKeys.length,
      });
    }
  }

  if (onProgress) {
    onProgress({
      phase: "delete_existing",
      processed: deleted,
      total: existingKeys.length,
    });
  }

  let written = 0;
  for (const entry of blob.entries) {
    await kv.set(entry.key, entry.value);
    written += 1;
    if (onProgress && written % progressInterval === 0) {
      onProgress({
        phase: "write_new",
        processed: written,
        total: blob.entries.length,
      });
    }
  }

  if (onProgress) {
    onProgress({
      phase: "write_new",
      processed: written,
      total: blob.entries.length,
    });
  }
}

export function isKvBackupBlob(value: unknown): value is KvBackupBlob {
  if (!value || typeof value !== "object") {
    return false;
  }
  if (!("entries" in value)) {
    return false;
  }

  const entries = (value as { entries: unknown }).entries;
  if (!Array.isArray(entries)) {
    return false;
  }

  return entries.every((entry) => {
    if (!entry || typeof entry !== "object") {
      return false;
    }

    const maybeEntry = entry as { key?: unknown };
    return Array.isArray(maybeEntry.key);
  });
}

export function assertKvImportAllowed(stage?: string): void {
  if (!stage || stage === "PROD") {
    throw new Error(
      "KV import is blocked when STAGE is PROD or undefined.",
    );
  }
}
