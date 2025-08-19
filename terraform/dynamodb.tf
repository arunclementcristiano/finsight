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

output "expenses_table_name" {
  value = aws_dynamodb_table.expenses.name
}

// category_memory_table_name output removed

output "category_rules_table_name" {
  value = aws_dynamodb_table.category_rules.name
}

