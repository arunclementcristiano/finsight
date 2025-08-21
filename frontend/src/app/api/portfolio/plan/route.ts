import { NextRequest, NextResponse } from "next/server";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, PutCommand } from "@aws-sdk/lib-dynamodb";
import { getUserSubFromJwt } from "../../_utils/auth";

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: process.env.AWS_REGION || "us-east-1" }));
const INVEST_TABLE = process.env.INVEST_TABLE || "InvestApp";

export async function PUT(req: NextRequest) {
  const sub = await getUserSubFromJwt(req);
  if (!sub) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { portfolioId, plan } = await req.json();
  if (!portfolioId || !plan) return NextResponse.json({ error: "Missing portfolioId or plan" }, { status: 400 });
  const now = new Date().toISOString();
  await ddb.send(new PutCommand({
    TableName: INVEST_TABLE,
    Item: {
      pk: `USER#${sub}`,
      sk: `ALLOCATION#${portfolioId}`,
      entityType: "ALLOCATION",
      plan,
      updatedAt: now,
      GSI1PK: `PORTFOLIO#${portfolioId}`,
      GSI1SK: `ALLOCATION#${now}`,
    }
  }));
  return NextResponse.json({ ok: true });
}

export async function GET(req: NextRequest) {
  const sub = await getUserSubFromJwt(req);
  if (!sub) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const portfolioId = searchParams.get("portfolioId");
  if (!portfolioId) return NextResponse.json({ error: "Missing portfolioId" }, { status: 400 });
  const res = await ddb.send(new GetCommand({
    TableName: INVEST_TABLE,
    Key: { pk: `USER#${sub}`, sk: `ALLOCATION#${portfolioId}` }
  }));
  const plan = (res.Item as any)?.plan || null;
  return NextResponse.json({ plan });
}

