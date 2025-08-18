import { NextRequest, NextResponse } from "next/server";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand } from "@aws-sdk/lib-dynamodb";

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: process.env.AWS_REGION || "us-east-1" }));
const EXPENSES_TABLE = process.env.EXPENSES_TABLE || "Expenses";

// 2.2 get_expenses
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, start, end, category } = body as { userId: string; start?: string; end?: string; category?: string };
    if (!userId) return NextResponse.json({ error: "Missing userId" }, { status: 400 });

    // Temporary: scan then filter. Replace with PK/SK query in production.
    const res = await ddb.send(new ScanCommand({ TableName: EXPENSES_TABLE }));

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

