variable "expenses_table_name" {
  description = "DynamoDB table name for expenses"
  type        = string
  default     = "Expenses"
}

// CategoryMemory removed per simplified flow

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

output "invest_table_name" {
  value = aws_dynamodb_table.invest.name
}

