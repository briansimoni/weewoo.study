# an SQS queue that subscribes to an SNS topic for SES event

resource "aws_sqs_queue" "weewoo_ops_listener" {
  name = "weewoo_ops_listener"
}

resource "aws_sqs_queue_policy" "allow_sns" {
  queue_url = aws_sqs_queue.weewoo_ops_listener.id

  policy = jsonencode({
    Version   = "2012-10-17",
    Statement = [{
      Sid       = "AllowSNSToSend",
      Effect    = "Allow",
      Principal = "*",
      Action    = "sqs:SendMessage",
      Resource  = aws_sqs_queue.weewoo_ops_listener.arn,
      Condition = {
        ArnEquals = {
          "aws:SourceArn" = data.aws_sns_topic.weewoo_ops.arn
        }
      }
    }]
  })
}

resource "aws_sns_topic_subscription" "weewoo_ops_listener" {
  topic_arn = data.aws_sns_topic.weewoo_ops.arn
  protocol  = "sqs"
  endpoint  = aws_sqs_queue.weewoo_ops_listener.arn
}

data "aws_sns_topic" "weewoo_ops" {
  name = "weewoo-ops"
}