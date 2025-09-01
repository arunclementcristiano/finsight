import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand } from '@aws-sdk/lib-dynamodb';

// AWS Configuration
const awsConfig = {
  region: process.env.NEXT_PUBLIC_AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.NEXT_PUBLIC_AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.NEXT_PUBLIC_AWS_SECRET_ACCESS_KEY || '',
  },
};

// Initialize DynamoDB client
const client = new DynamoDBClient(awsConfig);
const docClient = DynamoDBDocumentClient.from(client);

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

// Function to fetch mutual fund schemes from DynamoDB
export async function fetchMutualFundSchemes(): Promise<TransformedFund[]> {
  try {
    const command = new ScanCommand({
      TableName: process.env.NEXT_PUBLIC_MUTUAL_FUND_TABLE || 'MutualFundSchemes',
    });

    const response = await docClient.send(command);
    
    if (!response.Items) {
      console.warn('No mutual fund schemes found in DynamoDB');
      return [];
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
    throw error;
  }
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