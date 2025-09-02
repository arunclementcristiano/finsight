# Lambda function for fetching and storing stock data
resource "aws_lambda_function" "fetch_stocks" {
  filename         = "fetch_stocks.zip"
  function_name    = "fetch-stocks"
  role            = aws_iam_role.fetch_stocks_exec.arn
  handler         = "fetch-stocks.lambda_handler"
  source_code_hash = data.archive_file.fetch_stocks_zip.output_base64sha256
  runtime         = "python3.12"
  timeout         = 300  # 5 minutes timeout for data fetching

  environment {
    variables = {
      STOCK_COMPANIES_TABLE = aws_dynamodb_table.stock_companies.name
    }
  }

  tags = {
    Name        = "fetch-stocks"
    Environment = var.environment
    Project     = "finsight"
  }
}

# IAM role for fetch-stocks Lambda
resource "aws_iam_role" "fetch_stocks_exec" {
  name = "fetch-stocks-exec"

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
    Name        = "fetch-stocks-exec"
    Environment = var.environment
    Project     = "finsight"
  }
}

# IAM policy for fetch-stocks Lambda
resource "aws_iam_role_policy" "fetch_stocks_policy" {
  name = "fetch-stocks-policy"
  role = aws_iam_role.fetch_stocks_exec.id

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
          "dynamodb:PutItem",
          "dynamodb:GetItem",
          "dynamodb:UpdateItem",
          "dynamodb:DeleteItem",
          "dynamodb:Query",
          "dynamodb:Scan",
          "dynamodb:BatchGetItem",
          "dynamodb:BatchWriteItem"
        ]
        Resource = [
          aws_dynamodb_table.stock_companies.arn,
          "${aws_dynamodb_table.stock_companies.arn}/index/*"
        ]
      }
    ]
  })
}

# Attach basic execution role
resource "aws_iam_role_policy_attachment" "fetch_stocks_basic" {
  role       = aws_iam_role.fetch_stocks_exec.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# Archive file for Lambda deployment
data "archive_file" "fetch_stocks_zip" {
  type        = "zip"
  source_dir  = "${path.module}/../backend/lambda/parse-stock-names"
  output_path = "fetch_stocks.zip"
  excludes    = ["__pycache__", "*.pyc", ".DS_Store"]
}

# CloudWatch Log Group for fetch-stocks Lambda
resource "aws_cloudwatch_log_group" "fetch_stocks_logs" {
  name              = "/aws/lambda/fetch-stocks"
  retention_in_days = 14

  tags = {
    Name        = "fetch-stocks-logs"
    Environment = var.environment
    Project     = "finsight"
  }
}

# Output the Lambda function name
output "fetch_stocks_lambda_name" {
  value = aws_lambda_function.fetch_stocks.function_name
}

output "fetch_stocks_lambda_arn" {
  value = aws_lambda_function.fetch_stocks.arn
}