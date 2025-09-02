#!/bin/bash

# Deploy Portfolio Lambda Function
# This script deploys the portfolio-api Lambda function to AWS

set -e

echo "🚀 Deploying Portfolio Lambda Function..."

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo "❌ AWS CLI is not installed. Please install it first."
    exit 1
fi

# Check if Terraform is installed
if ! command -v terraform &> /dev/null; then
    echo "❌ Terraform is not installed. Please install it first."
    exit 1
fi

# Navigate to terraform directory
cd terraform

# Initialize Terraform (if not already done)
echo "📦 Initializing Terraform..."
terraform init

# Plan the deployment
echo "📋 Planning Terraform deployment..."
terraform plan -out=portfolio-plan.tfplan

# Apply the deployment
echo "🚀 Applying Terraform deployment..."
terraform apply portfolio-plan.tfplan

# Get the API endpoint
echo "🔍 Getting API endpoint..."
PORTFOLIO_API_ENDPOINT=$(terraform output -raw portfolio_api_endpoint)

echo "✅ Portfolio Lambda deployment completed!"
echo "🌐 Portfolio API Endpoint: $PORTFOLIO_API_ENDPOINT"
echo ""
echo "📋 Available endpoints:"
echo "  Public endpoints:"
echo "    GET  $PORTFOLIO_API_ENDPOINT/mutual-funds"
echo "    GET  $PORTFOLIO_API_ENDPOINT/mutual-funds/search"
echo ""
echo "  Protected endpoints (require JWT):"
echo "    POST $PORTFOLIO_API_ENDPOINT/portfolio"
echo "    GET  $PORTFOLIO_API_ENDPOINT/portfolio"
echo "    PUT  $PORTFOLIO_API_ENDPOINT/portfolio/plan"
echo "    GET  $PORTFOLIO_API_ENDPOINT/portfolio/plan"
echo "    POST $PORTFOLIO_API_ENDPOINT/holdings"
echo "    GET  $PORTFOLIO_API_ENDPOINT/holdings"
echo "    DELETE $PORTFOLIO_API_ENDPOINT/holdings/{id}"
echo "    POST $PORTFOLIO_API_ENDPOINT/transactions"
echo "    GET  $PORTFOLIO_API_ENDPOINT/transactions"
echo ""
echo "🧹 Cleaning up..."
rm -f portfolio-plan.tfplan

echo "✨ Deployment script completed!"