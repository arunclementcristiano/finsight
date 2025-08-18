import json
import os
import re
import uuid
from datetime import datetime
from urllib import request as urlrequest

import boto3
from boto3.dynamodb.conditions import Key
from decimal import Decimal

AWS_REGION = os.environ.get("AWS_REGION", "us-east-1")
EXPENSES_TABLE = os.environ.get("EXPENSES_TABLE", "Expenses")
CATEGORY_MEMORY_TABLE = os.environ.get("CATEGORY_MEMORY_TABLE", "CategoryMemory")
GROQ_API_KEY = os.environ.get("GROQ_API_KEY", "")

dynamodb = boto3.resource("dynamodb", region_name=AWS_REGION)
expenses_table = dynamodb.Table(EXPENSES_TABLE)
category_memory_table = dynamodb.Table(CATEGORY_MEMORY_TABLE)


def _cors_headers():
    return {
        "content-type": "application/json",
        "access-control-allow-origin": "*",
        "access-control-allow-headers": "*",
        "access-control-allow-methods": "GET,POST,PUT,DELETE,OPTIONS",
    }


def _response(status, body):
    return {"statusCode": status, "headers": _cors_headers(), "body": json.dumps(body, default=_to_json)}


def _to_json(o):
    if isinstance(o, Decimal):
        return float(o)
    return o


def _get_category_from_ai(raw_text: str):
    if not GROQ_API_KEY:
        return {"category": "Misc", "confidence": 0.5}
    try:
        req = urlrequest.Request(
            "https://api.groq.com/v1/classify",
            data=json.dumps({"text": raw_text}).encode("utf-8"),
            headers={"Content-Type": "application/json", "Authorization": f"Bearer {GROQ_API_KEY}"},
            method="POST",
        )
        with urlrequest.urlopen(req, timeout=5) as resp:
            data = json.loads(resp.read().decode("utf-8"))
        return {"category": data.get("category", "Misc"), "confidence": data.get("confidence", 0.7)}
    except Exception:
        return {"category": "Misc", "confidence": 0.5}


def _parse_amount(raw_text: str):
    m = re.search(r"(?:[₹$€£])?\s*(\d+(?:\.\d{1,2})?)", raw_text)
    return float(m.group(1)) if m else None


