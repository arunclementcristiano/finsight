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
  asset_class?: string;
  portfolio_role?: string;
  created_at: string;
  updated_at: string;
}

// API Base URLs for segregated Lambda functions
const EXPENSES_API_BASE = process.env.NEXT_PUBLIC_API_BASE_EXPENSES || "";
const PORTFOLIO_API_BASE = process.env.NEXT_PUBLIC_API_BASE_PORTFOLIO || "";

// Legacy support - if new variables aren't set, fall back to old one
const API_BASE = PORTFOLIO_API_BASE || process.env.NEXT_PUBLIC_API_BASE || "";

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

// Function to fetch funds by ETF status (deprecated - use role-based filtering instead)
export async function fetchFundsByETFStatus(isETF: boolean): Promise<TransformedFund[]> {
  const allFunds = await fetchMutualFundSchemes();
  return allFunds.filter(fund => fund.isETF === isETF);
}

export async function searchFundsByName(searchTerm: string): Promise<TransformedFund[]> {
  // Use cached data for search to avoid API calls
  const allFunds = await fetchMutualFundSchemes();
  
  let filteredFunds = allFunds;
  
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

export async function deleteHolding(holdingId: string, portfolioId: string): Promise<boolean> {
  if (!API_BASE) {
    throw new Error('API_BASE not configured');
  }

  try {
    const res = await fetch(`${API_BASE}/holdings/${holdingId}`, { 
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ portfolioId })
    });
    
    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Delete holding failed: ${res.status} - ${errorText}`);
    }
    
    return true;
  } catch (error) {
    throw error;
  }
}

// ==================== EXPENSES API FUNCTIONS ====================

// Types for expense data
export interface ExpenseData {
  id: string;
  amount: number;
  category: string;
  description: string;
  date: string;
  createdAt: string;
}

export interface CategoryRule {
  id: string;
  pattern: string;
  category: string;
  priority: number;
  createdAt: string;
}

export interface BudgetData {
  id: string;
  category: string;
  amount: number;
  period: string;
  createdAt: string;
  updatedAt: string;
}

// Fetch expenses from expenses API
export async function fetchExpenses(userId: string, startDate?: string, endDate?: string, category?: string): Promise<ExpenseData[]> {
  if (!EXPENSES_API_BASE) {
    throw new Error('EXPENSES_API_BASE not configured');
  }

  try {
    let url = `${EXPENSES_API_BASE}/expenses`;
    const params = new URLSearchParams();
    
    if (startDate) params.append('start', startDate);
    if (endDate) params.append('end', endDate);
    if (category) params.append('category', category);
    
    if (params.toString()) {
      url += `?${params.toString()}`;
    }

    const res = await fetch(url, { method: 'GET' });
    
    if (!res.ok) {
      throw new Error(`API returned ${res.status}: ${res.statusText}`);
    }
    
    const data = await res.json();
    return (data.items || []) as ExpenseData[];
  } catch (error) {
    throw error;
  }
}

// Create new expense
export async function createExpense(expense: Omit<ExpenseData, 'id' | 'createdAt'>): Promise<string> {
  if (!EXPENSES_API_BASE) {
    throw new Error('EXPENSES_API_BASE not configured');
  }

  try {
    const res = await fetch(`${EXPENSES_API_BASE}/expenses`, { 
      method: 'POST', 
      headers: { 'Content-Type': 'application/json' }, 
      body: JSON.stringify(expense) 
    });
    
    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Create expense failed: ${res.status} - ${errorText}`);
    }
    
    const data = await res.json();
    return data.expenseId;
  } catch (error) {
    throw error;
  }
}

// Fetch expense categories
export async function fetchExpenseCategories(): Promise<string[]> {
  if (!EXPENSES_API_BASE) {
    throw new Error('EXPENSES_API_BASE not configured');
  }

  try {
    const res = await fetch(`${EXPENSES_API_BASE}/categories`, { method: 'GET' });
    
    if (!res.ok) {
      throw new Error(`API returned ${res.status}: ${res.statusText}`);
    }
    
    const data = await res.json();
    return data.categories || [];
  } catch (error) {
    throw error;
  }
}

