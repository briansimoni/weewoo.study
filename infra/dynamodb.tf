# DynamoDB tables that replace Deno KV: one per stage, used through
# lib/dynamo_kv.ts (see docs/data-model.md, "DynamoDB").
locals {
  dynamodb_stages = toset(["test", "prod"])
}

resource "aws_dynamodb_table" "app" {
  for_each = local.dynamodb_stages

  name         = "weewoo-study-${each.key}"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "pk"
  range_key    = "sk"

  attribute {
    name = "pk"
    type = "S"
  }

  attribute {
    name = "sk"
    type = "S"
  }

  # Sessions, streaks and Stripe event records expire. DynamoDB removes them
  # lazily, so the app also treats an expired item as missing.
  ttl {
    attribute_name = "ttl"
    enabled        = true
  }

  point_in_time_recovery {
    enabled = true
  }


  deletion_protection_enabled = each.key == "prod"

  tags = {
    Project = "weewoo-study"
    Stage   = each.key
  }
}

output "dynamodb_table_names" {
  description = "DynamoDB table per stage (the app's DYNAMODB_TABLE)"
  value       = { for stage, table in aws_dynamodb_table.app : stage => table.name }
}
