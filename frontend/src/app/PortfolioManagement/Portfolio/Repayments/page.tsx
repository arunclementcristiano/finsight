'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../../components/Card';
import { Button } from '../../../components/Button';
import { Input } from '../../../components/Input';
import { Label } from '../../../components/Label';
import { Badge } from '../../../components/Badge';
import { Modal } from '../../../components/Modal';
import { Progress } from '../../../components/Progress';
import { 
  DollarSign, 
  Clock, 
  TrendingUp, 
  Target, 
  Plus, 
  Zap, 
  Calculator,
  TrendingDown,
  Coins,
  Star,
  Shield,
  CreditCard,
  Home,
  Car,
  GraduationCap,
  Briefcase
} from 'lucide-react';
import { LoanEngine, EnhancedLoanStatus } from '../../domain/Repaymentadvisor/repaymentEngine';
import { fetchRepayments, createRepayment } from '../../../../lib/repayments';
import { Repayment } from '../../../../lib/repayments';

// Loan type configurations
const loanIcons: Record<string, React.ReactNode> = {
  personal_loan: <Briefcase className="w-4 h-4" />,
  home_loan: <Home className="w-4 h-4" />,
  car_loan: <Car className="w-4 h-4" />,
  education_loan: <GraduationCap className="w-4 h-4" />,
  credit_card: <CreditCard className="w-4 h-4" />,
  gold_loan: <DollarSign className="w-4 h-4" />,
  generic_loan: <DollarSign className="w-4 h-4" />
};

const loanColors: Record<string, string> = {
  personal_loan: 'bg-blue-500',
  home_loan: 'bg-green-500',
  car_loan: 'bg-purple-500',
  education_loan: 'bg-orange-500',
  credit_card: 'bg-red-500',
  gold_loan: 'bg-yellow-500',
  generic_loan: 'bg-gray-500'
};

interface UltraSimpleLiabilityInput {
  type: string;
  original_amount: number;
  interest_rate: number;
  tenure_months: number;
  start_date: string;
  current_outstanding?: number;
  months_elapsed?: number;
}

