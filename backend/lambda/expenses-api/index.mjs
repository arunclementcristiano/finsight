import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand, UpdateCommand, DeleteCommand, ScanCommand } from "@aws-sdk/lib-dynamodb";

const region = process.env.AWS_REGION || "us-east-1";
const EXPENSES_TABLE = process.env.EXPENSES_TABLE || "Expenses";
const CATEGORY_MEMORY_TABLE = process.env.CATEGORY_MEMORY_TABLE || "CategoryMemory";

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region }));

async function getCategoryFromAI(rawText) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    // Fallback
    return { category: "Misc", confidence: 0.5 };
  }
  // Placeholder example call shape; replace with real Groq endpoint
  try {
    const resp = await fetch("https://api.groq.com/v1/classify", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ text: rawText })
    });
    if (!resp.ok) throw new Error("groq error");
    const data = await resp.json();
    return { category: data.category || "Misc", confidence: data.confidence ?? 0.7 };
  } catch {
    return { category: "Misc", confidence: 0.5 };
  }
}

function json(statusCode, body) {
  return {
    statusCode,
    headers: {
      "content-type": "application/json",
      "access-control-allow-origin": "*",
      "access-control-allow-headers": "*",
      "access-control-allow-methods": "GET,POST,PUT,DELETE,OPTIONS"
    },
    body: JSON.stringify(body)
  };
}

export const handler = async (event) => {
  try {
    const method = event.requestContext?.http?.method || event.httpMethod;
    const path = event.rawPath || event.resource || "";

    if (method === "OPTIONS") {
      return json(200, { ok: true });
    }
    const routeKey = `${method} ${path}`;
    const body = event.body ? JSON.parse(event.body) : {};

    // POST /add (parse only)
    if (path.endsWith("/add") && method === "POST") {
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
    if (path.endsWith("/add") && method === "PUT") {
      const { userId, amount, category, rawText, date } = body;
      if (!userId || typeof amount !== "number" || !category || !rawText) return json(400, { error: "Missing fields" });
      const expenseId = crypto.randomUUID();
      const isoDate = date || new Date().toISOString().slice(0,10);
      await ddb.send(new PutCommand({ TableName: EXPENSES_TABLE, Item: { expenseId, userId, amount, category, rawText, date: isoDate, createdAt: new Date().toISOString() } }));
      await ddb.send(new UpdateCommand({ TableName: CATEGORY_MEMORY_TABLE, Key: { userId, category }, UpdateExpression: "ADD usageCount :inc", ExpressionAttributeValues: { ":inc": 1 } }));
      return json(200, { ok: true, expenseId });
    }

    // POST /list
    if (path.endsWith("/list") && method === "POST") {
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
    if (path.endsWith("/edit") && method === "POST") {
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
    if (path.endsWith("/delete") && method === "POST") {
      const { expenseId } = body;
      if (!expenseId) return json(400, { error: "Missing expenseId" });
      await ddb.send(new DeleteCommand({ TableName: EXPENSES_TABLE, Key: { expenseId } }));
      return json(200, { ok: true });
    }

    // POST /summary/monthly
    if (path.endsWith("/summary/monthly") && method === "POST") {
      const { userId, month } = body;
      if (!userId) return json(400, { error: "Missing userId" });
      const now = new Date(); const ym = month || `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2, "0")}`;
      const res = await ddb.send(new ScanCommand({ TableName: EXPENSES_TABLE }));
      const items = (res.Items || []).filter(x => x.userId === userId && String(x.date).startsWith(ym));
      const totals = {}; for (const it of items) { const c = it.category || "Misc"; totals[c] = (totals[c] || 0) + Number(it.amount || 0); }
      return json(200, { month: ym, totals });
    }

    // POST /summary/category
    if (path.endsWith("/summary/category") && method === "POST") {
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

