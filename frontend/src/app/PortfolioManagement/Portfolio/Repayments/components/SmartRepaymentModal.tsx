"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "../../../../components/Card";
import { Button } from "../../../../components/Button";
import { Input } from "../../../../components/Input";
import { Label } from "../../../../components/Label";
import { Modal } from "../../../../components/Modal";
import { useSmartRepaymentCalculation, validateRepaymentForm } from "../hooks/useSmartRepaymentCalculation";
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
  X,
  ArrowDown,
  ArrowUp
} from "lucide-react";

interface SmartRepaymentModalProps {
  open: boolean;
  onClose: () => void;
  liabilities: any[];
  onApplyStrategy?: (result: any) => void;
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
  const variantClasses = {
    default: "border-border bg-card",
    success: "border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/50",
    warning: "border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/50",
    info: "border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/50"
  };

  const iconColors = {
    default: "text-muted-foreground",
    success: "text-green-600 dark:text-green-400",
    warning: "text-amber-600 dark:text-amber-400",
    info: "text-blue-600 dark:text-blue-400"
  };

  return (
    <div className={`rounded-xl border p-4 ${variantClasses[variant]}`}>
      <div className="flex items-center justify-between mb-2">
        <div className={`p-2 rounded-lg ${variant === 'success' ? 'bg-green-100 dark:bg-green-900/30' : 
                                       variant === 'warning' ? 'bg-amber-100 dark:bg-amber-900/30' :
                                       variant === 'info' ? 'bg-blue-100 dark:bg-blue-900/30' :
                                       'bg-muted'}`}>
          <div className={iconColors[variant]}>{icon}</div>
        </div>
        {trend && (
          <div className={`text-xs px-2 py-1 rounded-full ${
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
        <p className="text-xs text-muted-foreground mb-1">{title}</p>
        <p className="text-lg font-bold text-foreground">{value}</p>
        {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
      </div>
    </div>
  );
};

export default function SmartRepaymentModal({ open, onClose, liabilities, onApplyStrategy }: SmartRepaymentModalProps) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<'input' | 'results'>('input');
  const [repaymentMode, setRepaymentMode] = useState<'monthly' | 'lump'>('monthly');
  const [advisorAutoPick, setAdvisorAutoPick] = useState(true); // Start with advisor mode
  const [selectedLoanId, setSelectedLoanId] = useState<string>('');
  const [monthlyAmount, setMonthlyAmount] = useState<string>('');
  const [lumpSumAmount, setLumpSumAmount] = useState<string>('');
  const [paymentDate, setPaymentDate] = useState<string>('');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Check if mobile for responsive design
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Redirect to full page on mobile when modal opens
  useEffect(() => {
    if (open && isMobile) {
      onClose(); // Close modal immediately
      router.push('/PortfolioManagement/Portfolio/Repayments/smart-repayment');
    }
  }, [open, isMobile, onClose, router]);

  // Reset when modal opens/closes
  useEffect(() => {
    if (open) {
      setCurrentStep('input');
      setRepaymentMode('monthly');
      setAdvisorAutoPick(true);
      setSelectedLoanId('');
      setMonthlyAmount('');
      setLumpSumAmount('');
      setPaymentDate('');
      setResult(null);
    }
  }, [open]);

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

  // Form validation using shared function
  const isFormValid = () => validateRepaymentForm(repaymentInputs);

  const handleCalculate = async () => {
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

  if (!open) return null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Smart Repayment"
      footer={
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleReset}>
            Reset
          </Button>
          <Button variant="outline" onClick={onClose}>Close</Button>
          <Button onClick={handleCalculate} leftIcon={<Calculator className="w-4 h-4" />}>
            Calculate
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Header with Advisor Toggle (Plan page style) */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="text-sm text-muted-foreground">Smart Repayment</div>
          </div>
          <div className="flex items-center gap-2">
            <div className="inline-flex rounded-md border border-border overflow-hidden text-xs">
              <Button size="sm" variant="outline" className={`rounded-none ${!advisorAutoPick ? 'bg-indigo-600 text-white border-indigo-600' : ''}`} onClick={() => setAdvisorAutoPick(false)}>
                <div className="flex flex-col items-start leading-tight">
                  <span>Manual</span>
                  {!advisorAutoPick ? <span className="text-[10px] opacity-80">You choose</span> : null}
                </div>
              </Button>
              <Button size="sm" variant="outline" className={`rounded-none ${advisorAutoPick ? 'bg-indigo-600 text-white border-indigo-600' : ''}`} onClick={() => setAdvisorAutoPick(true)}>
                <div className="flex flex-col items-start leading-tight">
                  <span>Advisor</span>
                  {advisorAutoPick ? <span className="text-[10px] opacity-80">AI picks best</span> : null}
                </div>
              </Button>
            </div>
          </div>
        </div>

        {/* Contribution Type Tabs */}
        <div className="flex space-x-1 bg-muted p-1 rounded-lg">
          <button
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              repaymentMode === 'monthly'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
            onClick={() => setRepaymentMode('monthly')}
          >
            Monthly Top-up
          </button>
          <button
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              repaymentMode === 'lump'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
            onClick={() => setRepaymentMode('lump')}
          >
            Lump Sum
          </button>
        </div>

        {/* AI Selected Target (compact) */}
        {advisorAutoPick && liveResult?.selectedLoan && (
          <div className="rounded-lg border border-border bg-card/60 p-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-foreground">AI Selected Target</div>
                <div className="text-xs text-muted-foreground">{liveResult.selectedLoan.replace('_', ' ').toUpperCase()}</div>
              </div>
              <Target className="w-4 h-4 text-muted-foreground" />
            </div>
            {liveResult.reason && (
              <p className="text-xs text-muted-foreground mt-1">{liveResult.reason}</p>
            )}
          </div>
        )}

        {/* Manual Loan Selection (when auto-pick is off) */}
        {!advisorAutoPick && (
          <div>
            <Label className="text-sm font-medium text-foreground">Target Loan</Label>
            <select
              className="mt-1 w-full rounded-md border bg-background text-foreground h-10 px-3 text-sm border-border"
              value={selectedLoanId}
              onChange={(e) => setSelectedLoanId(e.target.value)}
            >
              <option value="">Select a loan...</option>
              {liabilities.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.type?.replace('_', ' ').toUpperCase()} — ₹{l.original_amount?.toLocaleString()} @ {l.interest_rate}%
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Input Fields */}
        <div className="space-y-4">
          {repaymentMode === 'monthly' ? (
            <div>
              <Label className="text-sm font-medium text-foreground">Monthly Extra Payment <span className="text-red-500">*</span></Label>
              <div className="relative mt-1">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-muted-foreground text-sm">₹</span>
                </div>
                <Input 
                  type="number" 
                  placeholder="5000" 
                  className="pl-8"
                  value={monthlyAmount}
                  onChange={(e) => setMonthlyAmount(e.target.value)}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Add this amount to your existing EMI each month
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium text-foreground">Lump Sum Amount <span className="text-red-500">*</span></Label>
                <div className="relative mt-1">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-muted-foreground text-sm">₹</span>
                  </div>
                  <Input 
                    type="number" 
                    placeholder="50000" 
                    className="pl-8"
                    value={lumpSumAmount}
                    onChange={(e) => setLumpSumAmount(e.target.value)}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  One-time payment to reduce principal
                </p>
              </div>
              <div>
                <Label className="text-sm font-medium text-foreground">Payment Date <span className="text-red-500">*</span></Label>
                <Input 
                  type="date" 
                  className="mt-1"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                />
              </div>
            </div>
          )}
        </div>

        {/* Projected Results (only show when calculated) */}
        {liveResult && (
          <div className="space-y-4">
            <h4 className="font-semibold text-foreground">Projected Results</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-lg border border-border bg-card/60 p-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Payoff Timeline</span>
                    <span className="font-semibold text-foreground">
                      {liveResult.currentMonthsRemaining} → {liveResult.newMonthsRemaining} months
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Months Saved</span>
                    <span className="font-semibold text-green-600">
                      {liveResult.monthsSaved} months
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Payoff Date</span>
                    <span className="font-semibold text-foreground">
                      {liveResult.payoffDate || '—'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-border bg-card/60 p-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Interest Saved</span>
                    <span className="font-semibold text-green-600">
                      ₹{Math.round(liveResult.interestSaved).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Total Interest Paid</span>
                    <span className="font-semibold text-foreground">
                      ₹{Math.round(liveResult.totalInterestPaidNew).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Efficiency</span>
                    <span className="font-semibold text-blue-600">
                      {liveResult.efficiency?.toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
