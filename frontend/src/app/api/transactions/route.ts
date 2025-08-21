import { NextRequest, NextResponse } from "next/server";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { getUserSubFromJwt } from "../_utils/auth";

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: process.env.AWS_REGION || "us-east-1" }));
const INVEST_TABLE = process.env.INVEST_TABLE || "InvestApp";

export async function POST(req: NextRequest) {
  const sub = await getUserSubFromJwt(req);
  if (!sub) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { portfolioId, txn } = await req.json();
  if (!portfolioId || !txn) return NextResponse.json({ error: "Missing portfolioId or txn" }, { status: 400 });
  const txnId = txn.id || crypto.randomUUID();
  const now = new Date().toISOString();
  const date = txn.date || now.slice(0, 10);
  await ddb.send(new PutCommand({
    TableName: INVEST_TABLE,
    Item: {
      pk: `USER#${sub}`,
      sk: `TRANSACTION#${portfolioId}#${date}#${txnId}`,
      entityType: "TRANSACTION",
      portfolioId,
      transactionId: txnId,
      data: txn,
      createdAt: now,
      GSI1PK: `PORTFOLIO#${portfolioId}`,
      GSI1SK: `TRANSACTION#${date}#${txnId}`,
    }
  }));
  return NextResponse.json({ transactionId: txnId });
}

export async function GET(req: NextRequest) {
  const sub = await getUserSubFromJwt(req);
  if (!sub) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const portfolioId = searchParams.get("portfolioId");
  const start = searchParams.get("start");
  const end = searchParams.get("end");
  if (!portfolioId) return NextResponse.json({ error: "Missing portfolioId" }, { status: 400 });
  const res = await ddb.send(new QueryCommand({
    TableName: INVEST_TABLE,
    KeyConditionExpression: "pk = :pk AND begins_with(#sk, :sk)",
    ExpressionAttributeValues: { ":pk": `USER#${sub}`, ":sk": `TRANSACTION#${portfolioId}#` },
    ExpressionAttributeNames: { "#sk": "sk" },
  }));
  const items = (res.Items || []).filter((it: any) => {
    const sk = String(it.sk || "");
    const parts = sk.split("#");
    const date = parts[2] || "";
    if (start && date < start) return false;
    if (end && date > end) return false;
    return true;
  }).map((it: any) => ({ id: it.transactionId, ...(it.data || {}) }));
  return NextResponse.json({ items });
}

