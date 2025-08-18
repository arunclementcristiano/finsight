import json
import os
import re
import uuid
from datetime import datetime
from urllib import request as urlrequest
from urllib.error import HTTPError, URLError

import boto3
from boto3.dynamodb.conditions import Key
from decimal import Decimal

AWS_REGION = os.environ.get("AWS_REGION") or os.environ.get("REGION") or "us-east-1"
EXPENSES_TABLE = os.environ.get("EXPENSES_TABLE", "Expenses")
CATEGORY_MEMORY_TABLE = os.environ.get("CATEGORY_MEMORY_TABLE", "CategoryMemory")
CATEGORY_RULES_TABLE = os.environ.get("CATEGORY_RULES_TABLE", "CategoryRules")
GROQ_API_KEY = (os.environ.get("GROQ_API_KEY") or "").strip()
GROQ_MODEL = os.environ.get("GROQ_MODEL", "llama-3.1-70b-versatile")

dynamodb = boto3.resource("dynamodb", region_name=AWS_REGION)
expenses_table = dynamodb.Table(EXPENSES_TABLE)
category_memory_table = dynamodb.Table(CATEGORY_MEMORY_TABLE)
category_rules_table = dynamodb.Table(CATEGORY_RULES_TABLE)


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


ALLOWED_CATEGORIES = [
    "Food",
    "Travel",
    "Entertainment",
    "Shopping",
    "Utilities",
    "Healthcare",
    "Other",
]


def _get_category_from_ai(raw_text: str):
    if not GROQ_API_KEY:
        print("GROQ_API_KEY missing")
        return {"category": "", "confidence": 0.0}
    try:
        system_prompt = (
            "You are a financial expense categorizer. Allowed categories: Food, Travel, Entertainment, Shopping, Utilities, Healthcare, Other. "
            "Given a user input, respond ONLY as JSON: {\"category\": one of the allowed, \"confidence\": number 0..1}."
        )
        payload = {
            "model": GROQ_MODEL,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": raw_text},
            ],
            "temperature": 0,
        }
        req = urlrequest.Request(
            "https://api.groq.com/openai/v1/chat/completions",
            data=json.dumps(payload).encode("utf-8"),
            headers={
                "Content-Type": "application/json",
                "Accept": "application/json",
                "Authorization": f"Bearer {GROQ_API_KEY}",
                "User-Agent": "finsight-lambda/1.0 (+https://github.com/arunclementcristiano/finsight)"
            },
            method="POST",
        )
        try:
            with urlrequest.urlopen(req, timeout=10) as resp:
                content = resp.read().decode("utf-8")
                data = json.loads(content)
        except HTTPError as he:
            try:
                err_body = he.read().decode("utf-8")
            except Exception:
                err_body = ""
            print("GROQ_HTTP_ERROR", he.code, err_body[:500])
            # Cloudflare 1010 is often due to missing headers/UA; we added UA/Accept above
            return {"category": "", "confidence": 0.0}
        except URLError as ue:
            print("GROQ_URL_ERROR", str(ue))
            return {"category": "", "confidence": 0.0}
        txt = (
            (data.get("choices") or [{}])[0].get("message", {}).get("content", "")
            if isinstance(data, dict)
            else ""
        )
        try:
            parsed = json.loads(txt)
            cat = parsed.get("category", "")
            conf = parsed.get("confidence", 0.7)
        except Exception:
            # Best-effort extraction
            mcat = re.search(r"category\W+([A-Za-z]+)", txt, re.I)
            mconf = re.search(r"confidence\W+(\d+(?:\.\d+)?)", txt, re.I)
            cat = (mcat.group(1) if mcat else "")
            conf = float(mconf.group(1)) if mconf else 0.7
            if conf > 1:
                conf = conf / 100.0
        return {"category": cat, "confidence": conf}
    except Exception as e:
        print("GROQ_ERROR", str(e))
        return {"category": "", "confidence": 0.0}


def _parse_amount(raw_text: str):
    m = re.search(r"(?:[₹$€£])?\s*(\d+(?:\.\d{1,2})?)", raw_text)
    return float(m.group(1)) if m else None


