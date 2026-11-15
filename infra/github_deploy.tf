# Lets GitHub Actions deploy Lambda code without stored AWS keys: the
# workflows exchange GitHub's OIDC token for a short-lived role session.
#
# - weewoo-study-github-deploy-test: only pushes to `main`
#   (.github/workflows/deploy-test.yml).
# - weewoo-study-github-deploy-prod: only jobs running in the `production`
#   GitHub environment (.github/workflows/deploy-production.yml).
#
# Each role can replace the code of its stage's functions and nothing else.
# Function configuration stays with Terraform.

locals {
  github_repo = "briansimoni/weewoo.study"

  github_deploy = {
    test = {
      subject   = "repo:${local.github_repo}:ref:refs/heads/main"
      functions = ["weewoo-study-test-web", "weewoo-study-test-weekly-report"]
    }
    prod = {
      subject = "repo:${local.github_repo}:environment:production"
      functions = [
        "weewoo-study-prod-web",
        "weewoo-study-prod-weekly-report",
        "weewoo-study-prod-ses-events",
      ]
    }
  }
}

resource "aws_iam_openid_connect_provider" "github" {
  url            = "https://token.actions.githubusercontent.com"
  client_id_list = ["sts.amazonaws.com"]
  # AWS no longer checks these for GitHub's issuer, but the API requires one.
  thumbprint_list = [
    "6938fd4d98bab03faadb97b34396831e3780aea1",
    "1c58a3a8518e8759bf075b76b750d4f2df264fcd",
  ]
}

resource "aws_iam_role" "github_deploy" {
  for_each = local.github_deploy
  name     = "weewoo-study-github-deploy-${each.key}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Action    = "sts:AssumeRoleWithWebIdentity"
      Principal = { Federated = aws_iam_openid_connect_provider.github.arn }
      Condition = {
        StringEquals = {
          "token.actions.githubusercontent.com:aud" = "sts.amazonaws.com"
          "token.actions.githubusercontent.com:sub" = each.value.subject
        }
      }
    }]
  })
}

resource "aws_iam_role_policy" "github_deploy" {
  for_each = local.github_deploy
  name     = "deploy-lambda-code"
  role     = aws_iam_role.github_deploy[each.key].id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = [
        "lambda:UpdateFunctionCode",
        "lambda:GetFunction",
        "lambda:GetFunctionConfiguration",
      ]
      Resource = [
        for fn in each.value.functions :
        "arn:aws:lambda:us-east-1:${data.aws_caller_identity.current.account_id}:function:${fn}"
      ]
    }]
  })
}

output "github_deploy_roles" {
  description = "Role each deploy workflow assumes"
  value       = { for stage, role in aws_iam_role.github_deploy : stage => role.arn }
}
