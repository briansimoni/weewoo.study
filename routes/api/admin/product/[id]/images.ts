import { Handlers } from "$fresh/server.ts";
import {
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import JSZip from "npm:jszip";

// S3 client instance
const s3Client = new S3Client({
  region: Deno.env.get("AWS_REGION") || "us-east-1",
  credentials: {
    accessKeyId: Deno.env.get("AWS_ACCESS_KEY_ID") || "",
    secretAccessKey: Deno.env.get("AWS_SECRET_ACCESS_KEY") || "",
  },
});

// Bucket name from environment variable
const BUCKET_NAME = Deno.env.get("S3_IMAGES_BUCKET") || "";
const CLOUDFRONT_URL = Deno.env.get("CLOUDFRONT_URL") || "";

interface UploadResult {
  success: boolean;
  url: string;
  key: string;
  error?: string;
}

interface ExtractedFile {
  name: string;
  data: Uint8Array;
  contentType: string;
}

/**
 * Uploads a file to S3 bucket
 * @param fileBuffer - The file buffer to upload
 * @param fileName - The filename to use in S3
 * @param contentType - MIME type of the file
 * @returns Promise with upload result containing URL and success status
 */
async function uploadToS3(
  fileBuffer: Uint8Array,
  fileName: string,
  contentType: string,
  productId: string,
): Promise<UploadResult> {
  try {
    const key = `${productId}/${fileName}`;

    // Upload to S3
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      Body: fileBuffer,
      ContentType: contentType,
    });

    await s3Client.send(command);

    // Generate the URL for the uploaded file
    // This will be served through CloudFront, but we'll return the S3 path for now
    const url = `https://${CLOUDFRONT_URL}/${key}`;

    return {
      success: true,
      url,
      key,
    };
  } catch (error) {
    console.error("Error uploading to S3:", error);
    return {
      success: false,
      url: "",
      key: "",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Lists available files in the S3 bucket (product images folder)
 * @returns Promise with array of S3 object URLs
 */
async function listS3ProductImages(productId: string): Promise<string[]> {
  try {
    if (!BUCKET_NAME) {
      console.warn("S3 bucket name not configured");
      return [];
    }

    const command = new ListObjectsV2Command({
      Bucket: BUCKET_NAME,
      Prefix: `${productId}/`,
      MaxKeys: 100,
    });

    const response = await s3Client.send(command);

    if (!response.Contents) {
      return [];
    }

    // Convert S3 objects to URLs
    return response.Contents
      .filter((obj) => obj.Key && obj.Key.match(/\.(jpg|jpeg|png|gif|webp)$/i))
      .map((obj) => `${CLOUDFRONT_URL}/${obj.Key}`);
  } catch (error) {
    console.error("Error listing S3 objects:", error);
    return [];
  }
}

/**
 * Detects the MIME type based on file extension
 * @param filename - The name of the file
 * @returns The MIME type as a string
 */
function getMimeType(filename: string): string {
  const extension = filename.split(".").pop()?.toLowerCase();

  switch (extension) {
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "png":
      return "image/png";
    case "gif":
      return "image/gif";
    case "webp":
      return "image/webp";
    default:
      return "application/octet-stream";
  }
}

/**
 * Check if a file is an image based on its name
 * @param filename - The name of the file
 * @returns boolean indicating if the file is an image
 */
function isImageFile(filename: string): boolean {
  const extension = filename.split(".").pop()?.toLowerCase();
  return ["jpg", "jpeg", "png", "gif", "webp"].includes(extension || "");
}

/**
 * Extracts files from a ZIP archive buffer
 * @param zipBuffer - The ZIP file as an ArrayBuffer
 * @returns Promise with array of extracted files
 */
async function extractFromZip(
  zipBuffer: ArrayBuffer,
): Promise<ExtractedFile[]> {
  try {
    // Load the ZIP file
    const zip = new JSZip();
    const loadedZip = await zip.loadAsync(zipBuffer);

    const extractedFiles: ExtractedFile[] = [];

    // Process each file in the ZIP
    for (const [filename, file] of Object.entries(loadedZip.files)) {
      // Skip directories and non-image files
      if (file.dir || !isImageFile(filename)) {
        continue;
      }

      // Extract the file data as a Uint8Array
      const data = await file.async("uint8array");

      // Get the base filename without any directory structure
      const name = filename.split("/").pop() || filename;

      extractedFiles.push({
        name,
        data,
        contentType: getMimeType(name),
      });
    }

    return extractedFiles;
  } catch (error) {
    console.error("Error extracting ZIP file:", error);
    throw new Error(
      `Failed to extract ZIP file: ${
        error instanceof Error ? error.message : "Unknown error"
      }`,
    );
  }
}

/**
 * API endpoint for uploading ZIP files containing product images
 */
export const handler: Handlers = {
  /**
   * GET handler for listing images from S3
   */
  async GET(_req, ctx) {
    const productId = ctx.params.id;
    try {
      // Get all product images from S3
      const images = await listS3ProductImages(productId);

      // Return the list of image URLs
      return new Response(
        JSON.stringify({
          success: true,
          images,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    } catch (error) {
      console.error("Error retrieving S3 images:", error);

      return new Response(
        JSON.stringify({
          error: "Failed to retrieve images from S3",
          details: error instanceof Error ? error.message : "Unknown error",
        }),
        { status: 500, headers: { "Content-Type": "application/json" } },
      );
    }
  },

  /**
   * POST handler for uploading and processing ZIP files
   */
  async POST(req, ctx) {
    try {
      const productId = ctx.params.id;
      // Check if request is multipart form data
      const contentType = req.headers.get("content-type") || "";
      if (!contentType.includes("multipart/form-data")) {
        return new Response(
          JSON.stringify({ error: "Request must be multipart/form-data" }),
          { status: 400, headers: { "Content-Type": "application/json" } },
        );
      }

      // Parse the form data
      const formData = await req.formData();
      const zipFile = formData.get("zipFile") as File;

      if (!zipFile) {
        return new Response(
          JSON.stringify({ error: "No ZIP file provided" }),
          { status: 400, headers: { "Content-Type": "application/json" } },
        );
      }

      // Validate the file is actually a ZIP
      if (!zipFile.name.toLowerCase().endsWith(".zip")) {
        return new Response(
          JSON.stringify({ error: "File must be a .zip archive" }),
          { status: 400, headers: { "Content-Type": "application/json" } },
        );
      }

      // Convert the ZIP file to an ArrayBuffer
      const zipBuffer = await zipFile.arrayBuffer();

      // Extract files from the ZIP
      const extractedFiles = await extractFromZip(zipBuffer);

      if (extractedFiles.length === 0) {
        return new Response(
          JSON.stringify({ error: "No image files found in the ZIP archive" }),
          { status: 400, headers: { "Content-Type": "application/json" } },
        );
      }

      // Upload each extracted file to S3
      const uploadResults = await Promise.all(
        extractedFiles.map((file) =>
          uploadToS3(file.data, file.name, file.contentType, productId)
        ),
      );

      // Filter out successful uploads and extract their URLs
      const successfulUploads = uploadResults
        .filter((result) => result.success)
        .map((result) => result.url);

      // Return the array of image URLs
      return new Response(
        JSON.stringify({
          success: true,
          uploadedImages: successfulUploads,
          message:
            `Successfully uploaded ${successfulUploads.length} of ${extractedFiles.length} images`,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    } catch (error) {
      console.error("Error processing ZIP upload:", error);

      return new Response(
        JSON.stringify({
          error: "Failed to process ZIP file",
          details: error instanceof Error ? error.message : "Unknown error",
        }),
        { status: 500, headers: { "Content-Type": "application/json" } },
      );
    }
  },
};
