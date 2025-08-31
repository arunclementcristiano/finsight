# Lambda function for fetch-mf-nav
resource "aws_lambda_function" "fetch_mf_nav" {
  filename         = "./fetch-mf-nav.zip"
  function_name    = "fetch-mf-nav"
  role            = aws_iam_role.fetch_mf_nav_lambda_role.arn
  handler         = "index.lambda_handler"
  runtime         = "python3.9"
  timeout         = 300  # 5 minutes
  memory_size     = 512
  
  source_code_hash = filebase64sha256("./fetch-mf-nav.zip")

  environment {
    variables = {
      DYNAMODB_TABLE_NAME = aws_dynamodb_table.mutual_fund_schemes.name
      KEEP_VARIANTS      = "direct_growth_only"  # Can be changed to "all" if needed
    }
  }

  depends_on = [
    aws_iam_role_policy_attachment.fetch_mf_nav_lambda_logs,
    aws_iam_role_policy_attachment.fetch_mf_nav_lambda_dynamodb,
    aws_cloudwatch_log_group.fetch_mf_nav_lambda,
  ]

  tags = {
    Name        = "fetch-mf-nav"
    Environment = var.environment
    Project     = "finsight"
  }
}

# Create ZIP file for Lambda deployment
# CloudWatch Log Group for Lambda
resource "aws_cloudwatch_log_group" "fetch_mf_nav_lambda" {
  name              = "/aws/lambda/fetch-mf-nav"
  retention_in_days = 14

  tags = {
    Name        = "fetch-mf-nav-logs"
    Environment = var.environment
    Project     = "finsight"
  }
}

# EventBridge rule to trigger Lambda daily
resource "aws_cloudwatch_event_rule" "fetch_mf_nav_schedule" {
  name                = "fetch-mf-nav-daily"
  description         = "Trigger fetch-mf-nav lambda daily"
  schedule_expression = "cron(0 18 * * ? *)"  # Daily at 6 PM UTC (after market close)

  tags = {
    Name        = "fetch-mf-nav-schedule"
    Environment = var.environment
    Project     = "finsight"
  }
}

# EventBridge target
resource "aws_cloudwatch_event_target" "fetch_mf_nav_target" {
  rule      = aws_cloudwatch_event_rule.fetch_mf_nav_schedule.name
  target_id = "FetchMfNavLambdaTarget"
  arn       = aws_lambda_function.fetch_mf_nav.arn
}

# Permission for EventBridge to invoke Lambda
resource "aws_lambda_permission" "allow_eventbridge" {
  statement_id  = "AllowExecutionFromEventBridge"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.fetch_mf_nav.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.fetch_mf_nav_schedule.arn
}

# Outputs
output "fetch_mf_nav_lambda_arn" {
  description = "ARN of the fetch-mf-nav Lambda function"
  value       = aws_lambda_function.fetch_mf_nav.arn
}

output "fetch_mf_nav_lambda_function_name" {
  description = "Name of the fetch-mf-nav Lambda function"
  value       = aws_lambda_function.fetch_mf_nav.function_name
}

output "fetch_mf_nav_cloudwatch_log_group" {
  description = "CloudWatch log group for fetch-mf-nav Lambda"
  value       = aws_cloudwatch_log_group.fetch_mf_nav_lambda.name
}
