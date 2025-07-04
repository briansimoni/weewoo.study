# CloudWatch Log Groups for weewoo.study application

# Production Log Group
resource "aws_cloudwatch_log_group" "production" {
  name              = "/weewoo-study/production"
  retention_in_days = 180
}

# Test Log Group
resource "aws_cloudwatch_log_group" "test" {
  name              = "/weewoo-study/test"
  retention_in_days = 7 # Lower retention for test environment to save costs
}

# CloudWatch Log Metric Filter for Error Logs (production)
resource "aws_cloudwatch_log_metric_filter" "error_logs_production" {
  name           = "ErrorLogsProduction"
  pattern        = "ERROR"
  log_group_name = aws_cloudwatch_log_group.production.name

  metric_transformation {
    name      = "ProductionErrorCount"
    namespace = "WeewooStudy/Logs"
    value     = "1"
    unit      = "Count"
  }
}

# CloudWatch Log Metric Filter for Error Logs (test)
resource "aws_cloudwatch_log_metric_filter" "error_logs_test" {
  name           = "ErrorLogsTest"
  pattern        = "ERROR"
  log_group_name = aws_cloudwatch_log_group.test.name

  metric_transformation {
    name      = "TestErrorCount"
    namespace = "WeewooStudy/Logs"
    value     = "1"
    unit      = "Count"
  }
}

# Optional: Alarm for high error rates in production
resource "aws_cloudwatch_metric_alarm" "high_error_rate_production" {
  alarm_name          = "high-error-rate-production"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "ProductionErrorCount"
  namespace           = "WeewooStudy/Logs"
  period              = 300
  statistic           = "Sum"
  threshold           = 5
  alarm_description   = "This alarm monitors for high error rates in the production environment"
}

# Outputs for log group ARNs
output "production_log_group_arn" {
  description = "ARN of the production CloudWatch log group"
  value       = aws_cloudwatch_log_group.production.arn
}

output "test_log_group_arn" {
  description = "ARN of the test CloudWatch log group"
  value       = aws_cloudwatch_log_group.test.arn
}
