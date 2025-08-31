import { NextRequest, NextResponse } from "next/server";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand } from "@aws-sdk/lib-dynamodb";

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: process.env.AWS_REGION || "us-east-1" }));
const MUTUAL_FUND_TABLE = process.env.MUTUAL_FUND_TABLE || "MutualFundSchemes";

export async function GET(req: NextRequest) {
  try {
    // Scan the MutualFundSchemes table to get all funds
    const res = await ddb.send(new ScanCommand({
      TableName: MUTUAL_FUND_TABLE,
      // You can add filters here if needed, e.g., only active funds
    }));

    if (!res.Items) {
      return NextResponse.json({ 
        success: false, 
        error: "No funds found",
        funds: [] 
      });
    }

    // Transform the data to match our expected format
    const funds = res.Items.map((fund: any) => ({
      scheme_code: fund.scheme_code || fund.schemeCode,
      fund_name: fund.fund_name || fund.name,
      scheme_name: fund.scheme_name || fund.fullName,
      nav: fund.nav || fund.currentNAV || 0,
      allocation_class: fund.allocation_class || fund.allocationClass || 'Equity',
      is_etf: fund.is_etf || fund.isETF || false,
      fund_type: fund.fund_type || fund.fundType || 'Equity MF',
      category: fund.category || fund.fundCategory || '',
      direct_plan: fund.direct_plan || fund.directPlan || false,
      growth_option: fund.growth_option || fund.growthOption || false
    }));

    return NextResponse.json({ 
      success: true, 
      funds,
      count: funds.length
    });

  } catch (error) {
    console.error('Error fetching mutual funds:', error);
    return NextResponse.json({ 
      success: false, 
      error: "Failed to fetch mutual funds",
      funds: []
    }, { status: 500 });
  }
}