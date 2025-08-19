import { NextRequest, NextResponse } from "next/server";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand, UpdateCommand, GetCommand, ScanCommand } from "@aws-sdk/lib-dynamodb";

// Utilities
const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: process.env.AWS_REGION || "us-east-1" }));
const EXPENSES_TABLE = process.env.EXPENSES_TABLE || "Expenses";
const CATEGORY_MEMORY_TABLE = process.env.CATEGORY_MEMORY_TABLE || "CategoryMemory";
const CATEGORY_RULES_TABLE = process.env.CATEGORY_RULES_TABLE || "CategoryRules";

const ALLOWED_CATEGORIES = ["Food","Travel","Entertainment","Shopping","Utilities","Healthcare","Other"] as const;

// Step 2.5: Real AI categorization via Groq
async function getCategoryFromAI(rawText: string): Promise<{ category: string; confidence: number }> {
  const apiKey = (process.env.GROQ_API_KEY || "").trim();
  if (!apiKey) return { category: "", confidence: 0 };
  try {
    const system = "You are a financial expense categorizer. Allowed categories: Food, Travel, Entertainment, Shopping, Utilities, Healthcare, Other. Respond ONLY JSON: {\"category\": string, \"confidence\": number between 0 and 1}.";
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "Authorization": `Bearer ${apiKey}`,
        "User-Agent": "finsight-next/1.0"
      },
      body: JSON.stringify({
        model: process.env.GROQ_MODEL || "llama-3.1-8b-instant",
        messages: [
          { role: "system", content: system },
          { role: "user", content: rawText }
        ],
        temperature: 0,
      })
    });
    const data = await res.json();
    const txt = (data?.choices?.[0]?.message?.content as string) || "";
    try {
      const parsed = JSON.parse(txt);
      return { category: String(parsed.category || ""), confidence: Number(parsed.confidence || 0) };
    } catch {
      const mcat = /category\W+([A-Za-z]+)/i.exec(txt);
      const mconf = /confidence\W+(\d+(?:\.\d+)?)/i.exec(txt);
      let conf = mconf ? Number(mconf[1]) : 0.7;
      if (conf > 1) conf = conf / 100;
      return { category: mcat ? mcat[1] : "", confidence: conf };
    }
  } catch {
    return { category: "", confidence: 0 };
  }
}

