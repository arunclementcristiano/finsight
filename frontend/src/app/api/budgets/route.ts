import { NextRequest, NextResponse } from "next/server";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, PutCommand } from "@aws-sdk/lib-dynamodb";

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: process.env.AWS_REGION || "us-east-1" }));
const USER_BUDGETS_TABLE = process.env.USER_BUDGETS_TABLE || "UserBudgets";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");
    if (!userId) return NextResponse.json({ error: "Missing userId" }, { status: 400 });
    const res = await ddb.send(new GetCommand({ TableName: USER_BUDGETS_TABLE, Key: { userId } }));
    const budgets = (res.Item as any)?.budgets || {};
    return NextResponse.json({ budgets });
  } catch (err) {
    return NextResponse.json({ budgets: {} });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, budgets } = body as { userId: string; budgets: Record<string, number> };
    if (!userId || !budgets || typeof budgets !== "object") return NextResponse.json({ error: "Missing userId or budgets" }, { status: 400 });
    await ddb.send(new PutCommand({ TableName: USER_BUDGETS_TABLE, Item: { userId, budgets, updatedAt: new Date().toISOString() } }));
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: "Failed to save budgets" }, { status: 500 });
  }
}

