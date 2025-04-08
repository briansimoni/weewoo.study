# IAM Policy for Amazon SES Email Sending

# Reference the existing IAM user as a data source
data "aws_iam_user" "svc_weewoo" {
  user_name = "svc_weewoo"
}

resource "aws_iam_policy" "ses_email_sending" {
  name        = "SESEmailSendingPolicy"
  description = "Allows sending emails via Amazon SES"
  
  policy = jsonencode({
    Version = "2012-10-17",
    Statement = [
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
      }
    ]
  })
}

# Attach the SES policy to the existing IAM user
resource "aws_iam_user_policy_attachment" "ses_user_attachment" {
  user       = data.aws_iam_user.svc_weewoo.user_name
  policy_arn = aws_iam_policy.ses_email_sending.arn
}

# Output the ARN of the policy for reference
output "ses_email_sending_policy_arn" {
  value       = aws_iam_policy.ses_email_sending.arn
  description = "The ARN of the SES email sending policy"
}

# Output the IAM user ARN for reference
output "iam_user_arn" {
  value       = data.aws_iam_user.svc_weewoo.arn
  description = "The ARN of the IAM user with SES permissions"
}
