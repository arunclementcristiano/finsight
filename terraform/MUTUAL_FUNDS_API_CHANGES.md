# Mutual Funds API - Terraform Infrastructure Changes

## Overview
This document outlines the Terraform infrastructure changes required to support the `/api/mutual-funds` endpoint for the Holdings page.

## Changes Made

### 1. DynamoDB Table Updates (`dynamodb.tf`)

#### New Attributes Added to `mutual_fund_schemes` Table:
- `is_etf` (String) - Identifies if the fund is an ETF or mutual fund
- `fund_name` (String) - Short name of the fund for display
- `scheme_name` (String) - Full scheme name
- `nav` (Number) - Net Asset Value of the fund

#### New Global Secondary Indexes (GSI):
- **ETF-Status-Index**: Hash key on `is_etf` for efficient ETF/MF filtering
- **FundName-Index**: Hash key on `fund_name` for search functionality

#### Output Added:
- `mutual_fund_schemes_table_name` - Table name for reference

### 2. Lambda API Updates (`lambda_api.tf`)

#### IAM Permissions:
- Added access to `mutual_fund_schemes` table
- Added access to all indexes of `mutual_fund_schemes` table

#### Environment Variables:
- `MUTUAL_FUND_TABLE` - Table name for Lambda function

#### API Gateway Routes:
- Added `GET /mutual-funds` to public routes (no authentication required)

## Infrastructure Requirements

### DynamoDB Table Schema
The `MutualFundSchemes` table should contain:
```json
{
  "scheme_code": "string (hash key)",
  "fund_name": "string",
  "scheme_name": "string", 
  "nav": "number",
  "allocation_class": "string",
  "is_etf": "string (true/false)",
  "date": "string",
  "amc": "string",
  "scheme_type": "string",
  "plan": "string",
  "option": "string"
}
```

### Lambda Function Requirements
The existing Lambda function needs to handle the new route:
- **Route**: `GET /mutual-funds`
- **Functionality**: Query DynamoDB table and return fund data
- **Response Format**: JSON with success status and funds array

## Deployment Steps

1. **Apply Terraform Changes**:
   ```bash
   cd terraform
   terraform plan
   terraform apply
   ```

2. **Update Lambda Function**:
   - Add handler for `GET /mutual-funds` route
   - Implement DynamoDB query logic
   - Return properly formatted JSON response

3. **Test API Endpoint**:
   - Verify `/api/mutual-funds` returns data
   - Test filtering by `is_etf` field
   - Ensure proper error handling

## Expected API Response
```json
{
  "success": true,
  "funds": [
    {
      "scheme_code": "MOCK001",
      "fund_name": "HDFC Mid-Cap Opportunities Fund",
      "scheme_name": "HDFC Mid-Cap Opportunities Fund - Direct Plan - Growth",
      "nav": 45.67,
      "allocation_class": "Equity",
      "is_etf": "false"
    }
  ],
  "count": 1
}
```

## Notes
- The API endpoint is public (no authentication required) since it's fund reference data
- GSIs are optimized for the most common query patterns
- The existing Lambda function will need code updates to handle the new route
- All changes are backward compatible with existing infrastructure