def handler(event, context):
    try:
        method = (event.get("requestContext", {}).get("http", {}) or {}).get("method") or event.get("httpMethod")
        path = event.get("rawPath") or event.get("resource") or ""
        route_key = event.get("requestContext", {}).get("routeKey") or f"{method} {path}"

        # Preflight
        if method == "OPTIONS":
            return _response(200, {"ok": True})

        body = {}
        if event.get("body"):
            try:
                body = json.loads(event["body"]) or {}
            except Exception:
                body = {}

        # POST /add -> parse only
        if route_key == "POST /add":
            user_id = body.get("userId")
            raw_text = body.get("rawText", "")
            if not user_id or not raw_text:
                return _response(400, {"error": "Missing userId or rawText"})
            amount = _parse_amount(raw_text)
            keyword_map = {
                "groceries": "Groceries",
                "food": "Food",
                "rent": "Rent",
                "shopping": "Shopping",
                "travel": "Travel",
                "transport": "Transport",
                "entertainment": "Entertainment",
                "utilities": "Utilities",
                "health": "Health",
            }
            lower = raw_text.lower()
            key = next((k for k in keyword_map.keys() if k in lower), None)
            ai_conf = None
            if not key:
                ai = _get_category_from_ai(raw_text)
                key = ai.get("category")
                ai_conf = ai.get("confidence")
            category = keyword_map.get(key, key.capitalize() if key else "Misc")
            msg = f"Parsed amount {amount} and category {category}" if amount is not None else f"Could not parse amount; suggested category {category}"
            return _response(200, {"amount": amount, "category": category, "AIConfidence": ai_conf, "message": msg})

        # PUT /add -> confirm & save
        if route_key == "PUT /add":
            user_id = body.get("userId")
            amount = body.get("amount")
            category = body.get("category")
            raw_text = body.get("rawText")
            date = body.get("date") or datetime.utcnow().strftime("%Y-%m-%d")
            if not user_id or raw_text is None or category is None or amount is None:
                return _response(400, {"error": "Missing fields"})
            expense_id = str(uuid.uuid4())
            expenses_table.put_item(
                Item={
                    "expenseId": expense_id,
                    "userId": user_id,
                    "amount": Decimal(str(amount)),
                    "category": category,
                    "rawText": raw_text,
                    "date": date,
                    "createdAt": datetime.utcnow().isoformat(),
                }
            )
            category_memory_table.update_item(
                Key={"userId": user_id, "category": category},
                UpdateExpression="ADD usageCount :inc",
                ExpressionAttributeValues={":inc": Decimal("1")},
            )
            return _response(200, {"ok": True, "expenseId": expense_id})

        # POST /list
        if route_key == "POST /list":
            user_id = body.get("userId")
            start = body.get("start")
            end = body.get("end")
            category = body.get("category")
            if not user_id:
                return _response(400, {"error": "Missing userId"})
            # Scan then filter (dev). For prod, use GSI and Query.
            items = expenses_table.scan().get("Items", [])
            items = [x for x in items if x.get("userId") == user_id]
            def _ok_date(it):
                if not start and not end:
                    return True
                d = datetime.strptime(it.get("date"), "%Y-%m-%d")
                if start and d < datetime.strptime(start, "%Y-%m-%d"):
                    return False
                if end and d > datetime.strptime(end, "%Y-%m-%d"):
                    return False
                return True
            items = [x for x in items if (category is None or x.get("category") == category) and _ok_date(x)]
            return _response(200, {"items": items})

        # POST /edit
        if route_key == "POST /edit":
            expense_id = body.get("expenseId")
            updates = body.get("updates") or {}
            if not expense_id or not updates:
                return _response(400, {"error": "Missing expenseId or updates"})
            exprs = []
            vals = {}
            if "amount" in updates and updates["amount"] is not None:
                exprs.append("amount = :a")
                vals[":a"] = Decimal(str(updates["amount"]))
            if "category" in updates and updates["category"] is not None:
                exprs.append("category = :c")
                vals[":c"] = updates["category"]
            if "rawText" in updates and updates["rawText"] is not None:
                exprs.append("rawText = :r")
                vals[":r"] = updates["rawText"]
            if not exprs:
                return _response(400, {"error": "No valid updates"})
            expenses_table.update_item(
                Key={"expenseId": expense_id},
                UpdateExpression="SET " + ", ".join(exprs),
                ExpressionAttributeValues=vals,
            )
            return _response(200, {"ok": True})

        # POST /delete
        if route_key == "POST /delete":
            expense_id = body.get("expenseId")
            if not expense_id:
                return _response(400, {"error": "Missing expenseId"})
            expenses_table.delete_item(Key={"expenseId": expense_id})
            return _response(200, {"ok": True})

        # POST /summary/monthly
        if route_key == "POST /summary/monthly":
            user_id = body.get("userId")
            month = body.get("month")  # YYYY-MM
            if not user_id:
                return _response(400, {"error": "Missing userId"})
            if not month:
                now = datetime.utcnow()
                month = f"{now.year}-{str(now.month).zfill(2)}"
            items = expenses_table.scan().get("Items", [])
            items = [x for x in items if x.get("userId") == user_id and str(x.get("date", "")).startswith(month)]
            totals = {}
            for it in items:
                cat = it.get("category", "Misc")
                totals[cat] = float(totals.get(cat, 0)) + float(it.get("amount", 0))
            return _response(200, {"month": month, "totals": totals})

        # POST /summary/category
        if route_key == "POST /summary/category":
            user_id = body.get("userId")
            category = body.get("category")
            if not user_id or not category:
                return _response(400, {"error": "Missing userId or category"})
            items = expenses_table.scan().get("Items", [])
            items = [x for x in items if x.get("userId") == user_id and x.get("category") == category]
            total = sum(float(x.get("amount", 0)) for x in items)
            return _response(200, {"items": items, "total": total})

        return _response(404, {"error": "Not found", "routeKey": route_key})
    except Exception as e:
        print("handler error", e)
        return _response(500, {"error": "Internal error"})

