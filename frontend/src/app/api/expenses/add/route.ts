import { NextRequest, NextResponse } from "next/server";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";

// Utilities
const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: process.env.AWS_REGION || "us-east-1" }));
const EXPENSES_TABLE = process.env.EXPENSES_TABLE || "Expenses";
const CATEGORY_MEMORY_TABLE = process.env.CATEGORY_MEMORY_TABLE || "CategoryMemory";

// Step 2.5: Placeholder AI categorization via Groq
async function getCategoryFromAI(rawText: string): Promise<{ category: string; confidence: number }> {
  // Placeholder: Replace with real Groq API call
  // Example outline:
  // const res = await fetch("https://api.groq.com/v1/chat/completions", { headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}` }, ... })
  // const data = await res.json();
  // return { category: data.category, confidence: data.confidence };
  return { category: "Misc", confidence: 0.5 };
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

    // 2) Parse category using keyword map + CategoryMemory
    const keywordMap: Record<string, string> = {
      groceries: "Groceries",
      food: "Food",
      rent: "Rent",
      shopping: "Shopping",
      travel: "Travel",
      transport: "Transport",
      entertainment: "Entertainment",
      utilities: "Utilities",
      health: "Health",
    };
    const lower = rawText.toLowerCase();
    let category = Object.keys(keywordMap).find(k => lower.includes(k));

    // Try CategoryMemory (simple per-user last-mappings style)
    if (!category) {
      // Optionally, you could fetch by a tokenized keyword from rawText; here we skip to AI fallback
    }

    // 3) If category unknown -> call getCategoryFromAI(rawText)
    let AIConfidence: number | undefined;
    if (!category) {
      const ai = await getCategoryFromAI(rawText);
      category = ai.category;
      AIConfidence = ai.confidence;
    }

    const normalizedCategory = category ? (keywordMap[category] || category.charAt(0).toUpperCase() + category.slice(1)) : "Misc";

    const message = isFinite(amount)
      ? `Parsed amount ${amount} and category ${normalizedCategory}`
      : `Could not parse amount; suggested category ${normalizedCategory}`;

    // Respond first to frontend for confirmation
    // 4) Return response to frontend: {amount, category, AIConfidence, message}
    return NextResponse.json({ amount: isFinite(amount) ? amount : undefined, category: normalizedCategory, AIConfidence, message });

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

    // Update CategoryMemory (simple upsert count)
    await ddb.send(new UpdateCommand({
      TableName: CATEGORY_MEMORY_TABLE,
      Key: { userId, category },
      UpdateExpression: "ADD usageCount :inc",
      ExpressionAttributeValues: { ":inc": 1 },
    }));

    return NextResponse.json({ ok: true, expenseId });
  } catch (err) {
    return NextResponse.json({ error: "Failed to save expense" }, { status: 500 });
  }
}

