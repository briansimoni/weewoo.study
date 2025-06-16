#!/usr/bin/env -S deno run --allow-net --allow-read --allow-write --allow-env

import { ListObjectsV2Command, S3Client } from "@aws-sdk/client-s3";
import "$std/dotenv/load.ts";

// S3 configuration using environment variables
const S3_BUCKET_NAME = Deno.env.get("S3_BUCKET_NAME") ||
  "ems-questions-static-assets";
const S3_PREFIX_KEY = Deno.env.get("S3_PREFIX_KEY") || "emt-book/";
const S3_REGION = Deno.env.get("AWS_REGION") || "us-east-1";

// Initialize S3 client
const s3Client = new S3Client({
  region: S3_REGION,
  credentials: {
    accessKeyId: Deno.env.get("AWS_ACCESS_KEY_ID") || "",
    secretAccessKey: Deno.env.get("AWS_SECRET_ACCESS_KEY") || "",
  },
});

async function listAvailableChapters() {
  try {
    console.log("🔍 Searching for available textbook chapters...");
    console.log(`📍 S3 Bucket: ${S3_BUCKET_NAME}`);
    console.log(`📂 Prefix: ${S3_PREFIX_KEY}`);

    // List objects in the S3 bucket
    const listCommand = new ListObjectsV2Command({
      Bucket: S3_BUCKET_NAME,
      Prefix: S3_PREFIX_KEY,
    });

    const listResponse = await s3Client.send(listCommand);

    if (!listResponse.Contents || listResponse.Contents.length === 0) {
      console.log("❌ No files found in S3 bucket with the specified prefix");
      console.log(
        `   Check that files exist at: s3://${S3_BUCKET_NAME}/${S3_PREFIX_KEY}`,
      );
      return;
    }

    console.log(`📚 Found ${listResponse.Contents.length} files:`);
    console.log();

    const chapters: Array<{ id: string; filename: string; size: number }> = [];

    for (const object of listResponse.Contents) {
      if (object.Key && object.Size) {
        const filename = object.Key.replace(S3_PREFIX_KEY, "");

        // Extract chapter ID from filename (assumes format: "01 - Chapter Title.txt")
        const match = filename.match(/^(\d+)\s*-/);
        if (match) {
          const chapterId = parseInt(match[1], 10).toString(); // Remove leading zeros
          chapters.push({
            id: chapterId,
            filename: filename,
            size: object.Size,
          });
        } else {
          console.log(
            `⚠️  Skipping file (doesn't match chapter pattern): ${filename}`,
          );
        }
      }
    }

    // Sort chapters by ID
    chapters.sort((a, b) => parseInt(a.id) - parseInt(b.id));

    if (chapters.length === 0) {
      console.log(
        "❌ No chapter files found that match the expected naming pattern",
      );
      console.log("   Expected pattern: '01 - Chapter Title.txt'");
      return;
    }

    console.log("📋 Available Chapter IDs:");
    console.log(
      "┌─────┬─────────┬─────────────────────────────────────────────────┐",
    );
    console.log(
      "│ ID  │ Size    │ Filename                                        │",
    );
    console.log(
      "├─────┼─────────┼─────────────────────────────────────────────────┤",
    );

    for (const chapter of chapters) {
      const sizeKB = Math.round(chapter.size / 1024);
      const idStr = chapter.id.padEnd(3);
      const sizeStr = `${sizeKB}KB`.padEnd(7);
      const filenameStr = chapter.filename.length > 47
        ? chapter.filename.substring(0, 44) + "..."
        : chapter.filename.padEnd(47);

      console.log(`│ ${idStr} │ ${sizeStr} │ ${filenameStr} │`);
    }

    console.log(
      "└─────┴─────────┴─────────────────────────────────────────────────┘",
    );
    console.log();

    // Generate config example
    const chapterIds = chapters.map((c) => c.id);
    console.log("💡 Example config.json configuration:");
    console.log(JSON.stringify(
      {
        chapter_ids: chapterIds.slice(0, 3), // Show first 3 as example
        num_questions: 10,
        output_file: "./output/generated_questions.json",
      },
      null,
      2,
    ));

    console.log(`\n✅ Found ${chapters.length} available chapters`);
    console.log(`   Use these IDs in your config.json 'chapter_ids' array`);
  } catch (error) {
    console.error("❌ Failed to list S3 objects:", error);

    if (error instanceof Error) {
      if (error.name === "NoSuchBucket") {
        console.error(`   Bucket '${S3_BUCKET_NAME}' does not exist`);
      } else if (error.name === "AccessDenied") {
        console.error("   Check your AWS credentials and bucket permissions");
      } else {
        console.error(
          "   Make sure your AWS credentials are configured correctly",
        );
      }
    }
  }
}

if (import.meta.main) {
  await listAvailableChapters();
}