export default function RepaymentsPage() {
  const [liabilities, setLiabilities] = useState<EnhancedLoanStatus[]>([]);
  const [dbRepayments, setDbRepayments] = useState<Repayment[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showOptimizeModal, setShowOptimizeModal] = useState(false);
  const [showPrepayModal, setShowPrepayModal] = useState(false);
  const [whatIfExtraMonthly, setWhatIfExtraMonthly] = useState<number>(0);
  const [whatIfLumpSum, setWhatIfLumpSum] = useState<number>(0);
  const [whatIfStrategy, setWhatIfStrategy] = useState<'avalanche'|'snowball'>('avalanche');
  const [whatIfKPIs, setWhatIfKPIs] = useState<{payoffMonths?: number; monthsSaved?: number; interestSaved?: number}>({});
  const [loading, setLoading] = useState(true);
  const [engine] = useState(new LoanEngine());

  // Quick Add Form State
  const [formData, setFormData] = useState<Partial<UltraSimpleLiabilityInput>>({
    type: 'personal_loan',
    interest_rate: 12,
    tenure_months: 60,
    start_date: new Date().toISOString().split('T')[0],
    original_amount: 0,
    current_outstanding: 0,
    months_elapsed: 0
  });

  // Load data on component mount
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const repaymentSummary = await fetchRepayments();
      setDbRepayments(repaymentSummary.repayments);
      
      // Convert DB repayments to engine format and calculate
      const enhancedLoans: EnhancedLoanStatus[] = [];
      
      for (const repayment of repaymentSummary.repayments) {
        const input = {
          type: repayment.type as any,
          institution: repayment.institution || 'Unknown',
          original_amount: repayment.principal,
          interest_rate: repayment.interest_rate || 12, // Default to 12% if missing
          tenure_months: repayment.tenure_months,
          start_date: repayment.start_date
        };
        
        const result = engine.calculateEverything(input);
        enhancedLoans.push(result);
      }
      
      setLiabilities(enhancedLoans);
    } catch (error) {
      console.error('Error loading repayments:', error);
    } finally {
      setLoading(false);
    }
  };

  const addLiability = async () => {
    if (!formData.type || !formData.original_amount || !formData.interest_rate || !formData.tenure_months || !formData.start_date) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      const repaymentData = {
        type: formData.type || 'personal_loan',
        institution: 'User Added',
        principal: formData.original_amount || 0,
        interest_rate: formData.interest_rate || 12,
        emi_amount: 0, // Will be calculated
        tenure_months: formData.tenure_months || 60,
        outstanding_balance: formData.current_outstanding || formData.original_amount || 0,
        start_date: formData.start_date || new Date().toISOString().split('T')[0],
        due_date: new Date().toISOString().split('T')[0],
        status: 'active'
      };

      await createRepayment(repaymentData);
      await loadData(); // Reload data
      setShowAddForm(false);
      
      // Reset form
      setFormData({
        type: 'personal_loan',
        interest_rate: 12,
        tenure_months: 60,
        start_date: new Date().toISOString().split('T')[0],
        original_amount: 0,
        current_outstanding: 0,
        months_elapsed: 0
      });
    } catch (error) {
      console.error('Error adding liability:', error);
      alert('Error adding liability. Please try again.');
    }
  };

  // Calculate totals
  const totalOutstanding = liabilities.reduce((sum, loan) => sum + loan.outstandingBalance, 0);
  const totalMonthlyEMI = liabilities.reduce((sum, loan) => sum + (loan.emi || 0), 0);
  const totalInterestAccrued = liabilities.reduce((sum, loan) => sum + (loan.totalInterestAccrued || 0), 0);
  const avgInterestRate = liabilities.length > 0 
    ? liabilities.reduce((sum, loan) => sum + loan.interest_rate, 0) / liabilities.length 
    : 0;

  function computeAmortizedMonths(principal: number, annualRatePct: number, paymentPerMonth: number): number {
    const r = annualRatePct > 0 ? (annualRatePct / 12) / 100 : 0;
    if (principal <= 0) return 0;
    if (r === 0) {
      if (paymentPerMonth <= 0) return Infinity;
      return Math.ceil(principal / paymentPerMonth);
    }
    if (paymentPerMonth <= principal * r) return Infinity; // payment not enough to cover interest
    const n = -Math.log(1 - (r * principal) / paymentPerMonth) / Math.log(1 + r);
    return Math.ceil(Math.max(0, n));
  }

  function recomputeWhatIf() {
    try {
      if (!liabilities || liabilities.length === 0) { setWhatIfKPIs({}); return; }
      // Choose target EMI loan based on strategy
      const emiLoans = liabilities.filter(l => l.loanType === 'emi');
      if (emiLoans.length === 0) { setWhatIfKPIs({}); return; }
      const ordered = whatIfStrategy === 'avalanche'
        ? [...emiLoans].sort((a,b)=> b.interest_rate - a.interest_rate)
        : [...emiLoans].sort((a,b)=> a.outstandingBalance - b.outstandingBalance);
      const target = ordered[0];
      const baselineMonths = Math.max(0, target.remainingMonths || 0);
      const baselineEmi = Math.max(0, target.emi || 0);
      const baselineOutstanding = Math.max(0, target.outstandingBalance || 0);

      // Apply lump sum to principal first (capped by outstanding)
      const appliedLump = Math.min(Math.max(0, whatIfLumpSum || 0), baselineOutstanding);
      const newPrincipal = Math.max(0, baselineOutstanding - appliedLump);
      const newPayment = baselineEmi + Math.max(0, whatIfExtraMonthly || 0);
      const projectedMonths = computeAmortizedMonths(newPrincipal, target.interest_rate, newPayment);

      // Rough interest saved estimate: (baselineEmi * baselineMonths - outstanding) - (newPayment * projectedMonths - newPrincipal)
      const baselineTotalPaid = baselineEmi * baselineMonths;
      const baselineInterestRemaining = Math.max(0, baselineTotalPaid - baselineOutstanding);
      const projectedTotalPaid = newPayment * projectedMonths;
      const projectedInterest = Math.max(0, projectedTotalPaid - newPrincipal);
      const interestSaved = Math.max(0, baselineInterestRemaining - projectedInterest);
      const monthsSaved = Math.max(0, baselineMonths - projectedMonths);

      setWhatIfKPIs({ payoffMonths: projectedMonths, monthsSaved, interestSaved });
    } catch {
      setWhatIfKPIs({});
    }
  }

  if (loading) {
    return (
      <div className="max-w-full space-y-4 pl-2">
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-full space-y-4 pl-2">
      {/* Header - Exact same structure as Plan page */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="text-sm text-muted-foreground">Repayment Management</div>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            leftIcon={<Plus className="h-4 w-4" />} 
            onClick={() => setShowAddForm(true)}
          >
            Add Liability
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            leftIcon={<Zap className="h-4 w-4" />} 
            onClick={() => setShowOptimizeModal(true)}
          >
            Optimize Strategy
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            leftIcon={<Calculator className="h-4 w-4" />} 
            onClick={() => { setShowPrepayModal(true); setTimeout(recomputeWhatIf, 0); }}
          >
            What‑if / Prepay
          </Button>
        </div>
      </div>

      {/* Quick Stats - Same structure as Plan page */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Outstanding</p>
                <p className="text-2xl font-bold text-foreground">
                  ₹{totalOutstanding.toLocaleString()}
                </p>
              </div>
              <div className="p-3 bg-red-100 dark:bg-red-900/20 rounded-xl">
                <DollarSign className="w-5 h-5 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Monthly EMI</p>
                <p className="text-2xl font-bold text-foreground">
                  ₹{totalMonthlyEMI.toLocaleString()}
                </p>
              </div>
              <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-xl">
                <Clock className="w-5 h-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Interest Accrued</p>
                <p className="text-2xl font-bold text-foreground">
                  ₹{totalInterestAccrued.toLocaleString()}
                </p>
              </div>
              <div className="p-3 bg-yellow-100 dark:bg-yellow-900/20 rounded-xl">
                <TrendingUp className="w-5 h-5 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg Interest Rate</p>
                <p className="text-2xl font-bold text-foreground">
                  {avgInterestRate.toFixed(1)}%
                </p>
              </div>
              <div className="p-3 bg-green-100 dark:bg-green-900/20 rounded-xl">
                <Target className="w-5 h-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Liabilities Overview - Clean and Simple */}
      {liabilities.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No Liabilities Added Yet</CardTitle>
            <CardDescription>Add your first liability to start optimizing your repayment strategy</CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={() => setShowAddForm(true)}
              leftIcon={<Plus className="w-4 h-4" />}
            >
              Add Your First Liability
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Your Liabilities</CardTitle>
            <CardDescription>Manage and optimize your debt repayment strategy</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {liabilities.map((loan, index) => (
                <div key={index} className="rounded-lg border border-border bg-card/60 backdrop-blur-sm p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`p-3 rounded-xl ${loanColors[loan.loanCategory]} text-white shrink-0`}>
                        {loanIcons[loan.loanCategory]}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-foreground truncate">
                            {loan.loanCategory.replace('_', ' ').toUpperCase()}
                          </h3>
                          <Badge variant="outline" className="text-[10px] px-1 py-0.5">
                            {loan.loanType.toUpperCase()}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground truncate">
                          ₹{loan.originalAmount.toLocaleString()} • {loan.interest_rate}% APR
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-right">
                      <div>
                        <p className="text-[11px] text-muted-foreground">Outstanding</p>
                        <p className="font-semibold text-foreground text-sm">₹{loan.outstandingBalance.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-[11px] text-muted-foreground">EMI</p>
                        <p className="font-semibold text-foreground text-sm">₹{loan.emi?.toLocaleString() || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-[11px] text-muted-foreground">Remaining</p>
                        <p className="font-semibold text-foreground text-sm">{loan.remainingMonths} mo</p>
                      </div>
                    </div>
                  </div>
                  <div className="mt-3">
                    {(() => {
                      const total = Math.max(loan.originalAmount, loan.outstandingBalance);
                      const completed = Math.max(0, total - loan.outstandingBalance);
                      const pct = total > 0 ? Math.min(100, Math.round((completed / total) * 100)) : 0;
                      return (
                        <div className="flex items-center gap-3">
                          <Progress value={pct} max={100} className="h-1.5 bg-muted" />
                          <span className="text-[11px] text-muted-foreground w-10 text-right">{pct}%</span>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Optimize Modal */}
      <Modal 
        open={showOptimizeModal} 
        onClose={() => setShowOptimizeModal(false)}
        title="Repayment Optimization Analysis"
        footer={
          <Button variant="outline" onClick={() => setShowOptimizeModal(false)}>
            Close
          </Button>
        }
      >
        <div className="space-y-6">
          {liabilities.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Add some liabilities to see optimization strategies</p>
            </div>
          ) : (
            <>
              {/* Current Situation Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Current Situation</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Total Outstanding</p>
                      <p className="font-semibold text-foreground">₹{totalOutstanding.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Monthly EMI</p>
                      <p className="font-semibold text-foreground">₹{totalMonthlyEMI.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Interest Accrued</p>
                      <p className="font-semibold text-foreground">₹{totalInterestAccrued.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Avg Interest Rate</p>
                      <p className="font-semibold text-foreground">{avgInterestRate.toFixed(1)}%</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Strategy Analysis */}
              <div className="space-y-4">
                <h3 className="font-semibold text-foreground">Optimization Strategies</h3>
                
                {/* Avalanche Strategy */}
                <Card className="border-l-4 border-l-red-500">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="p-2 bg-red-100 dark:bg-red-900/20 rounded-lg">
                          <TrendingDown className="w-4 h-4 text-red-600" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-foreground">Avalanche Method</h4>
                          <p className="text-xs text-muted-foreground">Pay highest interest rate loans first</p>
                        </div>
                      </div>
                      <Badge className="bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400 text-xs">
                        Saves Most Money
                      </Badge>
                    </div>
                    
                    {(() => {
                      const highInterestLoans = liabilities
                        .filter(loan => loan.interest_rate >= avgInterestRate)
                        .sort((a, b) => b.interest_rate - a.interest_rate);
                      
                      return highInterestLoans.length > 0 ? (
                        <div className="space-y-2">
                          <p className="text-xs text-muted-foreground mb-2">Priority Order:</p>
                          {highInterestLoans.slice(0, 3).map((loan, index) => (
                            <div key={index} className="flex items-center justify-between p-2 bg-muted rounded-lg text-xs">
                              <div className="flex items-center space-x-2">
                                <div className={`p-1 rounded ${loanColors[loan.loanCategory]} text-white`}>
                                  {loanIcons[loan.loanCategory]}
                                </div>
                                <span className="font-medium">{loan.loanCategory.replace('_', ' ')}</span>
                              </div>
                              <div className="text-right">
                                <div className="font-semibold">₹{loan.outstandingBalance.toLocaleString()}</div>
                                <div className="text-muted-foreground">{loan.interest_rate}% APR</div>
                              </div>
                            </div>
                          ))}
                          <p className="text-xs text-green-600 mt-2">
                            💡 Focus extra payments on highest interest loans to minimize total interest paid
                          </p>
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground">No high-interest loans found</p>
                      );
                    })()}
                  </CardContent>
                </Card>

                {/* Snowball Strategy */}
                <Card className="border-l-4 border-l-blue-500">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                          <Coins className="w-4 h-4 text-blue-600" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-foreground">Snowball Method</h4>
                          <p className="text-xs text-muted-foreground">Pay smallest balance loans first</p>
                        </div>
                      </div>
                      <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400 text-xs">
                        Builds Momentum
                      </Badge>
                    </div>
                    
                    {(() => {
                      const smallBalanceLoans = liabilities
                        .sort((a, b) => a.outstandingBalance - b.outstandingBalance);
                      
                      return smallBalanceLoans.length > 0 ? (
                        <div className="space-y-2">
                          <p className="text-xs text-muted-foreground mb-2">Priority Order:</p>
                          {smallBalanceLoans.slice(0, 3).map((loan, index) => (
                            <div key={index} className="flex items-center justify-between p-2 bg-muted rounded-lg text-xs">
                              <div className="flex items-center space-x-2">
                                <div className={`p-1 rounded ${loanColors[loan.loanCategory]} text-white`}>
                                  {loanIcons[loan.loanCategory]}
                                </div>
                                <span className="font-medium">{loan.loanCategory.replace('_', ' ')}</span>
                              </div>
                              <div className="text-right">
                                <div className="font-semibold">₹{loan.outstandingBalance.toLocaleString()}</div>
                                <div className="text-muted-foreground">{loan.remainingMonths} months left</div>
                              </div>
                            </div>
                          ))}
                          <p className="text-xs text-blue-600 mt-2">
                            💡 Pay off smallest loans first for psychological wins and freed-up cash flow
                          </p>
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground">No loans found</p>
                      );
                    })()}
                  </CardContent>
                </Card>

                {/* Smart Hybrid Strategy */}
                <Card className="border-l-4 border-l-purple-500">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
                          <Star className="w-4 h-4 text-purple-600" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-foreground">Smart Hybrid</h4>
                          <p className="text-xs text-muted-foreground">Balanced approach considering both factors</p>
                        </div>
                      </div>
                      <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400 text-xs">
                        AI Optimized
                      </Badge>
                    </div>
                    
                    {(() => {
                      // Calculate hybrid score: interest rate * 0.7 + (1/balance) * 0.3
                      const hybridLoans = liabilities
                        .map(loan => ({
                          ...loan,
                          hybridScore: (loan.interest_rate * 0.7) + ((1 / (loan.outstandingBalance / 100000)) * 0.3)
                        }))
                        .sort((a, b) => b.hybridScore - a.hybridScore);
                      
                      return hybridLoans.length > 0 ? (
                        <div className="space-y-2">
                          <p className="text-xs text-muted-foreground mb-2">Optimized Priority Order:</p>
                          {hybridLoans.slice(0, 3).map((loan, index) => (
                            <div key={index} className="flex items-center justify-between p-2 bg-muted rounded-lg text-xs">
                              <div className="flex items-center space-x-2">
                                <div className={`p-1 rounded ${loanColors[loan.loanCategory]} text-white`}>
                                  {loanIcons[loan.loanCategory]}
                                </div>
                                <span className="font-medium">{loan.loanCategory.replace('_', ' ')}</span>
                              </div>
                              <div className="text-right">
                                <div className="font-semibold">₹{loan.outstandingBalance.toLocaleString()}</div>
                                <div className="text-muted-foreground">{loan.interest_rate}% APR</div>
                              </div>
                            </div>
                          ))}
                          <p className="text-xs text-purple-600 mt-2">
                            💡 Balanced approach considering both interest rate and loan size for optimal results
                          </p>
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground">No loans found</p>
                      );
                    })()}
                  </CardContent>
                </Card>

                {/* Risk Assessment */}
                <Card className="border-l-4 border-l-orange-500">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="p-2 bg-orange-100 dark:bg-orange-900/20 rounded-lg">
                          <Shield className="w-4 h-4 text-orange-600" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-foreground">Risk Assessment</h4>
                          <p className="text-xs text-muted-foreground">Prioritize high-risk loans first</p>
                        </div>
                      </div>
                      <Badge className="bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400 text-xs">
                        Risk Management
                      </Badge>
                    </div>
                    
                    {(() => {
                      const riskLoans = liabilities
                        .filter(loan => loan.interest_rate > 15 || loan.loanCategory === 'credit_card')
                        .sort((a, b) => b.interest_rate - a.interest_rate);
                      
                      return riskLoans.length > 0 ? (
                        <div className="space-y-2">
                          <p className="text-xs text-muted-foreground mb-2">High-Risk Loans:</p>
                          {riskLoans.map((loan, index) => (
                            <div key={index} className="flex items-center justify-between p-2 bg-muted rounded-lg text-xs">
                              <div className="flex items-center space-x-2">
                                <div className={`p-1 rounded ${loanColors[loan.loanCategory]} text-white`}>
                                  {loanIcons[loan.loanCategory]}
                                </div>
                                <span className="font-medium">{loan.loanCategory.replace('_', ' ')}</span>
                              </div>
                              <div className="text-right">
                                <div className="font-semibold">₹{loan.outstandingBalance.toLocaleString()}</div>
                                <div className="text-muted-foreground">{loan.interest_rate}% APR</div>
                              </div>
                            </div>
                          ))}
                          <p className="text-xs text-orange-600 mt-2">
                            ⚠️ High-interest loans can quickly spiral - prioritize these for financial stability
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <p className="text-xs text-green-600">✅ No high-risk loans detected</p>
                          <p className="text-xs text-muted-foreground">Your current loans have reasonable interest rates</p>
                        </div>
                      );
                    })()}
                  </CardContent>
                </Card>
              </div>

              {/* Recommendations */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">💡 Key Recommendations</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 text-sm">
                    {(() => {
                      const recommendations = [];
                      
                      // High interest rate recommendation
                      const highInterestLoans = liabilities.filter(loan => loan.interest_rate > 15);
                      if (highInterestLoans.length > 0) {
                        recommendations.push(
                          <div key="high-interest" className="flex items-start space-x-2">
                            <div className="w-2 h-2 bg-red-500 rounded-full mt-2"></div>
                            <div>
                              <p className="font-medium text-foreground">Focus on High-Interest Debt</p>
                              <p className="text-muted-foreground">You have {highInterestLoans.length} loan(s) with interest rates above 15%. These should be your top priority.</p>
                            </div>
                          </div>
                        );
                      }
                      
                      // Credit card recommendation
                      const creditCards = liabilities.filter(loan => loan.loanCategory === 'credit_card');
                      if (creditCards.length > 0) {
                        recommendations.push(
                          <div key="credit-card" className="flex items-start space-x-2">
                            <div className="w-2 h-2 bg-orange-500 rounded-full mt-2"></div>
                            <div>
                              <p className="font-medium text-foreground">Credit Card Debt Priority</p>
                              <p className="text-muted-foreground">Credit cards typically have the highest interest rates. Pay these off first if possible.</p>
                            </div>
                          </div>
                        );
                      }
                      
                      // Extra payment recommendation
                      if (totalMonthlyEMI > 0) {
                        recommendations.push(
                          <div key="extra-payment" className="flex items-start space-x-2">
                            <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                            <div>
                              <p className="font-medium text-foreground">Consider Extra Payments</p>
                              <p className="text-muted-foreground">Even small extra payments can significantly reduce your total interest and payoff time.</p>
                            </div>
                          </div>
                        );
                      }
                      
                      return recommendations.length > 0 ? recommendations : (
                        <p className="text-muted-foreground">Add more liabilities to get personalized recommendations</p>
                      );
                    })()}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </Modal>

      {/* What-if / Prepay Modal */}
      <Modal
        open={showPrepayModal}
        onClose={() => setShowPrepayModal(false)}
        title="What‑if / Prepay Calculator"
        footer={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowPrepayModal(false)}>Close</Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium text-foreground">Monthly Extra (₹)</Label>
              <Input 
                type="number" 
                placeholder="5000" 
                className="mt-1"
                value={whatIfExtraMonthly}
                onChange={(e)=> { setWhatIfExtraMonthly(Number(e.target.value||0)); recomputeWhatIf(); }}
              />
            </div>
            <div>
              <Label className="text-sm font-medium text-foreground">One‑time Lump Sum (₹)</Label>
              <Input 
                type="number" 
                placeholder="25000" 
                className="mt-1"
                value={whatIfLumpSum}
                onChange={(e)=> { setWhatIfLumpSum(Number(e.target.value||0)); recomputeWhatIf(); }}
              />
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="text-muted-foreground">Priority:</span>
            <button
              className={`px-2 py-1 rounded border text-xs ${whatIfStrategy==='avalanche' ? 'bg-indigo-600 text-white border-indigo-600' : 'border-border'}`}
              onClick={()=> { setWhatIfStrategy('avalanche'); setTimeout(recomputeWhatIf, 0); }}
            >
              Avalanche
            </button>
            <button
              className={`px-2 py-1 rounded border text-xs ${whatIfStrategy==='snowball' ? 'bg-indigo-600 text-white border-indigo-600' : 'border-border'}`}
              onClick={()=> { setWhatIfStrategy('snowball'); setTimeout(recomputeWhatIf, 0); }}
            >
              Snowball
            </button>
          </div>

          <div className="rounded-lg border border-border bg-card/60 p-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Projected Payoff</p>
                <p className="font-semibold text-foreground">{whatIfKPIs.payoffMonths !== undefined ? `${whatIfKPIs.payoffMonths} months` : '—'}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Interest Saved</p>
                <p className="font-semibold text-foreground">{whatIfKPIs.interestSaved !== undefined ? `₹${Math.round(whatIfKPIs.interestSaved).toLocaleString()}` : '—'}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Months Saved</p>
                <p className="font-semibold text-foreground">{whatIfKPIs.monthsSaved !== undefined ? `${whatIfKPIs.monthsSaved} months` : '—'}</p>
              </div>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">Tip: Use Optimize Strategy to pick which loans to target first.</p>
        </div>
      </Modal>

      {/* Add Liability Modal */}
      {showAddForm && (
        <Modal
          open={showAddForm}
          onClose={() => setShowAddForm(false)}
          title="Add New Liability"
          footer={
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowAddForm(false)}>
                Cancel
              </Button>
              <Button onClick={addLiability} leftIcon={<Plus className="w-4 h-4" />}>
                Add Liability
              </Button>
            </div>
          }
        >
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium text-foreground">Loan Type</Label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({...formData, type: e.target.value})}
                className="w-full mt-1 p-2 border border-border rounded-md bg-background text-foreground"
              >
                <option value="personal_loan">Personal Loan</option>
                <option value="home_loan">Home Loan</option>
                <option value="car_loan">Car Loan</option>
                <option value="education_loan">Education Loan</option>
                <option value="credit_card">Credit Card</option>
                <option value="gold_loan">Gold Loan</option>
                <option value="generic_loan">Generic Loan</option>
              </select>
            </div>

            <div>
              <Label className="text-sm font-medium text-foreground">Original Amount (₹)</Label>
              <Input
                type="number"
                value={formData.original_amount}
                onChange={(e) => setFormData({...formData, original_amount: Number(e.target.value)})}
                placeholder="500000"
                className="mt-1"
              />
            </div>

            <div>
              <Label className="text-sm font-medium text-foreground">Interest Rate (%)</Label>
              <Input
                type="number"
                step="0.1"
                value={formData.interest_rate}
                onChange={(e) => setFormData({...formData, interest_rate: Number(e.target.value)})}
                placeholder="12.5"
                className="mt-1"
              />
            </div>

            <div>
              <Label className="text-sm font-medium text-foreground">Tenure (Months)</Label>
              <Input
                type="number"
                value={formData.tenure_months}
                onChange={(e) => setFormData({...formData, tenure_months: Number(e.target.value)})}
                placeholder="60"
                className="mt-1"
              />
            </div>

            <div>
              <Label className="text-sm font-medium text-foreground">Start Date</Label>
              <Input
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData({...formData, start_date: e.target.value})}
                className="mt-1"
              />
            </div>

            <div>
              <Label className="text-sm font-medium text-foreground">Current Outstanding (₹)</Label>
              <Input
                type="number"
                value={formData.current_outstanding}
                onChange={(e) => setFormData({...formData, current_outstanding: Number(e.target.value)})}
                placeholder="Leave empty to use original amount"
                className="mt-1"
              />
            </div>

            <div>
              <Label className="text-sm font-medium text-foreground">Months Elapsed</Label>
              <Input
                type="number"
                value={formData.months_elapsed}
                onChange={(e) => setFormData({...formData, months_elapsed: Number(e.target.value)})}
                placeholder="0"
                className="mt-1"
              />
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}