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

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "";

// Cache for mutual fund data with daily refresh
let mfCache: { data: TransformedFund[]; timestamp: number } | null = null;
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

export async function fetchMutualFundSchemes(): Promise<TransformedFund[]> {
  // Check if cache is valid
  if (mfCache && (Date.now() - mfCache.timestamp) < CACHE_DURATION) {
    console.log('Using cached mutual fund data');
    return mfCache.data;
  }

  // Fetch fresh data
  console.log('Fetching fresh mutual fund data from API');
  const res = await fetch(`${API_BASE}/mutual-funds`, { method: 'GET' });
  if (!res.ok) throw new Error(`MF fetch failed: ${res.status}`);
  const data = await res.json();
  const funds = (data.items || []) as TransformedFund[];
  
  // Update cache
  mfCache = { data: funds, timestamp: Date.now() };
  return funds;
}

// Function to fetch funds by ETF status
export async function fetchFundsByETFStatus(isETF: boolean): Promise<TransformedFund[]> {
  const allFunds = await fetchMutualFundSchemes();
  return allFunds.filter(fund => fund.isETF === isETF);
}

export async function searchFundsByName(searchTerm: string, isETF?: boolean): Promise<TransformedFund[]> {
  // Use cached data for search to avoid API calls
  const allFunds = await fetchMutualFundSchemes();
  
  let filteredFunds = allFunds;
  
  // Filter by ETF status if specified
  if (isETF !== undefined) {
    filteredFunds = filteredFunds.filter(fund => fund.isETF === isETF);
  }
  
  // Filter by search term
  if (searchTerm.trim()) {
    const term = searchTerm.toLowerCase();
    filteredFunds = filteredFunds.filter(fund => 
      fund.name.toLowerCase().includes(term) || 
      fund.fullName.toLowerCase().includes(term)
    );
  }
  
  // Return limited results
  return filteredFunds.slice(0, 10);
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