import { exportKv } from "../../../../lib/kv_backup.ts";
import { getKv } from "../../../../lib/kv.ts";
import { AppHandlers } from "../../../_middleware.ts";

export async function exportKvResponse(kv: Deno.Kv): Promise<Response> {
  const blob = await exportKv(kv);
  return new Response(JSON.stringify(blob), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
    },
  });
}

export const handler: AppHandlers = {
  async GET() {
    const kv = await getKv();
    return exportKvResponse(kv);
  },
};
