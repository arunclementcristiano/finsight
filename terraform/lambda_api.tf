variable "lambda_name" {
  type        = string
  default     = "expenses-api"
  description = "Lambda function name"
}

variable "groq_api_key" {
  type        = string
  description = "Groq API key for AI categorization"
  default     = ""
  sensitive   = true
}

data "archive_file" "lambda_zip" {
  type        = "zip"
  source_dir  = "${path.root}/../backend/lambda/expenses-api-py"
  output_path = "${path.module}/build/expenses-api.zip"
}

resource "aws_iam_role" "lambda_exec" {
  name = "${var.lambda_name}-exec"
  assume_role_policy = jsonencode({
    Version = "2012-10-17",
    Statement = [{
      Effect = "Allow",
      Principal = { Service = "lambda.amazonaws.com" },
      Action   = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy_attachment" "lambda_basic_logs" {
  role       = aws_iam_role.lambda_exec.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_iam_role_policy" "lambda_ddb_access" {
  name = "${var.lambda_name}-ddb-access"
  role = aws_iam_role.lambda_exec.id
  policy = jsonencode({
    Version = "2012-10-17",
    Statement: [{
      Effect: "Allow",
      Action: [
        "dynamodb:PutItem","dynamodb:GetItem","dynamodb:UpdateItem","dynamodb:DeleteItem","dynamodb:Scan","dynamodb:Query"
      ],
      Resource: [
        aws_dynamodb_table.expenses.arn,
        aws_dynamodb_table.category_memory.arn,
        aws_dynamodb_table.category_rules.arn
      ]
    }]
  })
}

resource "aws_lambda_function" "expenses" {
  function_name = var.lambda_name
  role          = aws_iam_role.lambda_exec.arn
  handler       = "index.handler"
  runtime       = "python3.12"
  filename      = data.archive_file.lambda_zip.output_path
  source_code_hash = data.archive_file.lambda_zip.output_base64sha256

  environment {
    variables = {
      REGION                   = var.aws_region
      EXPENSES_TABLE           = aws_dynamodb_table.expenses.name
      CATEGORY_MEMORY_TABLE    = aws_dynamodb_table.category_memory.name
      GROQ_API_KEY             = var.groq_api_key
      CATEGORY_RULES_TABLE     = aws_dynamodb_table.category_rules.name
      GROQ_MODEL               = "llama-3.1-70b-versatile"
    }
  }
}

resource "aws_apigatewayv2_api" "http" {
  name          = "expenses-http-api"
  protocol_type = "HTTP"
  cors_configuration {
    allow_origins = ["*"]
    allow_methods = ["GET","POST","PUT","DELETE","OPTIONS"]
    allow_headers = ["*"]
  }
}

resource "aws_apigatewayv2_integration" "lambda" {
  api_id                 = aws_apigatewayv2_api.http.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.expenses.arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_route" "routes" {
  for_each = toset([
    "POST /add",
    "PUT /add",
    "POST /list",
    "POST /edit",
    "POST /delete",
    "POST /summary/monthly",
    "POST /summary/category"
  ])
  api_id    = aws_apigatewayv2_api.http.id
  route_key = each.value
  target    = "integrations/${aws_apigatewayv2_integration.lambda.id}"
}

resource "aws_lambda_permission" "apigw_invoke" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.expenses.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.http.execution_arn}/*/*"
}

resource "aws_apigatewayv2_stage" "default" {
  api_id      = aws_apigatewayv2_api.http.id
  name        = "$default"
  auto_deploy = true
}

output "api_endpoint" {
  value = aws_apigatewayv2_api.http.api_endpoint
}