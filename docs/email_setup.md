# Email Service Setup Guide

This guide explains how to set up and use the email service for sending order
confirmations using Amazon SES.

## Prerequisites

1. An AWS account with Amazon SES service enabled
2. A verified email address or domain in Amazon SES
3. Appropriate IAM permissions to send emails via SES

## Configuration

Add the following environment variables to your `.env` file:

```
# Amazon SES Configuration
AWS_REGION=us-east-1  # Replace with your AWS region if different
SES_FROM_EMAIL=your-verified-email@example.com  # Must be verified in SES
AWS_ACCESS_KEY_ID=your-access-key-id  # Your AWS access key with SES permissions
AWS_SECRET_ACCESS_KEY=your-secret-access-key  # Your AWS secret key
```

## Amazon SES Setup Steps

1. **Verify Email Address**:
   - Go to the [Amazon SES Console](https://console.aws.amazon.com/ses/)
   - Navigate to "Verified Identities"
   - Click "Create Identity" and select "Email address"
   - Enter the email address you want to use as the sender
   - Follow the verification steps in the email you receive

2. **IAM Configuration for SES Access**:
   - Go to the [IAM Console](https://console.aws.amazon.com/iam/)
   - Use an existing IAM user or create a new one with programmatic access
   - Attach a policy with the following permissions:
     ```json
     {
       "Version": "2012-10-17",
       "Statement": [
         {
           "Effect": "Allow",
           "Action": [
             "ses:SendEmail",
             "ses:SendRawEmail",
             "ses:SendTemplatedEmail"
           ],
           "Resource": "*"
         },
         {
           "Effect": "Allow",
           "Action": [
             "ses:GetSendQuota",
             "ses:GetSendStatistics"
           ],
           "Resource": "*"
         }
       ]
     }
     ```
   - Save the Access Key ID and Secret Access Key for the `.env` file

3. **Move Out of SES Sandbox** (for production use):
   - By default, new SES accounts are in the sandbox mode, which limits you to
     sending emails only to verified addresses
   - To move out of the sandbox, create a support ticket requesting production
     access
   - Provide details about your email sending use case, expected volume, and
     compliance with best practices

## Usage

The email service will attempt to send real emails via SES in all environments.
Make sure your AWS credentials are properly configured in your `.env` file.

All email sending attempts (successful or failed) are logged for debugging
purposes.

## Troubleshooting

- **Emails not sending in production**: Check that all environment variables are
  correctly set and that your AWS credentials have the necessary permissions
- **SES throttling**: If you're sending a large volume of emails, you might hit
  SES sending limits. Check your SES console for current limits and request
  increases if needed
- **Email deliverability issues**: Ensure your sending domain has proper SPF and
  DKIM records set up through the SES console
