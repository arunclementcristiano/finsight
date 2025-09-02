import boto3
import csv
import requests
import io
import os
from datetime import datetime

dynamodb = boto3.resource("dynamodb")
table = dynamodb.Table(os.environ.get("STOCK_COMPANIES_TABLE", "StockCompanies"))

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
            "listingDate": None,  # BSE file doesn’t provide
            "isinNumber": row["ISIN"].strip(),
            "exchange": "BSE"
        })
    return items

def store_to_dynamodb(items):
    with table.batch_writer() as batch:
        for item in items:
            batch.put_item(Item=item)

def lambda_handler(event, context):
    try:
        nse_items = fetch_nse()
        bse_items = fetch_bse()

        store_to_dynamodb(nse_items)
        store_to_dynamodb(bse_items)

        return {
            "statusCode": 200,
            "body": f"Inserted {len(nse_items)} NSE and {len(bse_items)} BSE records"
        }
    except Exception as e:
        return {"statusCode": 500, "body": str(e)}
