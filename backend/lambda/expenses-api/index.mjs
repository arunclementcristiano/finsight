import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand, UpdateCommand, DeleteCommand, ScanCommand } from "@aws-sdk/lib-dynamodb";

const region = process.env.AWS_REGION || "us-east-1";
const EXPENSES_TABLE = process.env.EXPENSES_TABLE || "Expenses";
const CATEGORY_MEMORY_TABLE = process.env.CATEGORY_MEMORY_TABLE || "CategoryMemory";

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region }));

async function getCategoryFromAI(rawText) {
  return { category: "Misc", confidence: 0.5 };
}

function json(statusCode, body) {
  return { statusCode, headers: { "content-type": "application/json" }, body: JSON.stringify(body) };
}

export const handler = async (event) => {
  try {
    const routeKey = `${event.httpMethod} ${event.resource || event.rawPath}`;
    const body = event.body ? JSON.parse(event.body) : {};

    // POST /add (parse only)
    if (routeKey.includes("/add") && event.httpMethod === "POST") {
      const { userId, rawText } = body;
      if (!userId || !rawText) return json(400, { error: "Missing userId or rawText" });
      const m = rawText.match(/(?:[₹$€£])?\s*(\d+(?:\.\d{1,2})?)/);
      const amount = m ? Number(m[1]) : undefined;
      const kms = { groceries: "Groceries", food: "Food", rent: "Rent", shopping: "Shopping", travel: "Travel", transport: "Transport", entertainment: "Entertainment", utilities: "Utilities", health: "Health" };
      const lower = rawText.toLowerCase();
      let key = Object.keys(kms).find(k => lower.includes(k));
      let AIConfidence;
      if (!key) { const ai = await getCategoryFromAI(rawText); key = ai.category; AIConfidence = ai.confidence; }
      const category = kms[key] || (key ? key[0].toUpperCase() + key.slice(1) : "Misc");
      const message = amount !== undefined ? `Parsed amount ${amount} and category ${category}` : `Could not parse amount; suggested category ${category}`;
      return json(200, { amount, category, AIConfidence, message });
    }

    // PUT /add (confirm & save)
    if (routeKey.includes("/add") && event.httpMethod === "PUT") {
      const { userId, amount, category, rawText, date } = body;
      if (!userId || typeof amount !== "number" || !category || !rawText) return json(400, { error: "Missing fields" });
      const expenseId = crypto.randomUUID();
      const isoDate = date || new Date().toISOString().slice(0,10);
      await ddb.send(new PutCommand({ TableName: EXPENSES_TABLE, Item: { expenseId, userId, amount, category, rawText, date: isoDate, createdAt: new Date().toISOString() } }));
      await ddb.send(new UpdateCommand({ TableName: CATEGORY_MEMORY_TABLE, Key: { userId, category }, UpdateExpression: "ADD usageCount :inc", ExpressionAttributeValues: { ":inc": 1 } }));
      return json(200, { ok: true, expenseId });
    }

    // POST /list
    if (routeKey.includes("/list") && event.httpMethod === "POST") {
      const { userId, start, end, category } = body;
      if (!userId) return json(400, { error: "Missing userId" });
      const res = await ddb.send(new ScanCommand({ TableName: EXPENSES_TABLE }));
      const items = (res.Items || []).filter(x => x.userId === userId).filter(x => {
        const okCat = category ? x.category === category : true;
        const okDate = (() => {
          if (!start && !end) return true; const d = new Date(x.date);
          if (start && d < new Date(start)) return false; if (end && d > new Date(end)) return false; return true;
        })();
        return okCat && okDate;
      });
      return json(200, { items });
    }

    // POST /edit
    if (routeKey.includes("/edit") && event.httpMethod === "POST") {
      const { expenseId, updates } = body;
      if (!expenseId || !updates) return json(400, { error: "Missing expenseId or updates" });
      const expressions = []; const values = {};
      if (typeof updates.amount === "number") { expressions.push("amount = :a"); values[":a"] = updates.amount; }
      if (typeof updates.category === "string") { expressions.push("category = :c"); values[":c"] = updates.category; }
      if (typeof updates.rawText === "string") { expressions.push("rawText = :r"); values[":r"] = updates.rawText; }
      if (!expressions.length) return json(400, { error: "No valid updates" });
      await ddb.send(new UpdateCommand({ TableName: EXPENSES_TABLE, Key: { expenseId }, UpdateExpression: `SET ${expressions.join(", ")}`, ExpressionAttributeValues: values }));
      return json(200, { ok: true });
    }

    // POST /delete
    if (routeKey.includes("/delete") && event.httpMethod === "POST") {
      const { expenseId } = body;
      if (!expenseId) return json(400, { error: "Missing expenseId" });
      await ddb.send(new DeleteCommand({ TableName: EXPENSES_TABLE, Key: { expenseId } }));
      return json(200, { ok: true });
    }

    // POST /summary/monthly
    if (routeKey.includes("/summary/monthly") && event.httpMethod === "POST") {
      const { userId, month } = body;
      if (!userId) return json(400, { error: "Missing userId" });
      const now = new Date(); const ym = month || `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2, "0")}`;
      const res = await ddb.send(new ScanCommand({ TableName: EXPENSES_TABLE }));
      const items = (res.Items || []).filter(x => x.userId === userId && String(x.date).startsWith(ym));
      const totals = {}; for (const it of items) { const c = it.category || "Misc"; totals[c] = (totals[c] || 0) + Number(it.amount || 0); }
      return json(200, { month: ym, totals });
    }

    // POST /summary/category
    if (routeKey.includes("/summary/category") && event.httpMethod === "POST") {
      const { userId, category } = body;
      if (!userId || !category) return json(400, { error: "Missing userId or category" });
      const res = await ddb.send(new ScanCommand({ TableName: EXPENSES_TABLE }));
      const items = (res.Items || []).filter(x => x.userId === userId && x.category === category);
      const total = items.reduce((s, x) => s + Number(x.amount || 0), 0);
      return json(200, { items, total });
    }

    return json(404, { error: "Not found" });
  } catch (e) {
    return json(500, { error: "Internal error" });
  }
};

