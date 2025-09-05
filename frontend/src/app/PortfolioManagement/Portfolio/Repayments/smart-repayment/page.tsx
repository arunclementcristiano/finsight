"use client";
import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "../../../../components/Card";
import { Button } from "../../../../components/Button";
import { Input } from "../../../../components/Input";
import { Label } from "../../../../components/Label";
import { useSmartRepaymentCalculation, validateRepaymentForm } from "../hooks/useSmartRepaymentCalculation";
import { fetchRepayments } from "../../../../../lib/repayments";
import { LoanEngine } from "../../../domain/Repaymentadvisor/repaymentEngine";
import { 
  Calculator, 
  Sparkles, 
  TrendingUp, 
  Target, 
  Calendar, 
  DollarSign,
  Clock,
  CheckCircle,
  ArrowRight,
  Banknote,
  PiggyBank,
  Zap,
  Star,
  AlertCircle,
  Info,
  BarChart3,
  Timer,
  Crown,
  Coins,
  ArrowLeft,
  ArrowDown,
  ArrowUp
} from "lucide-react";

interface KPICardProps {
  icon: React.ReactNode;
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: "up" | "down" | "neutral";
  variant?: "default" | "success" | "warning" | "info";
}

const KPICard: React.FC<KPICardProps> = ({ 
  icon, 
  title, 
  value, 
  subtitle, 
  trend,
  variant = "default" 
}) => {
  const variantClasses = {
    default: "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900",
    success: "border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/50",
    warning: "border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/50",
    info: "border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/50"
  };

  const iconColors = {
    default: "text-gray-600 dark:text-gray-400",
    success: "text-green-600 dark:text-green-400",
    warning: "text-amber-600 dark:text-amber-400",
    info: "text-blue-600 dark:text-blue-400"
  };

  return (
    <div className={`rounded-xl border p-6 transition-all hover:shadow-md ${variantClasses[variant]}`}>
      <div className="flex items-start justify-between mb-4">
        <div className={`p-3 rounded-lg ${variant === 'success' ? 'bg-green-100 dark:bg-green-900/30' : 
                                       variant === 'warning' ? 'bg-amber-100 dark:bg-amber-900/30' :
                                       variant === 'info' ? 'bg-blue-100 dark:bg-blue-900/30' :
                                       'bg-gray-100 dark:bg-gray-800'}`}>
          <div className={iconColors[variant]}>{icon}</div>
        </div>
        {trend && (
          <div className={`text-xs px-3 py-1 rounded-full font-medium ${
            trend === 'up' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' :
            trend === 'down' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' :
            'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-300'
          }`}>
            {trend === 'up' ? <ArrowUp className="w-3 h-3 inline mr-1" /> : 
             trend === 'down' ? <ArrowDown className="w-3 h-3 inline mr-1" /> : null}
            {trend === 'up' ? 'Improved' : trend === 'down' ? 'Reduced' : 'Stable'}
          </div>
        )}
      </div>
      <div>
        <p className="text-sm text-muted-foreground mb-2">{title}</p>
        <p className="text-2xl font-bold text-foreground mb-1">{value}</p>
        {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
      </div>
    </div>
  );
};

export default function SmartRepaymentPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [currentStep, setCurrentStep] = useState<'input' | 'results'>('input');
  const [repaymentMode, setRepaymentMode] = useState<'monthly' | 'lump'>('monthly');
  const [advisorAutoPick, setAdvisorAutoPick] = useState(false); // Start with manual mode
  const [selectedLoanId, setSelectedLoanId] = useState<string>('');
  const [monthlyAmount, setMonthlyAmount] = useState<string>('');
  const [lumpSumAmount, setLumpSumAmount] = useState<string>('');
  const [paymentDate, setPaymentDate] = useState<string>('');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [liabilities, setLiabilities] = useState<any[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  // Initialize loan engine
  const engine = new LoanEngine();

  // Fetch real liability data from database
  useEffect(() => {
    const loadLiabilities = async () => {
      try {
        setDataLoading(true);
        const repaymentSummary = await fetchRepayments();
        
        // Convert DB repayments to liability format
        const processedLiabilities = repaymentSummary.repayments.map((repayment, index) => {
          const input = {
            type: repayment.type as any,
            institution: repayment.institution || 'Unknown',
            original_amount: repayment.principal,
            interest_rate: repayment.interest_rate || 12,
            tenure_months: repayment.tenure_months,
            start_date: repayment.start_date
          };
          
          // Calculate current status using loan engine
          const result = engine.calculateEverything(input);
          
          return {
            id: repayment.repayment_id || `loan_${index}`,
            label: repayment.type?.toUpperCase().replace('_', ' ') || 'LOAN',
            institution: repayment.institution || 'Bank/Institution',
            original_amount: repayment.principal,
            current_outstanding: result.outstandingBalance,
            emi_amount: result.emi,
            interest_rate: repayment.interest_rate || 12,
            type: repayment.type || 'personal_loan',
            tenure_months: repayment.tenure_months,
            remaining_months: result.remainingMonths,
            start_date: repayment.start_date
          };
        });
        
        setLiabilities(processedLiabilities);
      } catch (error) {
        console.error('Error loading liabilities:', error);
        // Fallback to empty array if error
        setLiabilities([]);
      } finally {
        setDataLoading(false);
      }
    };

    loadLiabilities();
  }, []);

  // Set default payment date to today
  useEffect(() => {
    if (repaymentMode === 'lump' && !paymentDate) {
      const today = new Date();
      setPaymentDate(today.toISOString().split('T')[0]);
    }
  }, [repaymentMode, paymentDate]);

  // Use shared calculation hook
  const repaymentInputs = {
    repaymentMode,
    monthlyAmount,
    lumpSumAmount,
    paymentDate,
    selectedLoanId,
    advisorAutoPick,
    liabilities
  };
  
  const liveResult = useSmartRepaymentCalculation(repaymentInputs);
  
  // Debug log for troubleshooting
  React.useEffect(() => {
    if (liveResult && liabilities.length > 0) {
      const selectedLoan = liabilities.find(l => l.id === liveResult.selectedLoanId);
      console.log('🔍 Debug Outstanding Issue:', {
        selectedLoanId: liveResult.selectedLoanId,
        currentOutstanding: liveResult.currentOutstanding,
        selectedLoan: selectedLoan,
        selectedLoanOutstanding: selectedLoan?.current_outstanding,
        selectedLoanOriginal: selectedLoan?.original_amount,
        monthlyAmount,
        lumpSumAmount,
        liabilitiesSample: liabilities[0]
      });
    }
  }, [liveResult, liabilities, monthlyAmount, lumpSumAmount]);  const handleCalculate = async () => {
    if (!liveResult) return;
    
    setLoading(true);
    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 800));
      setResult(liveResult);
      setCurrentStep('results');
    } catch (error) {
      console.error('Calculation error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setCurrentStep('input');
    setResult(null);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', { 
      style: 'currency', 
      currency: 'INR',
      maximumFractionDigits: 0 
    }).format(amount);
  };

  const formatMonths = (months: number | null) => {
    if (months === null) return "N/A";
    const years = Math.floor(months / 12);
    const remainingMonths = months % 12;
    if (years > 0) {
      return remainingMonths > 0 ? `${years}y ${remainingMonths}m` : `${years}y`;
    }
    return `${months}m`;
  };

  // Form validation using shared function
  const isFormValid = () => validateRepaymentForm(repaymentInputs);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Loading State */}
      {dataLoading ? (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center space-y-4">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-purple-500 border-t-transparent mx-auto"></div>
            <p className="text-lg text-muted-foreground">Loading your liability data...</p>
          </div>
        </div>
      ) : liabilities.length === 0 ? (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center space-y-4 max-w-md">
            <div className="p-4 bg-yellow-100 dark:bg-yellow-900/30 rounded-xl">
              <p className="text-lg font-semibold text-yellow-800 dark:text-yellow-200">No Liabilities Found</p>
              <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-2">
                You don't have any loans or liabilities to optimize. Add some liabilities first to use the Smart Repayment Advisor.
              </p>
            </div>
            <Button onClick={() => router.back()} className="mt-4">
              Go Back to Repayments
            </Button>
          </div>
        </div>
      ) : (
        <>
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-500 via-blue-500 to-cyan-500 text-white">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              onClick={() => router.back()}
              className="text-white hover:bg-white/20 p-2"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-3">
              <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold">Smart Repayment Advisor</h1>
                <p className="text-white/90 text-sm">Optimize your loan repayments with AI-powered insights</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content - Simplified Layout */}
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto space-y-8">
          {currentStep === 'input' ? (
            <div className="space-y-8">
              {/* Strategy Mode Selection - Simplified */}
              <Card>
                <CardContent className="p-8">
                  <Label className="text-lg font-semibold text-foreground mb-6 block">
                    Choose Your Repayment Strategy
                  </Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <button
                      onClick={() => setRepaymentMode('monthly')}
                      className={`p-6 rounded-xl border-2 transition-all text-left ${
                        repaymentMode === 'monthly'
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30'
                          : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 hover:border-blue-300'
                      }`}
                    >
                      <div className="flex items-start gap-4">
                        <div className={`p-3 rounded-lg ${
                          repaymentMode === 'monthly' 
                            ? 'bg-blue-100 dark:bg-blue-900/50' 
                            : 'bg-gray-100 dark:bg-gray-800'
                        }`}>
                          <Calendar className={`w-6 h-6 ${
                            repaymentMode === 'monthly' 
                              ? 'text-blue-600 dark:text-blue-400' 
                              : 'text-gray-600 dark:text-gray-400'
                          }`} />
                        </div>
                        <div>
                          <p className="font-semibold text-foreground mb-1">Monthly Top-up</p>
                          <p className="text-sm text-muted-foreground">Add extra amount to your EMI every month</p>
                        </div>
                      </div>
                    </button>
                    
                    <button
                      onClick={() => setRepaymentMode('lump')}
                      className={`p-6 rounded-xl border-2 transition-all text-left ${
                        repaymentMode === 'lump'
                          ? 'border-green-500 bg-green-50 dark:bg-green-950/30'
                          : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 hover:border-green-300'
                      }`}
                    >
                      <div className="flex items-start gap-4">
                        <div className={`p-3 rounded-lg ${
                          repaymentMode === 'lump' 
                            ? 'bg-green-100 dark:bg-green-900/50' 
                            : 'bg-gray-100 dark:bg-gray-800'
                        }`}>
                          <Banknote className={`w-6 h-6 ${
                            repaymentMode === 'lump' 
                              ? 'text-green-600 dark:text-green-400' 
                              : 'text-gray-600 dark:text-gray-400'
                          }`} />
                        </div>
                        <div>
                          <p className="font-semibold text-foreground mb-1">Lump Sum Payment</p>
                          <p className="text-sm text-muted-foreground">Make a one-time large payment</p>
                        </div>
                      </div>
                    </button>
                  </div>
                </CardContent>
              </Card>

              {/* AI Advisor Toggle */}
              <Card className="border-2 border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/30">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-lg">
                        <Crown className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                        <p className="font-semibold text-foreground">AI Advisor Mode</p>
                        <p className="text-sm text-muted-foreground">
                          {advisorAutoPick 
                            ? "Let AI select the optimal loan for maximum savings"
                            : "Manually choose which loan to target"
                          }
                        </p>
                      </div>
                    </div>
                    <button
                      className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${
                        advisorAutoPick ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'
                      }`}
                      onClick={() => setAdvisorAutoPick(!advisorAutoPick)}
                    >
                      <span
                        className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                          advisorAutoPick ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                </CardContent>
              </Card>

              {/* AI Selected Loan Highlight */}
              {advisorAutoPick && liveResult && (
                <Card className="border-2 border-green-200 dark:border-green-800 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-green-100 dark:bg-green-900/50 rounded-lg">
                        <Target className="w-5 h-5 text-green-600 dark:text-green-400" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-foreground">🎯 AI Selected Target</p>
                          <div className="px-2 py-1 bg-green-600 text-white text-xs rounded-full font-medium">
                            RECOMMENDED
                          </div>
                        </div>
                        <p className="text-sm text-green-700 dark:text-green-300 font-medium">
                          {liveResult.selectedLoanLabel.replace(' (AI Selected)', '')}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Highest interest rate ({liabilities.find(l => l.id === liveResult.selectedLoanId)?.interest_rate}%) - Maximum savings potential
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* AI Suggestion for Manual Mode */}
              {!advisorAutoPick && liabilities.length > 0 && (
                <Card className="border border-blue-200 dark:border-blue-700 bg-blue-50/50 dark:bg-blue-950/20">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-lg">
                        <Crown className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-blue-900 dark:text-blue-100">💡 AI Suggestion</p>
                        <p className="text-xs text-blue-700 dark:text-blue-300">
                          Based on your portfolio, targeting <strong>{liabilities.find(l => l.interest_rate === Math.max(...liabilities.map(li => li.interest_rate)))?.label}</strong> 
                          {" "}({liabilities.find(l => l.interest_rate === Math.max(...liabilities.map(li => li.interest_rate)))?.interest_rate}% APR) would maximize your savings
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Manual Loan Selection */}
              {!advisorAutoPick && (
                <Card>
                  <CardContent className="p-6">
                    <Label className="text-base font-medium text-foreground mb-3 block">
                      Select Target Loan
                    </Label>
                    <select
                      className="w-full rounded-xl border border-border bg-card text-foreground h-12 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                      value={selectedLoanId}
                      onChange={(e) => setSelectedLoanId(e.target.value)}
                    >
                      <option value="">Choose a loan...</option>
                      {liabilities.map((liability, index) => (
                        <option key={liability.id || index} value={liability.id || index.toString()}>
                          {liability.label || liability.institution || `${liability.type} Loan`} - 
                          {formatCurrency(liability.current_outstanding || liability.original_amount)} outstanding @ {liability.interest_rate}% 
                          {liability.remaining_months ? ` (${liability.remaining_months}mo left)` : ''}
                        </option>
                      ))}
                    </select>
                  </CardContent>
                </Card>
              )}

              {/* Amount Input */}
              <Card>
                <CardContent className="p-6">
                  <Label className="text-base font-medium text-foreground mb-3 block">
                    {repaymentMode === 'monthly' ? 'Monthly Extra Amount' : 'Lump Sum Amount'}
                  </Label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <span className="text-muted-foreground text-lg">₹</span>
                    </div>
                    <Input
                      type="number"
                      placeholder={repaymentMode === 'monthly' ? '5,000' : '50,000'}
                      className="pl-8 h-12 text-lg rounded-xl border-2 focus:border-purple-500"
                      value={repaymentMode === 'monthly' ? monthlyAmount : lumpSumAmount}
                      onChange={(e) => {
                        if (repaymentMode === 'monthly') {
                          setMonthlyAmount(e.target.value);
                        } else {
                          setLumpSumAmount(e.target.value);
                        }
                      }}
                    />
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    {repaymentMode === 'monthly' 
                      ? 'This amount will be added to your existing EMI each month'
                      : 'One-time payment to reduce the principal amount'
                    }
                  </p>
                </CardContent>
              </Card>

              {/* Enhanced Live Preview */}
              {liveResult && (
                <Card className="border-2 border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-950/30">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <Zap className="w-5 h-5 text-green-600 dark:text-green-400" />
                      <h3 className="font-semibold text-foreground">Live Savings Preview</h3>
                    </div>
                    
                    {/* Target Loan Info */}
                    <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-blue-800 dark:text-blue-200">Target Loan</p>
                          <p className="text-lg font-bold text-blue-900 dark:text-blue-100">
                            {liveResult.selectedLoanLabel.replace(' (AI Selected)', '')}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-blue-600 dark:text-blue-400">Outstanding</p>
                          <p className="text-lg font-bold text-blue-900 dark:text-blue-100">
                            {formatCurrency(liveResult.currentOutstanding || 0)}
                          </p>
                          <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                            {liveResult.currentMonthsRemaining} months remaining
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    {/* Key Metrics Grid */}
                    <div className="grid grid-cols-3 gap-3 mb-4">
                      <div className="text-center p-3 bg-white/50 dark:bg-gray-900/30 rounded-lg">
                        <p className="text-xs text-muted-foreground">Interest Saved</p>
                        <p className="text-lg font-bold text-green-600 dark:text-green-400">
                          ₹{liveResult.interestSaved.toLocaleString()}
                        </p>
                      </div>
                      <div className="text-center p-3 bg-white/50 dark:bg-gray-900/30 rounded-lg">
                        <p className="text-xs text-muted-foreground">Time Saved</p>
                        <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
                          {liveResult.monthsSaved}mo
                        </p>
                      </div>
                      <div className="text-center p-3 bg-white/50 dark:bg-gray-900/30 rounded-lg">
                        <p className="text-xs text-muted-foreground">ROI</p>
                        <p className="text-lg font-bold text-purple-600 dark:text-purple-400">
                          ₹{(liveResult.efficiency || 0).toFixed(1)}
                        </p>
                      </div>
                    </div>
                    
                    {/* Key Insights Summary - Simplified */}
                    <div className="mb-4 p-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-lg border border-green-200 dark:border-green-800">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="text-center">
                          <div className="text-sm text-muted-foreground mb-1">Time Saved</div>
                          <div className="text-lg font-bold text-green-600 dark:text-green-400">
                            {formatMonths(liveResult?.monthsSaved)}
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="text-sm text-muted-foreground mb-1">Interest Saved</div>
                          <div className="text-lg font-bold text-green-600 dark:text-green-400">
                            {formatCurrency(liveResult?.interestSaved || 0)}
                          </div>
                        </div>
                      </div>
                      <div className="mt-3 text-center">
                        <span className="text-sm text-green-800 dark:text-green-200 font-medium">
                          💡 Every ₹1 invested saves ₹{(liveResult?.efficiency || 0).toFixed(2)} in interest
                        </span>
                      </div>
                    </div>

                    {/* Loan Portfolio Overview Chart - Mobile Optimized */}
                    {liabilities.length > 1 && (
                      <div className="mb-4">
                        <h4 className="text-sm font-medium text-foreground mb-3">Your Loan Portfolio</h4>
                        <div className="space-y-2">
                          {liabilities.map((liability, index) => {
                            const totalOutstanding = liabilities.reduce((sum, l) => sum + (l.current_outstanding || 0), 0);
                            const percentage = ((liability.current_outstanding || 0) / totalOutstanding) * 100;
                            const isSelected = liability.id === liveResult?.selectedLoanId;
                            
                            return (
                              <div key={liability.id} className={`p-3 rounded-lg border transition-all ${isSelected ? 'border-green-500 bg-green-50 dark:bg-green-950/30 shadow-sm' : 'border-gray-200 dark:border-gray-700 bg-white/50 dark:bg-gray-900/30 md:block hidden'} ${isSelected ? 'block' : ''}`}>
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center gap-2">
                                    <div className={`w-3 h-3 rounded-full ${isSelected ? 'bg-green-500' : index === 0 ? 'bg-blue-500' : index === 1 ? 'bg-purple-500' : 'bg-orange-500'}`}></div>
                                    <span className="text-sm font-medium">{liability.label}</span>
                                    {isSelected && <span className="text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 px-2 py-1 rounded-full">SELECTED</span>}
                                  </div>
                                  <div className="text-right">
                                    <span className="text-sm font-medium text-muted-foreground">{percentage.toFixed(1)}%</span>
                                  </div>
                                </div>
                                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                                  <div 
                                    className={`h-2 rounded-full transition-all ${isSelected ? 'bg-green-500' : index === 0 ? 'bg-blue-500' : index === 1 ? 'bg-purple-500' : 'bg-orange-500'}`}
                                    style={{ width: `${percentage}%` }}
                                  />
                                </div>
                                <div className="flex items-center justify-between mt-2">
                                  <span className="text-sm font-medium text-foreground">{formatCurrency(liability.current_outstanding || 0)}</span>
                                  <span className="text-sm text-muted-foreground">{liability.interest_rate}% APR</span>
                                </div>
                              </div>
                            );
                          })}
                          
                          {/* Show summary on mobile when only selected loan is displayed */}
                          <div className="md:hidden p-2 bg-gray-100 dark:bg-gray-800 rounded-lg text-center">
                            <span className="text-xs text-muted-foreground">
                              Showing selected loan (1 of {liabilities.length} total loans)
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="text-center p-3 bg-gradient-to-r from-green-100 to-emerald-100 dark:from-green-900/30 dark:to-emerald-900/30 rounded-lg">
                      <p className="text-green-800 dark:text-green-200 text-sm font-medium">
                        💡 Every ₹1 invested saves ₹{(liveResult.efficiency || 0).toFixed(2)} in interest
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Payment Date for Lump Sum */}
              {repaymentMode === 'lump' && (
                <Card>
                  <CardContent className="p-6">
                    <Label className="text-base font-medium text-foreground mb-3 block">
                      Payment Date
                    </Label>
                    <Input
                      type="date"
                      className="h-12 rounded-xl border-2 focus:border-purple-500"
                      value={paymentDate}
                      onChange={(e) => setPaymentDate(e.target.value)}
                    />
                  </CardContent>
                </Card>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4 sticky bottom-4 bg-gray-50 dark:bg-gray-900 p-4 -mx-4">
                <Button
                  variant="outline"
                  onClick={() => router.back()}
                  className="flex-1 h-12 rounded-xl"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCalculate}
                  disabled={!isFormValid() || loading}
                  className="flex-1 h-12 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                  leftIcon={loading ? <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" /> : <Calculator className="w-4 h-4" />}
                >
                  {loading ? 'Calculating...' : 'Calculate Savings'}
                </Button>
              </div>
            </div>
          ) : (
            // Results Page (similar to modal but full page layout)
            <div className="space-y-6">
              {/* Results Header */}
              <Card>
                <CardContent className="p-6 text-center space-y-2">
                  <div className="flex items-center justify-center gap-2">
                    <CheckCircle className="w-6 h-6 text-green-600" />
                    <h3 className="text-xl font-bold text-foreground">Optimization Complete!</h3>
                  </div>
                  {result?.reason && (
                    <p className="text-sm text-muted-foreground max-w-md mx-auto">
                      {result.reason}
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Key Metrics */}
              <div className="grid grid-cols-2 gap-4">
                <KPICard
                  icon={<PiggyBank className="w-5 h-5" />}
                  title="Interest Saved"
                  value={formatCurrency(result?.interestSaved || 0)}
                  trend="down"
                  variant="success"
                />
                <KPICard
                  icon={<Timer className="w-5 h-5" />}
                  title="Time Saved"
                  value={result?.monthsSaved !== null ? formatMonths(result?.monthsSaved || 0) : "N/A"}
                  trend={result?.monthsSaved > 0 ? "down" : "neutral"}
                  variant="info"
                />
              </div>

              {/* Timeline Chart */}
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Clock className="w-5 h-5" />
                    <h3 className="font-semibold">Payoff Timeline Comparison</h3>
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Current Plan</span>
                      <span className="font-medium">{formatMonths(result?.timeline?.current)}</span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4">
                      <div className="bg-gray-400 dark:bg-gray-500 h-4 rounded-full" style={{ width: '100%' }} />
                    </div>
                    
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">With {repaymentMode === 'monthly' ? 'Monthly Top-up' : 'Lump Sum'}</span>
                      <span className="font-medium text-green-600 dark:text-green-400">{formatMonths(result?.timeline?.withContribution)}</span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4">
                      <div 
                        className="bg-green-500 h-4 rounded-full" 
                        style={{ width: `${((result?.timeline?.withContribution || 0) / (result?.timeline?.current || 1)) * 100}%` }} 
                      />
                    </div>
                  </div>

                  <div className="text-center p-3 bg-green-50 dark:bg-green-950/30 rounded-xl mt-4">
                    <p className="text-green-700 dark:text-green-300 font-semibold">
                      🎉 You'll finish {result?.monthsSaved} months earlier!
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4 sticky bottom-4 bg-gray-50 dark:bg-gray-900 p-4 -mx-4">
                <Button
                  variant="outline"
                  onClick={handleReset}
                  className="flex-1 h-12 rounded-xl"
                >
                  Try Another Strategy
                </Button>
                <Button
                  onClick={() => {
                    // Handle apply strategy
                    router.back();
                  }}
                  className="flex-1 h-12 rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                >
                  Apply This Strategy
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
        </>
      )}
    </div>
  );
}
