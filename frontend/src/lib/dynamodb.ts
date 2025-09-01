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

// Only initialize if credentials are available
if (process.env.NEXT_PUBLIC_AWS_ACCESS_KEY_ID && process.env.NEXT_PUBLIC_AWS_SECRET_ACCESS_KEY) {
  try {
    client = new DynamoDBClient(awsConfig);
    docClient = DynamoDBDocumentClient.from(client);
  } catch (error) {
    console.warn('Failed to initialize DynamoDB client:', error);
  }
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
  try {
    // Check if DynamoDB client is available
    if (!docClient) {
      console.warn('DynamoDB client not initialized - using mock data');
      return getMockFundData();
    }

    const command = new ScanCommand({
      TableName: process.env.NEXT_PUBLIC_MUTUAL_FUND_TABLE || 'MutualFundSchemes',
    });

    const response = await docClient.send(command);
    
    if (!response.Items) {
      console.warn('No mutual fund schemes found in DynamoDB');
      return getMockFundData();
    }

    // Transform the data to match our expected format
    const funds = response.Items.map((item: any) => ({
      schemeCode: item.scheme_code || item.schemeCode || '',
      name: item.fund_name || item.name || '',
      fullName: item.scheme_name || item.fullName || '',
      currentNAV: parseFloat(item.nav) || 0,
      fundType: item.allocation_class || 'Equity MF',
      allocationClass: item.allocation_class || 'Equity',
      isETF: item.is_etf === 'true' || item.isETF === true
    }));

    // Sort by name for better UX
    funds.sort((a, b) => a.name.localeCompare(b.name));
    
    console.log(`Successfully loaded ${funds.length} funds from DynamoDB`);
    return funds;
    
  } catch (error) {
    console.error('Error fetching mutual fund schemes from DynamoDB:', error);
    console.log('Falling back to mock data');
    return getMockFundData();
  }
}

// Mock data function
function getMockFundData(): TransformedFund[] {
  return [
    { schemeCode: 'MOCK001', name: 'HDFC Mid-Cap Opportunities Fund', fullName: 'HDFC Mid-Cap Opportunities Fund - Direct Plan - Growth', currentNAV: 45.67, fundType: 'Equity MF', allocationClass: 'Equity', isETF: false },
    { schemeCode: 'MOCK002', name: 'ICICI Prudential Bluechip Fund', fullName: 'ICICI Prudential Bluechip Fund - Direct Plan - Growth', currentNAV: 52.34, fundType: 'Equity MF', allocationClass: 'Equity', isETF: false },
    { schemeCode: 'MOCK003', name: 'SBI Gold Fund', fullName: 'SBI Gold Fund - Direct Plan - Growth', currentNAV: 23.45, fundType: 'Gold MF', allocationClass: 'Gold', isETF: false },
    { schemeCode: 'ETF001', name: 'NIFTY 50 ETF', fullName: 'NIFTY 50 ETF - Direct Plan - Growth', currentNAV: 185.67, fundType: 'Equity ETF', allocationClass: 'Equity', isETF: true },
    { schemeCode: 'ETF002', name: 'GOLD ETF', fullName: 'GOLD ETF - Direct Plan - Growth', currentNAV: 45.23, fundType: 'Gold ETF', allocationClass: 'Gold', isETF: true }
  ];
}

// Function to fetch funds by ETF status
export async function fetchFundsByETFStatus(isETF: boolean): Promise<TransformedFund[]> {
  try {
    const allFunds = await fetchMutualFundSchemes();
    return allFunds.filter(fund => fund.isETF === isETF);
  } catch (error) {
    console.error(`Error fetching ${isETF ? 'ETFs' : 'Mutual Funds'}:`, error);
    throw error;
  }
}

// Function to search funds by name
export async function searchFundsByName(searchTerm: string, isETF?: boolean): Promise<TransformedFund[]> {
  try {
    let allFunds = await fetchMutualFundSchemes();
    
    // Filter by ETF status if specified
    if (isETF !== undefined) {
      allFunds = allFunds.filter(fund => fund.isETF === isETF);
    }
    
    // Filter by search term
    if (searchTerm.trim()) {
      allFunds = allFunds.filter(fund =>
        fund.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        fund.fullName.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    return allFunds.slice(0, 10); // Limit to 10 results
  } catch (error) {
    console.error('Error searching funds:', error);
    throw error;
  }
}

// Function to save holding to DynamoDB
export async function saveHolding(holding: HoldingData): Promise<boolean> {
  try {
    const command = new PutCommand({
      TableName: process.env.NEXT_PUBLIC_HOLDINGS_TABLE || 'holdings',
      Item: holding,
    });

    await docClient.send(command);
    console.log('Holding saved successfully to DynamoDB:', holding.id);
    return true;
  } catch (error) {
    console.error('Error saving holding to DynamoDB:', error);
    throw error;
  }
}

// Function to fetch holdings for a user from DynamoDB
export async function fetchUserHoldings(userId: string): Promise<HoldingData[]> {
  try {
    if (!docClient) {
      console.warn('DynamoDB client not initialized - using mock holdings data');
      return getMockHoldingsData();
    }
    const command = new ScanCommand({
      TableName: process.env.NEXT_PUBLIC_HOLDINGS_TABLE || 'holdings',
      FilterExpression: 'user_id = :userId',
      ExpressionAttributeValues: {
        ':userId': userId,
      },
    });

    const response = await docClient.send(command);
    
    if (!response.Items) {
      console.warn('No holdings found in DynamoDB for user:', userId);
      return getMockHoldingsData();
    }

    // Sort by creation date (newest first)
    const holdings = response.Items.sort((a: any, b: any) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    console.log(`Successfully loaded ${holdings.length} holdings from DynamoDB for user:`, userId);
    return holdings as HoldingData[];
    
  } catch (error) {
    console.error('Error fetching holdings from DynamoDB:', error);
    return getMockHoldingsData();
  }
}

// Mock holdings data
function getMockHoldingsData(): HoldingData[] {
  return [
    {
      id: 'mock-holding-1',
      user_id: 'user-123',
      instrumentClass: 'Stocks',
      name: 'RELIANCE',
      symbol: 'RELIANCE',
      units: 10,
      price: 2500,
      investedAmount: 20000,
      currentValue: 25000,
      allocation_class: 'Equity',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'mock-holding-2',
      user_id: 'user-123',
      instrumentClass: 'Mutual Funds',
      name: 'HDFC Mid-Cap Opportunities Fund',
      symbol: 'MOCK001',
      units: 100,
      price: 45.67,
      investedAmount: 4567,
      currentValue: 5000,
      allocation_class: 'Equity',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
  ];
}