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

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || ""; // e.g., https://abc123.execute-api.us-east-1.amazonaws.com

export async function fetchMutualFundSchemes(): Promise<TransformedFund[]> {
  const res = await fetch(`${API_BASE}/mutual-funds`, { method: 'GET' });
  if (!res.ok) throw new Error(`MF fetch failed: ${res.status}`);
  const data = await res.json();
  return (data.items || []) as TransformedFund[];
}

// Function to fetch funds by ETF status
export async function fetchFundsByETFStatus(isETF: boolean): Promise<TransformedFund[]> {
  const allFunds = await fetchMutualFundSchemes();
  return allFunds.filter(fund => fund.isETF === isETF);
}

export async function searchFundsByName(searchTerm: string, isETF?: boolean): Promise<TransformedFund[]> {
  const params = new URLSearchParams();
  if (searchTerm) params.set('q', searchTerm);
  if (isETF !== undefined) params.set('is_etf', String(isETF));
  const res = await fetch(`${API_BASE}/mutual-funds/search?${params.toString()}`, { method: 'GET' });
  if (!res.ok) throw new Error(`MF search failed: ${res.status}`);
  const data = await res.json();
  return (data.items || []) as TransformedFund[];
}

export async function saveHolding(holding: HoldingData): Promise<boolean> {
  const body = { portfolioId: holding.user_id, holding };
  const res = await fetch(`${API_BASE}/holdings`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  if (!res.ok) throw new Error(`Save holding failed: ${res.status}`);
  return true;
}

export async function fetchUserHoldings(userId: string): Promise<HoldingData[]> {
  const res = await fetch(`${API_BASE}/holdings?portfolioId=${encodeURIComponent(userId)}`, { method: 'GET' });
  if (!res.ok) throw new Error(`Fetch holdings failed: ${res.status}`);
  const data = await res.json();
  return (data.items || []) as HoldingData[];
}