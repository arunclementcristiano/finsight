variable "expenses_table_name" {
  description = "DynamoDB table name for expenses"
  type        = string
  default     = "Expenses"
}

// CategoryMemory removed per simplified 


output "mutual_fund_schemes_table_name" {
  value = aws_dynamodb_table.mutual_fund_schemes.name
}

variable "category_rules_table_name" {
  description = "DynamoDB table name for global category rules"
  type        = string
  default     = "CategoryRules"
}

variable "user_budgets_table_name" {
  description = "DynamoDB table name for per-user default category budgets"
  type        = string
  default     = "UserBudgets"
}

variable "invest_table_name" {
  description = "Single-table DynamoDB for user, portfolios, allocations, holdings, transactions"
  type        = string
  default     = "InvestApp"
}

variable "mutual_fund_schemes_table_name" {
  description = "DynamoDB table name for mutual fund schemes"
  type        = string
  default     = "MutualFundSchemes"
}

variable "holdings_table_name" {
  description = "DynamoDB table name for holdings"
  type        = string
  default     = "holdings"
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "dev"
}

resource "aws_dynamodb_table" "expenses" {
  name         = var.expenses_table_name
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "expenseId"

  attribute {
    name = "expenseId"
    type = "S"
  }

  # Attributes used by the GSI must be defined here
  attribute {
    name = "userId"
    type = "S"
  }

  attribute {
    name = "date"
    type = "S"
  }

  # GSI to efficiently query by userId and date for list and monthly summaries
  global_secondary_index {
    name            = "userId-date-index"
    hash_key        = "userId"
    range_key       = "date"
    projection_type = "ALL"
  }
}

// Removed CategoryMemory as per simplified flow (global rules only)

resource "aws_dynamodb_table" "category_rules" {
  name         = var.category_rules_table_name
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "rule"

  attribute {
    name = "rule"
    type = "S"
  }
}

resource "aws_dynamodb_table" "user_budgets" {
  name         = var.user_budgets_table_name
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "userId"

  attribute {
    name = "userId"
    type = "S"
  }
}

resource "aws_dynamodb_table" "invest" {
  name         = var.invest_table_name
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "pk"
  range_key    = "sk"

  attribute {
    name = "pk"
    type = "S"
  }

  attribute {
    name = "sk"
    type = "S"
  }

  # Generic GSI to support alternative access patterns when needed
  attribute {
    name = "GSI1PK"
    type = "S"
  }

  attribute {
    name = "GSI1SK"
    type = "S"
  }

  global_secondary_index {
    name            = "GSI1"
    hash_key        = "GSI1PK"
    range_key       = "GSI1SK"
    projection_type = "ALL"
  }
}

# DynamoDB table for mutual fund schemes
resource "aws_dynamodb_table" "mutual_fund_schemes" {
  name         = var.mutual_fund_schemes_table_name
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "scheme_code"

  attribute {
    name = "scheme_code"
    type = "S"
  }

  attribute {
    name = "date"
    type = "S"
  }

  attribute {
    name = "amc"
    type = "S"
  }

  attribute {
    name = "scheme_type"
    type = "S"
  }

  attribute {
    name = "allocation_class"
    type = "S"
  }

  attribute {
    name = "plan"
    type = "S"
  }

  attribute {
    name = "option"
    type = "S"
  }

  attribute {
    name = "is_etf"
    type = "S"
  }

  attribute {
    name = "fund_name"
    type = "S"
  }

  # GSI for querying by date
  global_secondary_index {
    name     = "DateIndex"
    hash_key = "date"
    projection_type = "ALL"
  }

  # GSI for querying by AMC
  global_secondary_index {
    name     = "AMC-Date-Index"
    hash_key = "amc"
    range_key = "date"
    projection_type = "ALL"
  }

  # GSI for querying by scheme type
  global_secondary_index {
    name     = "SchemeType-Date-Index" 
    hash_key = "scheme_type"
    range_key = "date"
    projection_type = "ALL"
  }

  # GSI for querying by allocation class - very useful for portfolio analysis
  global_secondary_index {
    name     = "AllocationClass-Date-Index" 
    hash_key = "allocation_class"
    range_key = "date"
    projection_type = "ALL"
  }

  # GSI for querying by plan (Direct/Regular)
  global_secondary_index {
    name     = "Plan-Date-Index" 
    hash_key = "plan"
    range_key = "date"
    projection_type = "ALL"
  }

  # GSI for querying by option (Growth/IDCW)
  global_secondary_index {
    name     = "Option-Date-Index" 
    hash_key = "option"
    range_key = "date"
    projection_type = "ALL"
  }

  # GSI for querying by ETF status - essential for portfolio allocation
  global_secondary_index {
    name     = "ETF-Status-Index" 
    hash_key = "is_etf"
    projection_type = "ALL"
  }

  # GSI for querying by fund name for search functionality
  global_secondary_index {
    name     = "FundName-Index" 
    hash_key = "fund_name"
    projection_type = "ALL"
  }

  tags = {
    Name        = var.mutual_fund_schemes_table_name
    Environment = var.environment
    Project     = "finsight"
  }
}

# Dedicated holdings table for portfolio holdings
resource "aws_dynamodb_table" "holdings" {
  name         = var.holdings_table_name
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "id"

  attribute {
    name = "id"
    type = "S"
  }

  # Attributes used by the GSI must be defined here
  attribute {
    name = "user_id"
    type = "S"
  }

  attribute {
    name = "created_at"
    type = "S"
  }

  global_secondary_index {
    name            = "userId-createdAt-index"
    hash_key        = "user_id"
    range_key       = "created_at"
    projection_type = "ALL"
  }

  tags = {
    Name        = var.holdings_table_name
    Environment = var.environment
    Project     = "finsight"
  }
}

output "expenses_table_name" {
  value = aws_dynamodb_table.expenses.name
}

// category_memory_table_name output removed

output "category_rules_table_name" {
  value = aws_dynamodb_table.category_rules.name
}

output "user_budgets_table_name" {
  value = aws_dynamodb_table.user_budgets.name
}

output "holdings_table_name" {
  value = aws_dynamodb_table.holdings.name
}