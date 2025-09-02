# Lambda function for fetching and storing MF and stock data
resource "aws_lambda_function" "parse_mf_stocks" {
  filename         = "parse_mf_stocks.zip"
  function_name    = "parse-mf-stocks"
  role            = aws_iam_role.parse_mf_stocks_exec.arn
  handler         = "combined_parser.lambda_handler"
  source_code_hash = data.archive_file.parse_mf_stocks_zip.output_base64sha256
  runtime         = "python3.12"
  timeout         = 300  # 5 minutes timeout for data fetching

  environment {
    variables = {
      STOCK_COMPANIES_TABLE = aws_dynamodb_table.stock_companies.name
      MUTUAL_FUND_SCHEMES_TABLE = aws_dynamodb_table.mutual_fund_schemes.name
      KEEP_VARIANTS = "direct_growth_only"
    }
  }

  tags = {
    Name        = "parse-mf-stocks"
    Environment = var.environment
    Project     = "finsight"
  }
}

# IAM role for parse-mf-stocks Lambda
resource "aws_iam_role" "parse_mf_stocks_exec" {
  name = "parse-mf-stocks-exec"

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
    Name        = "parse-mf-stocks-exec"
    Environment = var.environment
    Project     = "finsight"
  }
}

# IAM policy for parse-mf-stocks Lambda
resource "aws_iam_role_policy" "parse_mf_stocks_policy" {
  name = "parse-mf-stocks-policy"
  role = aws_iam_role.parse_mf_stocks_exec.id

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
          aws_dynamodb_table.mutual_fund_schemes.arn,
          "${aws_dynamodb_table.stock_companies.arn}/index/*",
          "${aws_dynamodb_table.mutual_fund_schemes.arn}/index/*"
        ]
      }
    ]
  })
}

# Attach basic execution role
resource "aws_iam_role_policy_attachment" "parse_mf_stocks_basic" {
  role       = aws_iam_role.parse_mf_stocks_exec.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# Archive file for Lambda deployment
data "archive_file" "parse_mf_stocks_zip" {
  type        = "zip"
  source_dir  = "${path.module}/../backend/lambda/parse-mf-stocks"
  output_path = "parse_mf_stocks.zip"
  excludes    = ["__pycache__", "*.pyc", ".DS_Store"]
}

# CloudWatch Log Group for parse-mf-stocks Lambda
resource "aws_cloudwatch_log_group" "parse_mf_stocks_logs" {
  name              = "/aws/lambda/parse-mf-stocks"
  retention_in_days = 14

  tags = {
    Name        = "parse-mf-stocks-logs"
    Environment = var.environment
    Project     = "finsight"
  }
}

# Output the Lambda function name
output "parse_mf_stocks_lambda_name" {
  value = aws_lambda_function.parse_mf_stocks.function_name
}

output "parse_mf_stocks_lambda_arn" {
  value = aws_lambda_function.parse_mf_stocks.arn
}