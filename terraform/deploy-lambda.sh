#!/bin/bash

# Deploy the fetch-mf-nav Lambda function
# This script handles the complete deployment process

set -e

echo "🚀 Starting fetch-mf-nav Lambda deployment..."

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
LAMBDA_SRC="../backend/lambda/parse-navall"
BUILD_DIR="lambda_build"
ZIP_FILE="fetch-mf-nav.zip"

# Navigate to terraform directory first
cd "$(dirname "$0")"

rm -rf "$BUILD_DIR" "$ZIP_FILE"
mkdir "$BUILD_DIR"

# Copy only the Lambda code
cp "$LAMBDA_SRC/fetch-mf-nav.py" "$BUILD_DIR/index.py"

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
if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
    echo "🚀 Applying Terraform changes..."
    terraform apply --auto-approve tfplan
    
    echo "✅ Deployment completed!"
    echo ""
    echo "📊 Lambda Function Details:"
    terraform output fetch_mf_nav_lambda_function_name
    terraform output fetch_mf_nav_lambda_arn
    echo ""
    echo "📝 CloudWatch Logs:"
    terraform output fetch_mf_nav_cloudwatch_log_group
    echo ""
    echo "🕐 The Lambda is scheduled to run daily at 6 PM UTC"
    echo "🧪 You can test it manually from the AWS Console or CLI"
    
else
    echo "❌ Deployment cancelled."
    rm -f tfplan
fi