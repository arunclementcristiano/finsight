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

// Mock data for development/testing
const MOCK_MF_DATA: TransformedFund[] = [
  { schemeCode: "001", name: "HDFC Mid-Cap Opportunities Fund", fullName: "HDFC Mid-Cap Opportunities Fund - Direct Plan - Growth", currentNAV: 45.67, fundType: "Equity MF", allocationClass: "Equity", isETF: false },
  { schemeCode: "002", name: "ICICI Prudential Bluechip Fund", fullName: "ICICI Prudential Bluechip Fund - Direct Plan - Growth", currentNAV: 67.89, fundType: "Equity MF", allocationClass: "Equity", isETF: false },
  { schemeCode: "003", name: "SBI Gold ETF", fullName: "SBI Gold ETF", currentNAV: 123.45, fundType: "Gold ETF", allocationClass: "Gold", isETF: true },
  { schemeCode: "004", name: "Axis Liquid Fund", fullName: "Axis Liquid Fund - Direct Plan - Growth", currentNAV: 1000.00, fundType: "Liquid MF", allocationClass: "Liquid", isETF: false },
  { schemeCode: "005", name: "Nippon India Debt Fund", fullName: "Nippon India Debt Fund - Direct Plan - Growth", currentNAV: 12.34, fundType: "Debt MF", allocationClass: "Debt", isETF: false }
];

export async function fetchMutualFundSchemes(): Promise<TransformedFund[]> {
  // Check if cache is valid
  if (mfCache && !shouldRefreshCache()) {
    console.log('Using cached mutual fund data');
    return mfCache.data;
  }

  // Try to fetch from API if available
  if (API_BASE) {
    try {
      console.log('Fetching fresh mutual fund data from API');
      const res = await fetch(`${API_BASE}/mutual-funds`, { method: 'GET' });
      if (res.ok) {
        const data = await res.json();
        const funds = (data.items || []) as TransformedFund[];
        
        // Update cache
        mfCache = { data: funds, timestamp: Date.now() };
        console.log('Successfully fetched from API and cached');
        return funds;
      }
    } catch (error) {
      console.warn('API call failed, using mock data:', error);
    }
  }

  // Fallback to mock data
  console.log('Using mock mutual fund data (API not available)');
  mfCache = { data: MOCK_MF_DATA, timestamp: Date.now() };
  return MOCK_MF_DATA;
}

// Preload function to be called on server start
export async function preloadMutualFundData(): Promise<void> {
  console.log('Preloading mutual fund data on server start...');
  try {
    await fetchMutualFundSchemes();
    console.log('Mutual fund data preloaded successfully');
  } catch (error) {
    console.warn('Failed to preload mutual fund data:', error);
  }
}

// Function to fetch funds by ETF status
export async function fetchFundsByETFStatus(isETF: boolean): Promise<TransformedFund[]> {
  const allFunds = await fetchMutualFundSchemes();
  return allFunds.filter(fund => fund.isETF === isETF);
}

export async function searchFundsByName(searchTerm: string, isETF?: boolean): Promise<TransformedFund[]> {
  console.log('🔍 searchFundsByName called with:', { searchTerm, isETF });
  
  // Use cached data for search to avoid API calls
  const allFunds = await fetchMutualFundSchemes();
  console.log('📊 Total funds available:', allFunds.length);
  console.log('📋 Sample funds:', allFunds.slice(0, 3));
  
  let filteredFunds = allFunds;
  
  // Filter by ETF status if specified
  if (isETF !== undefined) {
    const beforeETFFilter = filteredFunds.length;
    filteredFunds = filteredFunds.filter(fund => fund.isETF === isETF);
    console.log(`🎯 ETF filter (${isETF}): ${beforeETFFilter} → ${filteredFunds.length} funds`);
  }
  
  // Filter by search term
  if (searchTerm.trim()) {
    const term = searchTerm.toLowerCase();
    const beforeSearchFilter = filteredFunds.length;
    filteredFunds = filteredFunds.filter(fund => {
      const nameMatch = fund.name.toLowerCase().includes(term);
      const fullNameMatch = fund.fullName.toLowerCase().includes(term);
      const matches = nameMatch || fullNameMatch;
      if (matches) {
        console.log(`✅ Match found: "${fund.name}" (term: "${term}")`);
      }
      return matches;
    });
    console.log(`🔎 Search filter ("${term}"): ${beforeSearchFilter} → ${filteredFunds.length} funds`);
  }
  
  const result = filteredFunds.slice(0, 10);
  console.log('🎯 Final results:', result.length, 'funds');
  return result;
}

export async function saveHolding(holding: HoldingData): Promise<boolean> {
  // Try to save to API if available
  if (API_BASE) {
    try {
      console.log('Saving holding to API...', holding);
      const body = { portfolioId: holding.user_id, holding };
      const res = await fetch(`${API_BASE}/holdings`, { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify(body) 
      });
      
      if (res.ok) {
        const result = await res.json();
        console.log('Successfully saved holding to API:', result);
        return true;
      } else {
        const errorText = await res.text();
        console.error(`API returned ${res.status}:`, errorText);
        throw new Error(`Save holding failed: ${res.status} - ${errorText}`);
      }
    } catch (error) {
      console.error('Error saving holding to API:', error);
      throw error;
    }
  } else {
    console.warn('API_BASE not configured, cannot save holding');
    throw new Error('API not configured');
  }
}

// Mock holdings data for development/testing
const MOCK_HOLDINGS_DATA: HoldingData[] = [
  {
    id: "1",
    user_id: "user123",
    name: "HDFC Bank",
    symbol: "HDFCBANK",
    instrumentClass: "Stocks",
    units: 100,
    price: 1500.00,
    investedAmount: 150000.00,
    currentValue: 155000.00,
    allocation_class: "Equity",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: "2",
    user_id: "user123", 
    name: "HDFC Mid-Cap Opportunities Fund",
    symbol: "",
    instrumentClass: "Mutual Funds",
    units: 0,
    price: 45.67,
    investedAmount: 50000.00,
    currentValue: 52000.00,
    allocation_class: "Equity",
    created_at: new Date(Date.now() - 86400000).toISOString(),
    updated_at: new Date(Date.now() - 86400000).toISOString()
  }
];

export async function fetchUserHoldings(userId: string): Promise<HoldingData[]> {
  // Try to fetch from API if available
  if (API_BASE) {
    try {
      console.log('Fetching holdings from API...');
      const res = await fetch(`${API_BASE}/holdings?portfolioId=${encodeURIComponent(userId)}`, { method: 'GET' });
      if (res.ok) {
        const data = await res.json();
        console.log('Successfully fetched holdings from API');
        return (data.items || []) as HoldingData[];
      } else {
        console.warn(`API returned ${res.status}, using mock data`);
      }
    } catch (error) {
      console.warn('API call failed, using mock data:', error);
    }
  }

  // Fallback to mock data
  console.log('Using mock holdings data (API not available)');
  return MOCK_HOLDINGS_DATA;
}