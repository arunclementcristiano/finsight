#!/bin/bash

# Deploy the parse-mf-stocks Lambda function
# This script handles the complete deployment process for the combined MF and stock parsing lambda

set -e

echo "🚀 Starting parse-mf-stocks Lambda deployment..."

# Check if terraform is installed
if ! command -v terraform &> /dev/null; then
    echo "❌ Terraform is not installed. Please install Terraform first."
    exit 1
fi

# Check if AWS CLI is configured
if ! aws sts get-caller-identity &> /dev/null; then
    echo "❌ AWS CLI is not configured. Please run 'aws configure' first."
    exit 1
fi

# Build clean Lambda deployment package
echo "📦 Building Lambda deployment package..."
LAMBDA_SRC="../backend/lambda/parse-mf-stocks"
BUILD_DIR="lambda_build"
ZIP_FILE="parse_mf_stocks.zip"

# Navigate to terraform directory first
cd "$(dirname "$0")"

rm -rf "$BUILD_DIR" "$ZIP_FILE"
mkdir "$BUILD_DIR"

# Copy all Lambda source files
cp "$LAMBDA_SRC"/*.py "$BUILD_DIR/"

# Install only required dependencies
if [ -f "$LAMBDA_SRC/requirements.txt" ]; then
    echo "📦 Installing Python dependencies..."
    pip3 install -r "$LAMBDA_SRC/requirements.txt" -t "$BUILD_DIR"
    if [ ! -d "$BUILD_DIR/requests" ]; then
        echo "❌ ERROR: 'requests' library not found in build directory. Lambda will fail to import 'requests'."
        exit 1
    fi
    echo "✅ Dependencies installed successfully"
fi

# Create the deployment ZIP
echo "📦 Creating deployment ZIP..."
cd "$BUILD_DIR"
zip -r "../$ZIP_FILE" .
cd ..

echo "📦 Verifying ZIP contents..."
unzip -l "$ZIP_FILE" | head -10

echo "📋 Initializing Terraform..."
terraform init

echo "📋 Validating Terraform configuration..."
terraform validate

echo "📋 Planning Terraform deployment..."
terraform plan -out=tfplan

echo "🤔 Do you want to apply these changes? (y/N)"
read -r response
echo "🚀 Applying Terraform changes..."
terraform apply --auto-approve tfplan

echo "✅ Deployment completed!"
echo ""
echo "📊 Lambda Function Details:"
terraform output parse_mf_stocks_lambda_name
terraform output parse_mf_stocks_lambda_arn
echo ""
echo "📊 DynamoDB Tables:"
terraform output stock_companies_table_name
terraform output mutual_fund_schemes_table_name
echo ""
echo "🎯 Usage Examples:"
echo "   📊 Parse both stocks and mutual funds:"
echo "   aws lambda invoke --function-name parse-mf-stocks --payload '{\"type\":\"both\"}' response.json"
echo "   "
echo "   📈 Parse stocks only:"
echo "   aws lambda invoke --function-name parse-mf-stocks --payload '{\"type\":\"stocks\"}' response.json"
echo "   "
echo "   💰 Parse mutual funds only:"
echo "   aws lambda invoke --function-name parse-mf-stocks --payload '{\"type\":\"mf\"}' response.json"
rm -f tfplan