def _extract_term(raw_text: str) -> str:
    # Pick a probable merchant/term after common prepositions; fallback to last alpha token
    m = re.search(r"\b(?:on|for|at|to)\s+([A-Za-z][A-Za-z\s]{1,30})", raw_text, flags=re.IGNORECASE)
    if m:
        cand = m.group(1).strip()
        cand = re.split(r"\b(yesterday|today|tomorrow|\d{4}-\d{2}-\d{2})\b", cand, flags=re.IGNORECASE)[0].strip()
        cand = re.sub(r"[^A-Za-z\s]", "", cand).strip()
        if cand:
            return cand.lower()
    tokens = re.findall(r"[A-Za-z]+", raw_text)
    if tokens:
        return tokens[-1].lower()
    return ""


def _match_memory_terms(user_id: str, lower_text: str) -> str:
    try:
        resp = category_memory_table.query(KeyConditionExpression=Key("userId").eq(user_id))
        for item in resp.get("Items", []):
            cat = item.get("category")
            terms = item.get("terms") or []
            # terms may be SS (set) or list
            for t in list(terms):
                try:
                    if t and t.lower() in lower_text:
                        return cat
                except Exception:
                    continue
    except Exception:
        pass
    return ""


def handler(event, context):
    try:
        method = (event.get("requestContext", {}).get("http", {}) or {}).get("method") or event.get("httpMethod")
        path = event.get("rawPath") or event.get("resource") or ""
        route_key = event.get("requestContext", {}).get("routeKey") or f"{method} {path}"

        if method == "OPTIONS":
            return _response(200, {"ok": True})

        body = {}
        if event.get("body"):
            try:
                body = json.loads(event["body"]) or {}
            except Exception:
                body = {}

        if route_key == "POST /add":
            user_id = body.get("userId")
            raw_text = body.get("rawText", "")
            if not user_id or not raw_text:
                return _response(400, {"error": "Missing userId or rawText"})
            amount = _parse_amount(raw_text)

            # Fixed categories (predefined rules)
            synonyms = {
                # Food
                "groceries": "Food", "grocery": "Food", "restaurant": "Food", "dining": "Food", "lunch": "Food", "dinner": "Food", "pizza": "Food",
                "breakfast": "Food", "snacks": "Food", "coffee": "Food", "swiggy": "Food", "zomato": "Food", "ubereats": "Food",
                # Travel
                "travel": "Travel", "transport": "Travel", "taxi": "Travel", "uber": "Travel", "ola": "Travel", "bus": "Travel",
                "train": "Travel", "flight": "Travel", "airline": "Travel", "fuel": "Travel", "petrol": "Travel", "gas": "Travel",
                # Entertainment
                "entertainment": "Entertainment", "cinema": "Entertainment", "netflix": "Entertainment", "movie": "Entertainment", "movies": "Entertainment", "tv": "Entertainment",
                "hotstar": "Entertainment", "sunnxt": "Entertainment", "spotify": "Entertainment", "prime": "Entertainment",
                "disney": "Entertainment", "playstation": "Entertainment", "xbox": "Entertainment",
                # Shopping
                "shopping": "Shopping", "amazon": "Shopping", "flipkart": "Shopping", "myntra": "Shopping", "apparel": "Shopping",
                "clothing": "Shopping", "mall": "Shopping", "electronics": "Shopping", "gadget": "Shopping",
                # Utilities
                "utilities": "Utilities", "electricity": "Utilities", "water": "Utilities", "internet": "Utilities", "broadband": "Utilities",
                "jio": "Utilities", "airtel": "Utilities", "bsnl": "Utilities", "bill": "Utilities",
                # Healthcare
                "health": "Healthcare", "healthcare": "Healthcare", "medicine": "Healthcare", "hospital": "Healthcare", "doctor": "Healthcare",
                "pharmacy": "Healthcare", "apollo": "Healthcare", "pharmeasy": "Healthcare", "practo": "Healthcare",
            }
            lower = raw_text.lower()
            extracted_term = _extract_term(raw_text)

            # 1) Rule-based (predefined)
            matched_key = next((k for k in synonyms.keys() if k in lower), None)
            matched = synonyms.get(matched_key) if matched_key else None
            final_category = matched if matched else ""
            ai_conf = None

            # If matched by predefined, also upsert into CategoryRules for future
            if final_category:
                try:
                    if extracted_term:
                        category_rules_table.put_item(Item={"rule": extracted_term, "category": final_category})
                except Exception:
                    pass

            # 2) CategoryRules table (global rules configured by you)
            if not final_category:
                try:
                    r = category_rules_table.get_item(Key={"rule": extracted_term})
                    rule_cat = (r.get("Item", {}) or {}).get("category")
                    if rule_cat:
                        final_category = rule_cat
                except Exception:
                    pass

            # 3) CategoryMemory terms (user-specific)
            if not final_category:
                mem_cat = _match_memory_terms(user_id, lower)
                if mem_cat:
                    final_category = mem_cat

            # 4) Groq fallback
            if not final_category:
                print("GROQ_CALL_START")
                ai = _get_category_from_ai(raw_text)
                print("GROQ_CALL_END", ai)
                ai_cat = (ai.get("category") or "").strip().lower()
                ai_conf = ai.get("confidence")
                mapping = {
                    "food": "Food", "restaurant": "Food", "groceries": "Food",
                    "travel": "Travel", "transport": "Travel", "taxi": "Travel", "fuel": "Travel",
                    "entertainment": "Entertainment", "movies": "Entertainment", "movie": "Entertainment", "subscription": "Entertainment",
                    "shopping": "Shopping", "apparel": "Shopping", "clothing": "Shopping", "electronics": "Shopping",
                    "utilities": "Utilities", "internet": "Utilities", "electricity": "Utilities", "water": "Utilities",
                    "health": "Healthcare", "healthcare": "Healthcare", "medical": "Healthcare", "medicine": "Healthcare",
                    "other": "Other"
                }
                mapped_ai = mapping.get(ai_cat)
                if not mapped_ai:
                    for k, v in mapping.items():
                        if k in ai_cat or ai_cat in k:
                            mapped_ai = v
                            break
                if not mapped_ai:
                    mapped_ai = "Other"

                low_conf = False
                try:
                    low_conf = (ai_conf is None) or (float(ai_conf) < 0.8)
                except Exception:
                    low_conf = True

                if low_conf:
                    # Provide options, but keep suggested category preselected
                    msg = (
                        f"Could not parse amount; low-confidence AI suggestion {mapped_ai}. Pick a category."
                        if amount is None
                        else f"Parsed amount {amount}; low-confidence AI suggestion {mapped_ai}. Pick a category."
                    )
                    return _response(200, {"amount": amount, "category": mapped_ai, "AIConfidence": ai_conf, "options": ALLOWED_CATEGORIES, "message": msg})
                else:
                    final_category = mapped_ai

            msg = (
                f"Parsed amount {amount} and category {final_category}" if amount is not None
                else f"Could not parse amount; suggested category {final_category}"
            )
            return _response(200, {"amount": amount, "category": final_category, "AIConfidence": ai_conf, "message": msg})

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
            # Update memory: increment usage and add term for future matching (skip Uncategorized)
            try:
                if category != "Uncategorized":
                    term = _extract_term(raw_text)
                    if term:
                        category_memory_table.update_item(
                            Key={"userId": user_id, "category": category},
                            UpdateExpression="ADD usageCount :one, terms :t",
                            ExpressionAttributeValues={":one": Decimal("1"), ":t": set([term])},
                        )
                        # Also persist rule->category mapping for future global use
                        try:
                            category_rules_table.put_item(Item={"rule": term, "category": category})
                        except Exception:
                            pass
                    else:
                        category_memory_table.update_item(
                            Key={"userId": user_id, "category": category},
                            UpdateExpression="ADD usageCount :one",
                            ExpressionAttributeValues={":one": Decimal("1")},
                        )
            except Exception:
                pass
            return _response(200, {"ok": True, "expenseId": expense_id})

        if route_key == "POST /list":
            user_id = body.get("userId")
            start = body.get("start")
            end = body.get("end")
            category = body.get("category")
            if not user_id:
                return _response(400, {"error": "Missing userId"})
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

        if route_key == "POST /delete":
            expense_id = body.get("expenseId")
            if not expense_id:
                return _response(400, {"error": "Missing expenseId"})
            expenses_table.delete_item(Key={"expenseId": expense_id})
            return _response(200, {"ok": True})

        if route_key == "POST /summary/monthly":
            user_id = body.get("userId")
            month = body.get("month")
            if not user_id:
                return _response(400, {"error": "Missing userId"})
            if not month:
                now = datetime.utcnow()
                month = f"{now.year}-{str(now.month).zfill(2)}"
            items = expenses_table.scan().get("Items", [])
            items = [x for x in items if x.get("userId") == user_id and str(x.get("date", "")).startswith(month)]
            totals = {}
            for it in items:
                cat = it.get("category", "Other")
                totals[cat] = float(totals.get(cat, 0)) + float(it.get("amount", 0))
            return _response(200, {"month": month, "totals": totals})

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