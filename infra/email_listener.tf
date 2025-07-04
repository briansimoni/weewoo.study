# an SQS queue that subscribes to an SNS topic for SES event

data "aws_sns_topic" "weewoo_ops" {
  name = "weewoo-ops"
}

resource "aws_sqs_queue" "weewoo_ops_listener" {
  name = "weewoo_ops_listener"
}

resource "aws_sns_topic_subscription" "weewoo_ops_listener" {
  topic_arn = data.aws_sns_topic.weewoo_ops.arn
  protocol  = "sqs" # SQS queue
  endpoint  = aws_sqs_queue.weewoo_ops_listener.arn
}