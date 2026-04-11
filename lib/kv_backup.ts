export interface KvBackupEntry {
  key: Deno.KvKey;
  value: unknown;
}

export interface KvBackupBlob {
  entries: KvBackupEntry[];
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
): Promise<void> {
  const existingKeys: Deno.KvKey[] = [];
  for await (const entry of kv.list({ prefix: [] })) {
    existingKeys.push(entry.key);
  }

  for (const key of existingKeys) {
    await kv.delete(key);
  }

  for (const entry of blob.entries) {
    await kv.set(entry.key, entry.value);
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
