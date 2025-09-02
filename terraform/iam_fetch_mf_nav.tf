# IAM Role for fetch-mf-nav Lambda
resource "aws_iam_role" "fetch_mf_nav_lambda_role" {
  name = "fetch-mf-nav-lambda-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })

  tags = {
    Name        = "fetch-mf-nav-lambda-role"
    Environment = var.environment
    Project     = "finsight"
  }
}

# IAM Policy for CloudWatch Logs
resource "aws_iam_policy" "fetch_mf_nav_lambda_logs" {
  name        = "fetch-mf-nav-lambda-logs"
  description = "IAM policy for logging from fetch-mf-nav lambda"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "arn:aws:logs:*:*:*"
      }
    ]
  })
}

# IAM Policy for DynamoDB access
resource "aws_iam_policy" "fetch_mf_nav_lambda_dynamodb" {
  name        = "fetch-mf-nav-lambda-dynamodb"
  description = "IAM policy for DynamoDB access from fetch-mf-nav lambda"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "dynamodb:BatchWriteItem",
          "dynamodb:PutItem",
          "dynamodb:DescribeTable"
        ]
        Resource = [
          aws_dynamodb_table.mutual_fund_schemes.arn
        ]
      }
    ]
  })
}

# Attach CloudWatch Logs policy to Lambda role
resource "aws_iam_role_policy_attachment" "fetch_mf_nav_lambda_logs" {
  role       = aws_iam_role.fetch_mf_nav_lambda_role.name
  policy_arn = aws_iam_policy.fetch_mf_nav_lambda_logs.arn
}

# Attach DynamoDB policy to Lambda role
resource "aws_iam_role_policy_attachment" "fetch_mf_nav_lambda_dynamodb" {
  role       = aws_iam_role.fetch_mf_nav_lambda_role.name
  policy_arn = aws_iam_policy.fetch_mf_nav_lambda_dynamodb.arn
}
