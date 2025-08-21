const { S3Client, GetObjectCommand, PutObjectCommand } = require(
    "@aws-sdk/client-s3",
);
const sharp = require("sharp");

const s3Client = new S3Client({
    region: process.env.AWS_REGION || "us-east-1",
});

exports.handler = async (event) => {
    console.log("Received SQS event:", JSON.stringify(event, null, 2));

    for (const sqsRecord of event.Records) {
        // Parse S3 event from SQS message body
        const s3Event = JSON.parse(sqsRecord.body);
        console.log("Parsed S3 event:", JSON.stringify(s3Event, null, 2));

        // Process each S3 record within the SQS message
        for (const s3Record of s3Event.Records) {
            const bucket = s3Record.s3.bucket.name;
            const key = decodeURIComponent(
                s3Record.s3.object.key.replace(/\+/g, " "),
            );

            console.log(`Processing image: s3://${bucket}/${key}`);

            // Skip if already processed (avoid infinite loops)
            if (key.endsWith(".webp")) {
                console.log(`Skipping already processed file: ${key}`);
                continue;
            }

        try {
            // Download the image from S3
            const getObjectCommand = new GetObjectCommand({
                Bucket: bucket,
                Key: key,
            });

            const data = await s3Client.send(getObjectCommand);
            const bodyBytes = await streamToBuffer(data.Body);
            console.log(
                `Downloaded image from S3: ${data.ContentLength} bytes`,
            );

            // Process the image with Sharp
            let sharpImage = sharp(bodyBytes);

            // Get image metadata
            const metadata = await sharpImage.metadata();
            console.log(
                `Original image: ${metadata.width}x${metadata.height}, format: ${metadata.format}`,
            );

            // Resize if width > 1000px, maintaining aspect ratio
            if (metadata.width > 1000) {
                sharpImage = sharpImage.resize(1000, null, {
                    kernel: sharp.kernel.lanczos3, // Better quality than default
                    withoutEnlargement: true, // Don't upscale if image is smaller
                });
                console.log(`Resizing image to max width 1000px`);
            }

            // Convert to WebP with high quality settings
            const webpBuffer = await sharpImage
                .webp({
                    quality: 85, // Higher quality (default is 80)
                    effort: 6, // Maximum compression effort (0-6, higher = better compression)
                    smartSubsample: false, // Better quality for images with fine details
                    nearLossless: false, // Set to true for even higher quality if file size allows
                })
                .toBuffer();

            console.log(`Converted to WebP: ${webpBuffer.length} bytes`);

            // Generate processed key
            const processedKey = generateProcessedKey(key);

            // Upload processed image back to S3
            const putObjectCommand = new PutObjectCommand({
                Bucket: bucket,
                Key: processedKey,
                Body: webpBuffer,
                ContentType: "image/webp",
            });

            await s3Client.send(putObjectCommand);
            console.log(
                `Successfully uploaded processed image: s3://${bucket}/${processedKey}`,
            );
            } catch (error) {
                console.log(`Error processing image ${key}:`, error);
                // Continue processing other images
            }
        }
    }

    return {
        statusCode: 200,
        body: JSON.stringify("Image processing completed"),
    };
};

// Helper function to convert stream to buffer
async function streamToBuffer(stream) {
    const chunks = [];
    for await (const chunk of stream) {
        chunks.push(chunk);
    }
    return Buffer.concat(chunks);
}

function generateProcessedKey(originalKey) {
    const lastDotIndex = originalKey.lastIndexOf(".");
    
    // Replace extension with .webp
    if (lastDotIndex !== -1) {
        return originalKey.substring(0, lastDotIndex) + ".webp";
    }
    
    // If no extension, just add .webp
    return originalKey + ".webp";
}
