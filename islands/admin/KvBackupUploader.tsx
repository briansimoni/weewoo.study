import { useState } from "preact/hooks";
import { JSX } from "preact";

interface KvBackupEntry {
  key: unknown[];
  value: unknown;
}

interface KvBackupBlob {
  entries: KvBackupEntry[];
}

interface KvImportResponse {
  ok?: boolean;
  imported?: number;
  error?: string;
}

interface KvBackupUploaderProps {
  stage?: string;
  chunkSize?: number;
}

function parseBackup(jsonText: string): KvBackupBlob {
  const payload = JSON.parse(jsonText) as { entries?: unknown };

  if (!payload || !Array.isArray(payload.entries)) {
    throw new Error("Invalid payload. Expected { entries: [{ key, value }] }.");
  }

  for (const entry of payload.entries) {
    if (!entry || typeof entry !== "object") {
      throw new Error("Invalid payload entry. Expected object entries.");
    }

    const maybeEntry = entry as { key?: unknown };
    if (!Array.isArray(maybeEntry.key)) {
      throw new Error("Invalid payload entry key. Expected key array.");
    }
  }

  return payload as KvBackupBlob;
}

export default function KvBackupUploader(
  { stage, chunkSize = 250 }: KvBackupUploaderProps,
) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [progressPercent, setProgressPercent] = useState(0);
  const [uploadedEntries, setUploadedEntries] = useState(0);
  const [totalEntries, setTotalEntries] = useState(0);
  const [statusText, setStatusText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const blockedStage = !stage || stage === "PROD" || stage === "undefined";

  const onFileChange = (
    event: JSX.TargetedEvent<HTMLInputElement, Event>,
  ) => {
    const file = event.currentTarget.files?.[0] ?? null;
    setSelectedFile(file);
    setError(null);
    setSuccess(null);
  };

  const uploadInChunks = async () => {
    if (blockedStage) {
      throw new Error("KV import is blocked when STAGE is PROD or undefined.");
    }

    if (!selectedFile) {
      throw new Error("Please select a JSON file to upload.");
    }

    if (!confirmed) {
      throw new Error(
        "You must confirm database merge upload before uploading.",
      );
    }

    const fileText = await selectedFile.text();
    const payload = parseBackup(fileText);
    const entries = payload.entries;

    setTotalEntries(entries.length);

    if (entries.length === 0) {
      setProgressPercent(100);
      setStatusText("No entries found in backup. Nothing to upload.");
      setSuccess("Upload complete. 0 entries upserted.");
      return;
    }

    const totalBatches = Math.ceil(entries.length / chunkSize);
    let totalImported = 0;

    for (let batchIndex = 0; batchIndex < totalBatches; batchIndex += 1) {
      const start = batchIndex * chunkSize;
      const end = Math.min(start + chunkSize, entries.length);
      const batchEntries = entries.slice(start, end);

      setStatusText(
        `Uploading batch ${
          batchIndex + 1
        } of ${totalBatches} (${end}/${entries.length} entries)...`,
      );

      const response = await fetch("/api/admin/kv/import", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ entries: batchEntries }),
      });

      const responseBody = await response.json() as KvImportResponse;
      if (!response.ok) {
        const apiMessage = responseBody?.error || "Failed to upload chunk.";
        throw new Error(
          `Batch ${batchIndex + 1}/${totalBatches} failed: ${apiMessage}`,
        );
      }

      totalImported += responseBody.imported ?? batchEntries.length;
      setUploadedEntries(totalImported);
      setProgressPercent(Math.round(((batchIndex + 1) / totalBatches) * 100));
    }

    setStatusText("Upload complete.");
    setSuccess(`Upload complete. ${totalImported} entries upserted.`);
  };

  const onSubmit = async (event: JSX.TargetedEvent<HTMLFormElement, Event>) => {
    event.preventDefault();

    setError(null);
    setSuccess(null);
    setProgressPercent(0);
    setUploadedEntries(0);
    setTotalEntries(0);
    setStatusText("Preparing upload...");

    try {
      setIsUploading(true);
      await uploadInChunks();
    } catch (uploadError) {
      setStatusText("");
      setError(
        uploadError instanceof Error ? uploadError.message : "Upload failed.",
      );
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div class="card bg-base-200 shadow-md p-6">
      <h2 class="text-xl font-semibold mb-2">Upload & Merge</h2>
      <p class="text-base-content/70 mb-4">
        Upload a backup JSON file and merge entries in batches of {chunkSize}.
      </p>

      {blockedStage && (
        <div class="alert alert-warning mb-4">
          <span>Uploads are blocked when STAGE is PROD or undefined.</span>
        </div>
      )}

      {error && (
        <div class="alert alert-error mb-4">
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div class="alert alert-success mb-4">
          <span>{success}</span>
        </div>
      )}

      <form onSubmit={onSubmit} class="space-y-4">
        <input
          type="file"
          name="backup_file"
          accept="application/json,.json"
          class="file-input file-input-bordered w-full"
          onChange={onFileChange}
          disabled={isUploading || blockedStage}
          required
        />
        <label class="label cursor-pointer justify-start gap-3">
          <input
            type="checkbox"
            name="confirm_upload"
            class="checkbox checkbox-warning"
            checked={confirmed}
            onChange={(event) =>
              setConfirmed((event.currentTarget as HTMLInputElement).checked)}
            disabled={isUploading || blockedStage}
            required
          />
          <span class="label-text">
            I understand this will merge uploaded entries into the database.
          </span>
        </label>

        {(isUploading || progressPercent > 0) && (
          <div class="space-y-2">
            <progress
              class="progress progress-primary w-full"
              value={progressPercent}
              max={100}
            >
            </progress>
            <div class="text-sm text-base-content/80">
              {statusText}
              {totalEntries > 0 && (
                <span>({uploadedEntries}/{totalEntries})</span>
              )}
            </div>
          </div>
        )}

        <button
          type="submit"
          class={`btn btn-warning ${isUploading ? "loading" : ""}`}
          disabled={isUploading || blockedStage}
        >
          {isUploading ? "Uploading..." : "Upload and Merge Database"}
        </button>
      </form>
    </div>
  );
}
