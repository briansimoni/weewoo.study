import { page, type PageProps } from "fresh";
import {
  assertKvImportAllowed,
  exportKv,
  importKvUpsert,
  isKvBackupBlob,
  KvImportProgress,
} from "../../lib/kv_backup.ts";
import { getKv } from "../../lib/kv.ts";
import KvBackupUploader from "../../islands/admin/KvBackupUploader.tsx";
import { Handlers } from "fresh/compat";
import { AdminPage } from "../../components/admin/AdminPage.tsx";

interface DatabasePageData {
  stage?: string;
  success?: string;
  error?: string;
}

interface ImportLogger {
  info: (message: string, meta?: Record<string, unknown>) => void;
}

interface ImportFromJsonOptions {
  logger?: ImportLogger;
  progressInterval?: number;
}

export async function buildDownloadResponse(kv: Deno.Kv): Promise<Response> {
  const blob = await exportKv(kv);
  const filename = `kv-backup-${
    new Date().toISOString().replace(/[:.]/g, "-")
  }.json`;

  return new Response(JSON.stringify(blob, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}

export async function importFromJsonText(
  kv: Deno.Kv,
  jsonText: string,
  stage?: string,
  options?: ImportFromJsonOptions,
): Promise<number> {
  const logger = options?.logger;
  const progressInterval = options?.progressInterval ?? 250;
  const importStart = Date.now();
  logger?.info("admin database import started", {
    stage: stage ?? "undefined",
    payloadSizeBytes: jsonText.length,
  });

  assertKvImportAllowed(stage);

  const parseStart = Date.now();
  const payload = JSON.parse(jsonText);
  logger?.info("admin database import parsed payload", {
    parseDurationMs: Date.now() - parseStart,
  });

  if (!isKvBackupBlob(payload)) {
    throw new Error("Invalid payload. Expected { entries: [{ key, value }] }.");
  }

  logger?.info("admin database import validated payload", {
    entries: payload.entries.length,
  });

  let lastLogAt = 0;
  const logProgress = (progress: KvImportProgress) => {
    const now = Date.now();
    if (now - lastLogAt < 1000 && progress.processed !== progress.total) {
      return;
    }
    lastLogAt = now;
    logger?.info("admin database import progress", {
      phase: progress.phase,
      processed: progress.processed,
      total: progress.total,
      elapsedMs: now - importStart,
    });
  };

  await importKvUpsert(kv, payload, {
    onProgress: logProgress,
    progressInterval,
  });

  logger?.info("admin database import completed", {
    entries: payload.entries.length,
    totalDurationMs: Date.now() - importStart,
  });
  return payload.entries.length;
}

export const handler: Handlers<DatabasePageData> = {
  GET() {
    return page({
      stage: Deno.env.get("STAGE") ?? "undefined",
    });
  },

  async POST(ctx) {
    const req = ctx.req;
    const formData = await req.formData();
    const action = formData.get("action")?.toString();
    const stage = Deno.env.get("STAGE") ?? "undefined";
    const kv = await getKv();

    if (action === "download") {
      return buildDownloadResponse(kv);
    }

    if (action === "upload") {
      const confirmed = formData.get("confirm_upload") === "on";
      if (!confirmed) {
        return page({
          stage,
          error: "You must confirm database merge upload before uploading.",
        });
      }

      const file = formData.get("backup_file");
      if (!(file instanceof File)) {
        return page({
          stage,
          error: "Please select a JSON file to upload.",
        });
      }

      try {
        const { log } = await import("../../lib/logger.ts");
        const importedCount = await importFromJsonText(
          kv,
          await file.text(),
          Deno.env.get("STAGE"),
          {
            logger: log,
            progressInterval: 250,
          },
        );
        return page({
          stage,
          success: `Import complete. ${importedCount} entries upserted.`,
        });
      } catch (error) {
        if (error instanceof Error) {
          return page({ stage, error: error.message });
        }
        return page({ stage, error: "Import failed." });
      }
    }

    return page({ stage, error: "Unknown action." });
  },
};

export default function DatabasePage({ data }: PageProps<DatabasePageData>) {
  return (
    <AdminPage
      title="Database"
      section="database"
      width="narrow"
      description="Download a JSON backup of the KV database, or restore one."
    >
      <div class="alert alert-info mb-6">
        <span>
          Current STAGE: <strong>{data.stage}</strong>
        </span>
      </div>

      {data.success && (
        <div class="alert alert-success mb-6">
          <span>{data.success}</span>
        </div>
      )}

      {data.error && (
        <div class="alert alert-error mb-6">
          <span>{data.error}</span>
        </div>
      )}

      <div class="card bg-base-200 shadow-md p-6 mb-6">
        <h2 class="text-xl font-semibold mb-2">Download Backup</h2>
        <p class="text-base-content/70 mb-4">
          Export the entire KV database as a JSON file.
        </p>
        <form method="POST">
          <button
            type="submit"
            name="action"
            value="download"
            class="btn btn-primary"
          >
            Download JSON Backup
          </button>
        </form>
      </div>

      <KvBackupUploader stage={data.stage} chunkSize={250} />
    </AdminPage>
  );
}
