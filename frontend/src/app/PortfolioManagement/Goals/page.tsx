'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/Card';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/Select';
import { Badge } from '../../components/Badge';
// Simple SVG icons to replace lucide-react
const Plus = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} className={"h-5 w-5 "+(props.className||"")} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>;
const Edit2 = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} className={"h-5 w-5 "+(props.className||"")} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>;
const Trash2 = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} className={"h-5 w-5 "+(props.className||"")} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>;
const Target = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} className={"h-5 w-5 "+(props.className||"")} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-1 1h-2a2 2 0 01-2-2z" /></svg>;
const Calendar = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} className={"h-5 w-5 "+(props.className||"")} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>;
const DollarSign = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} className={"h-5 w-5 "+(props.className||"")} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" /></svg>;
const Star = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} className={"h-5 w-5 "+(props.className||"")} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" /></svg>;
const CheckCircle = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} className={"h-5 w-5 "+(props.className||"")} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
const XCircle = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} className={"h-5 w-5 "+(props.className||"")} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
const Clock = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} className={"h-5 w-5 "+(props.className||"")} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
const Home = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} className={"h-5 w-5 "+(props.className||"")} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>;
const GraduationCap = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} className={"h-5 w-5 "+(props.className||"")} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" /></svg>;
const Shield = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} className={"h-5 w-5 "+(props.className||"")} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>;
const TrendingUp = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} className={"h-5 w-5 "+(props.className||"")} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>;
const User = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} className={"h-5 w-5 "+(props.className||"")} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>;
const Zap = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} className={"h-5 w-5 "+(props.className||"")} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>;

// NEW: Portfolio structure for goal mapping with strict typing
type AssetClass = 'stocks' | 'mutualFunds' | 'gold' | 'realEstate' | 'debt' | 'liquid';
type PortfolioAllocation = Record<AssetClass, number>;

interface Goal {
  id: string;
  name: string;
  category: "retirement" | "home_purchase" | "child_education" | "emergency_fund" | "wealth_building" | "custom";
  targetAmount: number;
  targetDate: Date;
  priority: "high" | "medium" | "low";
  currentProgress: number; // Changed from optional to required
  isActive: boolean;
  createdAt: Date;
  // NEW: Investment allocation tracking with strict typing
  allocatedInvestments?: PortfolioAllocation;
  // NEW: Enhanced goal tracking
  isCompleted?: boolean;
  completedDate?: Date;
  notes?: string;
  milestones?: {
    id: string;
    name: string;
    targetAmount: number;
    isReached: boolean;
    reachedDate?: Date;
  }[];
  // NEW: Allocation explanation
  allocationExplanation?: string;
}

// NEW: User risk profile
type RiskProfile = "conservative" | "balanced" | "aggressive";

// NEW: Risk profile thresholds
const RISK_PROFILE_THRESHOLDS = {
  conservative: {
    maxEquityPercentage: 0.5, // 50% max equity
    minDebtPercentage: 0.25,  // 25% min debt/liquid
    targetEquityPercentage: 0.4, // 40% target equity
    targetDebtPercentage: 0.35  // 35% target debt/liquid
  },
  balanced: {
    maxEquityPercentage: 0.7, // 70% max equity
    minDebtPercentage: 0.15,  // 15% min debt/liquid
    targetEquityPercentage: 0.6, // 60% target equity
    targetDebtPercentage: 0.25  // 25% target debt/liquid
  },
  aggressive: {
    maxEquityPercentage: 0.85, // 85% max equity
    minDebtPercentage: 0.08,   // 8% min debt/liquid
    targetEquityPercentage: 0.75, // 75% target equity
    targetDebtPercentage: 0.15   // 15% target debt/liquid
  }
};

// NEW: Goal allocation suggestions based on timeline
const getGoalAllocationSuggestion = (timeline: string, priority: string): PortfolioAllocation => {
  if (timeline === 'short-term') {
    // Short-term: Conservative, more liquid/debt
    return {
      stocks: 0.1,
      mutualFunds: 0.1,
      gold: 0.05,
      realEstate: 0.05,
      debt: 0.4,
      liquid: 0.3
    };
  } else if (timeline === 'medium-term') {
    // Medium-term: Balanced
    return {
      stocks: 0.25,
      mutualFunds: 0.25,
      gold: 0.1,
      realEstate: 0.1,
      debt: 0.2,
      liquid: 0.1
    };
  } else {
    // Long-term: Growth-oriented, more equity
    return {
      stocks: 0.4,
      mutualFunds: 0.3,
      gold: 0.1,
      realEstate: 0.1,
      debt: 0.05,
      liquid: 0.05
    };
  }
};

// NEW: Calculate goal progress from portfolio
const calculateGoalProgressFromPortfolio = (
  goal: Goal, 
  portfolio: PortfolioAllocation,
  totalPortfolioValue: number
): { progress: number; breakdown: PortfolioAllocation } => {
  if (!goal.allocatedInvestments) {
    return { progress: 0, breakdown: { stocks: 0, mutualFunds: 0, gold: 0, realEstate: 0, debt: 0, liquid: 0 } };
  }

  // Calculate how much of the goal is funded by each asset class
  const breakdown = {
    stocks: Math.min(goal.allocatedInvestments.stocks, portfolio.stocks),
    mutualFunds: Math.min(goal.allocatedInvestments.mutualFunds, portfolio.mutualFunds),
    gold: Math.min(goal.allocatedInvestments.gold, portfolio.gold),
    realEstate: Math.min(goal.allocatedInvestments.realEstate, portfolio.realEstate),
    debt: Math.min(goal.allocatedInvestments.debt, portfolio.debt),
    liquid: Math.min(goal.allocatedInvestments.liquid, portfolio.liquid)
  };

  const totalFunded = Object.values(breakdown).reduce((sum, val) => sum + val, 0);
  const progress = Math.min((totalFunded / goal.targetAmount) * 100, 100);

  return { progress, breakdown };
};

// Pre-defined well-known goals with smart defaults
const PREDEFINED_GOALS = [
  {
    id: 'retirement_30',
    name: 'Retirement Fund (30 years)',
    category: 'retirement' as const,
    defaultAmount: 50000000,
    defaultYears: 30,
    icon: User,
    description: 'Build a substantial retirement corpus for financial independence',
    color: 'from-blue-500 to-blue-600'
  },
  {
    id: 'home_downpayment',
    name: 'Home Down Payment',
    category: 'home_purchase' as const,
    defaultAmount: 20000000,
    defaultYears: 5,
    icon: Home,
    description: 'Save for your dream home down payment',
    color: 'from-green-500 to-green-600'
  },
  {
    id: 'child_education',
    name: 'Child Education Fund',
    category: 'child_education' as const,
    defaultAmount: 15000000,
    defaultYears: 15,
    icon: GraduationCap,
    description: 'Secure your child\'s future education',
    color: 'from-purple-500 to-purple-600'
  },
  {
    id: 'emergency_fund',
    name: 'Emergency Fund',
    category: 'emergency_fund' as const,
    defaultAmount: 1000000,
    defaultYears: 1,
    icon: Shield,
    description: 'Build a safety net for unexpected expenses',
    color: 'from-orange-500 to-orange-600'
  },
  {
    id: 'wealth_building',
    name: 'Wealth Building',
    category: 'wealth_building' as const,
    defaultAmount: 10000000,
    defaultYears: 10,
    icon: TrendingUp,
    description: 'Grow your wealth through strategic investments',
    color: 'from-indigo-500 to-indigo-600'
  }
];

