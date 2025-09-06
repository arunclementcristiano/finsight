"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "../../../../components/Card";
import { Button } from "../../../../components/Button";
import { Input } from "../../../../components/Input";
import { Label } from "../../../../components/Label";
import { useSmartRepaymentCalculation, validateRepaymentForm } from "../hooks/useSmartRepaymentCalculation";
import { fetchRepayments } from "../../../../../lib/repayments";
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
  ArrowLeft,
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
  ArrowDown,
  ArrowUp
} from "lucide-react";

interface Liability {
  id: string;
  label?: string;
  institution?: string;
  original_amount: number;
  current_outstanding?: number;
  emi_amount?: number;
  interest_rate: number;
  type: string;
  tenure_months?: number;
  remaining_months?: number;
  start_date?: string;
}

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
  const variantStyles = {
    default: "border-border bg-card",
    success: "border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-950/30",
    warning: "border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/30",
    info: "border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/30"
  };

  const trendIcon = trend === "up" ? <ArrowUp className="w-3 h-3 text-green-600" /> : 
                   trend === "down" ? <ArrowDown className="w-3 h-3 text-red-600" /> : null;

  return (
    <Card className={`border-2 ${variantStyles[variant]}`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/80 dark:bg-gray-800/80 rounded-lg">
              {icon}
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{title}</p>
              <div className="flex items-center gap-2">
                <p className="text-lg font-bold text-foreground">{value}</p>
                {trendIcon}
              </div>
              {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default function SmartRepaymentPage() {
  const router = useRouter();
  
  // Form state
  const [repaymentMode, setRepaymentMode] = useState<'monthly' | 'lump'>('monthly');
  const [monthlyAmount, setMonthlyAmount] = useState('');
  const [lumpSumAmount, setLumpSumAmount] = useState('');
  const [selectedLoanId, setSelectedLoanId] = useState('');
  const [paymentDate, setPaymentDate] = useState('');
  const [advisorAutoPick, setAdvisorAutoPick] = useState(false);
  
  // Data state
  const [liabilities, setLiabilities] = useState<Liability[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Calculation state
  const [result, setResult] = useState<any>(null);
  const [showResults, setShowResults] = useState(false);

  // Live calculation hook
  const liveResult = useSmartRepaymentCalculation({
    repaymentMode,
    monthlyAmount: monthlyAmount,
    lumpSumAmount: lumpSumAmount,
    selectedLoanId,
    paymentDate,
    advisorAutoPick,
    liabilities
  });

  useEffect(() => {
    const loadRepayments = async () => {
      try {
        setLoading(true);
        const repaymentSummary = await fetchRepayments();
        if (repaymentSummary && repaymentSummary.repayments && Array.isArray(repaymentSummary.repayments) && repaymentSummary.repayments.length > 0) {
          // Convert Repayment objects to Liability format expected by the hook
          const transformedLiabilities = repaymentSummary.repayments.map(repayment => ({
            id: repayment.repayment_id,
            label: `${repayment.institution} ${repayment.type}`,
            institution: repayment.institution,
            original_amount: repayment.principal,
            current_outstanding: repayment.outstanding_balance,
            emi_amount: repayment.emi_amount,
            interest_rate: repayment.interest_rate,
            type: repayment.type,
            tenure_months: repayment.tenure_months,
            start_date: repayment.start_date
          }));
          
          setLiabilities(transformedLiabilities);
          // Auto-select AI mode and first loan for better UX
          setAdvisorAutoPick(true);
          setSelectedLoanId(transformedLiabilities[0]?.id || '');
        } else {
          setError("No loan data available. Please add some loans first.");
        }
      } catch (err) {
        console.error('Error loading repayments:', err);
        setError("Failed to load loan information.");
      } finally {
        setLoading(false);
      }
    };

    loadRepayments();
  }, []);

  // Auto-set payment date to today
  useEffect(() => {
    if (!paymentDate) {
      const today = new Date().toISOString().split('T')[0];
      setPaymentDate(today);
    }
  }, [paymentDate]);

  const handleCalculate = () => {
    const amount = repaymentMode === 'monthly' ? parseFloat(monthlyAmount) : parseFloat(lumpSumAmount);
    const validation = validateRepaymentForm({
      repaymentMode,
      monthlyAmount: repaymentMode === 'monthly' ? monthlyAmount : '',
      lumpSumAmount: repaymentMode === 'lump' ? lumpSumAmount : '',
      selectedLoanId,
      paymentDate,
      advisorAutoPick,
      liabilities
    });

    if (!validation) {
      setError("Please fill all required fields");
      return;
    }

    if (liveResult) {
      setResult(liveResult);
      setShowResults(true);
      setError(null);
    }
  };

  const formatCurrency = (amount: number | null | undefined) => {
    if (!amount && amount !== 0) return "N/A";
    return `₹${amount.toLocaleString('en-IN')}`;
  };

  const formatMonths = (months: number | null) => {
    if (months === null || months === undefined) return "N/A";
    const years = Math.floor(months / 12);
    const remainingMonths = months % 12;
    if (years > 0) {
      return remainingMonths > 0 ? `${years}y ${remainingMonths}m` : `${years}y`;
    }
    return `${months}m`;
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
            <p className="mt-2 text-muted-foreground">Loading loan information...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error && liabilities.length === 0) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <Card>
          <CardContent className="p-6 text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Loan Data Available</h3>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button onClick={() => router.push('/PortfolioManagement/Portfolio/Repayments')}>
              Back to Repayments
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Page Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Button 
            variant="ghost" 
            onClick={() => router.push('/PortfolioManagement/Portfolio/Repayments')}
            className="p-2"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-purple-600" />
              Smart Repayment Advisor
            </h1>
            <p className="text-muted-foreground">Optimize your loan repayments with AI-powered insights</p>
          </div>
        </div>
        
        {/* AI Toggle matching plan page design */}
        <div className="inline-flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-amber-500" />
          <span className="text-[11px] text-muted-foreground">
            AI Assist
          </span>
          <button 
            type="button" 
            onClick={() => setAdvisorAutoPick(!advisorAutoPick)} 
            className={`relative inline-flex h-6 w-12 items-center rounded-full transition-colors ${
              advisorAutoPick 
                ? "bg-gradient-to-r from-amber-500 via-fuchsia-500 to-indigo-600" 
                : "bg-muted"
            }`}
          >
            <span className={`inline-block h-5 w-5 transform rounded-full bg-white dark:bg-zinc-900 shadow transition-transform ${
              advisorAutoPick ? 'translate-x-6' : 'translate-x-1'
            }`} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column - Input Form */}
        <div className="space-y-6">
          {/* Payment Mode Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="w-5 h-5 text-blue-600" />
                Payment Strategy
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Button
                  variant={repaymentMode === 'monthly' ? 'primary' : 'outline'}
                  className="h-20 flex flex-col items-center justify-center"
                  onClick={() => setRepaymentMode('monthly')}
                >
                  <Calendar className="w-6 h-6 mb-2" />
                  <span className="font-medium">Monthly Top-up</span>
                  <span className="text-xs text-muted-foreground">Extra EMI amount</span>
                </Button>
                <Button
                  variant={repaymentMode === 'lump' ? 'primary' : 'outline'}
                  className="h-20 flex flex-col items-center justify-center"
                  onClick={() => setRepaymentMode('lump')}
                >
                  <Banknote className="w-6 h-6 mb-2" />
                  <span className="font-medium">Lump Sum</span>
                  <span className="text-xs text-muted-foreground">One-time payment</span>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* AI Selected Target - Compact */}
          {advisorAutoPick && liveResult && (
            <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
              <Target className="w-4 h-4 text-green-600 dark:text-green-400" />
              <span className="text-sm text-green-700 dark:text-green-300 font-medium">
                AI Target: {liveResult.selectedLoanLabel.replace(' (AI Selected)', '')}
              </span>
              <span className="px-1.5 py-0.5 bg-green-600 text-white text-xs rounded font-medium">
                AI
              </span>
            </div>
          )}

          {/* Manual Loan Selection */}
          {!advisorAutoPick && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="w-5 h-5 text-green-600" />
                  Select Target Loan
                </CardTitle>
              </CardHeader>
              <CardContent>
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
                    </option>
                  ))}
                </select>
              </CardContent>
            </Card>
          )}

          {/* Payment Amount */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-purple-600" />
                {repaymentMode === 'monthly' ? 'Monthly Extra Amount' : 'Lump Sum Amount'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Input
                  type="number"
                  placeholder={repaymentMode === 'monthly' ? "Enter monthly extra amount" : "Enter lump sum amount"}
                  className="h-12 rounded-xl border-2 focus:border-purple-500 text-lg"
                  value={repaymentMode === 'monthly' ? monthlyAmount : lumpSumAmount}
                  onChange={(e) => repaymentMode === 'monthly' 
                    ? setMonthlyAmount(e.target.value)
                    : setLumpSumAmount(e.target.value)
                  }
                />
                <p className="text-sm text-muted-foreground">
                  {repaymentMode === 'monthly' 
                    ? "This amount will be added to your existing EMI each month"
                    : "One-time payment to reduce your loan principal"
                  }
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Payment Date for Lump Sum */}
          {repaymentMode === 'lump' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-blue-600" />
                  Payment Date
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Input
                  type="date"
                  className="h-12 rounded-xl border-2 focus:border-purple-500"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                />
              </CardContent>
            </Card>
          )}

          {/* Calculate Button */}
          <Button 
            onClick={handleCalculate}
            className="w-full h-12 text-lg font-semibold bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
            disabled={!liveResult}
          >
            <Calculator className="w-5 h-5 mr-2" />
            Calculate Savings
          </Button>

          {error && (
            <div className="p-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-red-700 dark:text-red-300 text-sm">{error}</p>
            </div>
          )}
        </div>

        {/* Right Column - Results */}
        <div className="space-y-6">
          {/* Live Preview */}
          {liveResult && (
            <Card className="border-2 border-emerald-200 dark:border-emerald-800 bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-950/30 dark:to-green-950/30">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="w-5 h-5 text-emerald-600" />
                  Live Savings Preview
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center p-4 bg-white/50 dark:bg-gray-900/30 rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">TARGET LOAN</p>
                  <p className="font-bold text-lg text-emerald-700 dark:text-emerald-300">
                    {liveResult.selectedLoanLabel}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Outstanding: {formatCurrency(liveResult.currentOutstanding)} | {liveResult.currentMonthsRemaining} months left
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="text-center p-2 bg-white/50 dark:bg-gray-900/30 rounded-lg">
                    <p className="text-xs text-muted-foreground">Interest Saved</p>
                    <p className="text-sm font-bold text-green-600 dark:text-green-400">
                      ₹{liveResult.interestSaved.toLocaleString()}
                    </p>
                  </div>
                  <div className="text-center p-2 bg-white/50 dark:bg-gray-900/30 rounded-lg">
                    <p className="text-xs text-muted-foreground">Time Saved</p>
                    <p className="text-sm font-bold text-blue-600 dark:text-blue-400">
                      {liveResult.monthsSaved}mo
                    </p>
                  </div>
                  <div className="text-center p-2 bg-white/50 dark:bg-gray-900/30 rounded-lg">
                    <p className="text-xs text-muted-foreground">ROI</p>
                    <p className="text-sm font-bold text-purple-600 dark:text-purple-400">
                      ₹{(liveResult.efficiency || 0).toFixed(1)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Detailed Results */}
          {showResults && result && (
            <>
              {/* KPI Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <KPICard
                  icon={<PiggyBank className="w-5 h-5 text-green-600" />}
                  title="Interest Saved"
                  value={formatCurrency(result.interestSaved)}
                  trend={result.interestSaved > 0 ? "down" : "neutral"}
                  variant="success"
                />
                <KPICard
                  icon={<Clock className="w-5 h-5 text-blue-600" />}
                  title="Time Saved"
                  value={result?.monthsSaved !== null ? formatMonths(result?.monthsSaved || 0) : "N/A"}
                  trend={result?.monthsSaved > 0 ? "down" : "neutral"}
                  variant="info"
                />
                <KPICard
                  icon={<Calendar className="w-5 h-5 text-purple-600" />}
                  title="New Payoff Date"
                  value={result?.payoffDate || "N/A"}
                  variant="default"
                />
                <KPICard
                  icon={<TrendingUp className="w-5 h-5 text-amber-600" />}
                  title="ROI per ₹1"
                  value={`₹${(result?.efficiency || 0).toFixed(2)}`}
                  subtitle="Interest saved per rupee invested"
                  variant="warning"
                />
              </div>

              {/* Timeline Comparison */}
              {result?.timeline && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="w-5 h-5 text-indigo-600" />
                      Payoff Timeline Comparison
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Current Plan</span>
                        <span className="font-medium">
                          {result.timeline.current !== null ? formatMonths(result.timeline.current) : "Interest-only"}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                        <div className="bg-gray-400 dark:bg-gray-500 h-3 rounded-full" style={{ width: '100%' }} />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">With {repaymentMode === 'monthly' ? 'Top-up' : 'Lump Sum'}</span>
                        <span className="font-medium text-green-600 dark:text-green-400">
                          {formatMonths(result.timeline.withContribution)}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                        <div 
                          className="bg-gradient-to-r from-green-500 to-emerald-500 h-3 rounded-full" 
                          style={{ 
                            width: result.timeline.current 
                              ? `${(result.timeline.withContribution / result.timeline.current) * 100}%`
                              : '0%'
                          }} 
                        />
                      </div>
                    </div>
                    
                    {result?.monthsSaved > 0 && (
                      <div className="text-center p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
                        <p className="text-green-700 dark:text-green-300 font-medium">
                          🎉 You'll finish {formatMonths(result.monthsSaved)} earlier!
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* AI Recommendation */}
              {advisorAutoPick && result?.reason && (
                <Card className="border-2 border-amber-200 dark:border-amber-800 bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-950/30 dark:to-yellow-950/30">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Crown className="w-5 h-5 text-amber-600" />
                      AI Recommendation
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-amber-800 dark:text-amber-200">{result.reason}</p>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
