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

Outputs include the DynamoDB table names, IAM Role ARN, and the API endpoint.

## Notes
- For production-grade queries (e.g., list/filter by user and date), add a GSI:
  - PK: userId, SK: date
  - Then update the app to use Query instead of Scan.
- The Lambda runtime is Python 3.12; the handler is `index.handler` in `backend/lambda/expenses-api-py/`.