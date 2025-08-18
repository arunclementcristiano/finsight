variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

provider "aws" {
  region = var.aws_region
}

variable "groq_api_key" {
  description = "Groq API key"
  type        = string
  default     = ""
}

