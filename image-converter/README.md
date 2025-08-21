# Weewoo Image Converter Lambda

An AWS Lambda function that automatically processes images uploaded to S3, converting them to optimized WebP format.

## Why This Exists

This image converter was created to solve cross-platform compatibility issues with image processing libraries in the main Deno/TypeScript application. Libraries like `@squoosh/lib` had WASM loading problems and Sharp had native dependency issues when running in different environments.

By moving image processing to AWS Lambda, we achieve:

- **Eliminates Cross-Platform Issues**: No more native dependency problems across different deployment environments
- **Better Performance**: Lambda provides consistent, scalable image processing
- **Cost-Effective**: Only pay for actual image processing time
- **Separation of Concerns**: Keeps the main application lightweight while handling heavy image processing separately

## Architecture

1. **Image Upload** → S3 bucket (`ems-questions-static-assets`)
2. **S3 Event** → SQS queue (`weewoo-image-processing-queue`)
3. **SQS Message** → Lambda function (`weewoo-image-converter`)
4. **Lambda Processing** → Resize + WebP conversion using Sharp
5. **Processed Image** → Back to S3 with `.webp` extension

## Features

- **Automatic Processing**: Triggered by S3 upload events via SQS
- **Image Optimization**: Resizes images to max 1000px width while maintaining aspect ratio
- **WebP Conversion**: Converts all image formats to WebP at 85% quality for optimal web performance
- **Error Handling**: Dead Letter Queue (DLQ) for failed processing attempts
- **Loop Prevention**: Skips already processed `.webp` files to avoid infinite processing
- **Comprehensive Logging**: CloudWatch logs for monitoring and debugging

## Technical Details

- **Runtime**: Node.js 22.x
- **Architecture**: x86_64
- **Timeout**: 15 minutes
- **Memory**: 1024MB
- **Dependencies**: Sharp (high-performance image processing), AWS SDK v3

## File Processing

Input: `image.png` → Output: `image.webp`

The original file remains unchanged, and a new optimized WebP version is created with the same base name.

## Deployment

1. Run `.\build.ps1` to package the Lambda function
2. Run `terraform apply` in the `infra/` directory to deploy infrastructure
3. Upload images to the S3 bucket to trigger automatic processing

## Monitoring

- CloudWatch logs: `/aws/lambda/weewoo-image-converter`
- SQS queue metrics for processing status
- DLQ monitoring for failed processing attempts