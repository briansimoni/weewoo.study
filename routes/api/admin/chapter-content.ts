import { AppHandlers } from "../../_middleware.ts";
import { S3Client, GetObjectCommand, ListObjectsV2Command } from "@aws-sdk/client-s3";

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
  async GET(req, _ctx) {
    try {
      const url = new URL(req.url);
      const chapterId = url.searchParams.get("chapterId");

      if (!chapterId) {
        return new Response(
          JSON.stringify({ error: "Missing chapterId parameter" }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          },
        );
      }

      // List objects in the S3 bucket to find the chapter
      const listCommand = new ListObjectsV2Command({
        Bucket: S3_BUCKET_NAME,
        Prefix: S3_PREFIX_KEY,
      });
      
      const listResponse = await s3Client.send(listCommand);
      let chapterKey = "";
      
      if (listResponse.Contents) {
        // Find the chapter file that starts with the provided chapterId
        for (const object of listResponse.Contents) {
          if (object.Key && object.Key.includes(`${chapterId.padStart(2, "0")} -`)) {
            chapterKey = object.Key;
            break;
          }
        }
      }

      if (!chapterKey) {
        return new Response(
          JSON.stringify({ error: `Chapter ${chapterId} not found` }),
          {
            status: 404,
            headers: { "Content-Type": "application/json" },
          },
        );
      }

      // Get the chapter content from S3
      const getCommand = new GetObjectCommand({
        Bucket: S3_BUCKET_NAME,
        Key: chapterKey,
      });
      
      const getResponse = await s3Client.send(getCommand);
      
      if (!getResponse.Body) {
        return new Response(
          JSON.stringify({ error: `Failed to get chapter ${chapterId} content` }),
          {
            status: 500,
            headers: { "Content-Type": "application/json" },
          },
        );
      }
      
      // Convert the response body to a string
      const bodyContents = await getResponse.Body.transformToByteArray();
      const chapterContent = new TextDecoder().decode(bodyContents);

      return new Response(chapterContent, {
        status: 200,
        headers: { "Content-Type": "text/plain" },
      });
    } catch (error) {
      console.error("Error reading chapter content:", error);
      return new Response(
        JSON.stringify({ error: "Failed to read chapter content" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        },
      );
    }
  },
};
