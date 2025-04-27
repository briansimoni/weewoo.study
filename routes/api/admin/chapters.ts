import { AppHandlers } from "../../_middleware.ts";
import { S3Client, ListObjectsV2Command } from "@aws-sdk/client-s3";

// S3 configuration
const S3_BUCKET_NAME = Deno.env.get("S3_BUCKET_NAME") || "ems-questions-static-assets";
const S3_PREFIX_KEY = Deno.env.get("S3_PREFIX_KEY") || "emt-book/";
const s3Client = new S3Client({
  region: Deno.env.get("AWS_REGION") || "us-east-1",
  credentials: {
    accessKeyId: Deno.env.get("AWS_ACCESS_KEY_ID") || "",
    secretAccessKey: Deno.env.get("AWS_SECRET_ACCESS_KEY") || "",
  }
});

export const handler: AppHandlers = {
  async GET(_req, _ctx) {
    try {
      // List objects in the S3 bucket to get chapters
      const listCommand = new ListObjectsV2Command({
        Bucket: S3_BUCKET_NAME,
        Prefix: S3_PREFIX_KEY,
      });
      
      const listResponse = await s3Client.send(listCommand);
      const chapters = [];
      
      if (listResponse.Contents) {
        for (const object of listResponse.Contents) {
          if (object.Key && object.Key.endsWith(".txt")) {
            // Extract the filename from the full key (remove prefix)
            const filename = object.Key.replace(S3_PREFIX_KEY, "");
            
            // Extract chapter number and title from filename
            // Format: "01 - EMS Systems.txt"
            const match = filename.match(/^(\d+)\s*-\s*(.+)\.txt$/);
            if (match) {
              chapters.push({
                id: match[1],
                key: object.Key,
                title: match[2].trim(),
              });
            }
          }
        }
      }

      // Sort chapters by their number
      chapters.sort((a, b) => parseInt(a.id) - parseInt(b.id));

      return new Response(JSON.stringify(chapters), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      });
    } catch (error) {
      console.error("Error reading chapters:", error);
      return new Response(
        JSON.stringify({ error: "Failed to read chapters" }),
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
