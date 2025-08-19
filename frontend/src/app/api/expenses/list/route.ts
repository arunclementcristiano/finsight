import { NextRequest, NextResponse } from "next/server";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand } from "@aws-sdk/lib-dynamodb";

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: process.env.AWS_REGION || "us-east-1" }));
const EXPENSES_TABLE = process.env.EXPENSES_TABLE || "Expenses";

// 2.2 get_expenses
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, start, end, category, page, limit } = body as { userId: string; start?: string; end?: string; category?: string; page?: number; limit?: number };
    if (!userId) return NextResponse.json({ error: "Missing userId" }, { status: 400 });

    // Use GSI userId-date-index for efficient queries
    const keyCond = "userId = :uid";
    const exprVals: Record<string, any> = { ":uid": userId };
    // Date filter via KeyCondition when start/end are provided
    let rangeKeyCond = "";
    if (start && end) { rangeKeyCond = " AND #d BETWEEN :start AND :end"; exprVals[":start"] = start; exprVals[":end"] = end; }
    else if (start) { rangeKeyCond = " AND #d >= :start"; exprVals[":start"] = start; }
    else if (end) { rangeKeyCond = " AND #d <= :end"; exprVals[":end"] = end; }

    const res = await ddb.send(new QueryCommand({
      TableName: EXPENSES_TABLE,
      IndexName: "userId-date-index",
      KeyConditionExpression: keyCond + rangeKeyCond,
      ExpressionAttributeValues: exprVals,
      ExpressionAttributeNames: { "#d": "date" }
    }));

    let items = (res.Items || []).filter((it: any) => (category ? it.category === category : true));

    // Sort by createdAt desc, fallback to date desc
    items.sort((a: any, b: any) => {
      const aCreated = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bCreated = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      if (aCreated !== 0 || bCreated !== 0) return bCreated - aCreated;
      return String(b.date || "").localeCompare(String(a.date || ""));
    });

    const pageNum = Math.max(1, Number(page) || 1);
    const pageSize = Math.min(50, Math.max(1, Number(limit) || 10));
    const startIdx = (pageNum - 1) * pageSize;
    const endIdx = startIdx + pageSize;
    const paged = items.slice(startIdx, endIdx);
    const hasMore = endIdx < items.length;

    return NextResponse.json({ items: paged, page: pageNum, limit: pageSize, hasMore, total: items.length });
  } catch (err) {
    return NextResponse.json({ error: "Failed to get expenses" }, { status: 500 });
  }
}

