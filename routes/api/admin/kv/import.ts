import {
  assertKvImportAllowed,
  importKvReplace,
  isKvBackupBlob,
  KvBackupBlob,
} from "../../../../lib/kv_backup.ts";
import { getKv } from "../../../../lib/kv.ts";
import { AppHandlers } from "../../../_middleware.ts";

export async function importKvResponse(
  kv: Deno.Kv,
  payload: unknown,
  stage = Deno.env.get("STAGE"),
): Promise<Response> {
  assertKvImportAllowed(stage);

  if (!isKvBackupBlob(payload)) {
    return new Response(
      JSON.stringify({
        error: "Invalid payload. Expected { entries: [{ key, value }] }",
      }),
      {
        status: 400,
        headers: {
          "Content-Type": "application/json",
        },
      },
    );
  }

  const blob = payload as KvBackupBlob;
  await importKvReplace(kv, blob);

  return new Response(
    JSON.stringify({ ok: true, imported: blob.entries.length }),
    {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    },
  );
}

export const handler: AppHandlers = {
  async POST(req) {
    try {
      const payload = await req.json();
      const kv = await getKv();
      return await importKvResponse(kv, payload);
    } catch (_error) {
      return new Response(
        JSON.stringify({ error: "Failed to import KV backup" }),
        {
          status: 500,
          headers: {
            "Content-Type": "application/json",
          },
        },
      );
    }
  },
};
