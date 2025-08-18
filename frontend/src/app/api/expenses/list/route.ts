import { NextRequest, NextResponse } from "next/server";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand } from "@aws-sdk/lib-dynamodb";

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: process.env.AWS_REGION || "us-east-1" }));
const EXPENSES_TABLE = process.env.EXPENSES_TABLE || "Expenses";

// 2.2 get_expenses
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, start, end, category } = body as { userId: string; start?: string; end?: string; category?: string };
    if (!userId) return NextResponse.json({ error: "Missing userId" }, { status: 400 });

    // Assuming a GSI or PK/SK design: PK = userId, SK = date#expenseId
    // For simplicity: query by userId and filter by date/category client-side (note: for production use GSI/range keys)
    const res = await ddb.send(new QueryCommand({
      TableName: EXPENSES_TABLE,
      IndexName: undefined,
      KeyConditions: undefined,
      // Placeholder: In a real schema, you would use KeyConditionExpression on a partition key and range key.
      // Here we simulate with a Scan disguised via Query fallback not ideal; real impl should adjust table design.
    } as any));

    const items = (res.Items || []).filter((it: any) => it.userId === userId).filter((it: any) => {
      const okCategory = category ? it.category === category : true;
      const okDate = (() => {
        if (!start && !end) return true;
        const d = new Date(it.date);
        if (start && d < new Date(start)) return false;
        if (end && d > new Date(end)) return false;
        return true;
      })();
      return okCategory && okDate;
    });

    return NextResponse.json({ items });
  } catch (err) {
    return NextResponse.json({ error: "Failed to get expenses" }, { status: 500 });
  }
}

