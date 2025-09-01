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

// Cache for mutual fund data with daily refresh at 6 AM
let mfCache: { data: TransformedFund[]; timestamp: number } | null = null;

function getNextRefreshTime(): number {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(6, 0, 0, 0); // 6 AM tomorrow
  return tomorrow.getTime();
}

function shouldRefreshCache(): boolean {
  if (!mfCache) return true;
  
  const now = Date.now();
  const nextRefresh = getNextRefreshTime();
  
  // Refresh if it's past 6 AM or cache is older than 24 hours
  return now >= nextRefresh || (now - mfCache.timestamp) >= 24 * 60 * 60 * 1000;
}



export async function fetchMutualFundSchemes(): Promise<TransformedFund[]> {
  // Check if cache is valid
  if (mfCache && !shouldRefreshCache()) {
    return mfCache.data;
  }

  // Fetch from API
  if (!API_BASE) {
    throw new Error('API_BASE not configured');
  }

  try {
    console.log('🔄 Cache loading in progress...');
    const res = await fetch(`${API_BASE}/mutual-funds`, { method: 'GET' });
    
    if (!res.ok) {
      throw new Error(`API returned ${res.status}: ${res.statusText}`);
    }
    
    const data = await res.json();
    const funds = (data.items || []) as TransformedFund[];
    
    // Update cache
    mfCache = { data: funds, timestamp: Date.now() };
    console.log('✅ Cache load completed');
    return funds;
  } catch (error) {
    throw error;
  }
}

// Preload function to be called on server start
export async function preloadMutualFundData(): Promise<void> {
  try {
    await fetchMutualFundSchemes();
  } catch (error) {
    // Silent fail on preload
  }
}

// Function to clear cache (for testing)
export function clearMFCache(): void {
  mfCache = null;
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
  if (!API_BASE) {
    throw new Error('API_BASE not configured');
  }

  try {
    const body = { portfolioId: holding.user_id, holding };
    const res = await fetch(`${API_BASE}/holdings`, { 
      method: 'POST', 
      headers: { 'Content-Type': 'application/json' }, 
      body: JSON.stringify(body) 
    });
    
    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Save holding failed: ${res.status} - ${errorText}`);
    }
    
    return true;
  } catch (error) {
    throw error;
  }
}



export async function fetchUserHoldings(userId: string): Promise<HoldingData[]> {
  if (!API_BASE) {
    throw new Error('API_BASE not configured');
  }

  try {
    const res = await fetch(`${API_BASE}/holdings?portfolioId=${encodeURIComponent(userId)}`, { method: 'GET' });
    
    if (!res.ok) {
      throw new Error(`API returned ${res.status}: ${res.statusText}`);
    }
    
    const data = await res.json();
    return (data.items || []) as HoldingData[];
  } catch (error) {
    throw error;
  }
}