export default function GoalsPage() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isCustomFormOpen, setIsCustomFormOpen] = useState(false);
  const [isProgressFormOpen, setIsProgressFormOpen] = useState(false);
  const [isAllocationFormOpen, setIsAllocationFormOpen] = useState(false);
  const [selectedGoalForProgress, setSelectedGoalForProgress] = useState<Goal | null>(null);
  const [selectedGoalForAllocation, setSelectedGoalForAllocation] = useState<Goal | null>(null);
  const [progressData, setProgressData] = useState({
    currentAmount: '',
    notes: ''
  });
  const [allocationData, setAllocationData] = useState({
    stocks: '',
    mutualFunds: '',
    gold: '',
    realEstate: '',
    debt: '',
    liquid: ''
  });
  const [formData, setFormData] = useState({
    name: '',
    category: 'retirement' as Goal['category'],
    targetAmount: '',
    targetDate: '',
    priority: 'medium' as Goal['priority'],
    isActive: true,
    currentProgress: 0,
    notes: ''
  });
  
  // NEW: Form validation state
  const [formErrors, setFormErrors] = useState<{[key: string]: string}>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // NEW: User risk profile (in real app, this would come from user settings)
  const [userRiskProfile] = useState<RiskProfile>('balanced');

  // NEW: Mock portfolio data (in real app, this would come from your portfolio engine)
  const [portfolioData] = useState<PortfolioAllocation>({
    stocks: 2000000,      // ₹20L
    mutualFunds: 1500000, // ₹15L
    gold: 500000,         // ₹5L
    realEstate: 3000000,  // ₹30L
    debt: 1000000,        // ₹10L
    liquid: 2000000       // ₹20L
  });

  const totalPortfolioValue = Object.values(portfolioData).reduce((sum: number, val: number) => sum + val, 0);

  // Load goals from localStorage on component mount
  useEffect(() => {
    const savedGoals = localStorage.getItem('investmentGoals');
    if (savedGoals) {
      const parsedGoals = JSON.parse(savedGoals).map((goal: any) => ({
        ...goal,
        targetDate: new Date(goal.targetDate),
        createdAt: new Date(goal.createdAt)
      }));
      setGoals(parsedGoals);
      
      // NEW: Always trigger allocation calculation on load
      console.log('🔄 Component loaded, triggering allocation calculation');
      setTimeout(() => {
        // Check if there are goals without allocations and calculate them
        const goalsWithoutAllocations = parsedGoals.filter((goal: Goal) => !goal.allocatedInvestments);
        if (goalsWithoutAllocations.length > 0) {
          console.log('🔄 Found goals without allocations on load:', goalsWithoutAllocations.map((g: any) => g.name));
          // Calculate allocations for goals that don't have them
          const goalsWithAllocations = parsedGoals.map((goal: any) => {
            if (!goal.allocatedInvestments) {
              console.log('🔧 Calculating allocation for goal:', goal.name);
              const timeline = getTimelineCategory(goal.targetDate);
              const suggestion = getGoalAllocationSuggestion(timeline, goal.priority);
              const allocation = calculateBalancedAllocation(goal.targetAmount, suggestion);
              const explanation = generateAllocationExplanation(goal, allocation, timeline, userRiskProfile);
              
              return {
                ...goal,
                allocatedInvestments: allocation,
                allocationExplanation: explanation
              };
            }
            return goal;
          });
          
          // Apply portfolio-level reconciliation
          const reconciledGoals = reconcilePortfolioAllocation(goalsWithAllocations, userRiskProfile);
          
          // Apply risk profile enforcement
          const finalGoals = enforceRiskProfile(reconciledGoals, userRiskProfile);
          
          console.log('🔧 Final goals after load calculation:', finalGoals);
          
          // Save to localStorage
          localStorage.setItem('investmentGoals', JSON.stringify(finalGoals));
          setGoals(finalGoals);
        }
      }, 1000); // Small delay to ensure state is set
    }
  }, []);

  // NEW: Listen for goal updates from other components
  useEffect(() => {
    const handleGoalsUpdated = () => {
      console.log('🔄 Goals updated event received, checking for missing allocations');
      const savedGoals = localStorage.getItem('investmentGoals');
      if (savedGoals) {
        const parsedGoals = JSON.parse(savedGoals).map((goal: any) => ({
          ...goal,
          targetDate: new Date(goal.targetDate),
          createdAt: new Date(goal.createdAt)
        }));
        
        const goalsWithoutAllocations = parsedGoals.filter((goal: Goal) => !goal.allocatedInvestments);
        if (goalsWithoutAllocations.length > 0) {
          console.log('🔄 Found goals without allocations after update:', goalsWithoutAllocations.map((g: any) => g.name));
          calculateAutomaticAllocation(parsedGoals);
        }
      }
    };

    window.addEventListener('goals-updated', handleGoalsUpdated);
    return () => window.removeEventListener('goals-updated', handleGoalsUpdated);
  }, []);

  // NEW: Check for missing allocations every 2 seconds (workaround for external saves)
  useEffect(() => {
    const interval = setInterval(() => {
      const currentGoals = goals;
      const goalsWithoutAllocations = currentGoals.filter((goal: Goal) => !goal.allocatedInvestments);
      if (goalsWithoutAllocations.length > 0) {
        console.log('🔄 Periodic check: Found goals without allocations:', goalsWithoutAllocations.map((g: any) => g.name));
        calculateAutomaticAllocation(currentGoals);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [goals]);

  useEffect(() => {
    loadGoals();
  }, []);

  // NEW: Form validation function
  const validateForm = (): boolean => {
    const errors: {[key: string]: string} = {};
    
    if (!formData.name.trim()) {
      errors.name = 'Goal name is required';
    }
    
    if (!formData.targetAmount || Number(formData.targetAmount) <= 0) {
      errors.targetAmount = 'Target amount must be greater than 0';
    }
    
    if (!formData.targetDate) {
      errors.targetDate = 'Target date is required';
    } else {
      const targetDate = new Date(formData.targetDate);
      const today = new Date();
      if (targetDate <= today) {
        errors.targetDate = 'Target date must be in the future';
      }
    }
    
    if (Number(formData.currentProgress) < 0) {
      errors.currentProgress = 'Current progress cannot be negative';
    }
    
    if (Number(formData.currentProgress) > Number(formData.targetAmount)) {
      errors.currentProgress = 'Current progress cannot exceed target amount';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // NEW: Check if goal is completed
  const checkGoalCompletion = (goal: Goal): boolean => {
    return goal.currentProgress >= goal.targetAmount;
  };

  // NEW: Auto-complete goals when target is reached
  const autoCompleteGoal = (goal: Goal) => {
    if (checkGoalCompletion(goal) && !goal.isCompleted) {
      const updatedGoal = {
        ...goal,
        isCompleted: true,
        completedDate: new Date()
      };
      const updatedGoals = goals.map(g => g.id === goal.id ? updatedGoal : g);
      saveGoals(updatedGoals);
    }
  };

  const loadGoals = () => {
    const savedGoals = localStorage.getItem('investmentGoals');
    if (savedGoals) {
      setGoals(JSON.parse(savedGoals).map((goal: any) => ({
        ...goal,
        targetDate: new Date(goal.targetDate),
        createdAt: new Date(goal.createdAt)
      })));
    }
  };

  // NEW: Enhanced goal saving with guaranteed allocation calculation
  const saveGoals = (newGoals: Goal[]) => {
    console.log('💾 saveGoals called with:', newGoals);
    
    // Always calculate allocations for goals that don't have them
    const goalsWithAllocations = newGoals.map(goal => {
      if (!goal.allocatedInvestments) {
        console.log('🔧 Calculating allocation for goal:', goal.name);
        const timeline = getTimelineCategory(goal.targetDate);
        const suggestion = getGoalAllocationSuggestion(timeline, goal.priority);
        const allocation = calculateBalancedAllocation(goal.targetAmount, suggestion);
        const explanation = generateAllocationExplanation(goal, allocation, timeline, userRiskProfile);
        
        return {
          ...goal,
          allocatedInvestments: allocation,
          allocationExplanation: explanation
        };
      }
      return goal;
    });
    
    // Apply portfolio-level reconciliation
    const reconciledGoals = reconcilePortfolioAllocation(goalsWithAllocations, userRiskProfile);
    
    // Apply risk profile enforcement
    const finalGoals = enforceRiskProfile(reconciledGoals, userRiskProfile);
    
    console.log('💾 Final goals with allocations:', finalGoals);
    
    // Save to localStorage
    localStorage.setItem('investmentGoals', JSON.stringify(finalGoals));
    setGoals(finalGoals);
    
    // Dispatch event for other components
    window.dispatchEvent(new Event('goals-updated'));
  };

  // NEW: Force allocation calculation for all goals (manual trigger)
  const forceAllocationCalculation = () => {
    console.log('🔧 Force allocation calculation triggered');
    const currentGoals = goals;
    const goalsWithAllocations = currentGoals.map(goal => {
      if (!goal.allocatedInvestments) {
        console.log('🔧 Calculating allocation for goal:', goal.name);
        const timeline = getTimelineCategory(goal.targetDate);
        const suggestion = getGoalAllocationSuggestion(timeline, goal.priority);
        const allocation = calculateBalancedAllocation(goal.targetAmount, suggestion);
        const explanation = generateAllocationExplanation(goal, allocation, timeline, userRiskProfile);
        
        return {
          ...goal,
          allocatedInvestments: allocation,
          allocationExplanation: explanation
        };
      }
      return goal;
    });
    
    // Apply portfolio-level reconciliation
    const reconciledGoals = reconcilePortfolioAllocation(goalsWithAllocations, userRiskProfile);
    
    // Apply risk profile enforcement
    const finalGoals = enforceRiskProfile(reconciledGoals, userRiskProfile);
    
    console.log('🔧 Final goals after force calculation:', finalGoals);
    
    // Save to localStorage
    localStorage.setItem('investmentGoals', JSON.stringify(finalGoals));
    setGoals(finalGoals);
  };

  // NEW: Generate allocation explanation with gold/real estate
  const generateAllocationExplanation = (goal: Goal, allocation: PortfolioAllocation, timeline: string, riskProfile: RiskProfile): string => {
    const equityPercentage = ((allocation.stocks + allocation.mutualFunds) / goal.targetAmount) * 100;
    const debtPercentage = ((allocation.debt + allocation.liquid) / goal.targetAmount) * 100;
    const goldPercentage = (allocation.gold / goal.targetAmount) * 100;
    const realEstatePercentage = (allocation.realEstate / goal.targetAmount) * 100;
    
    let explanation = `${goal.name} is a ${timeline} goal, so we allocated `;
    
    if (timeline === 'short-term') {
      explanation += `${debtPercentage.toFixed(0)}% to debt and liquid assets for safety, and ${equityPercentage.toFixed(0)}% to growth assets. `;
    } else if (timeline === 'medium-term') {
      explanation += `${equityPercentage.toFixed(0)}% to growth assets and ${debtPercentage.toFixed(0)}% to stable assets for balance. `;
    } else {
      explanation += `${equityPercentage.toFixed(0)}% to growth assets for long-term appreciation, with ${debtPercentage.toFixed(0)}% in stable assets. `;
    }
    
    // Add diversifier explanations if >10%
    if (goldPercentage > 10) {
      explanation += `We've also allocated ${goldPercentage.toFixed(0)}% to gold for diversification and inflation protection. `;
    }
    
    if (realEstatePercentage > 10) {
      explanation += `We've allocated ${realEstatePercentage.toFixed(0)}% to real estate for portfolio diversification and potential rental income. `;
    }
    
    explanation += `Given your ${riskProfile} risk profile, we've ensured the allocation stays within your comfort zone.`;
    
    return explanation;
  };

  // NEW: Risk profile enforcement hook
  const enforceRiskProfile = (goals: Goal[], riskProfile: RiskProfile): Goal[] => {
    // Aggregate all allocations
    const totalAllocation: PortfolioAllocation = {
      stocks: 0,
      mutualFunds: 0,
      gold: 0,
      realEstate: 0,
      debt: 0,
      liquid: 0
    };

    goals.forEach(goal => {
      if (goal.allocatedInvestments) {
        (Object.keys(totalAllocation) as AssetClass[]).forEach(asset => {
          totalAllocation[asset] += goal.allocatedInvestments![asset];
        });
      }
    });

    const totalAmount = Object.values(totalAllocation).reduce((sum: number, val: number) => sum + val, 0);
    
    // Check risk profile compliance
    const equityPct = (totalAllocation.stocks + totalAllocation.mutualFunds) / totalAmount;
    const debtPct = (totalAllocation.debt + totalAllocation.liquid) / totalAmount;
    
    const thresholds = RISK_PROFILE_THRESHOLDS[riskProfile];
    
    if (equityPct > thresholds.maxEquityPercentage || debtPct < thresholds.minDebtPercentage) {
      // Trigger proportional adjustment using target percentages
      return adjustToRiskProfile(goals, totalAllocation, totalAmount, thresholds, riskProfile);
    }
    
    return goals;
  };

  // NEW: Adjust allocations to maintain risk profile with proportional scaling
  const adjustToRiskProfile = (
    goals: Goal[], 
    totalAllocation: PortfolioAllocation, 
    totalAmount: number, 
    thresholds: typeof RISK_PROFILE_THRESHOLDS.balanced,
    riskProfile: RiskProfile
  ): Goal[] => {
    
    // Calculate diversification allocation (gold + real estate) from remaining percentage
    // Guard against negative percentages in case thresholds overshoot 100%
    const diversificationPercentage = Math.max(
      0,
      1 - thresholds.targetEquityPercentage - thresholds.targetDebtPercentage
    );
    const diversificationPerAsset = diversificationPercentage / 2; // Split between gold and real estate
    
    // Complete target allocation with all asset classes - normalized to avoid overshooting 100%
    const targetAllocation: PortfolioAllocation = {
      stocks: Math.round(totalAmount * thresholds.targetEquityPercentage * 0.6), // 60% of equity
      mutualFunds: Math.round(totalAmount * thresholds.targetEquityPercentage * 0.4), // 40% of equity
      gold: Math.round(totalAmount * diversificationPerAsset), // Dynamic diversification
      realEstate: Math.round(totalAmount * diversificationPerAsset), // Dynamic diversification
      debt: Math.round(totalAmount * thresholds.targetDebtPercentage * 0.6), // 60% of debt
      liquid: Math.round(totalAmount * thresholds.targetDebtPercentage * 0.4) // 40% of debt
    };
    
    // Proportional adjustment logic with proper typing
    return goals.map(goal => {
      if (!goal.allocatedInvestments) return goal;
      
      const goalTotal = Object.values(goal.allocatedInvestments).reduce((sum: number, val: number) => sum + val, 0);
      const factor = goalTotal / totalAmount; // proportional scaling factor
      
      // Adjust goal allocation proportionally with proper typing
      const adjustedAllocation: PortfolioAllocation = {
        stocks: Math.round(targetAllocation.stocks * factor),
        mutualFunds: Math.round(targetAllocation.mutualFunds * factor),
        gold: Math.round(targetAllocation.gold * factor),
        realEstate: Math.round(targetAllocation.realEstate * factor),
        debt: Math.round(targetAllocation.debt * factor),
        liquid: Math.round(targetAllocation.liquid * factor)
      };
      
      // Ensure the adjusted allocation equals the original goal amount
      const adjustedTotal = Object.values(adjustedAllocation).reduce((sum: number, val: number) => sum + val, 0);
      const difference = goalTotal - adjustedTotal;
      
      // Add difference to the largest asset class
      const largestAsset = Object.entries(adjustedAllocation).sort((a, b) => b[1] - a[1])[0][0] as AssetClass;
      adjustedAllocation[largestAsset] += difference;
      
      // Build complete explanation with goal-specific rationale and risk adjustments
      const timeline = getTimelineCategory(goal.targetDate);
      const baseExplanation = generateAllocationExplanation(goal, adjustedAllocation, timeline, riskProfile);
      
      const riskAdjustmentExplanation = ` Your initial allocation exceeded your ${riskProfile} risk profile, so we rebalanced to keep equity at ${thresholds.targetEquityPercentage * 100}% and debt/liquid at ${thresholds.targetDebtPercentage * 100}% as per your ${riskProfile} profile. This ensures your portfolio stays within your comfort zone.`;
      
      const explanation = baseExplanation + riskAdjustmentExplanation;
      
      return { 
        ...goal, 
        allocatedInvestments: adjustedAllocation,
        allocationExplanation: explanation
      };
    });
  };

  // NEW: Automatic allocation calculation engine with risk profile enforcement
  const calculateAutomaticAllocation = (goalsList: Goal[]) => {
    console.log('🔍 calculateAutomaticAllocation called with goals:', goalsList);
    const activeGoals = goalsList.filter(goal => goal.isActive);
    console.log('🔍 Active goals:', activeGoals);
    
    // First pass: Calculate individual goal allocations
    const goalsWithAllocations = activeGoals.map(goal => {
      console.log('🔍 Processing goal:', goal.name, 'has allocatedInvestments:', !!goal.allocatedInvestments);
      
      if (goal.allocatedInvestments) {
        console.log('🔍 Skipping goal with existing allocation:', goal.name);
        return goal; // Skip if already allocated
      }
      
      const timeline = getTimelineCategory(goal.targetDate);
      const suggestion = getGoalAllocationSuggestion(timeline, goal.priority);
      
      console.log('🔍 Goal:', goal.name, 'Timeline:', timeline, 'Priority:', goal.priority, 'Suggestion:', suggestion);
      
      // Calculate allocation with proper rounding (largest asset last as balancing bucket)
      const allocation = calculateBalancedAllocation(goal.targetAmount, suggestion);
      
      console.log('🔍 Calculated allocation for', goal.name, ':', allocation);
      
      // Generate explanation
      const explanation = generateAllocationExplanation(goal, allocation, timeline, userRiskProfile);
      
      return { 
        ...goal, 
        allocatedInvestments: allocation,
        allocationExplanation: explanation
      };
    });
    
    console.log('🔍 Goals with allocations:', goalsWithAllocations);
    
    // Second pass: Portfolio-level reconciliation with risk profile
    const reconciledGoals = reconcilePortfolioAllocation(goalsWithAllocations, userRiskProfile);
    
    // Third pass: Risk profile enforcement
    const enforcedGoals = enforceRiskProfile(reconciledGoals, userRiskProfile);
    
    // Fourth pass: Update all goals with final allocations
    const updatedGoalsList = goalsList.map(goal => {
      const enforcedGoal = enforcedGoals.find(g => g.id === goal.id);
      return enforcedGoal || goal;
    });
    
    console.log('🔍 Final updated goals list:', updatedGoalsList);
    
    // Save the updated goals
    localStorage.setItem('investmentGoals', JSON.stringify(updatedGoalsList));
    setGoals(updatedGoalsList);
  };

  // NEW: Calculate balanced allocation to avoid rounding drift
  const calculateBalancedAllocation = (targetAmount: number, suggestion: PortfolioAllocation): PortfolioAllocation => {
    const assets = Object.entries(suggestion).sort((a, b) => b[1] - a[1]); // Sort by percentage descending
    const allocation: any = {};
    let remainingAmount = targetAmount;
    
    // Allocate all assets except the largest one
    for (let i = 0; i < assets.length - 1; i++) {
      const [asset, percentage] = assets[i];
      const amount = Math.round(targetAmount * percentage);
      allocation[asset] = amount;
      remainingAmount -= amount;
    }
    
    // Use the largest asset as balancing bucket
    const largestAsset = assets[assets.length - 1][0];
    allocation[largestAsset] = remainingAmount;
    
    return allocation;
  };

  // NEW: Portfolio-level reconciliation with risk profile
  const reconcilePortfolioAllocation = (goalsWithAllocations: Goal[], riskProfile: RiskProfile): Goal[] => {
    // Aggregate all allocations
    const totalAllocation = {
      stocks: 0,
      mutualFunds: 0,
      gold: 0,
      realEstate: 0,
      debt: 0,
      liquid: 0
    };
    
    goalsWithAllocations.forEach(goal => {
      if (goal.allocatedInvestments) {
        totalAllocation.stocks += goal.allocatedInvestments.stocks;
        totalAllocation.mutualFunds += goal.allocatedInvestments.mutualFunds;
        totalAllocation.gold += goal.allocatedInvestments.gold;
        totalAllocation.realEstate += goal.allocatedInvestments.realEstate;
        totalAllocation.debt += goal.allocatedInvestments.debt;
        totalAllocation.liquid += goal.allocatedInvestments.liquid;
      }
    });
    
    const totalAmount = Object.values(totalAllocation).reduce((sum: number, val: number) => sum + val, 0);
    
    // Check if portfolio is too skewed based on risk profile
    const equityPercentage = (totalAllocation.stocks + totalAllocation.mutualFunds) / totalAmount;
    const debtPercentage = (totalAllocation.debt + totalAllocation.liquid) / totalAmount;
    
    const thresholds = RISK_PROFILE_THRESHOLDS[riskProfile];
    
    if (equityPercentage > thresholds.maxEquityPercentage || debtPercentage < thresholds.minDebtPercentage) {
      // Apply risk adjustment
      return adjustToRiskProfile(goalsWithAllocations, totalAllocation, totalAmount, thresholds, riskProfile);
    }
    
    return goalsWithAllocations;
  };

  // NEW: Calculate overall portfolio allocation from all goals
  const calculateOverallPortfolioAllocation = (): PortfolioAllocation => {
    const activeGoals = goals.filter(goal => goal.isActive && goal.allocatedInvestments);
    
    const totalAllocation = {
      stocks: 0,
      mutualFunds: 0,
      gold: 0,
      realEstate: 0,
      debt: 0,
      liquid: 0
    };
    
    activeGoals.forEach(goal => {
      if (goal.allocatedInvestments) {
        totalAllocation.stocks += goal.allocatedInvestments.stocks;
        totalAllocation.mutualFunds += goal.allocatedInvestments.mutualFunds;
        totalAllocation.gold += goal.allocatedInvestments.gold;
        totalAllocation.realEstate += goal.allocatedInvestments.realEstate;
        totalAllocation.debt += goal.allocatedInvestments.debt;
        totalAllocation.liquid += goal.allocatedInvestments.liquid;
      }
    });
    
    return totalAllocation;
  };

  // NEW: Get portfolio recommendations
  const getPortfolioRecommendations = () => {
    const currentPortfolio = portfolioData;
    const recommendedAllocation = calculateOverallPortfolioAllocation();
    const totalRecommended = Object.values(recommendedAllocation).reduce((sum, val) => sum + val, 0);
    
    const recommendations: any[] = [];
    
    // Calculate gaps and recommendations
    Object.entries(recommendedAllocation).forEach(([asset, recommended]) => {
      const current = currentPortfolio[asset as keyof PortfolioAllocation];
      const gap = recommended - current;
      
      if (gap > 0) {
        recommendations.push({
          asset,
          action: 'increase',
          amount: gap,
          percentage: Math.round((gap / totalRecommended) * 100)
        });
      } else if (gap < 0) {
        recommendations.push({
          asset,
          action: 'decrease',
          amount: Math.abs(gap),
          percentage: Math.round((Math.abs(gap) / totalRecommended) * 100)
        });
      }
    });
    
    return recommendations;
  };

  const handlePredefinedGoal = (predefinedGoal: typeof PREDEFINED_GOALS[0]) => {
    const targetDate = new Date();
    targetDate.setFullYear(targetDate.getFullYear() + predefinedGoal.defaultYears);
    
    const newGoal: Goal = {
      id: `${predefinedGoal.id}_${Date.now()}`,
      name: predefinedGoal.name,
      category: predefinedGoal.category,
      targetAmount: predefinedGoal.defaultAmount,
      targetDate: targetDate,
      priority: 'medium',
      currentProgress: 0,
      isActive: true,
      createdAt: new Date()
    };
    
    saveGoals([...goals, newGoal]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      console.log('🎯 handleSubmit called with formData:', formData);
      
      if (editingGoal) {
        console.log('🔄 Editing existing goal:', editingGoal.name);
        const updatedGoals = goals.map(goal => 
          goal.id === editingGoal.id 
            ? { 
                ...goal, 
                ...formData, 
                targetAmount: Number(formData.targetAmount), 
                targetDate: new Date(formData.targetDate), 
                currentProgress: Number(formData.currentProgress),
                notes: formData.notes
              }
            : goal
        );
        console.log('🔄 Updated goals:', updatedGoals);
        saveGoals(updatedGoals);
        setEditingGoal(null);
      } else {
        console.log('➕ Creating new goal');
        const newGoal: Goal = {
          id: Date.now().toString(),
          ...formData,
          targetAmount: Number(formData.targetAmount),
          targetDate: new Date(formData.targetDate),
          currentProgress: Number(formData.currentProgress),
          notes: formData.notes,
          createdAt: new Date()
        };
        console.log('➕ New goal created:', newGoal);
        console.log('➕ Current goals before adding:', goals);
        saveGoals([...goals, newGoal]);
      }
      
      resetForm();
    } catch (error) {
      console.error('Error saving goal:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      category: 'retirement',
      targetAmount: '',
      targetDate: '',
      priority: 'medium',
      isActive: true,
      currentProgress: 0,
      notes: ''
    });
    setFormErrors({});
    setIsFormOpen(false);
    setIsCustomFormOpen(false);
  };

  const editGoal = (goal: Goal) => {
    setEditingGoal(goal);
    setFormData({
      name: goal.name,
      category: goal.category,
      targetAmount: goal.targetAmount.toString(),
      targetDate: goal.targetDate.toISOString().split('T')[0],
      priority: goal.priority,
      isActive: goal.isActive,
      currentProgress: goal.currentProgress,
      notes: goal.notes || ''
    });
    setIsFormOpen(true);
  };

  const openProgressForm = (goal: Goal) => {
    setSelectedGoalForProgress(goal);
    setProgressData({
      currentAmount: goal.currentProgress.toString(),
      notes: ''
    });
    setIsProgressFormOpen(true);
  };

  const handleProgressUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedGoalForProgress) {
      const newProgress = Number(progressData.currentAmount);
      const updatedGoals = goals.map(goal => 
        goal.id === selectedGoalForProgress.id 
          ? { ...goal, currentProgress: newProgress }
          : goal
      );
      saveGoals(updatedGoals);
      
      // Check if goal is completed
      const updatedGoal = updatedGoals.find(g => g.id === selectedGoalForProgress.id);
      if (updatedGoal && checkGoalCompletion(updatedGoal)) {
        autoCompleteGoal(updatedGoal);
      }
      
      setIsProgressFormOpen(false);
      setSelectedGoalForProgress(null);
      setProgressData({ currentAmount: '', notes: '' });
    }
  };

  // NEW: Generate milestones for a goal
  const generateMilestones = (goal: Goal) => {
    const milestones = [];
    const totalMilestones = 5;
    
    for (let i = 1; i <= totalMilestones; i++) {
      const milestoneAmount = (goal.targetAmount / totalMilestones) * i;
      const isReached = goal.currentProgress >= milestoneAmount;
      
      milestones.push({
        id: `${goal.id}_milestone_${i}`,
        name: `${i * 20}% Complete`,
        targetAmount: milestoneAmount,
        isReached,
        reachedDate: isReached ? new Date() : undefined
      });
    }
    
    return milestones;
  };

  // NEW: Update goal with milestones
  const updateGoalWithMilestones = (goal: Goal) => {
    const milestones = generateMilestones(goal);
    const updatedGoal = { ...goal, milestones };
    const updatedGoals = goals.map(g => g.id === goal.id ? updatedGoal : g);
    saveGoals(updatedGoals);
  };

  const openAllocationForm = (goal: Goal) => {
    setSelectedGoalForAllocation(goal);
    if (goal.allocatedInvestments) {
      setAllocationData({
        stocks: goal.allocatedInvestments.stocks.toString(),
        mutualFunds: goal.allocatedInvestments.mutualFunds.toString(),
        gold: goal.allocatedInvestments.gold.toString(),
        realEstate: goal.allocatedInvestments.realEstate.toString(),
        debt: goal.allocatedInvestments.debt.toString(),
        liquid: goal.allocatedInvestments.liquid.toString()
      });
    } else {
      // Suggest allocation based on timeline
      const timeline = getTimelineCategory(goal.targetDate);
      const suggestion = getGoalAllocationSuggestion(timeline, goal.priority);
      setAllocationData({
        stocks: Math.round(goal.targetAmount * suggestion.stocks).toString(),
        mutualFunds: Math.round(goal.targetAmount * suggestion.mutualFunds).toString(),
        gold: Math.round(goal.targetAmount * suggestion.gold).toString(),
        realEstate: Math.round(goal.targetAmount * suggestion.realEstate).toString(),
        debt: Math.round(goal.targetAmount * suggestion.debt).toString(),
        liquid: Math.round(goal.targetAmount * suggestion.liquid).toString()
      });
    }
    setIsAllocationFormOpen(true);
  };

  const handleAllocationUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedGoalForAllocation) {
      const allocatedInvestments = {
        stocks: Number(allocationData.stocks),
        mutualFunds: Number(allocationData.mutualFunds),
        gold: Number(allocationData.gold),
        realEstate: Number(allocationData.realEstate),
        debt: Number(allocationData.debt),
        liquid: Number(allocationData.liquid)
      };

      const updatedGoals = goals.map(goal => 
        goal.id === selectedGoalForAllocation.id 
          ? { ...goal, allocatedInvestments }
          : goal
      );
      saveGoals(updatedGoals);
      setIsAllocationFormOpen(false);
      setSelectedGoalForAllocation(null);
      setAllocationData({ stocks: '', mutualFunds: '', gold: '', realEstate: '', debt: '', liquid: '' });
    }
  };

  const deleteGoal = (goalId: string) => {
    if (confirm('Are you sure you want to delete this goal?')) {
      saveGoals(goals.filter(goal => goal.id !== goalId));
    }
  };

  const toggleGoalStatus = (goalId: string) => {
    const updatedGoals = goals.map(goal => 
      goal.id === goalId ? { ...goal, isActive: !goal.isActive } : goal
    );
    saveGoals(updatedGoals);
  };

  const getTimelineCategory = (targetDate: Date): string => {
    const yearsToTarget = (targetDate.getTime() - new Date().getTime()) / (1000 * 3600 * 24 * 365.25);
    if (yearsToTarget < 5) return 'short-term';
    if (yearsToTarget <= 10) return 'medium-term';
    return 'long-term';
  };

  const getPriorityColor = (priority: string): string => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getTimelineColor = (timeline: string): string => {
    switch (timeline) {
      case 'short-term': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'medium-term': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'long-term': return 'bg-indigo-100 text-indigo-800 border-indigo-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getProgressPercentage = (current: number, target: number): number => {
    return Math.min(Math.round((current / target) * 100), 100);
  };

  const getProgressColor = (percentage: number): string => {
    if (percentage >= 80) return 'bg-green-500';
    if (percentage >= 60) return 'bg-blue-500';
    if (percentage >= 40) return 'bg-yellow-500';
    if (percentage >= 20) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (date: Date): string => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).format(date);
  };

  const activeGoals = goals.filter(goal => goal.isActive);
  const totalTargetAmount = activeGoals.reduce((sum, goal) => sum + goal.targetAmount, 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="container mx-auto p-6 max-w-7xl">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Investment Goals</h1>
          <div className="flex gap-2">
            <Button 
              onClick={() => {
                console.log('🔧 Manual allocation trigger clicked');
                console.log('🔧 Current goals:', goals);
                console.log('🔧 Goals without allocations:', goals.filter(g => !g.allocatedInvestments));
                forceAllocationCalculation();
              }}
              variant="outline"
              size="sm"
            >
              🔧 Debug: Calculate Allocations
            </Button>
            <Button onClick={() => setIsFormOpen(true)} size="sm">
              Add Goal
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <Card className="bg-white shadow-lg border-0">
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-blue-100 rounded-full">
                  <Target className="h-8 w-8 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Goals</p>
                  <p className="text-3xl font-bold text-gray-900">{goals.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-lg border-0">
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-green-100 rounded-full">
                  <CheckCircle className="h-8 w-8 text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Active Goals</p>
                  <p className="text-3xl font-bold text-gray-900">{activeGoals.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-lg border-0">
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-purple-100 rounded-full">
                  <DollarSign className="h-8 w-8 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Target</p>
                  <p className="text-3xl font-bold text-gray-900">{formatCurrency(totalTargetAmount)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* NEW: Portfolio Plan Section */}
        {activeGoals.length > 0 && (
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Portfolio Plan</h2>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Recommended Allocation */}
              <Card className="bg-white shadow-lg border-0">
                <CardHeader>
                  <CardTitle className="text-xl flex items-center space-x-2">
                    <TrendingUp className="h-6 w-6 text-green-600" />
                    <span>Recommended Allocation</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {(() => {
                    const recommendedAllocation = calculateOverallPortfolioAllocation();
                    const totalRecommended = Object.values(recommendedAllocation).reduce((sum: number, val: number) => sum + val, 0);
                    
                    return (
                      <div className="space-y-4">
                        {Object.entries(recommendedAllocation).map(([asset, amount]) => {
                          const percentage = totalRecommended > 0 ? (amount / totalRecommended) * 100 : 0;
                          return (
                            <div key={asset} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                              <div className="flex items-center space-x-3">
                                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                                <span className="font-medium capitalize">{asset.replace(/([A-Z])/g, ' $1').trim()}</span>
                              </div>
                              <div className="text-right">
                                <div className="font-semibold">{formatCurrency(amount)}</div>
                                <div className="text-sm text-gray-600">{percentage.toFixed(1)}%</div>
                              </div>
                            </div>
                          );
                        })}
                        <div className="pt-4 border-t border-gray-200">
                          <div className="flex justify-between items-center font-bold text-lg">
                            <span>Total Recommended</span>
                            <span>{formatCurrency(totalRecommended)}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </CardContent>
              </Card>

              {/* Portfolio Recommendations */}
              <Card className="bg-white shadow-lg border-0">
                <CardHeader>
                  <CardTitle className="text-xl flex items-center space-x-2">
                    <Zap className="h-6 w-6 text-orange-600" />
                    <span>Portfolio Recommendations</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {(() => {
                    const recommendations = getPortfolioRecommendations();
                    
                    if (recommendations.length === 0) {
                      return (
                        <div className="text-center py-8">
                          <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                          <p className="text-gray-600">Your portfolio is well-aligned with your goals!</p>
                        </div>
                      );
                    }
                    
                    return (
                      <div className="space-y-3">
                        {recommendations.slice(0, 5).map((rec, index) => (
                          <div key={index} className={`flex items-center justify-between p-3 rounded-lg ${
                            rec.action === 'increase' ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
                          }`}>
                            <div className="flex items-center space-x-3">
                              <div className={`w-3 h-3 rounded-full ${
                                rec.action === 'increase' ? 'bg-green-500' : 'bg-red-500'
                              }`}></div>
                              <span className="font-medium capitalize">{rec.asset.replace(/([A-Z])/g, ' $1').trim()}</span>
                            </div>
                            <div className="text-right">
                              <div className={`font-semibold ${
                                rec.action === 'increase' ? 'text-green-700' : 'text-red-700'
                              }`}>
                                {rec.action === 'increase' ? '+' : '-'}{formatCurrency(rec.amount)}
                              </div>
                              <div className="text-sm text-gray-600">{rec.percentage}% of total</div>
                            </div>
                          </div>
                        ))}
                        {recommendations.length > 5 && (
                          <div className="text-center py-2 text-sm text-gray-600">
                            +{recommendations.length - 5} more recommendations
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Pre-defined Goals Section */}
        {goals.length === 0 && (
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">Choose from Common Goals</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {PREDEFINED_GOALS.map((predefinedGoal) => {
                const IconComponent = predefinedGoal.icon;
                return (
                  <Card 
                    key={predefinedGoal.id} 
                    className="bg-white shadow-lg border-0 hover:shadow-xl transition-all duration-300 cursor-pointer group"
                    onClick={() => handlePredefinedGoal(predefinedGoal)}
                  >
                    <CardContent className="p-6">
                      <div className="text-center">
                        <div className={`inline-flex p-4 rounded-full bg-gradient-to-r ${predefinedGoal.color} mb-4 group-hover:scale-110 transition-transform duration-300`}>
                          <IconComponent className="h-8 w-8 text-white" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">{predefinedGoal.name}</h3>
                        <p className="text-gray-600 text-sm mb-4">{predefinedGoal.description}</p>
                        <div className="space-y-2 text-sm text-gray-500">
                          <div className="flex justify-between">
                            <span>Target Amount:</span>
                            <span className="font-semibold">{formatCurrency(predefinedGoal.defaultAmount)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Timeline:</span>
                            <span className="font-semibold">{predefinedGoal.defaultYears} years</span>
                          </div>
                        </div>
                        <Button className="w-full mt-4 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white border-0">
                          <Plus className="h-4 w-4 mr-2" />
                          Add This Goal
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
            
            <div className="text-center mt-8">
              <p className="text-gray-600 mb-4">Don't see what you're looking for?</p>
              <Button 
                onClick={() => setIsCustomFormOpen(true)}
                variant="outline"
                className="border-2 border-gray-300 hover:border-gray-400"
              >
                <Zap className="h-4 w-4 mr-2" />
                Create Custom Goal
              </Button>
            </div>
          </div>
        )}

        {/* Action Bar */}
        {goals.length > 0 && (
          <div className="flex justify-between items-center mb-8">
            <div className="flex space-x-3">
              <Button
                onClick={() => setIsCustomFormOpen(true)}
                className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white border-0 shadow-lg"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Custom Goal
              </Button>
            </div>
            
            <div className="text-sm text-gray-600 bg-green-50 px-4 py-2 rounded-full border border-green-200">
              <CheckCircle className="h-4 w-4 mr-2 text-green-600 inline" />
              {activeGoals.length} goal{activeGoals.length !== 1 ? 's' : ''} will influence your portfolio allocation
            </div>
          </div>
        )}

        {/* Goals List */}
        {goals.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {goals.map((goal) => {
              const timeline = getTimelineCategory(goal.targetDate);
              const progressPercentage = getProgressPercentage(goal.currentProgress, goal.targetAmount);
              const progressColor = getProgressColor(progressPercentage);
              
              // NEW: Calculate portfolio-based progress
              const portfolioProgress = calculateGoalProgressFromPortfolio(goal, portfolioData, totalPortfolioValue);
              const hasAllocation = goal.allocatedInvestments && Object.values(goal.allocatedInvestments).some(val => val > 0);
              
              return (
                <Card key={goal.id} className={`bg-white shadow-lg border-0 ${!goal.isActive ? 'opacity-60' : ''} hover:shadow-xl transition-all duration-300`}>
                  <CardHeader className="pb-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <CardTitle className="text-xl flex items-center space-x-3 mb-3">
                          <span className="text-gray-900">{goal.name}</span>
                          {!goal.isActive && (
                            <Badge variant="secondary" className="bg-gray-100 text-gray-600 border-gray-200">
                              Inactive
                            </Badge>
                          )}
                        </CardTitle>
                        <div className="flex flex-wrap gap-2 mb-4">
                          <Badge className={`${getPriorityColor(goal.priority)} border-0`}>
                            <Star className="h-3 w-3 mr-1" />
                            {goal.priority}
                          </Badge>
                          <Badge className={`${getTimelineColor(timeline)} border-0`}>
                            <Clock className="h-3 w-3 mr-1" />
                            {timeline}
                          </Badge>
                          {hasAllocation && (
                            <Badge className="bg-green-100 text-green-800 border-green-200">
                              Portfolio Linked
                            </Badge>
                          )}
                        </div>

                        {/* Progress Section */}
                        <div className="mb-4">
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-sm font-medium text-gray-700">Manual Progress</span>
                            <span className="text-sm font-bold text-gray-900">{progressPercentage}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2.5">
                            <div 
                              className={`h-2.5 rounded-full ${progressColor} transition-all duration-300`}
                              style={{ width: `${progressPercentage}%` }}
                            ></div>
                          </div>
                          <div className="flex justify-between items-center mt-2 text-sm text-gray-600">
                            <span>₹{formatCurrency(goal.currentProgress).replace('₹', '')}</span>
                            <span>₹{formatCurrency(goal.targetAmount).replace('₹', '')}</span>
                          </div>
                        </div>

                        {/* NEW: Portfolio Progress Section */}
                        {hasAllocation && (
                          <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                            <div className="flex justify-between items-center mb-2">
                              <span className="text-sm font-medium text-blue-700">Portfolio Progress</span>
                              <span className="text-sm font-bold text-blue-900">{Math.round(portfolioProgress.progress)}%</span>
                            </div>
                            <div className="w-full bg-blue-200 rounded-full h-2.5">
                              <div 
                                className="h-2.5 rounded-full bg-blue-500 transition-all duration-300"
                                style={{ width: `${portfolioProgress.progress}%` }}
                              ></div>
                            </div>
                            <div className="text-xs text-blue-600 mt-2">
                              Funded by: {Object.entries(portfolioProgress.breakdown)
                                .filter(([_, amount]) => amount > 0)
                                .map(([asset, amount]) => `${asset}: ₹${formatCurrency(amount).replace('₹', '')}`)
                                .join(', ')}
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openAllocationForm(goal)}
                          className="border-purple-300 text-purple-600 hover:border-purple-400"
                          title="Set Portfolio Allocation"
                        >
                          <Target className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openProgressForm(goal)}
                          className="border-blue-300 text-blue-600 hover:border-blue-400"
                          title="Update Progress"
                        >
                          <TrendingUp className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => editGoal(goal)}
                          className="border-gray-300 hover:border-gray-400"
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => toggleGoalStatus(goal.id)}
                          className={goal.isActive ? 'border-yellow-300 text-yellow-600 hover:border-yellow-400' : 'border-green-300 text-green-600 hover:border-green-400'}
                        >
                          {goal.isActive ? <XCircle className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => deleteGoal(goal.id)}
                          className="border-red-300 text-red-600 hover:border-red-400"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                        <DollarSign className="h-5 w-5 text-gray-600" />
                        <span className="text-sm text-gray-600">Target Amount:</span>
                        <span className="font-semibold text-gray-900">{formatCurrency(goal.targetAmount)}</span>
                      </div>
                      
                      <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                        <Calendar className="h-5 w-5 text-gray-600" />
                        <span className="text-sm text-gray-600">Target Date:</span>
                        <span className="font-semibold text-gray-900">{formatDate(goal.targetDate)}</span>
                      </div>
                      
                      <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                        <Target className="h-5 w-5 text-gray-600" />
                        <span className="text-sm text-gray-600">Category:</span>
                        <span className="font-semibold text-gray-900 capitalize">{goal.category.replace('_', ' ')}</span>
                      </div>

                      {/* NEW: Portfolio Allocation Summary */}
                      {hasAllocation && (
                        <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                          <div className="text-sm font-medium text-purple-700 mb-2">Portfolio Allocation</div>
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            {Object.entries(goal.allocatedInvestments!).map(([asset, amount]) => 
                              amount > 0 ? (
                                <div key={asset} className="flex justify-between">
                                  <span className="text-purple-600 capitalize">{asset.replace(/([A-Z])/g, ' $1').trim()}:</span>
                                  <span className="font-medium">{formatCurrency(amount)}</span>
                                </div>
                              ) : null
                            )}
                          </div>
                          
                          {/* NEW: Allocation Explanation */}
                          {goal.allocationExplanation && (
                            <div className="mt-3 pt-3 border-t border-purple-200">
                              <div className="text-xs text-purple-600 font-medium mb-1">Why this allocation?</div>
                              <div className="text-xs text-purple-700 leading-relaxed">
                                {goal.allocationExplanation}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* NEW: Portfolio Allocation Form */}
        {isAllocationFormOpen && selectedGoalForAllocation && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <Card className="w-full max-w-2xl bg-white shadow-2xl border-0">
              <CardHeader className="pb-4">
                <CardTitle className="text-xl">Set Portfolio Allocation</CardTitle>
                <p className="text-sm text-gray-600">
                  Define how much of your portfolio should be allocated to: {selectedGoalForAllocation.name}
                </p>
                <p className="text-sm text-gray-500">
                  Target: {formatCurrency(selectedGoalForAllocation.targetAmount)} | 
                  Timeline: {getTimelineCategory(selectedGoalForAllocation.targetDate)}
                </p>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleAllocationUpdate} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Stocks (₹)</label>
                      <Input
                        type="number"
                        value={allocationData.stocks}
                        onChange={(e) => setAllocationData({ ...allocationData, stocks: e.target.value })}
                        placeholder="0"
                        className="border-gray-300 focus:border-purple-500 focus:ring-purple-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Mutual Funds (₹)</label>
                      <Input
                        type="number"
                        value={allocationData.mutualFunds}
                        onChange={(e) => setAllocationData({ ...allocationData, mutualFunds: e.target.value })}
                        placeholder="0"
                        className="border-gray-300 focus:border-purple-500 focus:ring-purple-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Gold (₹)</label>
                      <Input
                        type="number"
                        value={allocationData.gold}
                        onChange={(e) => setAllocationData({ ...allocationData, gold: e.target.value })}
                        placeholder="0"
                        className="border-gray-300 focus:border-purple-500 focus:ring-purple-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Real Estate (₹)</label>
                      <Input
                        type="number"
                        value={allocationData.realEstate}
                        onChange={(e) => setAllocationData({ ...allocationData, realEstate: e.target.value })}
                        placeholder="0"
                        className="border-gray-300 focus:border-purple-500 focus:ring-purple-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Debt (₹)</label>
                      <Input
                        type="number"
                        value={allocationData.debt}
                        onChange={(e) => setAllocationData({ ...allocationData, debt: e.target.value })}
                        placeholder="0"
                        className="border-gray-300 focus:border-purple-500 focus:ring-purple-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Liquid (₹)</label>
                      <Input
                        type="number"
                        value={allocationData.liquid}
                        onChange={(e) => setAllocationData({ ...allocationData, liquid: e.target.value })}
                        placeholder="0"
                        className="border-gray-300 focus:border-purple-500 focus:ring-purple-500"
                      />
                    </div>
                  </div>

                  <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                    <div className="text-sm text-purple-700">
                      <strong>Total Allocated:</strong> ₹{Object.values(allocationData).reduce((sum, val) => sum + (Number(val) || 0), 0).toLocaleString()}
                      {selectedGoalForAllocation && (
                        <span className="ml-2">
                          ({Math.round((Object.values(allocationData).reduce((sum, val) => sum + (Number(val) || 0), 0) / selectedGoalForAllocation.targetAmount) * 100)}% of target)
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex space-x-3 pt-4">
                    <Button type="submit" className="flex-1 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white border-0 shadow-lg">
                      Set Allocation
                    </Button>
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => {
                        setIsAllocationFormOpen(false);
                        setSelectedGoalForAllocation(null);
                        setAllocationData({ stocks: '', mutualFunds: '', gold: '', realEstate: '', debt: '', liquid: '' });
                      }} 
                      className="flex-1 border-gray-300 hover:border-gray-400"
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Progress Update Form */}
        {isProgressFormOpen && selectedGoalForProgress && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <Card className="w-full max-w-md bg-white shadow-2xl border-0">
              <CardHeader className="pb-4">
                <CardTitle className="text-xl">Update Progress</CardTitle>
                <p className="text-sm text-gray-600">Update your progress for: {selectedGoalForProgress.name}</p>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleProgressUpdate} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Current Amount Saved (₹)</label>
                    <Input
                      type="number"
                      value={progressData.currentAmount}
                      onChange={(e) => setProgressData({ ...progressData, currentAmount: e.target.value })}
                      placeholder="500000"
                      className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                      required
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Target: {formatCurrency(selectedGoalForProgress.targetAmount)}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Notes (Optional)</label>
                    <Input
                      value={progressData.notes}
                      onChange={(e) => setProgressData({ ...progressData, notes: e.target.value })}
                      placeholder="e.g., Bonus received, investment gains"
                      className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>

                  <div className="flex space-x-3 pt-4">
                    <Button type="submit" className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white border-0 shadow-lg">
                      Update Progress
                    </Button>
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => {
                        setIsProgressFormOpen(false);
                        setSelectedGoalForProgress(null);
                        setProgressData({ currentAmount: '', notes: '' });
                      }} 
                      className="flex-1 border-gray-300 hover:border-gray-400"
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Add/Edit Goal Form */}
        {(isFormOpen || isCustomFormOpen) && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <Card className="w-full max-w-md bg-white shadow-2xl border-0">
              <CardHeader className="pb-4">
                <CardTitle className="text-xl">{editingGoal ? 'Edit Goal' : 'Create Custom Goal'}</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Goal Name</label>
                    <Input
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g., Retirement Fund, Home Down Payment"
                      className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                      required
                    />
                    {formErrors.name && <p className="text-xs text-red-500 mt-1">{formErrors.name}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                    <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value as Goal['category'] })}>
                      <SelectTrigger className="border-gray-300 focus:border-blue-500 focus:ring-blue-500">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="retirement">Retirement</SelectItem>
                        <SelectItem value="home_purchase">Home Purchase</SelectItem>
                        <SelectItem value="child_education">Child Education</SelectItem>
                        <SelectItem value="emergency_fund">Emergency Fund</SelectItem>
                        <SelectItem value="wealth_building">Wealth Building</SelectItem>
                        <SelectItem value="custom">Custom</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Target Amount (₹)</label>
                    <Input
                      type="number"
                      value={formData.targetAmount}
                      onChange={(e) => setFormData({ ...formData, targetAmount: e.target.value })}
                      placeholder="1000000"
                      className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                      required
                    />
                    {formErrors.targetAmount && <p className="text-xs text-red-500 mt-1">{formErrors.targetAmount}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Current Progress (₹)</label>
                    <Input
                      type="number"
                      value={formData.currentProgress}
                      onChange={(e) => setFormData({ ...formData, currentProgress: Number(e.target.value) })}
                      placeholder="0"
                      className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                      required
                    />
                    {formErrors.currentProgress && <p className="text-xs text-red-500 mt-1">{formErrors.currentProgress}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Target Date</label>
                    <Input
                      type="date"
                      value={formData.targetDate}
                      onChange={(e) => setFormData({ ...formData, targetDate: e.target.value })}
                      className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                      required
                    />
                    {formErrors.targetDate && <p className="text-xs text-red-500 mt-1">{formErrors.targetDate}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
                    <Select value={formData.priority} onValueChange={(value) => setFormData({ ...formData, priority: value as Goal['priority'] })}>
                      <SelectTrigger className="border-gray-300 focus:border-blue-500 focus:ring-blue-500">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                    <input
                      type="checkbox"
                      id="isActive"
                      checked={formData.isActive}
                      onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <label htmlFor="isActive" className="text-sm text-gray-700 font-medium">Active Goal</label>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Notes (Optional)</label>
                    <textarea
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      placeholder="Add any notes about this goal..."
                      className="w-full p-2 border border-gray-300 rounded focus:border-blue-500 focus:ring-blue-500"
                      rows={3}
                    />
                  </div>

                  <div className="flex space-x-3 pt-4">
                    <Button 
                      type="submit" 
                      className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white border-0 shadow-lg"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? 'Saving...' : (editingGoal ? 'Update Goal' : 'Create Goal')}
                    </Button>
                    <Button type="button" variant="outline" onClick={resetForm} className="flex-1 border-gray-300 hover:border-gray-400">
                      Cancel
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
