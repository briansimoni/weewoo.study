# Background jobs on Lambda (lambda/main.ts), replacing the app's Deno.cron jobs.
#
# - weewoo-study-<stage>-weekly-report: mails the admin the week's reported
#   questions. Prod runs on a schedule; test has no trigger and is only
#   invoked by hand, to try a new build.
# - weewoo-study-prod-ses-events: mails the admin about SES delivery events.
#   The weewoo_ops_listener queue invokes it for each message, so there is no
#   polling. The queue only carries prod's SES events, so there is no test
#   function.
#
# Terraform owns the functions' configuration. Their code is one zip, built
# and uploaded by `deno task deploy:jobs <test|prod>`; a new function starts
# with a placeholder that fails until the first deploy.

locals {
  job_stages = {
    test = { stage = "TEST" }
    prod = { stage = "PROD" }
  }
  job_runtime      = "provided.al2023"
  job_architecture = "arm64" # must match TARGET in scripts/build_jobs.ts
}

# Addresses the jobs mail to and from. They are settings, not secrets, but the
# repository is public, so they live in Parameter Store (created by hand:
# `aws ssm put-parameter --type String --name weewoo-study-admin-email ...`).
data "aws_ssm_parameter" "admin_email" {
  name = "weewoo-study-admin-email"
}

data "aws_ssm_parameter" "ses_from_email" {
  name = "weewoo-study-ses-from-email"
}

data "archive_file" "job_placeholder" {
  type        = "zip"
  output_path = "${path.module}/.job-placeholder.zip"

  source {
    filename = "bootstrap"
    content  = "#!/bin/sh\necho 'no code deployed yet: run deno task deploy:jobs' >&2\nexit 1\n"
  }
}

# One role per stage, so the test function can't read the prod table.
resource "aws_iam_role" "jobs" {
  for_each = local.job_stages
  name     = "weewoo-study-${each.key}-jobs"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { Service = "lambda.amazonaws.com" }
    }]
  })
}

resource "aws_iam_role_policy" "jobs" {
  for_each = local.job_stages
  name     = "weewoo-study-${each.key}-jobs"
  role     = aws_iam_role.jobs[each.key].id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = concat(
      [
        {
          Effect   = "Allow"
          Action   = ["logs:CreateLogStream", "logs:PutLogEvents"]
          Resource = "arn:aws:logs:*:*:log-group:/aws/lambda/weewoo-study-${each.key}-*:*"
        },
        {
          Effect   = "Allow"
          Action   = ["ses:SendEmail"]
          Resource = "*"
        },
        # The weekly report only reads (lib/dynamo_kv.ts get and list).
        {
          Effect   = "Allow"
          Action   = ["dynamodb:GetItem", "dynamodb:Query", "dynamodb:Scan"]
          Resource = aws_dynamodb_table.app[each.key].arn
        },
      ],
      each.key == "prod" ? [
        {
          Effect = "Allow"
          Action = [
            "sqs:ReceiveMessage",
            "sqs:DeleteMessage",
            "sqs:GetQueueAttributes"
          ]
          Resource = aws_sqs_queue.weewoo_ops_listener.arn
        },
      ] : []
    )
  })
}

# --- Weekly question report ---

resource "aws_cloudwatch_log_group" "weekly_report" {
  for_each          = local.job_stages
  name              = "/aws/lambda/weewoo-study-${each.key}-weekly-report"
  retention_in_days = each.key == "prod" ? 180 : 7
}

resource "aws_lambda_function" "weekly_report" {
  for_each      = local.job_stages
  function_name = "weewoo-study-${each.key}-weekly-report"
  role          = aws_iam_role.jobs[each.key].arn
  runtime       = local.job_runtime
  architectures = [local.job_architecture]
  handler       = "weekly-report" # the job name: see lambda/main.ts
  memory_size   = 512
  timeout       = 60

  filename         = data.archive_file.job_placeholder.output_path
  source_code_hash = data.archive_file.job_placeholder.output_base64sha256

  environment {
    variables = {
      STAGE          = each.value.stage
      DYNAMODB_TABLE = aws_dynamodb_table.app[each.key].name
      ADMIN_EMAIL    = data.aws_ssm_parameter.admin_email.value
      SES_FROM_EMAIL = data.aws_ssm_parameter.ses_from_email.value
    }
  }

  # Code is deployed by `deno task deploy:jobs`, not by Terraform.
  lifecycle {
    ignore_changes = [filename, source_code_hash]
  }

  depends_on = [aws_cloudwatch_log_group.weekly_report]
}

# Saturdays at 09:00 UTC, as the Deno.cron job ran. Prod only.
resource "aws_cloudwatch_event_rule" "weekly_report" {
  name                = "weewoo-study-prod-weekly-report"
  description         = "Weekly question report for weewoo.study"
  schedule_expression = "cron(0 9 ? * SAT *)"
}

resource "aws_cloudwatch_event_target" "weekly_report" {
  rule = aws_cloudwatch_event_rule.weekly_report.name
  arn  = aws_lambda_function.weekly_report["prod"].arn
}

resource "aws_lambda_permission" "weekly_report_schedule" {
  statement_id  = "AllowScheduleToInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.weekly_report["prod"].function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.weekly_report.arn
}

# --- SES event alerts ---

resource "aws_cloudwatch_log_group" "ses_events" {
  name              = "/aws/lambda/weewoo-study-prod-ses-events"
  retention_in_days = 180
}

resource "aws_lambda_function" "ses_events" {
  function_name = "weewoo-study-prod-ses-events"
  role          = aws_iam_role.jobs["prod"].arn
  runtime       = local.job_runtime
  architectures = [local.job_architecture]
  handler       = "ses-events" # the job name: see lambda/main.ts
  memory_size   = 512
  timeout       = 30

  filename         = data.archive_file.job_placeholder.output_path
  source_code_hash = data.archive_file.job_placeholder.output_base64sha256

  environment {
    variables = {
      STAGE          = "PROD"
      DYNAMODB_TABLE = aws_dynamodb_table.app["prod"].name
      ADMIN_EMAIL    = data.aws_ssm_parameter.admin_email.value
      SES_FROM_EMAIL = data.aws_ssm_parameter.ses_from_email.value
    }
  }

  lifecycle {
    ignore_changes = [filename, source_code_hash]
  }

  depends_on = [aws_cloudwatch_log_group.ses_events]
}

# The queue invokes the function. A message that fails is retried on its own
# (ReportBatchItemFailures) and goes to the dead-letter queue after 3 tries.
resource "aws_lambda_event_source_mapping" "ses_events" {
  event_source_arn        = aws_sqs_queue.weewoo_ops_listener.arn
  function_name           = aws_lambda_function.ses_events.arn
  batch_size              = 10
  function_response_types = ["ReportBatchItemFailures"]
}

output "job_function_names" {
  description = "Lambda functions that run the background jobs"
  value = concat(
    [for fn in aws_lambda_function.weekly_report : fn.function_name],
    [aws_lambda_function.ses_events.function_name]
  )
}
