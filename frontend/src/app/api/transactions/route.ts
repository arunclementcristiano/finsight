import { NextRequest, NextResponse } from "next/server";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand, QueryCommand, GetCommand } from "@aws-sdk/lib-dynamodb";
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

  // Basic HOLDING snapshot update (best-effort)
  try {
    const instrumentClass: string = String(txn.instrumentClass || txn.instrumentType || "");
    const name: string = String(txn.name || "").trim();
    const symbol: string | undefined = (txn.symbol && String(txn.symbol).trim()) || undefined;
    const type: string = String(txn.type || "Buy").toLowerCase();
    const unitsNum = Number(txn.units);
    const priceNum = Number(txn.price);
    const validQty = Number.isFinite(unitsNum) && unitsNum > 0;
    const validPrice = Number.isFinite(priceNum) && priceNum >= 0;

    if (instrumentClass && name && validQty) {
      const holdingKey = symbol ? String(symbol).toUpperCase() : name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
      const sk = `HOLDING#${portfolioId}#${holdingKey}`;
      const got = await ddb.send(new GetCommand({ TableName: INVEST_TABLE, Key: { pk: `USER#${sub}`, sk } }));
      const existing = (got.Item as any) || null;
      const prev = (existing?.data as any) || {};
      const prevUnits = Number(prev.units) || 0;
      const prevInvested = Number(prev.investedAmount) || 0;
      let nextUnits = prevUnits;
      let nextInvested = prevInvested;
      const tradeValue = validPrice ? unitsNum * priceNum : 0;
      if (type === "buy" || type === "sip") { nextUnits = prevUnits + unitsNum; nextInvested = prevInvested + tradeValue; }
      else if (type === "sell") { nextUnits = Math.max(0, prevUnits - unitsNum); nextInvested = Math.max(0, prevInvested - tradeValue); }
      if (nextUnits <= 0.000001) { nextUnits = 0; nextInvested = 0; }
      const holding = {
        id: holdingKey,
        instrumentClass,
        name,
        symbol,
        units: Number.isFinite(nextUnits) ? Number(nextUnits.toFixed(6)) : 0,
        price: validPrice ? Number(priceNum.toFixed(4)) : prev.price || undefined,
        investedAmount: Number.isFinite(nextInvested) ? Number(nextInvested.toFixed(2)) : 0,
        currentValue: Number.isFinite(nextInvested) ? Number(nextInvested.toFixed(2)) : 0,
      };
      await ddb.send(new PutCommand({
        TableName: INVEST_TABLE,
        Item: {
          pk: `USER#${sub}`,
          sk,
          entityType: "HOLDING",
          portfolioId,
          holdingId: holdingKey,
          data: holding,
          updatedAt: now,
          GSI1PK: `PORTFOLIO#${portfolioId}`,
          GSI1SK: `HOLDING#${holdingKey}`,
        }
      }));
    }
  } catch (e) {
    console.error("HOLDING_SNAPSHOT_UPDATE_ERROR", (e as any)?.message || e);
  }

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

