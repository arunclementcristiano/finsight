# Repayments API Lambda Function
resource "aws_lambda_function" "repayments_api" {
  function_name = "repayments-api"
  role         = aws_iam_role.repayments_lambda_role.arn
  handler      = "main.lambda_handler"
  runtime      = "python3.12"
  timeout      = 30
  memory_size  = 256

  filename         = "repayments-api.zip"
  source_code_hash = data.archive_file.repayments_api_zip.output_base64sha256

  environment {
    variables = {
      REPAYMENTS_TABLE        = aws_dynamodb_table.repayments.name
      REPAYMENT_HISTORY_TABLE = aws_dynamodb_table.repayment_history.name
    }
  }

  depends_on = [
    aws_iam_role_policy_attachment.repayments_lambda_policy,
    aws_cloudwatch_log_group.repayments_lambda_logs,
  ]
}

# IAM Role for Repayments Lambda
resource "aws_iam_role" "repayments_lambda_role" {
  name = "repayments-lambda-role"

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
}

# IAM Policy for Repayments Lambda
resource "aws_iam_role_policy" "repayments_lambda_policy" {
  name = "repayments-lambda-policy"
  role = aws_iam_role.repayments_lambda_role.id

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
      },
      {
        Effect = "Allow"
        Action = [
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:UpdateItem",
          "dynamodb:DeleteItem",
          "dynamodb:Query",
          "dynamodb:Scan",
          "dynamodb:BatchGetItem",
          "dynamodb:BatchWriteItem"
        ]
        Resource = [
          aws_dynamodb_table.repayments.arn,
          "${aws_dynamodb_table.repayments.arn}/index/*",
          aws_dynamodb_table.repayment_history.arn,
          "${aws_dynamodb_table.repayment_history.arn}/index/*"
        ]
      }
    ]
  })
}

# Attach the policy to the role
resource "aws_iam_role_policy_attachment" "repayments_lambda_policy" {
  role       = aws_iam_role.repayments_lambda_role.name
  policy_arn = aws_iam_role_policy.repayments_lambda_policy.arn
}

# CloudWatch Log Group for Repayments Lambda
resource "aws_cloudwatch_log_group" "repayments_lambda_logs" {
  name              = "/aws/lambda/repayments-api"
  retention_in_days = 14
}

# DynamoDB Table for Repayments
resource "aws_dynamodb_table" "repayments" {
  name           = "Repayments"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "user_id"
  range_key      = "repayment_id"

  attribute {
    name = "user_id"
    type = "S"
  }

  attribute {
    name = "repayment_id"
    type = "S"
  }

  attribute {
    name = "type"
    type = "S"
  }

  attribute {
    name = "status"
    type = "S"
  }

  global_secondary_index {
    name            = "TypeIndex"
    hash_key        = "type"
    projection_type = "ALL"
  }

  global_secondary_index {
    name            = "StatusIndex"
    hash_key        = "status"
    projection_type = "ALL"
  }

  tags = {
    Name        = "Repayments"
    Environment = "production"
  }
}

# DynamoDB Table for Repayment History
resource "aws_dynamodb_table" "repayment_history" {
  name           = "RepaymentHistory"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "user_id"
  range_key      = "repayment_id"

  attribute {
    name = "user_id"
    type = "S"
  }

  attribute {
    name = "repayment_id"
    type = "S"
  }

  attribute {
    name = "history_id"
    type = "S"
  }

  global_secondary_index {
    name            = "RepaymentHistoryIndex"
    hash_key        = "repayment_id"
    range_key       = "history_id"
    projection_type = "ALL"
  }

  tags = {
    Name        = "RepaymentHistory"
    Environment = "production"
  }
}

# Archive file for Repayments Lambda
data "archive_file" "repayments_api_zip" {
  type        = "zip"
  source_dir  = "../backend/lambda/repayments-api-py"
  output_path = "repayments-api.zip"
}