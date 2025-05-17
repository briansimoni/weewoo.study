# S3 bucket for Deno KV backups
resource "aws_s3_bucket" "deno_kv_backups" {
  bucket = "ems-questions-deno-kv-backups"
}

# Enable versioning for the backup bucket
resource "aws_s3_bucket_versioning" "deno_kv_backups" {
  bucket = aws_s3_bucket.deno_kv_backups.id
  versioning_configuration {
    status = "Enabled"
  }
}

# Block all public access to the backup bucket
resource "aws_s3_bucket_public_access_block" "deno_kv_backups" {
  bucket = aws_s3_bucket.deno_kv_backups.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# Configure lifecycle rules for backup retention
resource "aws_s3_bucket_lifecycle_configuration" "deno_kv_backups" {
  bucket = aws_s3_bucket.deno_kv_backups.id

  rule {
    id     = "backup-retention"
    status = "Enabled"

    filter {
      prefix = "" # Empty prefix means apply to all objects
    }

    # Move older backups to cheaper storage class
    transition {
      days          = 30
      storage_class = "STANDARD_IA"
    }

    # Keep backups for 365 days
    expiration {
      days = 365
    }
  }
}

# Configure server-side encryption for backups
resource "aws_s3_bucket_server_side_encryption_configuration" "deno_kv_backups" {
  bucket = aws_s3_bucket.deno_kv_backups.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# Output the backup bucket name
output "deno_kv_backup_bucket_name" {
  description = "Name of the Deno KV backup S3 bucket"
  value       = aws_s3_bucket.deno_kv_backups.id
}
