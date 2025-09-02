import boto3
import csv
import requests
import io
import os
import time
import logging
from datetime import datetime
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

# Configure logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

dynamodb = boto3.resource("dynamodb")
table = dynamodb.Table(os.environ.get("STOCK_COMPANIES_TABLE", "StockCompanies"))

def create_session_with_retries():
    """Create a requests session with retry logic"""
    session = requests.Session()
    
    # Configure retry strategy
    retry_strategy = Retry(
        total=3,  # Total number of retries
        backoff_factor=1,  # Wait time between retries
        status_forcelist=[429, 500, 502, 503, 504],  # HTTP status codes to retry
    )
    
    # Mount adapter with retry strategy
    adapter = HTTPAdapter(max_retries=retry_strategy)
    session.mount("http://", adapter)
    session.mount("https://", adapter)
    
    return session

def fetch_nse():
    url = "https://nsearchives.nseindia.com/content/equities/EQUITY_L.csv"
    logger.info(f"Fetching NSE data from: {url}")
    
    session = create_session_with_retries()
    
    try:
        # Increased timeout and added headers
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
        
        response = session.get(url, timeout=30, headers=headers)
        response.raise_for_status()
        
        logger.info(f"NSE data fetched successfully, size: {len(response.content)} bytes")
        
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
        
        logger.info(f"Parsed {len(items)} NSE companies")
        return items
        
    except requests.exceptions.Timeout:
        logger.error("NSE request timed out")
        raise Exception("NSE data fetch timed out after 30 seconds")
    except requests.exceptions.RequestException as e:
        logger.error(f"NSE request failed: {str(e)}")
        raise Exception(f"NSE data fetch failed: {str(e)}")
    except Exception as e:
        logger.error(f"Error parsing NSE data: {str(e)}")
        raise Exception(f"Error parsing NSE data: {str(e)}")

def fetch_bse():
    url = "https://www.bseindia.com/downloads1/List_of_companies.csv"
    logger.info(f"Fetching BSE data from: {url}")
    
    session = create_session_with_retries()
    
    try:
        # Increased timeout and added headers
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
        
        response = session.get(url, timeout=30, headers=headers)
        response.raise_for_status()
        
        logger.info(f"BSE data fetched successfully, size: {len(response.content)} bytes")
        
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
        
        logger.info(f"Parsed {len(items)} BSE companies")
        return items
        
    except requests.exceptions.Timeout:
        logger.error("BSE request timed out")
        raise Exception("BSE data fetch timed out after 30 seconds")
    except requests.exceptions.RequestException as e:
        logger.error(f"BSE request failed: {str(e)}")
        raise Exception(f"BSE data fetch failed: {str(e)}")
    except Exception as e:
        logger.error(f"Error parsing BSE data: {str(e)}")
        raise Exception(f"Error parsing BSE data: {str(e)}")

def store_to_dynamodb(items):
    with table.batch_writer() as batch:
        for item in items:
            batch.put_item(Item=item)

def lambda_handler(event, context):
    logger.info("Starting stock data fetch and processing")
    
    try:
        # Fetch NSE data
        logger.info("Fetching NSE data...")
        nse_items = fetch_nse()
        
        # Fetch BSE data
        logger.info("Fetching BSE data...")
        bse_items = fetch_bse()

        # Store to DynamoDB
        logger.info("Storing data to DynamoDB...")
        store_to_dynamodb(nse_items)
        store_to_dynamodb(bse_items)

        total_items = len(nse_items) + len(bse_items)
        logger.info(f"Successfully processed {total_items} stock records")
        
        return {
            "statusCode": 200,
            "body": f"Inserted {len(nse_items)} NSE and {len(bse_items)} BSE records"
        }
        
    except Exception as e:
        logger.error(f"Error in stock data processing: {str(e)}")
        return {
            "statusCode": 500, 
            "body": str(e)
        }
