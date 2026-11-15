# The web app on Lambda behind CloudFront (lambda/web.ts), replacing the Deno
# Deploy apps.
#
#   viewer -> CloudFront -> API Gateway (HTTP API) -> Lambda
#
# - CloudFront is the public entry point. It caches the hashed build assets
#   (/assets/*) and passes everything else through uncached.
# - The HTTP API is only there to invoke the function over HTTPS. Its endpoint
#   is public, so CloudFront adds a secret header (x-origin-secret) and the
#   function refuses requests without it.
# - Terraform owns the configuration. The code is built and uploaded by
#   `deno task deploy:web <stage>`; a new function starts with the placeholder
#   from jobs.tf, which fails until the first deploy.
# - Settings and secrets are not here: the function reads them at startup from
#   Parameter Store, under /weewoo-study/<stage>/ (`deno task config:push`).
#
# Only the stages listed in web_stages exist. Each is reachable at its
# distribution's cloudfront.net name until DNS is pointed at it.

locals {
  web_stages = {
    test = { stage = "TEST" }
  }

  # AWS managed CloudFront policies.
  cache_policy_disabled       = "4135ea2d-6df8-44a3-9df3-4b5a84be39ad" # CachingDisabled
  cache_policy_optimized      = "658327ea-f89d-4fab-a63d-7e88639e58f6" # CachingOptimized
  origin_request_all_but_host = "b689b0a8-53d0-40ab-baf2-68738e2966ac" # AllViewerExceptHostHeader
}

data "aws_caller_identity" "current" {}

resource "random_password" "web_origin_secret" {
  for_each = local.web_stages
  length   = 48
  special  = false
}

# --- Function ---

resource "aws_iam_role" "web" {
  for_each = local.web_stages
  name     = "weewoo-study-${each.key}-web"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { Service = "lambda.amazonaws.com" }
    }]
  })
}

# What the app's IAM user has on Deno Deploy (iam.tf), for one stage's table,
# plus reading the stage's settings.
resource "aws_iam_role_policy" "web" {
  for_each = local.web_stages
  name     = "weewoo-study-${each.key}-web"
  role     = aws_iam_role.web[each.key].id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["logs:CreateLogStream", "logs:PutLogEvents"]
        Resource = "${aws_cloudwatch_log_group.web[each.key].arn}:*"
      },
      {
        Effect   = "Allow"
        Action   = ["ssm:GetParametersByPath"]
        Resource = "arn:aws:ssm:us-east-1:${data.aws_caller_identity.current.account_id}:parameter/weewoo-study/${each.key}"
      },
      {
        Effect = "Allow"
        Action = [
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:DeleteItem",
          "dynamodb:ConditionCheckItem",
          "dynamodb:Query",
          "dynamodb:Scan"
        ]
        Resource = aws_dynamodb_table.app[each.key].arn
      },
      {
        Effect   = "Allow"
        Action   = ["ses:SendEmail", "ses:SendRawEmail", "ses:SendTemplatedEmail"]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "s3:PutObject",
          "s3:GetObject",
          "s3:GetObjectVersion",
          "s3:ListBucket",
          "s3:GetBucketLocation"
        ]
        Resource = [
          aws_s3_bucket.static_assets.arn,
          "${aws_s3_bucket.static_assets.arn}/*"
        ]
      },
    ]
  })
}

resource "aws_cloudwatch_log_group" "web" {
  for_each          = local.web_stages
  name              = "/aws/lambda/weewoo-study-${each.key}-web"
  retention_in_days = each.key == "prod" ? 180 : 7
}

resource "aws_lambda_function" "web" {
  for_each      = local.web_stages
  function_name = "weewoo-study-${each.key}-web"
  role          = aws_iam_role.web[each.key].arn
  runtime       = local.job_runtime
  architectures = [local.job_architecture]
  handler       = "web" # unused: the executable only serves the web app
  memory_size   = 1024
  timeout       = 30

  filename         = data.archive_file.job_placeholder.output_path
  source_code_hash = data.archive_file.job_placeholder.output_base64sha256

  environment {
    variables = {
      STAGE          = each.value.stage
      DYNAMODB_TABLE = aws_dynamodb_table.app[each.key].name
      CONFIG_PATH    = "/weewoo-study/${each.key}"
      ORIGIN_SECRET  = random_password.web_origin_secret[each.key].result
    }
  }

  # Code is deployed by `deno task deploy:web`, not by Terraform.
  lifecycle {
    ignore_changes = [filename, source_code_hash]
  }

  depends_on = [aws_cloudwatch_log_group.web]
}

