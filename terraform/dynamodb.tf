variable "expenses_table_name" {
  description = "DynamoDB table name for expenses"
  type        = string
  default     = "Expenses"
}

variable "category_memory_table_name" {
  description = "DynamoDB table name for category memory"
  type        = string
  default     = "CategoryMemory"
}

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

  # Example GSIs you can add later for efficient queries by user/date
  # global_secondary_index {
  #   name            = "userId-date-index"
  #   hash_key        = "userId"
  #   range_key       = "date"
  #   projection_type = "ALL"
  # }
}

resource "aws_dynamodb_table" "category_memory" {
  name         = var.category_memory_table_name
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "userId"
  range_key    = "category"

  attribute {
    name = "userId"
    type = "S"
  }

  attribute {
    name = "category"
    type = "S"
  }
}

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

output "category_memory_table_name" {
  value = aws_dynamodb_table.category_memory.name
}

output "category_rules_table_name" {
  value = aws_dynamodb_table.category_rules.name
}

