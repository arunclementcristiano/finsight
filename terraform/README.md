# Finsight Terraform (AWS)

This module provisions core AWS resources for the expense tracker:

- DynamoDB tables
  - Expenses (PK: expenseId)
  - CategoryMemory (PK: userId, SK: category)
- IAM Role + Policy for app access to the tables

## Prerequisites
- Terraform >= 1.5
- AWS credentials configured (e.g., with AWS CLI aws configure or env vars)

## Usage

```bash
cd terraform
terraform init
terraform plan -var="aws_region=us-east-1" \
  -var="expenses_table_name=Expenses" \
  -var="category_memory_table_name=CategoryMemory" \
  -var="app_role_name=finsight-app-role" \
  -var="groq_api_key=YOUR_GROQ_API_KEY"
terraform apply
```

Outputs include the DynamoDB table names and the IAM Role ARN.

## Notes
- For production-grade queries (e.g., list/filter by user and date), add a GSI:
  - PK: userId, SK: date
  - Then update the app to use Query instead of Scan.
- Attach the created IAM role to your compute (Lambda, ECS, EC2) or create an IAM user and attach the policy if needed for local dev.