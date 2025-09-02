#!/bin/bash

# Deploy parse-mf-stocks Lambda function
# This script creates the Lambda function and DynamoDB tables for both MF and stock data

set -e

echo "🚀 Deploying parse-mf-stocks Lambda function..."

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
terraform plan -target=aws_dynamodb_table.stock_companies -target=aws_dynamodb_table.mutual_fund_schemes -target=aws_lambda_function.parse_mf_stocks -target=aws_iam_role.parse_mf_stocks_exec -target=aws_iam_role_policy.parse_mf_stocks_policy -target=aws_iam_role_policy_attachment.parse_mf_stocks_basic -target=aws_cloudwatch_log_group.parse_mf_stocks_logs

# Apply the deployment
echo "🔨 Applying Terraform deployment..."
terraform apply -target=aws_dynamodb_table.stock_companies -target=aws_dynamodb_table.mutual_fund_schemes -target=aws_lambda_function.parse_mf_stocks -target=aws_iam_role.parse_mf_stocks_exec -target=aws_iam_role_policy.parse_mf_stocks_policy -target=aws_iam_role_policy_attachment.parse_mf_stocks_basic -target=aws_cloudwatch_log_group.parse_mf_stocks_logs -auto-approve

echo "✅ parse-mf-stocks Lambda function deployed successfully!"
echo ""
echo "📊 DynamoDB Tables:"
echo "   - Stock Companies: $(terraform output -raw stock_companies_table_name)"
echo "   - Mutual Fund Schemes: $(terraform output -raw mutual_fund_schemes_table_name)"
echo "🔧 Lambda Function: $(terraform output -raw parse_mf_stocks_lambda_name)"
echo ""
echo "🎯 Next steps:"
echo "1. Run the Lambda function with different options:"
echo ""
echo "   📊 Parse both stocks and mutual funds (default):"
echo "   aws lambda invoke --function-name parse-mf-stocks --payload '{\"type\":\"both\"}' response.json"
echo ""
echo "   📈 Parse stocks only:"
echo "   aws lambda invoke --function-name parse-mf-stocks --payload '{\"type\":\"stocks\"}' response.json"
echo ""
echo "   💰 Parse mutual funds only:"
echo "   aws lambda invoke --function-name parse-mf-stocks --payload '{\"type\":\"mf\"}' response.json"
echo ""
echo "2. Check the response:"
echo "   cat response.json"
echo ""
echo "📝 Note: This Lambda can handle:"
echo "   - Mutual Fund NAV data from AMFI (type: 'mf')"
echo "   - Stock company data from NSE and BSE (type: 'stocks')"
echo "   - Both datasets together (type: 'both' or default)"