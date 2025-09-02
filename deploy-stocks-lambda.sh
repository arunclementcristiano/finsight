#!/bin/bash

# Deploy fetch-stocks Lambda function
# This script creates the Lambda function and DynamoDB table for stock data

set -e

echo "🚀 Deploying fetch-stocks Lambda function..."

# Check if we're in the right directory
if [ ! -f "terraform/lambda_stocks.tf" ]; then
    echo "❌ Error: Please run this script from the project root directory"
    exit 1
fi

# Navigate to terraform directory
cd terraform

# Initialize Terraform if needed
if [ ! -d ".terraform" ]; then
    echo "📦 Initializing Terraform..."
    terraform init
fi

# Plan the deployment
echo "📋 Planning Terraform deployment..."
terraform plan -target=aws_dynamodb_table.stock_companies -target=aws_lambda_function.fetch_stocks -target=aws_iam_role.fetch_stocks_exec -target=aws_iam_role_policy.fetch_stocks_policy -target=aws_iam_role_policy_attachment.fetch_stocks_basic -target=aws_cloudwatch_log_group.fetch_stocks_logs

# Apply the deployment
echo "🔨 Applying Terraform deployment..."
terraform apply -target=aws_dynamodb_table.stock_companies -target=aws_lambda_function.fetch_stocks -target=aws_iam_role.fetch_stocks_exec -target=aws_iam_role_policy.fetch_stocks_policy -target=aws_iam_role_policy_attachment.fetch_stocks_basic -target=aws_cloudwatch_log_group.fetch_stocks_logs -auto-approve

echo "✅ fetch-stocks Lambda function deployed successfully!"
echo ""
echo "📊 DynamoDB Table: $(terraform output -raw stock_companies_table_name)"
echo "🔧 Lambda Function: $(terraform output -raw fetch_stocks_lambda_name)"
echo ""
echo "🎯 Next steps:"
echo "1. Run the Lambda function to populate stock data:"
echo "   aws lambda invoke --function-name fetch-stocks response.json"
echo "2. Check the response:"
echo "   cat response.json"
echo "3. Update your frontend to use the new stock data API"
echo ""
echo "💡 To manually trigger the Lambda function:"
echo "   aws lambda invoke --function-name fetch-stocks --payload '{}' response.json"