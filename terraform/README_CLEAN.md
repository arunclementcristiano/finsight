# Finsight Terraform Infrastructure

This directory contains Terraform configuration for the Finsight application infrastructure.

## Quick Deployment for fetch-mf-nav Lambda

For the mutual fund NAV parser Lambda:

```bash
cd terraform
./deploy-lambda.sh
```

This script will:
1. Build a clean Lambda deployment package with dependencies
2. Deploy the Lambda function with Terraform
3. Set up daily scheduling via EventBridge

## Architecture

- **Lambda Function**: `fetch-mf-nav` - Parses AMFI NAVAll.txt daily
- **DynamoDB**: `MutualFundSchemes` - Stores parsed mutual fund data  
- **EventBridge**: Daily trigger at 6 PM UTC
- **CloudWatch**: Logs and monitoring

## Files

### Core Infrastructure
- `provider.tf` - AWS provider configuration
- `dynamodb.tf` - DynamoDB tables for all app data
- `versions.tf` - Terraform version constraints

### Lambda Functions
- `lambda_fetch_mf_nav.tf` - MF NAV parser Lambda
- `lambda_api.tf` - Expenses API Lambda  
- `iam_fetch_mf_nav.tf` - IAM for MF NAV Lambda
- `iam.tf` - General IAM roles

### Other
- `aws_identity.tf` - AWS identity configuration
- `deploy-lambda.sh` - Automated deployment script
- `terraform.tfvars.example` - Configuration template

## Prerequisites

- AWS CLI configured
- Terraform installed  
- Python 3.9+

## Cost

Estimated monthly cost: ~$2-6 for the MF NAV Lambda and associated resources.
