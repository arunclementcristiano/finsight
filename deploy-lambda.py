#!/usr/bin/env python3
"""
Deploy the parse-mf-stocks Lambda function
This script handles the complete deployment process for the combined MF and stock parsing lambda
"""

import os
import sys
import subprocess
import json
import shutil
import zipfile
from pathlib import Path

def run_command(cmd, check=True, capture_output=False):
    """Run a shell command and return the result"""
    print(f"🔧 Running: {' '.join(cmd)}")
    result = subprocess.run(cmd, check=check, capture_output=capture_output, text=True)
    if capture_output:
        return result.stdout.strip()
    return result

def check_prerequisites():
    """Check if required tools are installed"""
    print("🔍 Checking prerequisites...")
    
    # Check Terraform
    try:
        run_command(["terraform", "version"], capture_output=True)
        print("✅ Terraform is installed")
    except (subprocess.CalledProcessError, FileNotFoundError):
        print("❌ Terraform is not installed. Please install Terraform first.")
        sys.exit(1)
    
    # Check AWS CLI
    try:
        run_command(["aws", "sts", "get-caller-identity"], capture_output=True)
        print("✅ AWS CLI is configured")
    except (subprocess.CalledProcessError, FileNotFoundError):
        print("❌ AWS CLI is not configured. Please run 'aws configure' first.")
        sys.exit(1)

def build_lambda_package():
    """Build the Lambda deployment package"""
    print("📦 Building Lambda deployment package...")
    
    # Paths
    lambda_src = Path("backend/lambda/parse-mf-stocks")
    build_dir = Path("terraform/lambda_build")
    zip_file = Path("terraform/parse_mf_stocks.zip")
    
    # Clean up previous builds
    if build_dir.exists():
        shutil.rmtree(build_dir)
    if zip_file.exists():
        zip_file.unlink()
    
    # Create build directory
    build_dir.mkdir(parents=True, exist_ok=True)
    
    # Copy Lambda source files
    print("📋 Copying Lambda source files...")
    for file in lambda_src.glob("*.py"):
        shutil.copy2(file, build_dir)
        print(f"   ✅ Copied {file.name}")
    
    # Install dependencies
    requirements_file = lambda_src / "requirements.txt"
    if requirements_file.exists():
        print("📦 Installing Python dependencies...")
        run_command([
            "pip3", "install", "-r", str(requirements_file), 
            "-t", str(build_dir)
        ])
        
        # Verify critical dependencies
        requests_dir = build_dir / "requests"
        if not requests_dir.exists():
            print("❌ ERROR: 'requests' library not found in build directory.")
            sys.exit(1)
        print("✅ Dependencies installed successfully")
    
    # Create deployment ZIP
    print("📦 Creating deployment ZIP...")
    with zipfile.ZipFile(zip_file, 'w', zipfile.ZIP_DEFLATED) as zipf:
        for file_path in build_dir.rglob("*"):
            if file_path.is_file():
                arcname = file_path.relative_to(build_dir)
                zipf.write(file_path, arcname)
    
    print(f"✅ Created {zip_file}")
    
    # Verify ZIP contents
    print("📦 Verifying ZIP contents...")
    with zipfile.ZipFile(zip_file, 'r') as zipf:
        file_list = zipf.namelist()[:10]  # Show first 10 files
        for file in file_list:
            print(f"   📄 {file}")
        if len(zipf.namelist()) > 10:
            print(f"   ... and {len(zipf.namelist()) - 10} more files")

def deploy_terraform():
    """Deploy using Terraform"""
    print("🚀 Starting Terraform deployment...")
    
    # Change to terraform directory
    os.chdir("terraform")
    
    try:
        # Initialize Terraform
        print("📋 Initializing Terraform...")
        run_command(["terraform", "init"])
        
        # Validate configuration
        print("📋 Validating Terraform configuration...")
        run_command(["terraform", "validate"])
        
        # Plan deployment
        print("📋 Planning Terraform deployment...")
        run_command(["terraform", "plan", "-out=tfplan"])
        
        # Ask for confirmation
        print("\n🤔 Do you want to apply these changes? (y/N)")
        response = input().strip().lower()
        
        if response in ['y', 'yes']:
            print("🚀 Applying Terraform changes...")
            run_command(["terraform", "apply", "--auto-approve", "tfplan"])
            
            # Show outputs
            print("\n✅ Deployment completed!")
            print("\n📊 Lambda Function Details:")
            try:
                lambda_name = run_command(["terraform", "output", "-raw", "parse_mf_stocks_lambda_name"], capture_output=True)
                lambda_arn = run_command(["terraform", "output", "-raw", "parse_mf_stocks_lambda_arn"], capture_output=True)
                print(f"   Function Name: {lambda_name}")
                print(f"   Function ARN: {lambda_arn}")
            except subprocess.CalledProcessError:
                print("   (Outputs not available)")
            
            print("\n📊 DynamoDB Tables:")
            try:
                stock_table = run_command(["terraform", "output", "-raw", "stock_companies_table_name"], capture_output=True)
                mf_table = run_command(["terraform", "output", "-raw", "mutual_fund_schemes_table_name"], capture_output=True)
                print(f"   Stock Companies: {stock_table}")
                print(f"   Mutual Fund Schemes: {mf_table}")
            except subprocess.CalledProcessError:
                print("   (Table outputs not available)")
            
            print("\n🎯 Usage Examples:")
            print("   📊 Parse both stocks and mutual funds:")
            print(f"   aws lambda invoke --function-name {lambda_name} --payload '{{\"type\":\"both\"}}' response.json")
            print("   ")
            print("   📈 Parse stocks only:")
            print(f"   aws lambda invoke --function-name {lambda_name} --payload '{{\"type\":\"stocks\"}}' response.json")
            print("   ")
            print("   💰 Parse mutual funds only:")
            print(f"   aws lambda invoke --function-name {lambda_name} --payload '{{\"type\":\"mf\"}}' response.json")
            
        else:
            print("❌ Deployment cancelled by user")
            return False
            
    finally:
        # Clean up
        if Path("tfplan").exists():
            Path("tfplan").unlink()
        os.chdir("..")
    
    return True

def main():
    """Main deployment function"""
    print("🚀 Starting parse-mf-stocks Lambda deployment...")
    print("=" * 60)
    
    # Check prerequisites
    check_prerequisites()
    
    # Build Lambda package
    build_lambda_package()
    
    # Deploy with Terraform
    success = deploy_terraform()
    
    if success:
        print("\n🎉 Deployment completed successfully!")
        print("\n📝 Next steps:")
        print("1. Test the Lambda function with different payload types")
        print("2. Check CloudWatch logs for any issues")
        print("3. Verify data in DynamoDB tables")
    else:
        print("\n❌ Deployment failed or was cancelled")
        sys.exit(1)

if __name__ == "__main__":
    main()