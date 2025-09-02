import boto3
import csv
import requests
import io
import re
import os
import logging
from datetime import datetime
from decimal import Decimal

# Configure logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# Initialize DynamoDB
dynamodb = boto3.resource("dynamodb")
stock_table = dynamodb.Table("StockCompanies")
mf_table = dynamodb.Table("MutualFundSchemes")

# Environment variables
KEEP_VARIANTS = os.environ.get("KEEP_VARIANTS", "direct_growth_only")

# --- Stock Parsing Functions ---
def fetch_nse():
    url = "https://nsearchives.nseindia.com/content/equities/EQUITY_L.csv"
    response = requests.get(url, timeout=15)
    response.raise_for_status()

    csv_text = response.content.decode("utf-8")
    reader = csv.DictReader(io.StringIO(csv_text))

    items = []
    for row in reader:
        items.append({
            "symbol": row["SYMBOL"].strip(),
            "companyName": row["NAME OF COMPANY"].strip(),
            "listingDate": row["DATE OF LISTING"].strip() or None,
            "isinNumber": row[" ISIN NUMBER"].strip(),  # has space in header
            "exchange": "NSE"
        })
    return items

def fetch_bse():
    url = "https://www.bseindia.com/downloads1/List_of_companies.csv"
    response = requests.get(url, timeout=15)
    response.raise_for_status()

    csv_text = response.content.decode("utf-8", errors="ignore")
    reader = csv.DictReader(io.StringIO(csv_text))

    items = []
    for row in reader:
        items.append({
            "symbol": row["Scrip code"].strip(),
            "companyName": row["Security Name"].strip(),
            "listingDate": None,  # BSE file doesn't provide
            "isinNumber": row["ISIN"].strip(),
            "exchange": "BSE"
        })
    return items

def store_stocks_to_dynamodb(items):
    with stock_table.batch_writer() as batch:
        for item in items:
            batch.put_item(Item=item)

# --- Mutual Fund Parsing Functions ---
NAV_URL = "https://www.amfiindia.com/spages/NAVAll.txt"

# Regex patterns
header_re = re.compile(r"^\s*Open Ended Schemes\((.*?)\)\s*$", re.IGNORECASE)
amc_re = re.compile(r".+Mutual Fund", re.IGNORECASE)
scheme_re = re.compile(r"^\d+;")

def normalize_quote(s: str) -> str:
    return (s or "").replace("â€™", "'").replace("Ã¢â‚¬â„¢", "'")

def parse_variant(fund_name: str):
    n = (fund_name or "").lower()
    plan   = "Direct"  if "direct"  in n else ("Regular" if "regular" in n else None)
    if re.search(r"(idcw|dividend|payout|reinvest|bonus|unclaimed|withdrawal)", n):
        option = "IDCW"
    elif "growth" in n:
        option = "Growth"
    else:
        option = None
    return plan, option

def detect_etf(scheme_type, scheme_subtype, fund_name: str) -> bool:
    st = (scheme_type or "").lower()
    ss = (scheme_subtype or "").lower() if scheme_subtype else ""
    n  = (fund_name or "").lower()
    return ("etf" in st or "etf" in ss or "etf" in n or "bees" in n)

def map_to_allocation(scheme_type: str, scheme_subtype: str, fund_name: str) -> str:
    st = (scheme_type or "").lower().strip()
    ss = normalize_quote((scheme_subtype or "")).lower().strip()
    n  = (fund_name or "").lower()
    
    if "equity" in st or "equity" in ss or "equity" in n:
        return "Equity MF"
    elif "debt" in st or "debt" in ss or "debt" in n:
        return "Debt MF"
    elif "liquid" in st or "liquid" in ss or "liquid" in n:
        return "Liquid MF"
    elif "hybrid" in st or "hybrid" in ss or "hybrid" in n:
        return "Hybrid MF"
    elif "gold" in st or "gold" in ss or "gold" in n:
        return "Gold MF"
    else:
        return "Other MF"

