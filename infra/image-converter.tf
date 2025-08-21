# SQS Queue for S3 image upload events
resource "aws_sqs_queue" "image_processing_dlq" {
  name                      = "weewoo-image-processing-dlq"
  message_retention_seconds = 1209600 # 14 days
  
  tags = {
    Name        = "Image Processing DLQ"
    Environment = "production"
  }
}

resource "aws_sqs_queue" "image_processing_queue" {
  name                      = "weewoo-image-processing-queue"
  visibility_timeout_seconds = 900 # 15 minutes to match Lambda timeout
  message_retention_seconds = 1209600 # 14 days
  
  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.image_processing_dlq.arn
    maxReceiveCount     = 3
  })
  
  tags = {
    Name        = "Image Processing Queue"
    Environment = "production"
  }
}

# SQS Queue Policy to allow S3 to send messages
resource "aws_sqs_queue_policy" "image_processing_queue_policy" {
  queue_url = aws_sqs_queue.image_processing_queue.id
  
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowS3ToSendMessage"
        Effect = "Allow"
        Principal = {
          Service = "s3.amazonaws.com"
        }
        Action   = "sqs:SendMessage"
        Resource = aws_sqs_queue.image_processing_queue.arn
        Condition = {
          ArnEquals = {
            "aws:SourceArn" = aws_s3_bucket.static_assets.arn
          }
        }
      }
    ]
  })
}

# Lambda execution role
resource "aws_iam_role" "image_converter_lambda_role" {
  name = "weewoo-image-converter-lambda-role"
  
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })
}

# Lambda execution policy
resource "aws_iam_role_policy" "image_converter_lambda_policy" {
  name = "weewoo-image-converter-lambda-policy"
  role = aws_iam_role.image_converter_lambda_role.id
  
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      # CloudWatch Logs permissions
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "arn:aws:logs:*:*:*"
      },
      # SQS permissions
      {
        Effect = "Allow"
        Action = [
          "sqs:ReceiveMessage",
          "sqs:DeleteMessage",
          "sqs:GetQueueAttributes"
        ]
        Resource = [
          aws_sqs_queue.image_processing_queue.arn,
          aws_sqs_queue.image_processing_dlq.arn
        ]
      },
      # S3 permissions
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:DeleteObject"
        ]
        Resource = [
          "${aws_s3_bucket.static_assets.arn}/*"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "s3:ListBucket"
        ]
        Resource = aws_s3_bucket.static_assets.arn
      }
    ]
  })
}

# Lambda function
resource "aws_lambda_function" "image_converter" {
  filename         = "image-converter-lambda.zip"
  function_name    = "weewoo-image-converter"
  role            = aws_iam_role.image_converter_lambda_role.arn
  handler         = "index.handler"
  runtime         = "nodejs22.x"
  timeout         = 900 # 15 minutes
  memory_size     = 1024
  
  architectures = ["x86_64"]
  
  environment {
    variables = {
      S3_BUCKET = aws_s3_bucket.static_assets.bucket
    }
  }
  
  # This will need to be updated when you deploy the Lambda code
  source_code_hash = filebase64sha256("image-converter-lambda.zip")
  
  tags = {
    Name        = "Image Converter Lambda"
    Environment = "production"
  }
}

# CloudWatch Log Group for Lambda
resource "aws_cloudwatch_log_group" "image_converter_logs" {
  name              = "/aws/lambda/weewoo-image-converter"
  retention_in_days = 14
  
  tags = {
    Name        = "Image Converter Lambda Logs"
    Environment = "production"
  }
}

# SQS trigger for Lambda
resource "aws_lambda_event_source_mapping" "image_processing_trigger" {
  event_source_arn = aws_sqs_queue.image_processing_queue.arn
  function_name    = aws_lambda_function.image_converter.arn
  batch_size       = 1
  
  # Optional: Configure partial batch failure handling
  function_response_types = ["ReportBatchItemFailures"]
}

# Outputs
output "image_processing_queue_url" {
  description = "URL of the image processing SQS queue"
  value       = aws_sqs_queue.image_processing_queue.url
}

output "image_processing_dlq_url" {
  description = "URL of the image processing DLQ"
  value       = aws_sqs_queue.image_processing_dlq.url
}

output "image_converter_lambda_arn" {
  description = "ARN of the image converter Lambda function"
  value       = aws_lambda_function.image_converter.arn
}