// Fetch expense summary
export async function fetchExpenseSummary(userId: string, startDate?: string, endDate?: string): Promise<{ summary: Array<{ category: string; total: number }>; total: number }> {
  if (!EXPENSES_API_BASE) {
    throw new Error('EXPENSES_API_BASE not configured');
  }

  try {
    let url = `${EXPENSES_API_BASE}/expenses/summary`;
    const params = new URLSearchParams();
    
    if (startDate) params.append('start', startDate);
    if (endDate) params.append('end', endDate);
    
    if (params.toString()) {
      url += `?${params.toString()}`;
    }

    const res = await fetch(url, { method: 'GET' });
    
    if (!res.ok) {
      throw new Error(`API returned ${res.status}: ${res.statusText}`);
    }
    
    const data = await res.json();
    return data;
  } catch (error) {
    throw error;
  }
}

// Fetch category rules
export async function fetchCategoryRules(): Promise<CategoryRule[]> {
  if (!EXPENSES_API_BASE) {
    throw new Error('EXPENSES_API_BASE not configured');
  }

  try {
    const res = await fetch(`${EXPENSES_API_BASE}/category-rules`, { method: 'GET' });
    
    if (!res.ok) {
      throw new Error(`API returned ${res.status}: ${res.statusText}`);
    }
    
    const data = await res.json();
    return (data.items || []) as CategoryRule[];
  } catch (error) {
    throw error;
  }
}

// Create category rule
export async function createCategoryRule(rule: Omit<CategoryRule, 'id' | 'createdAt'>): Promise<string> {
  if (!EXPENSES_API_BASE) {
    throw new Error('EXPENSES_API_BASE not configured');
  }

  try {
    const res = await fetch(`${EXPENSES_API_BASE}/category-rules`, { 
      method: 'POST', 
      headers: { 'Content-Type': 'application/json' }, 
      body: JSON.stringify(rule) 
    });
    
    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Create category rule failed: ${res.status} - ${errorText}`);
    }
    
    const data = await res.json();
    return data.ruleId;
  } catch (error) {
    throw error;
  }
}

// Delete category rule
export async function deleteCategoryRule(ruleId: string): Promise<boolean> {
  if (!EXPENSES_API_BASE) {
    throw new Error('EXPENSES_API_BASE not configured');
  }

  try {
    const res = await fetch(`${EXPENSES_API_BASE}/category-rules/${ruleId}`, { 
      method: 'DELETE' 
    });
    
    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Delete category rule failed: ${res.status} - ${errorText}`);
    }
    
    return true;
  } catch (error) {
    throw error;
  }
}

// Fetch budgets
export async function fetchBudgets(): Promise<BudgetData[]> {
  if (!EXPENSES_API_BASE) {
    throw new Error('EXPENSES_API_BASE not configured');
  }

  try {
    const res = await fetch(`${EXPENSES_API_BASE}/budgets`, { method: 'GET' });
    
    if (!res.ok) {
      throw new Error(`API returned ${res.status}: ${res.statusText}`);
    }
    
    const data = await res.json();
    return (data.items || []) as BudgetData[];
  } catch (error) {
    throw error;
  }
}

// Create or update budget
export async function saveBudget(budget: Omit<BudgetData, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  if (!EXPENSES_API_BASE) {
    throw new Error('EXPENSES_API_BASE not configured');
  }

  try {
    const res = await fetch(`${EXPENSES_API_BASE}/budgets/${budget.category}`, { 
      method: 'PUT', 
      headers: { 'Content-Type': 'application/json' }, 
      body: JSON.stringify(budget) 
    });
    
    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Save budget failed: ${res.status} - ${errorText}`);
    }
    
    const data = await res.json();
    return data.budgetId || budget.category;
  } catch (error) {
    throw error;
  }
}

// Delete budget
export async function deleteBudget(category: string): Promise<boolean> {
  if (!EXPENSES_API_BASE) {
    throw new Error('EXPENSES_API_BASE not configured');
  }

  try {
    const res = await fetch(`${EXPENSES_API_BASE}/budgets/${category}`, { 
      method: 'DELETE' 
    });
    
    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Delete budget failed: ${res.status} - ${errorText}`);
    }
    
    return true;
  } catch (error) {
    throw error;
  }
}