def map_to_portfolio_role(scheme_type: str, scheme_subtype: str, fund_name: str) -> str:
    st = (scheme_type or "").lower().strip()
    ss = normalize_quote((scheme_subtype or "")).lower().strip()
    n  = (fund_name or "").lower()
    
    if "equity" in st or "equity" in ss or "equity" in n:
        return "Equity"
    elif "debt" in st or "debt" in ss or "debt" in n:
        return "Defensive"
    elif "liquid" in st or "liquid" in ss or "liquid" in n:
        return "Defensive"
    elif "hybrid" in st or "hybrid" in ss or "hybrid" in n:
        return "Balanced"
    elif "gold" in st or "gold" in ss or "gold" in n:
        return "Satellite"
    else:
        return "Other"

def fetch_mf_data():
    response = requests.get(NAV_URL, timeout=30)
    response.raise_for_status()
    
    lines = response.text.split('\n')
    items = []
    current_amc = None
    current_category = None
    
    for line in lines:
        line = line.strip()
        if not line:
            continue
            
        # Check for AMC header
        if amc_re.match(line):
            current_amc = line
            continue
            
        # Check for category header
        header_match = header_re.match(line)
        if header_match:
            current_category = header_match.group(1)
            continue
            
        # Check for scheme line
        if scheme_re.match(line):
            parts = line.split(';')
            if len(parts) >= 5:
                scheme_code = parts[0].strip()
                scheme_name = parts[3].strip()
                nav = parts[4].strip()
                
                if not scheme_name or not nav:
                    continue
                    
                try:
                    nav_value = float(nav)
                except ValueError:
                    continue
                
                # Parse scheme details
                scheme_parts = scheme_name.split('-')
                if len(scheme_parts) >= 2:
                    fund_name = scheme_parts[0].strip()
                    scheme_type = scheme_parts[1].strip() if len(scheme_parts) > 1 else ""
                    scheme_subtype = scheme_parts[2].strip() if len(scheme_parts) > 2 else ""
                else:
                    fund_name = scheme_name
                    scheme_type = ""
                    scheme_subtype = ""
                
                # Parse variant
                plan, option = parse_variant(fund_name)
                
                # Check if we should keep this variant
                if KEEP_VARIANTS == "direct_growth_only":
                    if plan != "Direct" or option != "Growth":
                        continue
                
                # Detect ETF
                is_etf = detect_etf(scheme_type, scheme_subtype, fund_name)
                
                # Map to allocation and portfolio role
                asset_class = map_to_allocation(scheme_type, scheme_subtype, fund_name)
                portfolio_role = map_to_portfolio_role(scheme_type, scheme_subtype, fund_name)
                
                item = {
                    "scheme_code": scheme_code,
                    "amc": current_amc or "",
                    "asset_class": asset_class,
                    "date": datetime.now().strftime("%d-%b-%Y"),
                    "fund_name": fund_name,
                    "is_etf": is_etf,
                    "nav": nav_value,
                    "option": option or "",
                    "plan": plan or "",
                    "portfolio_role": portfolio_role,
                    "scheme_subtype": scheme_subtype,
                    "scheme_type": scheme_type
                }
                
                items.append(item)
    
    return items

def store_mf_to_dynamodb(items):
    with mf_table.batch_writer() as batch:
        for item in items:
            batch.put_item(Item=item)

# --- Main Lambda Handler ---
def lambda_handler(event, context):
    try:
        results = {}
        
        # Parse stocks
        logger.info("Starting stock data parsing...")
        nse_items = fetch_nse()
        bse_items = fetch_bse()
        store_stocks_to_dynamodb(nse_items)
        store_stocks_to_dynamodb(bse_items)
        results["stocks"] = {
            "nse_count": len(nse_items),
            "bse_count": len(bse_items),
            "total": len(nse_items) + len(bse_items)
        }
        logger.info(f"Stock parsing completed: {len(nse_items)} NSE, {len(bse_items)} BSE")
        
        # Parse mutual funds
        logger.info("Starting mutual fund data parsing...")
        mf_items = fetch_mf_data()
        store_mf_to_dynamodb(mf_items)
        results["mutual_funds"] = {
            "count": len(mf_items)
        }
        logger.info(f"Mutual fund parsing completed: {len(mf_items)} funds")
        
        return {
            "statusCode": 200,
            "body": {
                "message": "Data parsing completed successfully",
                "results": results
            }
        }
        
    except Exception as e:
        logger.error(f"Error in lambda_handler: {str(e)}")
        return {
            "statusCode": 500,
            "body": {
                "error": str(e),
                "message": "Data parsing failed"
            }
        }