# --- HTTP API: invokes the function for every request ---

resource "aws_apigatewayv2_api" "web" {
  for_each      = local.web_stages
  name          = "weewoo-study-${each.key}-web"
  protocol_type = "HTTP"
}

resource "aws_apigatewayv2_integration" "web" {
  for_each               = local.web_stages
  api_id                 = aws_apigatewayv2_api.web[each.key].id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.web[each.key].invoke_arn
  payload_format_version = "2.0" # the event shape lambda/http.ts reads
}

resource "aws_apigatewayv2_route" "web" {
  for_each  = local.web_stages
  api_id    = aws_apigatewayv2_api.web[each.key].id
  route_key = "$default"
  target    = "integrations/${aws_apigatewayv2_integration.web[each.key].id}"
}

resource "aws_apigatewayv2_stage" "web" {
  for_each    = local.web_stages
  api_id      = aws_apigatewayv2_api.web[each.key].id
  name        = "$default"
  auto_deploy = true
}

resource "aws_lambda_permission" "web_api" {
  for_each      = local.web_stages
  statement_id  = "AllowHttpApiToInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.web[each.key].function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.web[each.key].execution_arn}/*/*"
}

# --- CloudFront ---

# The origin can't be sent the viewer's Host header (API Gateway routes on its
# own), so pass it along under another name. The app builds absolute URLs,
# such as OAuth redirects, from it.
resource "aws_cloudfront_function" "web_forward_host" {
  name    = "weewoo-study-forward-host"
  runtime = "cloudfront-js-2.0"
  comment = "Copy the viewer's Host header into x-forwarded-host"
  publish = true
  code    = <<-EOT
    function handler(event) {
      var request = event.request;
      request.headers['x-forwarded-host'] = { value: request.headers.host.value };
      return request;
    }
  EOT
}

resource "aws_cloudfront_distribution" "web" {
  for_each        = local.web_stages
  enabled         = true
  is_ipv6_enabled = true
  http_version    = "http2and3"
  price_class     = "PriceClass_100"
  comment         = "weewoo.study web app (${each.key})"

  origin {
    origin_id   = "web"
    domain_name = replace(aws_apigatewayv2_api.web[each.key].api_endpoint, "https://", "")

    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "https-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }

    custom_header {
      name  = "x-origin-secret"
      value = random_password.web_origin_secret[each.key].result
    }
  }

  # Pages and API routes: never cached, everything forwarded.
  default_cache_behavior {
    target_origin_id         = "web"
    viewer_protocol_policy   = "redirect-to-https"
    allowed_methods          = ["GET", "HEAD", "OPTIONS", "PUT", "POST", "PATCH", "DELETE"]
    cached_methods           = ["GET", "HEAD"]
    compress                 = true
    cache_policy_id          = local.cache_policy_disabled
    origin_request_policy_id = local.origin_request_all_but_host

    function_association {
      event_type   = "viewer-request"
      function_arn = aws_cloudfront_function.web_forward_host.arn
    }
  }

  # Build output with a content hash in the file name: safe to cache for good.
  ordered_cache_behavior {
    path_pattern             = "/assets/*"
    target_origin_id         = "web"
    viewer_protocol_policy   = "redirect-to-https"
    allowed_methods          = ["GET", "HEAD"]
    cached_methods           = ["GET", "HEAD"]
    compress                 = true
    cache_policy_id          = local.cache_policy_optimized
    origin_request_policy_id = local.origin_request_all_but_host

    function_association {
      event_type   = "viewer-request"
      function_arn = aws_cloudfront_function.web_forward_host.arn
    }
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = true
  }
}

output "web_urls" {
  description = "Where each stage's web app on Lambda is reachable"
  value       = { for stage, dist in aws_cloudfront_distribution.web : stage => "https://${dist.domain_name}" }
}
