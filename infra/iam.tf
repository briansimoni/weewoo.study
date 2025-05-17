# IAM Policy for Amazon SES Email Sending

# Reference the existing IAM user as a data source
data "aws_iam_user" "svc_weewoo" {
  user_name = "svc_weewoo"
}

resource "aws_iam_policy" "ses_email_sending" {
  name        = "ServicePolicy-weewoo"
  description = "Policy for weewoo.study app service permissions (SES and S3)"
  
  policy = jsonencode({
    Version = "2012-10-17",
    Statement = [
      # SES Email Sending permissions
      {
        Effect = "Allow",
        Action = [
          "ses:SendEmail",
          "ses:SendRawEmail",
          "ses:SendTemplatedEmail"
        ],
        Resource = "*"  # You can restrict this to specific SES resources if needed
      },
      {
        Effect = "Allow",
        Action = [
          "ses:GetSendQuota",
          "ses:GetSendStatistics"
        ],
        Resource = "*"
      },
      # S3 Read permissions for static assets
      {
        Effect = "Allow",
        Action = [
          "s3:GetObject",
          "s3:GetObjectVersion",
          "s3:ListBucket",
          "s3:GetBucketLocation"
        ],
        Resource = [
          "arn:aws:s3:::ems-questions-static-assets",
          "arn:aws:s3:::ems-questions-static-assets/*"
        ]
      },
      # S3 Read/Write permissions for Deno KV backups
      {
        Effect = "Allow",
        Action = [
          "s3:PutObject",
          "s3:PutObjectAcl",
          "s3:GetObject",
          "s3:GetObjectVersion",
          "s3:DeleteObject",
          "s3:ListBucket",
          "s3:GetBucketLocation"
        ],
        Resource = [
          "arn:aws:s3:::ems-questions-deno-kv-backups",
          "arn:aws:s3:::ems-questions-deno-kv-backups/*"
        ]
      }
    ]
  })
}

# Attach the service policy to the existing IAM user
resource "aws_iam_user_policy_attachment" "service_policy_attachment" {
  user       = data.aws_iam_user.svc_weewoo.user_name
  policy_arn = aws_iam_policy.ses_email_sending.arn
}

# Output the ARN of the policy for reference
output "service_policy_arn" {
  value       = aws_iam_policy.ses_email_sending.arn
  description = "The ARN of the service policy for weewoo.study"
}

# Output the IAM user ARN for reference
output "iam_user_arn" {
  value       = data.aws_iam_user.svc_weewoo.arn
  description = "The ARN of the IAM user with SES permissions"
}
