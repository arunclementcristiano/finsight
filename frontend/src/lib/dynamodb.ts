import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand, PutCommand } from '@aws-sdk/lib-dynamodb';

// AWS Configuration
const awsConfig = {
  region: process.env.NEXT_PUBLIC_AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.NEXT_PUBLIC_AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.NEXT_PUBLIC_AWS_SECRET_ACCESS_KEY || '',
  },
};

// Initialize DynamoDB client
let client: DynamoDBClient;
let docClient: DynamoDBDocumentClient;

// Require credentials to initialize
if (process.env.NEXT_PUBLIC_AWS_ACCESS_KEY_ID && process.env.NEXT_PUBLIC_AWS_SECRET_ACCESS_KEY) {
  client = new DynamoDBClient(awsConfig);
  docClient = DynamoDBDocumentClient.from(client);
}

// Types for mutual fund data
export interface MutualFundScheme {
  scheme_code: string;
  fund_name: string;
  scheme_name: string;
  nav: number;
  allocation_class: string;
  is_etf: string;
  date: string;
  amc: string;
  scheme_type: string;
  plan: string;
  option: string;
}

export interface TransformedFund {
  schemeCode: string;
  name: string;
  fullName: string;
  currentNAV: number;
  fundType: string;
  allocationClass: string;
  isETF: boolean;
}

// Types for holdings
export interface HoldingData {
  id: string;
  user_id: string;
  instrumentClass: string;
  name: string;
  symbol?: string;
  units?: number;
  price?: number;
  investedAmount?: number;
  currentValue?: number;
  allocation_class?: string;
  created_at: string;
  updated_at: string;
}

// Function to fetch mutual fund schemes from DynamoDB
export async function fetchMutualFundSchemes(): Promise<TransformedFund[]> {
  if (!docClient) throw new Error('DynamoDB client not initialized');
  const command = new ScanCommand({
    TableName: process.env.NEXT_PUBLIC_MUTUAL_FUND_TABLE || 'MutualFundSchemes',
  });
  const response = await docClient.send(command);
  if (!response.Items) throw new Error('No mutual fund schemes found');
  const funds = response.Items.map((item: any) => ({
    schemeCode: item.scheme_code || item.schemeCode || '',
    name: item.fund_name || item.name || '',
    fullName: item.scheme_name || item.fullName || '',
    currentNAV: parseFloat(item.nav) || 0,
    fundType: item.allocation_class || 'Equity MF',
    allocationClass: item.allocation_class || 'Equity',
    isETF: item.is_etf === 'true' || item.isETF === true
  }));
  funds.sort((a, b) => a.name.localeCompare(b.name));
  return funds;
}

// Function to fetch funds by ETF status
export async function fetchFundsByETFStatus(isETF: boolean): Promise<TransformedFund[]> {
  const allFunds = await fetchMutualFundSchemes();
  return allFunds.filter(fund => fund.isETF === isETF);
}

// Function to search funds by name
export async function searchFundsByName(searchTerm: string, isETF?: boolean): Promise<TransformedFund[]> {
  let allFunds = await fetchMutualFundSchemes();
  if (isETF !== undefined) allFunds = allFunds.filter(fund => fund.isETF === isETF);
  if (searchTerm.trim()) {
    const term = searchTerm.toLowerCase();
    allFunds = allFunds.filter(fund => fund.name.toLowerCase().includes(term) || fund.fullName.toLowerCase().includes(term));
  }
  return allFunds.slice(0, 10);
}

// Function to save holding to DynamoDB
export async function saveHolding(holding: HoldingData): Promise<boolean> {
  if (!docClient) throw new Error('DynamoDB client not initialized');
  const command = new PutCommand({
    TableName: process.env.NEXT_PUBLIC_HOLDINGS_TABLE || 'holdings',
    Item: holding,
  });
  await docClient.send(command);
  return true;
}

// Function to fetch holdings for a user from DynamoDB
export async function fetchUserHoldings(userId: string): Promise<HoldingData[]> {
  if (!docClient) throw new Error('DynamoDB client not initialized');
  const command = new ScanCommand({
    TableName: process.env.NEXT_PUBLIC_HOLDINGS_TABLE || 'holdings',
    FilterExpression: 'user_id = :userId',
    ExpressionAttributeValues: { ':userId': userId },
  });
  const response = await docClient.send(command);
  if (!response.Items) throw new Error('No holdings found');
  const holdings = (response.Items as HoldingData[]).sort((a: any, b: any) =>
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
  return holdings;
}