import { Handlers, PageProps } from "$fresh/server.ts";
import { ArrowLeft, Database } from "lucide-preact";
import {
  assertKvImportAllowed,
  exportKv,
  importKvReplace,
  isKvBackupBlob,
  KvImportProgress,
} from "../../lib/kv_backup.ts";
import { getKv } from "../../lib/kv.ts";

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

  await importKvReplace(kv, payload, {
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
  GET(_req, ctx) {
    return ctx.render({
      stage: Deno.env.get("STAGE") ?? "undefined",
    });
  },

  async POST(req, ctx) {
    const formData = await req.formData();
    const action = formData.get("action")?.toString();
    const stage = Deno.env.get("STAGE") ?? "undefined";
    const kv = await getKv();

    if (action === "download") {
      return buildDownloadResponse(kv);
    }

    if (action === "upload") {
      const confirmed = formData.get("confirm_replace") === "on";
      if (!confirmed) {
        return ctx.render({
          stage,
          error: "You must confirm full database replacement before uploading.",
        });
      }

      const file = formData.get("backup_file");
      if (!(file instanceof File)) {
        return ctx.render({
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
        return ctx.render({
          stage,
          success: `Import complete. ${importedCount} entries loaded.`,
        });
      } catch (error) {
        if (error instanceof Error) {
          return ctx.render({ stage, error: error.message });
        }
        return ctx.render({ stage, error: "Import failed." });
      }
    }

    return ctx.render({ stage, error: "Unknown action." });
  },
};

export default function DatabasePage({ data }: PageProps<DatabasePageData>) {
  return (
    <div class="bg-base-100 min-h-screen">
      <header class="bg-primary text-primary-content shadow-md py-4">
        <div class="container mx-auto px-4">
          <div class="flex justify-between items-center">
            <div class="flex items-center gap-2">
              <Database className="w-6 h-6" />
              <h1 class="text-xl font-bold">Database Tools</h1>
            </div>
            <a href="/admin" class="btn btn-ghost btn-sm">
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back to Admin
            </a>
          </div>
        </div>
      </header>

      <div class="container mx-auto p-4 max-w-3xl">
        <div class="flex flex-col items-center mb-8 mt-4">
          <h1 class="text-3xl font-bold mb-2">Database Backup & Restore</h1>
          <p class="text-base-content/70">
            Download a JSON backup or restore from a backup file.
          </p>
        </div>

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

        <div class="card bg-base-200 shadow-md p-6">
          <h2 class="text-xl font-semibold mb-2">Upload & Replace</h2>
          <p class="text-base-content/70 mb-4">
            Upload a backup JSON file to replace the entire current KV database.
          </p>
          <form method="POST" encType="multipart/form-data" class="space-y-4">
            <input
              type="file"
              name="backup_file"
              accept="application/json,.json"
              class="file-input file-input-bordered w-full"
              required
            />
            <label class="label cursor-pointer justify-start gap-3">
              <input
                type="checkbox"
                name="confirm_replace"
                class="checkbox checkbox-warning"
                required
              />
              <span class="label-text">
                I understand this will replace the entire database.
              </span>
            </label>
            <button
              type="submit"
              name="action"
              value="upload"
              class="btn btn-warning"
            >
              Upload and Replace Database
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