// Step 2.1: add_expense
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, rawText } = body as { userId: string; rawText: string };
    if (!userId || !rawText) return NextResponse.json({ error: "Missing userId or rawText" }, { status: 400 });

    // 1) Parse amount using regex (₹?\d+(\.\d{1,2})?)
    const amountMatch = rawText.match(/(?:[₹$€£])?\s*(\d+(?:\.\d{1,2})?)/);
    const amount = amountMatch ? Number(amountMatch[1]) : NaN;

    const lower = rawText.toLowerCase();
    const extracted = (lower.match(/\b(?:on|for|at|to)\s+([a-z][a-z\s]{1,30})/i)?.[1] || lower.split(/\s+/).filter(Boolean).slice(-1)[0] || "").trim();

    // 2) Predefined rules
    const predefined: Record<string, string> = {
      groceries: "Food", grocery: "Food", restaurant: "Food", dining: "Food", lunch: "Food", dinner: "Food", pizza: "Food", breakfast: "Food", snacks: "Food", coffee: "Food", swiggy: "Food", zomato: "Food", ubereats: "Food",
      travel: "Travel", transport: "Travel", taxi: "Travel", uber: "Travel", ola: "Travel", bus: "Travel", train: "Travel", flight: "Travel", airline: "Travel", fuel: "Travel", petrol: "Travel", gas: "Travel",
      entertainment: "Entertainment", cinema: "Entertainment", netflix: "Entertainment", movie: "Entertainment", movies: "Entertainment", tv: "Entertainment", hotstar: "Entertainment", sunnxt: "Entertainment", spotify: "Entertainment", prime: "Entertainment", disney: "Entertainment", playstation: "Entertainment", xbox: "Entertainment",
      shopping: "Shopping", amazon: "Shopping", flipkart: "Shopping", myntra: "Shopping", apparel: "Shopping", clothing: "Shopping", mall: "Shopping", electronics: "Shopping", gadget: "Shopping",
      utilities: "Utilities", electricity: "Utilities", water: "Utilities", internet: "Utilities", broadband: "Utilities", jio: "Utilities", airtel: "Utilities", bsnl: "Utilities", bill: "Utilities",
      health: "Healthcare", healthcare: "Healthcare", medicine: "Healthcare", hospital: "Healthcare", doctor: "Healthcare", pharmacy: "Healthcare", apollo: "Healthcare", pharmeasy: "Healthcare", practo: "Healthcare",
    };
    const predefinedKey = Object.keys(predefined).find(k => lower.includes(k));
    let category = predefinedKey ? predefined[predefinedKey] : "";

    // If predefined matched, upsert CategoryRules for extracted term
    if (category && extracted) {
      await ddb.send(new PutCommand({
        TableName: CATEGORY_RULES_TABLE,
        Item: { rule: extracted, category },
      }));
    }

    // 3) CategoryRules lookup
    if (!category && extracted) {
      const r = await ddb.send(new GetCommand({ TableName: CATEGORY_RULES_TABLE, Key: { rule: extracted } }));
      const ruleCat = (r.Item as any)?.category as string | undefined;
      if (ruleCat) category = ruleCat;
    }

    // 3.5) CategoryMemory lookup (user-specific terms)
    if (!category) {
      try {
        const res = await ddb.send(new ScanCommand({ TableName: CATEGORY_MEMORY_TABLE }));
        const lowerText = rawText.toLowerCase();
        for (const it of (res.Items || [])) {
          if (it.userId !== userId) continue;
          const terms = (it.terms as any[]) || [];
          for (const t of terms) {
            const term = String(t || "").toLowerCase();
            if (term && lowerText.includes(term)) { category = String(it.category || ""); break; }
          }
          if (category) break;
        }
      } catch {}
    }

    // 4) If category unknown -> call Groq
    let AIConfidence: number | undefined;
    let options: string[] | undefined;
    if (!category) {
      const ai = await getCategoryFromAI(rawText);
      AIConfidence = ai.confidence;
      const aiCat = (ai.category || "").toLowerCase();
      const mapping: Record<string, string> = {
        food: "Food", restaurant: "Food", groceries: "Food",
        travel: "Travel", transport: "Travel", taxi: "Travel", fuel: "Travel",
        entertainment: "Entertainment", movies: "Entertainment", movie: "Entertainment", subscription: "Entertainment",
        shopping: "Shopping", apparel: "Shopping", clothing: "Shopping", electronics: "Shopping",
        utilities: "Utilities", internet: "Utilities", electricity: "Utilities", water: "Utilities",
        health: "Healthcare", healthcare: "Healthcare", medical: "Healthcare", medicine: "Healthcare",
        other: "Other",
      };
      let mapped = mapping[aiCat];
      if (!mapped) {
        for (const [k, v] of Object.entries(mapping)) {
          if (k.includes(aiCat) || aiCat.includes(k)) { mapped = v; break; }
        }
      }
      mapped = mapped || "Other";
      if (AIConfidence === undefined || Number(AIConfidence) < 0.8) {
        options = [...ALLOWED_CATEGORIES];
        category = mapped;
      } else {
        category = mapped;
      }
    }

    const normalizedCategory = category ? category : "Other";

    const message = isFinite(amount)
      ? `Parsed amount ${amount} and category ${normalizedCategory}`
      : `Could not parse amount; suggested category ${normalizedCategory}`;

    // Respond first to frontend for confirmation
    // 4) Return response to frontend: {amount, category, AIConfidence, message}
    return NextResponse.json({ amount: isFinite(amount) ? amount : undefined, category: normalizedCategory, AIConfidence, message, options });

  } catch (err) {
    return NextResponse.json({ error: "Failed to parse expense" }, { status: 500 });
  }
}

// 5) After user confirms AI suggestion, save to Expenses + update CategoryMemory
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, amount, category, rawText, date } = body as { userId: string; amount: number; category: string; rawText: string; date?: string };
    if (!userId || !category || !rawText || !isFinite(amount)) return NextResponse.json({ error: "Missing or invalid fields" }, { status: 400 });

    const expenseId = crypto.randomUUID();
    const isoDate = date ?? new Date().toISOString().slice(0,10);

    // Save expense
    await ddb.send(new PutCommand({
      TableName: EXPENSES_TABLE,
      Item: { expenseId, userId, amount, category, rawText, date: isoDate, createdAt: new Date().toISOString() },
    }));

    // Update CategoryMemory (upsert usageCount and append extracted term), and persist rule mapping
    const extracted = (rawText.toLowerCase().match(/\b(?:on|for|at|to)\s+([a-z][a-z\s]{1,30})/i)?.[1] || rawText.toLowerCase().split(/\s+/).filter(Boolean).slice(-1)[0] || "").trim();
    await ddb.send(new UpdateCommand({
      TableName: CATEGORY_MEMORY_TABLE,
      Key: { userId, category },
      UpdateExpression: "SET terms = list_append(if_not_exists(terms, :empty), :t) ADD usageCount :inc",
      ExpressionAttributeValues: { ":inc": 1, ":t": extracted ? [extracted] : [], ":empty": [] },
    }));

    if (category !== "Uncategorized" && extracted) {
      await ddb.send(new PutCommand({ TableName: CATEGORY_RULES_TABLE, Item: { rule: extracted, category } }));
    }

    return NextResponse.json({ ok: true, expenseId });
  } catch (err) {
    return NextResponse.json({ error: "Failed to save expense" }, { status: 500 });
  }
}

