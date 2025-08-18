variable "lambda_name" {
  type        = string
  default     = "expenses-api"
  description = "Lambda function name"
}

data "archive_file" "lambda_zip" {
  type        = "zip"
  source_dir  = "${path.root}/../backend/lambda/expenses-api"
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
        aws_dynamodb_table.category_memory.arn
      ]
    }]
  })
}

resource "aws_lambda_function" "expenses" {
  function_name = var.lambda_name
  role          = aws_iam_role.lambda_exec.arn
  handler       = "index.handler"
  runtime       = "nodejs20.x"
  filename      = data.archive_file.lambda_zip.output_path
  source_code_hash = data.archive_file.lambda_zip.output_base64sha256

  environment {
    variables = {
      AWS_REGION               = var.aws_region
      EXPENSES_TABLE           = aws_dynamodb_table.expenses.name
      CATEGORY_MEMORY_TABLE    = aws_dynamodb_table.category_memory.name
    }
  }
}

resource "aws_apigatewayv2_api" "http" {
  name          = "expenses-http-api"
  protocol_type = "HTTP"
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

