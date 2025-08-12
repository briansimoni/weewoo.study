#!/usr/bin/env deno run --allow-net --allow-read --allow-write --allow-env

import { log } from "../lib/logger.ts";
import sharp from "npm:sharp";
import {
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import "$std/dotenv/load.ts";

// S3 client instance
const s3Client = new S3Client({
  region: Deno.env.get("AWS_REGION") || "us-east-1",
  credentials: {
    accessKeyId: Deno.env.get("AWS_ACCESS_KEY_ID") || "",
    secretAccessKey: Deno.env.get("AWS_SECRET_ACCESS_KEY") || "",
  },
});

const BUCKET_NAME = Deno.env.get("S3_IMAGES_BUCKET") || "";
const CLOUDFRONT_URL = Deno.env.get("CLOUDFRONT_URL") || "";

interface ProcessResult {
  originalUrl: string;
  newUrl: string;
  success: boolean;
  error?: string;
}

/**
 * Processes an image by converting to WebP and resizing if needed
 * Same logic as the upload API
 */
async function processImage(
  imageBuffer: Uint8Array,
  originalKey: string,
): Promise<{ buffer: Uint8Array; fileName: string }> {
  try {
    // Extract filename from S3 key
    const keyParts = originalKey.split("/");
    const originalFileName = keyParts[keyParts.length - 1];

    // Get original image metadata
    const metadata = await sharp(imageBuffer).metadata();
    log.info(
      `Processing ${originalFileName}: ${metadata.width}x${metadata.height}`,
    );

    // Create Sharp instance
    const sharpInstance = sharp(imageBuffer);

    // Conditionally resize if width > 1000px
    if (metadata.width && metadata.width > 1000) {
      sharpInstance.resize(1000, null, {
        kernel: sharp.kernel.lanczos3, // Better quality than default
        withoutEnlargement: true, // Don't upscale if image is smaller
      });
    }

    // Convert to WebP with high quality settings
    const processedBuffer = await sharpInstance
      .webp({
        quality: 85, // Higher quality (default is 80)
        effort: 6, // Maximum compression effort (0-6, higher = better compression)
        smartSubsample: false, // Better quality for images with fine details
        nearLossless: false, // Set to true for even higher quality if file size allows
      })
      .toBuffer();

    // Generate WebP filename
    const baseName = originalFileName.replace(/\.[^/.]+$/, ""); // Remove extension
    const webpFileName = `${baseName}.webp`;

    return {
      buffer: processedBuffer,
      fileName: webpFileName,
    };
  } catch (error) {
    log.error(`Error processing image ${originalKey}:`, {
      error: error instanceof Error ? error.message : String(error),
    });
    throw new Error(
      `Failed to process image: ${
        error instanceof Error ? error.message : "Unknown error"
      }`,
    );
  }
}

/**
 * Downloads an image from S3
 */
async function downloadImageFromS3(key: string): Promise<Uint8Array> {
  try {
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });

    const response = await s3Client.send(command);
    if (!response.Body) {
      throw new Error("No body in S3 response");
    }

    // Convert the stream to Uint8Array
    const chunks: Uint8Array[] = [];
    const reader = response.Body.transformToWebStream().getReader();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
    }

    // Combine all chunks into a single Uint8Array
    const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
    const result = new Uint8Array(totalLength);
    let offset = 0;
    for (const chunk of chunks) {
      result.set(chunk, offset);
      offset += chunk.length;
    }

    return result;
  } catch (error) {
    log.error(`Error downloading image from S3 ${key}:`, {
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

/**
 * Uploads a processed image to S3
 */
async function uploadToS3(
  fileBuffer: Uint8Array,
  key: string,
): Promise<string> {
  try {
    // Upload to S3
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      Body: fileBuffer,
      ContentType: "image/webp",
    });

    await s3Client.send(command);

    // Generate the URL for the uploaded file
    const url = `https://${CLOUDFRONT_URL}/${key}`;

    log.info(`Successfully uploaded ${key} to S3`);
    return url;
  } catch (error) {
    log.error("Error uploading to S3:", {
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

/**
 * Processes a single S3 image and creates a WebP version
 */
async function processS3Image(
  originalKey: string,
): Promise<ProcessResult> {
  try {
    // Skip if already WebP
    if (originalKey.toLowerCase().endsWith(".webp")) {
      log.info(`Skipping ${originalKey} - already WebP format`);
      return {
        originalUrl: `https://${CLOUDFRONT_URL}/${originalKey}`,
        newUrl: `https://${CLOUDFRONT_URL}/${originalKey}`,
        success: true,
      };
    }

    // Generate WebP key
    const keyParts = originalKey.split("/");
    const fileName = keyParts[keyParts.length - 1];
    const baseName = fileName.replace(/\.[^/.]+$/, ""); // Remove extension
    const webpFileName = `${baseName}.webp`;
    const webpKey = keyParts.slice(0, -1).concat(webpFileName).join("/");

    // Check if WebP version already exists by trying to get its metadata
    try {
      await s3Client.send(
        new GetObjectCommand({
          Bucket: BUCKET_NAME,
          Key: webpKey,
        }),
      );
      log.info(`WebP version already exists: ${webpKey}`);
      return {
        originalUrl: `https://${CLOUDFRONT_URL}/${originalKey}`,
        newUrl: `https://${CLOUDFRONT_URL}/${webpKey}`,
        success: true,
      };
    } catch {
      // WebP doesn't exist, continue with processing
    }

    // Download the original image from S3
    log.info(`Processing S3 image: ${originalKey}`);
    const imageBuffer = await downloadImageFromS3(originalKey);

    // Process the image (convert to WebP and resize if needed)
    const processed = await processImage(imageBuffer, originalKey);

    // Upload the processed image to S3
    const newUrl = await uploadToS3(processed.buffer, webpKey);

    return {
      originalUrl: `https://${CLOUDFRONT_URL}/${originalKey}`,
      newUrl,
      success: true,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log.error(`Failed to process S3 image ${originalKey}:`, {
      error: errorMessage,
    });

    return {
      originalUrl: `https://${CLOUDFRONT_URL}/${originalKey}`,
      newUrl: `https://${CLOUDFRONT_URL}/${originalKey}`, // Keep original URL on failure
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Lists all objects in the S3 bucket
 */
async function listAllS3Objects(): Promise<string[]> {
  const objects: string[] = [];
  let continuationToken: string | undefined;

  try {
    do {
      const command = new ListObjectsV2Command({
        Bucket: BUCKET_NAME,
        ContinuationToken: continuationToken,
      });

      const response = await s3Client.send(command);

      if (response.Contents) {
        for (const object of response.Contents) {
          if (object.Key) {
            objects.push(object.Key);
          }
        }
      }

      continuationToken = response.NextContinuationToken;
    } while (continuationToken);

    return objects;
  } catch (error) {
    log.error("Error listing S3 objects:", {
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

/**
 * Filters S3 keys to only include image files (excluding WebP)
 */
function filterImageKeys(keys: string[]): string[] {
  const imageExtensions = [
    ".jpg",
    ".jpeg",
    ".png",
    ".gif",
    ".bmp",
    ".tiff",
    ".svg",
  ];

  return keys.filter((key) => {
    const lowerKey = key.toLowerCase();
    // Include if it has an image extension but is not already WebP
    return imageExtensions.some((ext) => lowerKey.endsWith(ext)) &&
      !lowerKey.endsWith(".webp");
  });
}

/**
 * Main migration function - Creates WebP images alongside existing ones without updating database
 */
async function migrateImagesToWebP() {
  log.info(
    "Starting WebP image creation from S3 objects (no database updates)...",
  );

  if (!BUCKET_NAME || !CLOUDFRONT_URL) {
    log.error(
      "Missing required environment variables: S3_IMAGES_BUCKET or CLOUDFRONT_URL",
    );
    return;
  }

  try {
    // List all objects in S3
    log.info("Listing all objects in S3 bucket...");
    const allObjects = await listAllS3Objects();
    log.info(`Found ${allObjects.length} total objects in S3`);

    // Filter to only image files (excluding WebP)
    const imageKeys = filterImageKeys(allObjects);
    log.info(`Found ${imageKeys.length} image files to potentially convert`);

    const totalImages = imageKeys.length;
    let processedImages = 0;
    let skippedImages = 0;
    let failedImages = 0;

    // Process each image
    for (const imageKey of imageKeys) {
      const result = await processS3Image(imageKey);

      if (result.success) {
        if (result.originalUrl !== result.newUrl) {
          processedImages++;
          log.info(`Created WebP: ${imageKey} -> ${result.newUrl}`);
        } else {
          skippedImages++;
        }
      } else {
        failedImages++;
        log.error(`Failed to process: ${imageKey} - ${result.error}`);
      }
    }

    // Final summary
    log.info("WebP image creation completed!", {
      totalImages,
      processedImages,
      skippedImages,
      failedImages,
      successRate: `${
        ((processedImages + skippedImages) / totalImages * 100).toFixed(1)
      }%`,
      note:
        "No database records were updated - WebP images created alongside originals in S3",
    });
  } catch (error) {
    log.error("WebP image creation failed:", {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

// Run the migration if this script is executed directly
if (import.meta.main) {
  await migrateImagesToWebP();
}
