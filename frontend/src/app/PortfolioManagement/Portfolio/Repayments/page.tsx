'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/Card';
import { Button } from '../../../components/Button';
import { Input } from '../../../components/Input';
import { Label } from '../../../components/Label';
import { Badge } from '../../../components/Badge';
import { 
  Plus, 
  Calculator, 
  TrendingUp, 
  Target, 
  Clock, 
  DollarSign,
  CreditCard,
  Home,
  Car,
  GraduationCap,
  Gem,
  FileText,
  Zap,
  CheckCircle,
  AlertCircle,
  Info
} from 'lucide-react';
import { LoanEngine, UltraSimpleLiabilityInput, EnhancedLoanStatus, LoanCategory } from '../../domain/Repaymentadvisor/repaymentEngine';
import { fetchRepayments, createRepayment, Repayment, RepaymentFormData } from '../../../../lib/repayments';

// Modern Loan Type Icons
const loanIcons: Record<LoanCategory, React.ReactNode> = {
  home_loan: <Home className="w-5 h-5" />,
  car_loan: <Car className="w-5 h-5" />,
  personal_loan: <FileText className="w-5 h-5" />,
  credit_card: <CreditCard className="w-5 h-5" />,
  gold_loan: <Gem className="w-5 h-5" />,
  education_loan: <GraduationCap className="w-5 h-5" />,
  other: <FileText className="w-5 h-5" />
};

const loanColors: Record<LoanCategory, string> = {
  home_loan: 'bg-blue-500',
  car_loan: 'bg-green-500',
  personal_loan: 'bg-purple-500',
  credit_card: 'bg-red-500',
  gold_loan: 'bg-yellow-500',
  education_loan: 'bg-indigo-500',
  other: 'bg-gray-500'
};

export default function RepaymentsPage() {
  const [liabilities, setLiabilities] = useState<EnhancedLoanStatus[]>([]);
  const [dbRepayments, setDbRepayments] = useState<Repayment[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [showOptimizeModal, setShowOptimizeModal] = useState(false);
  const [showPrepayModal, setShowPrepayModal] = useState(false);
  const [selectedLoanForPrepay, setSelectedLoanForPrepay] = useState<EnhancedLoanStatus | null>(null);
  const [prepayAmount, setPrepayAmount] = useState<number>(0);
  const [prepayFrequency, setPrepayFrequency] = useState<string>('lump_sum');
  const [loading, setLoading] = useState(true);
  const [engine] = useState(new LoanEngine());

  // Quick Add Form State
  const [formData, setFormData] = useState<Partial<UltraSimpleLiabilityInput>>({
    type: 'personal_loan',
    interest_rate: 12,
    institution: '',
    start_date: new Date().toISOString().split('T')[0],
    original_amount: 0,
    tenure_months: undefined
  });

  // Load repayments from database on component mount
  useEffect(() => {
    const loadRepayments = async () => {
      try {
        setLoading(true);
        const summary = await fetchRepayments();
        setDbRepayments(summary.repayments);
        
        // Convert DB repayments to engine format and calculate
        const calculatedLiabilities = summary.repayments.map(repayment => {
          const input: UltraSimpleLiabilityInput = {
            type: repayment.type as LoanCategory,
            interest_rate: repayment.interest_rate,
            institution: repayment.institution,
            start_date: repayment.start_date,
            original_amount: repayment.principal,
            tenure_months: repayment.tenure_months
          };
          return engine.calculateEverything(input);
        });
        
        setLiabilities(calculatedLiabilities);
      } catch (error) {
        console.error('Error loading repayments:', error);
      } finally {
        setLoading(false);
      }
    };

    loadRepayments();
  }, [engine]);

  const addLiability = async () => {
    if (!formData.type || !formData.institution || !formData.original_amount) return;
    
    try {
      // Calculate EMI using the engine first
      const input: UltraSimpleLiabilityInput = {
        type: formData.type as LoanCategory,
        interest_rate: formData.interest_rate || 12,
        institution: formData.institution,
        start_date: formData.start_date || new Date().toISOString().split('T')[0],
        original_amount: formData.original_amount,
        tenure_months: formData.tenure_months
      };

      const result = engine.calculateEverything(input);
      
      // Save to database
      const repaymentData: RepaymentFormData = {
        type: formData.type as string,
        institution: formData.institution,
        principal: formData.original_amount,
        interest_rate: formData.interest_rate || 12,
        emi_amount: result.emi || 0,
        tenure_months: formData.tenure_months || 0, // 0 means no fixed tenure (like credit cards)
        start_date: formData.start_date || new Date().toISOString().split('T')[0],
        due_date: new Date().toISOString().split('T')[0]
      };

      await createRepayment(repaymentData);
      
      // Update local state
      setLiabilities([...liabilities, result]);
      setShowAddForm(false);
      resetForm();
      
      // Reload from database to get the latest data
      const summary = await fetchRepayments();
      setDbRepayments(summary.repayments);
      
    } catch (error) {
      console.error('Error adding liability:', error);
      alert('Failed to add liability. Please try again.');
    }
  };

  const resetForm = () => {
    setFormData({
      type: 'personal_loan',
      interest_rate: 12,
      institution: '',
      start_date: new Date().toISOString().split('T')[0],
      original_amount: 0,
      tenure_months: undefined
    });
  };

  // Calculate Summary Stats
  const totalOutstanding = liabilities.reduce((sum, loan) => sum + loan.outstandingBalance, 0);
  const totalMonthlyEMI = liabilities.reduce((sum, loan) => sum + (loan.emi || 0), 0);
  const totalInterestAccrued = liabilities.reduce((sum, loan) => sum + (loan.totalInterestAccrued || 0), 0);
  const avgInterestRate = liabilities.length > 0 
    ? liabilities.reduce((sum, loan) => sum + (loan.emi ? 12 : 0), 0) / liabilities.length 
    : 0;

  // Calculate repayment strategies
  const calculateAvalancheStrategy = () => {
    return liabilities
      .filter(loan => loan.emi && loan.emi > 0)
      .sort((a, b) => (b.interest_rate || 0) - (a.interest_rate || 0))
      .map(loan => ({
        ...loan,
        priority: 'High Interest First',
        monthlyExtra: 0,
        totalSavings: 0
      }));
  };

  const calculateSnowballStrategy = () => {
    return liabilities
      .filter(loan => loan.emi && loan.emi > 0)
      .sort((a, b) => a.outstandingBalance - b.outstandingBalance)
      .map(loan => ({
        ...loan,
        priority: 'Smallest Balance First',
        monthlyExtra: 0,
        totalSavings: 0
      }));
  };

  const avalancheLoans = calculateAvalancheStrategy();
  const snowballLoans = calculateSnowballStrategy();

  // Calculate prepayment impact
  const calculatePrepaymentImpact = (loan: EnhancedLoanStatus, amount: number, frequency: string) => {
    if (!amount || amount <= 0) {
      return {
        interestSaved: 0,
        monthsSaved: 0,
        newEMI: loan.emi || 0,
        newBalance: loan.outstandingBalance,
        newPayoffDate: new Date()
      };
    }

    const isLumpSum = frequency === 'lump_sum';
    const monthlyRate = (loan.interest_rate || 0) / 100 / 12;
    
    if (isLumpSum) {
      // Lump sum prepayment
      const newBalance = Math.max(0, loan.outstandingBalance - amount);
      const remainingMonths = loan.remainingMonths;
      const interestSaved = amount * monthlyRate * remainingMonths;
      
      return {
        interestSaved,
        monthsSaved: 0, // Lump sum doesn't change EMI
        newEMI: loan.emi || 0,
        newBalance,
        newPayoffDate: new Date(Date.now() + remainingMonths * 30 * 24 * 60 * 60 * 1000)
      };
    } else {
      // Regular extra payment
      const extraMonthly = frequency === 'monthly' ? amount : 
                          frequency === 'quarterly' ? amount / 3 : 
                          frequency === 'yearly' ? amount / 12 : amount;
      
      const newEMI = (loan.emi || 0) + extraMonthly;
      const monthsSaved = Math.floor(loan.outstandingBalance / newEMI);
      const interestSaved = loan.outstandingBalance * monthlyRate * monthsSaved;
      
      return {
        interestSaved,
        monthsSaved,
        newEMI,
        newBalance: loan.outstandingBalance,
        newPayoffDate: new Date(Date.now() + (loan.remainingMonths - monthsSaved) * 30 * 24 * 60 * 60 * 1000)
      };
    }
  };

  // Calculate Smart Hybrid Strategy (combines avalanche + snowball)
  const calculateHybridStrategy = () => {
    const emiLoans = liabilities.filter(loan => loan.emi && loan.emi > 0);
    if (emiLoans.length === 0) return [];
    
    // Sort by interest rate first, then by balance for ties
    return emiLoans.sort((a, b) => {
      const interestDiff = (b.interest_rate || 0) - (a.interest_rate || 0);
      if (Math.abs(interestDiff) < 2) { // If interest rates are close (within 2%)
        return a.outstandingBalance - b.outstandingBalance; // Prefer smaller balance
      }
      return interestDiff; // Otherwise prefer higher interest
    }).map(loan => ({
      ...loan,
      priority: 'Smart Hybrid',
      monthlyExtra: 0,
      totalSavings: 0
    }));
  };

  // Calculate Risk First Strategy (prioritize high-risk loans)
  const calculateRiskFirstStrategy = () => {
    return liabilities
      .filter(loan => loan.emi && loan.emi > 0)
      .sort((a, b) => {
        // Risk score based on interest rate + balance size + remaining tenure
        const riskScoreA = (a.interest_rate || 0) + (a.outstandingBalance / 100000) + (a.remainingMonths / 12);
        const riskScoreB = (b.interest_rate || 0) + (b.outstandingBalance / 100000) + (b.remainingMonths / 12);
        return riskScoreB - riskScoreA;
      })
      .map(loan => ({
        ...loan,
        priority: 'Risk First',
        monthlyExtra: 0,
        totalSavings: 0
      }));
  };

  const hybridLoans = calculateHybridStrategy();
  const riskFirstLoans = calculateRiskFirstStrategy();

  // User input for scenarios
  const [scenarioInputs, setScenarioInputs] = useState({
    extraMonthlyAmount: 5000,
    lumpSumAmount: 50000,
    frequency: 'monthly', // monthly, quarterly, yearly, lump_sum
    selectedStrategy: 'avalanche' // avalanche, snowball, hybrid, risk
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600 dark:text-slate-400">Loading your repayments...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="container mx-auto px-4 py-8">
        
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
                Smart Repayment Hub
              </h1>
              <p className="text-slate-600 dark:text-slate-300">
                Optimize your debt repayment strategy with AI-powered insights
              </p>
            </div>
            <Button 
              onClick={() => setShowAddForm(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200"
            >
              <Plus className="w-5 h-5 mr-2" />
              Add Liability
            </Button>
            <Button 
              onClick={() => setShowOptimizeModal(true)}
              className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200"
            >
              <Zap className="w-5 h-5 mr-2" />
              Optimize All
            </Button>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card className="p-6 shadow-lg bg-white dark:bg-slate-800">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Total Outstanding</p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">
                    ₹{totalOutstanding.toLocaleString()}
                  </p>
                </div>
                <div className="p-3 bg-red-100 dark:bg-red-900/20 rounded-full">
                  <DollarSign className="w-6 h-6 text-red-600" />
                </div>
              </div>
            </Card>

            <Card className="p-6 shadow-lg bg-white dark:bg-slate-800">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Monthly EMI</p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">
                    ₹{totalMonthlyEMI.toLocaleString()}
                  </p>
                </div>
                <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-full">
                  <Clock className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </Card>

            <Card className="p-6 shadow-lg bg-white dark:bg-slate-800">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Interest Accrued</p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">
                    ₹{totalInterestAccrued.toLocaleString()}
                  </p>
                </div>
                <div className="p-3 bg-yellow-100 dark:bg-yellow-900/20 rounded-full">
                  <TrendingUp className="w-6 h-6 text-yellow-600" />
                </div>
              </div>
            </Card>

            <Card className="p-6 shadow-lg bg-white dark:bg-slate-800">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Avg Interest Rate</p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">
                    {avgInterestRate.toFixed(1)}%
                  </p>
                </div>
                <div className="p-3 bg-green-100 dark:bg-green-900/20 rounded-full">
                  <Target className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </Card>
          </div>
        </div>

        {/* Main Content Tabs */}
        <div className="space-y-6">
          <div className="flex space-x-1 bg-white dark:bg-slate-800 p-1 rounded-lg shadow-lg">
            {[
              { id: 'overview', label: 'Overview' },
              { id: 'insights', label: 'Insights' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
            {liabilities.length === 0 ? (
              <Card className="p-12 text-center shadow-lg bg-white dark:bg-slate-800">
                <div className="max-w-md mx-auto">
                  <div className="p-4 bg-blue-100 dark:bg-blue-900/20 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                    <Calculator className="w-8 h-8 text-blue-600" />
                  </div>
                  <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
                    No Liabilities Added Yet
                  </h3>
                  <p className="text-slate-600 dark:text-slate-400 mb-6">
                    Add your first liability to start optimizing your repayment strategy
                  </p>
                  <Button 
                    onClick={() => setShowAddForm(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl"
                  >
                    <Plus className="w-5 h-5 mr-2" />
                    Add Your First Liability
                  </Button>
                </div>
              </Card>
            ) : (
              <div className="grid gap-6">
                {liabilities.map((loan, index) => (
                  <Card key={index} className="p-6 shadow-lg bg-white dark:bg-slate-800 hover:shadow-xl transition-shadow">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <div className={`p-3 rounded-xl ${loanColors[loan.loanCategory]} text-white`}>
                          {loanIcons[loan.loanCategory]}
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                            {loan.loanCategory.replace('_', ' ').toUpperCase()}
                          </h3>
                          <p className="text-sm text-slate-600 dark:text-slate-400">
                            {loan.originalAmount.toLocaleString()} • {loan.interest_rate}% APR
                          </p>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {loan.loanType.toUpperCase()}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      <div className="text-center p-3 bg-slate-50 dark:bg-slate-700 rounded-lg">
                        <p className="text-sm text-slate-600 dark:text-slate-400">Outstanding</p>
                        <p className="text-lg font-semibold text-slate-900 dark:text-white">
                          ₹{loan.outstandingBalance.toLocaleString()}
                        </p>
                      </div>
                      <div className="text-center p-3 bg-slate-50 dark:bg-slate-700 rounded-lg">
                        <p className="text-sm text-slate-600 dark:text-slate-400">EMI</p>
                        <p className="text-lg font-semibold text-slate-900 dark:text-white">
                          ₹{loan.emi?.toLocaleString() || 'N/A'}
                        </p>
                      </div>
                      <div className="text-center p-3 bg-slate-50 dark:bg-slate-700 rounded-lg">
                        <p className="text-sm text-slate-600 dark:text-slate-400">Remaining</p>
                        <p className="text-lg font-semibold text-slate-900 dark:text-white">
                          {loan.remainingMonths} months
                        </p>
                      </div>
                      <div className="text-center p-3 bg-slate-50 dark:bg-slate-700 rounded-lg">
                        <p className="text-sm text-slate-600 dark:text-slate-400">Interest</p>
                        <p className="text-lg font-semibold text-slate-900 dark:text-white">
                          ₹{loan.totalInterestAccrued?.toLocaleString() || '0'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <p className="text-sm text-slate-600 dark:text-slate-400 italic">
                        {loan.explanation}
                      </p>
                      <div className="flex space-x-2">
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="text-xs"
                          onClick={() => {
                            setSelectedLoanForPrepay(loan);
                            setPrepayAmount(0);
                            setPrepayFrequency('lump_sum');
                            setShowPrepayModal(true);
                          }}
                        >
                          <Calculator className="w-4 h-4 mr-1" />
                          Prepay
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
            </div>
          )}

          {/* Optimize Tab - Removed, now in modal */}
          {false && (
            <div className="space-y-6">
              <Card className="p-6 shadow-lg bg-white dark:bg-slate-800">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
                    <Zap className="w-6 h-6 text-green-600" />
                  </div>
                  <h3 className="text-xl font-semibold text-slate-900 dark:text-white">
                    Repayment Optimization
                  </h3>
                </div>
                <p className="text-slate-600 dark:text-slate-400 mb-6">
                  AI-powered strategies to minimize interest and pay off debt faster
                </p>
                
                {liabilities.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-slate-600 dark:text-slate-400">
                      Add some liabilities to see optimization strategies
                    </p>
                  </div>
                ) : (
                  <div className="grid gap-4">
                    {/* Compact Strategy Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Avalanche Strategy */}
                      <div id="strategy-avalanche" className="p-4 border border-slate-200 dark:border-slate-700 rounded-lg">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-semibold text-slate-900 dark:text-white text-sm">Avalanche</h4>
                          <Badge className="bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400 text-xs">
                            High Interest First
                          </Badge>
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-400 mb-3">
                          Pay highest interest first - saves more money
                        </p>
                        
                        {avalancheLoans.length > 0 ? (
                          <div className="space-y-2">
                            {avalancheLoans.slice(0, 3).map((loan, index) => (
                              <div key={index} className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-700 rounded text-xs">
                                <div className="flex items-center space-x-2">
                                  <div className={`p-1 rounded ${loanColors[loan.loanCategory]} text-white`}>
                                    {loanIcons[loan.loanCategory]}
                                  </div>
                                  <div>
                                    <p className="font-medium text-slate-900 dark:text-white">
                                      {loan.loanCategory.replace('_', ' ').toUpperCase()}
                                    </p>
                                    <p className="text-slate-600 dark:text-slate-400">
                                      {loan.interest_rate}% • ₹{loan.outstandingBalance.toLocaleString()}
                                    </p>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <p className="font-medium text-slate-900 dark:text-white">
                                    #{index + 1}
                                  </p>
                                  <p className="text-slate-600 dark:text-slate-400">
                                    {loan.emi ? `₹${loan.emi.toLocaleString()}` : 'No EMI'}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-slate-600 dark:text-slate-400">
                            No EMI-based loans found
                          </p>
                        )}
                      </div>
                    
                      {/* Snowball Strategy */}
                      <div id="strategy-snowball" className="p-4 border border-slate-200 dark:border-slate-700 rounded-lg">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-semibold text-slate-900 dark:text-white text-sm">Snowball</h4>
                          <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400 text-xs">
                            Small Balance First
                          </Badge>
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-400 mb-3">
                          Pay smallest balances first - psychological wins
                        </p>
                        
                        {snowballLoans.length > 0 ? (
                          <div className="space-y-2">
                            {snowballLoans.slice(0, 3).map((loan, index) => (
                              <div key={index} className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-700 rounded text-xs">
                                <div className="flex items-center space-x-2">
                                  <div className={`p-1 rounded ${loanColors[loan.loanCategory]} text-white`}>
                                    {loanIcons[loan.loanCategory]}
                                  </div>
                                  <div>
                                    <p className="font-medium text-slate-900 dark:text-white">
                                      {loan.loanCategory.replace('_', ' ').toUpperCase()}
                                    </p>
                                    <p className="text-slate-600 dark:text-slate-400">
                                      {loan.interest_rate}% • ₹{loan.outstandingBalance.toLocaleString()}
                                    </p>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <p className="font-medium text-slate-900 dark:text-white">
                                    #{index + 1}
                                  </p>
                                  <p className="text-slate-600 dark:text-slate-400">
                                    {loan.emi ? `₹${loan.emi.toLocaleString()}` : 'No EMI'}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-slate-600 dark:text-slate-400">
                            No EMI-based loans found
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Second Row */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                      {/* Smart Hybrid Strategy */}
                      <div id="strategy-hybrid" className="p-4 border border-slate-200 dark:border-slate-700 rounded-lg">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-semibold text-slate-900 dark:text-white text-sm">Smart Hybrid</h4>
                          <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400 text-xs">
                            Best of Both
                          </Badge>
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-400 mb-3">
                          High interest first, small balance when rates close
                        </p>
                        
                        {hybridLoans.length > 0 ? (
                          <div className="space-y-2">
                            {hybridLoans.slice(0, 3).map((loan, index) => (
                              <div key={index} className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-700 rounded text-xs">
                                <div className="flex items-center space-x-2">
                                  <div className={`p-1 rounded ${loanColors[loan.loanCategory]} text-white`}>
                                    {loanIcons[loan.loanCategory]}
                                  </div>
                                  <div>
                                    <p className="font-medium text-slate-900 dark:text-white">
                                      {loan.loanCategory.replace('_', ' ').toUpperCase()}
                                    </p>
                                    <p className="text-slate-600 dark:text-slate-400">
                                      {loan.interest_rate}% • ₹{loan.outstandingBalance.toLocaleString()}
                                    </p>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <p className="font-medium text-slate-900 dark:text-white">
                                    #{index + 1}
                                  </p>
                                  <p className="text-slate-600 dark:text-slate-400">
                                    {loan.emi ? `₹${loan.emi.toLocaleString()}` : 'No EMI'}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-slate-600 dark:text-slate-400">
                            No EMI-based loans found
                          </p>
                        )}
                      </div>

                      {/* Risk First Strategy */}
                      <div id="strategy-risk" className="p-4 border border-slate-200 dark:border-slate-700 rounded-lg">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-semibold text-slate-900 dark:text-white text-sm">Risk First</h4>
                          <Badge className="bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400 text-xs">
                            High Risk
                          </Badge>
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-400 mb-3">
                          Prioritizes highest risk loans (rate + balance + tenure)
                        </p>
                        
                        {riskFirstLoans.length > 0 ? (
                          <div className="space-y-2">
                            {riskFirstLoans.slice(0, 3).map((loan, index) => {
                              const riskScore = (loan.interest_rate || 0) + (loan.outstandingBalance / 100000) + (loan.remainingMonths / 12);
                              return (
                                <div key={index} className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-700 rounded text-xs">
                                  <div className="flex items-center space-x-2">
                                    <div className={`p-1 rounded ${loanColors[loan.loanCategory]} text-white`}>
                                      {loanIcons[loan.loanCategory]}
                                    </div>
                                    <div>
                                      <p className="font-medium text-slate-900 dark:text-white">
                                        {loan.loanCategory.replace('_', ' ').toUpperCase()}
                                      </p>
                                      <p className="text-slate-600 dark:text-slate-400">
                                        {loan.interest_rate}% • ₹{loan.outstandingBalance.toLocaleString()}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <p className="font-medium text-slate-900 dark:text-white">
                                      #{index + 1}
                                    </p>
                                    <p className="text-slate-600 dark:text-slate-400">
                                      Risk: {riskScore.toFixed(1)} • {loan.emi ? `₹${loan.emi.toLocaleString()}` : 'No EMI'}
                                    </p>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <p className="text-xs text-slate-600 dark:text-slate-400">
                            No EMI-based loans found
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </Card>
            </div>
          )}

          {/* Scenarios Tab - Removed, now in modal */}
          {false && (
            <div className="space-y-6">
              <Card className="p-6 shadow-lg bg-white dark:bg-slate-800">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
                    <Calculator className="w-6 h-6 text-purple-600" />
                  </div>
                  <h3 className="text-xl font-semibold text-slate-900 dark:text-white">
                    What-If Scenarios
                  </h3>
                </div>
                <p className="text-slate-600 dark:text-slate-400 mb-6">
                  Test different repayment strategies and see the impact
                </p>
                
                {liabilities.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-slate-600 dark:text-slate-400">
                      Add some liabilities to see scenario calculations
                    </p>
                  </div>
                ) : (
                  <div className="grid gap-6">
                    {/* User Input Controls */}
                    <div id="scenario-inputs" className="p-4 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-700">
                      <h4 className="font-semibold text-slate-900 dark:text-white mb-4">
                        Scenario Inputs
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div>
                          <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                            Amount (₹)
                          </Label>
                          <Input
                            type="number"
                            value={scenarioInputs.frequency === 'lump_sum' ? scenarioInputs.lumpSumAmount : scenarioInputs.extraMonthlyAmount}
                            onChange={(e) => {
                              const value = Number(e.target.value);
                              if (scenarioInputs.frequency === 'lump_sum') {
                                setScenarioInputs({...scenarioInputs, lumpSumAmount: value});
                              } else {
                                setScenarioInputs({...scenarioInputs, extraMonthlyAmount: value});
                              }
                            }}
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                            Frequency
                          </Label>
                          <select
                            value={scenarioInputs.frequency}
                            onChange={(e) => setScenarioInputs({...scenarioInputs, frequency: e.target.value})}
                            className="w-full mt-1 p-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                          >
                            <option value="monthly">Monthly</option>
                            <option value="quarterly">Quarterly</option>
                            <option value="yearly">Yearly</option>
                            <option value="lump_sum">Lump Sum</option>
                          </select>
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                            Strategy
                          </Label>
                          <select
                            value={scenarioInputs.selectedStrategy}
                            onChange={(e) => setScenarioInputs({...scenarioInputs, selectedStrategy: e.target.value})}
                            className="w-full mt-1 p-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                          >
                            <option value="avalanche">Avalanche (High Interest First)</option>
                            <option value="snowball">Snowball (Small Balance First)</option>
                            <option value="hybrid">Smart Hybrid</option>
                            <option value="risk">Risk First</option>
                          </select>
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                            Show All Strategies
                          </Label>
                          <Button
                            onClick={() => setScenarioInputs({...scenarioInputs, selectedStrategy: 'all'})}
                            className="w-full mt-1 bg-blue-600 hover:bg-blue-700 text-white text-sm"
                          >
                            Compare All 4
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* Scenario Results */}
                    <div className="p-4 border border-slate-200 dark:border-slate-700 rounded-lg">
                      <h4 className="font-semibold text-slate-900 dark:text-white mb-3">
                        {scenarioInputs.frequency === 'lump_sum' 
                          ? `₹${scenarioInputs.lumpSumAmount.toLocaleString()} Lump Sum Prepayment`
                          : `₹${scenarioInputs.extraMonthlyAmount.toLocaleString()} ${scenarioInputs.frequency.charAt(0).toUpperCase() + scenarioInputs.frequency.slice(1)} Payment`
                        }
                      </h4>
                      <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                        {scenarioInputs.selectedStrategy === 'all' 
                          ? 'Comparison across all 4 strategies'
                          : `Apply payment using ${scenarioInputs.selectedStrategy} strategy`
                        }
                      </p>
                      
                      {(() => {
                        const strategies = scenarioInputs.selectedStrategy === 'all' 
                          ? [
                              { name: 'Avalanche', loans: avalancheLoans, color: 'red' },
                              { name: 'Snowball', loans: snowballLoans, color: 'blue' },
                              { name: 'Smart Hybrid', loans: hybridLoans, color: 'purple' },
                              { name: 'Risk First', loans: riskFirstLoans, color: 'orange' }
                            ]
                          : [{
                              name: scenarioInputs.selectedStrategy.charAt(0).toUpperCase() + scenarioInputs.selectedStrategy.slice(1),
                              loans: scenarioInputs.selectedStrategy === 'avalanche' ? avalancheLoans :
                                     scenarioInputs.selectedStrategy === 'snowball' ? snowballLoans :
                                     scenarioInputs.selectedStrategy === 'hybrid' ? hybridLoans : riskFirstLoans,
                              color: scenarioInputs.selectedStrategy === 'avalanche' ? 'red' :
                                     scenarioInputs.selectedStrategy === 'snowball' ? 'blue' :
                                     scenarioInputs.selectedStrategy === 'hybrid' ? 'purple' : 'orange'
                            }];

                        return strategies.map((strategy, strategyIndex) => {
                          const loans = strategy.loans;
                          if (loans.length === 0) return null;

                          return (
                            <div key={strategyIndex} className="mb-6">
                              <div className="flex items-center space-x-2 mb-3">
                                <div className={`w-3 h-3 rounded-full bg-${strategy.color}-500`}></div>
                                <h5 className="font-semibold text-slate-900 dark:text-white text-sm">
                                  {strategy.name} Strategy
                                </h5>
                              </div>
                              
                              <div className="space-y-2">
                                {loans.slice(0, 3).map((loan, index) => {
                                  const isLumpSum = scenarioInputs.frequency === 'lump_sum';
                                  const paymentAmount = isLumpSum ? scenarioInputs.lumpSumAmount : scenarioInputs.extraMonthlyAmount;
                                  const extraPayment = index === 0 ? paymentAmount : 0;
                                  
                                  let newEMI, monthsSaved, interestSaved, newBalance;
                                  
                                  if (isLumpSum) {
                                    newBalance = Math.max(0, loan.outstandingBalance - extraPayment);
                                    interestSaved = extraPayment > 0 ? (extraPayment * (loan.interest_rate || 0) / 100) * (loan.remainingMonths / 12) : 0;
                                    newEMI = loan.emi || 0;
                                    monthsSaved = 0; // Lump sum doesn't change EMI, just reduces balance
                                  } else {
                                    newEMI = (loan.emi || 0) + extraPayment;
                                    monthsSaved = extraPayment > 0 ? Math.floor(loan.outstandingBalance / newEMI) : 0;
                                    interestSaved = extraPayment > 0 ? (loan.outstandingBalance * (loan.interest_rate || 0) / 100) * (monthsSaved / 12) : 0;
                                    newBalance = loan.outstandingBalance;
                                  }
                            
                                  return (
                                    <div key={index} className="p-2 bg-slate-50 dark:bg-slate-700 rounded text-xs">
                                      <div className="flex items-center justify-between">
                                        <div className="flex items-center space-x-2">
                                          <div className={`p-1 rounded ${loanColors[loan.loanCategory]} text-white`}>
                                            {loanIcons[loan.loanCategory]}
                                          </div>
                                          <div>
                                            <p className="font-medium text-slate-900 dark:text-white">
                                              {loan.loanCategory.replace('_', ' ').toUpperCase()}
                                            </p>
                                            <p className="text-slate-600 dark:text-slate-400">
                                              {loan.interest_rate}% • ₹{loan.outstandingBalance.toLocaleString()}
                                            </p>
                                          </div>
                                        </div>
                                        <div className="text-right">
                                          {extraPayment > 0 ? (
                                            <>
                                              {isLumpSum ? (
                                                <>
                                                  <p className="font-medium text-green-600">
                                                    New Balance: ₹{newBalance.toLocaleString()}
                                                  </p>
                                                  <p className="text-slate-600 dark:text-slate-400">
                                                    Interest Saved: ₹{interestSaved.toLocaleString()}
                                                  </p>
                                                </>
                                              ) : (
                                                <>
                                                  <p className="font-medium text-green-600">
                                                    New EMI: ₹{newEMI.toLocaleString()}
                                                  </p>
                                                  <p className="text-slate-600 dark:text-slate-400">
                                                    Save {monthsSaved} months • ₹{interestSaved.toLocaleString()} interest
                                                  </p>
                                                </>
                                              )}
                                            </>
                                          ) : (
                                            <p className="text-slate-600 dark:text-slate-400">
                                              {isLumpSum ? 'No prepayment' : `Standard EMI: ₹${(loan.emi || 0).toLocaleString()}`}
                                            </p>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        }).filter(Boolean);
                      })()}
                    </div>
                  </div>
                )}
              </Card>
            </div>
          )}

          {/* Insights Tab */}
          {activeTab === 'insights' && (
            <div className="space-y-6">
            <Card className="p-6 shadow-lg bg-white dark:bg-slate-800">
              <div className="flex items-center space-x-3 mb-4">
                <div className="p-2 bg-indigo-100 dark:bg-indigo-900/20 rounded-lg">
                  <TrendingUp className="w-6 h-6 text-indigo-600" />
                </div>
                <h3 className="text-xl font-semibold text-slate-900 dark:text-white">
                  Smart Insights
                </h3>
              </div>
              <p className="text-slate-600 dark:text-slate-400 mb-6">
                AI-generated recommendations based on your debt profile
              </p>
              
              <div className="space-y-4">
                <div className="flex items-start space-x-3 p-4 bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800 rounded-lg">
                  <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-green-800 dark:text-green-400">
                      Refinancing Opportunity
                    </h4>
                    <p className="text-sm text-green-700 dark:text-green-300">
                      Your home loan rate is 2% higher than current market rates
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3 p-4 bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-yellow-800 dark:text-yellow-400">
                      High Interest Alert
                    </h4>
                    <p className="text-sm text-yellow-700 dark:text-yellow-300">
                      Credit card balance is accruing ₹2,500 monthly in interest
                    </p>
                  </div>
                </div>
              </div>
            </Card>
            </div>
          )}
        </div>

        {/* Optimize Modal */}
        {showOptimizeModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="w-full max-w-6xl max-h-[90vh] overflow-y-auto">
              <Card className="p-6 border-0 shadow-2xl bg-white dark:bg-slate-800">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
                      <Zap className="w-6 h-6 text-green-600" />
                    </div>
                    <h3 className="text-xl font-semibold text-slate-900 dark:text-white">
                      Repayment Optimization Strategies
                    </h3>
                  </div>
                  <Button
                    onClick={() => setShowOptimizeModal(false)}
                    variant="outline"
                    size="sm"
                  >
                    ✕
                  </Button>
                </div>
                
                <p className="text-slate-600 dark:text-slate-400 mb-6">
                  AI-powered strategies to minimize interest and pay off debt faster
                </p>
                
                {liabilities.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-slate-600 dark:text-slate-400">
                      Add some liabilities to see optimization strategies
                    </p>
                  </div>
                ) : (
                  <div className="grid gap-4">
                    {/* Compact Strategy Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Avalanche Strategy */}
                      <div className="p-4 border border-slate-200 dark:border-slate-700 rounded-lg">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-semibold text-slate-900 dark:text-white text-sm">Avalanche</h4>
                          <Badge className="bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400 text-xs">
                            High Interest First
                          </Badge>
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-400 mb-3">
                          Pay highest interest first - saves more money
                        </p>
                        
                        {avalancheLoans.length > 0 ? (
                          <div className="space-y-2">
                            {avalancheLoans.slice(0, 3).map((loan, index) => (
                              <div key={index} className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-700 rounded text-xs">
                                <div className="flex items-center space-x-2">
                                  <div className={`p-1 rounded ${loanColors[loan.loanCategory]} text-white`}>
                                    {loanIcons[loan.loanCategory]}
                                  </div>
                                  <div>
                                    <p className="font-medium text-slate-900 dark:text-white">
                                      {loan.loanCategory.replace('_', ' ').toUpperCase()}
                                    </p>
                                    <p className="text-slate-600 dark:text-slate-400">
                                      {loan.interest_rate}% • ₹{loan.outstandingBalance.toLocaleString()}
                                    </p>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <p className="font-medium text-slate-900 dark:text-white">
                                    #{index + 1}
                                  </p>
                                  <p className="text-slate-600 dark:text-slate-400">
                                    {loan.emi ? `₹${loan.emi.toLocaleString()}` : 'No EMI'}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-slate-600 dark:text-slate-400">
                            No EMI-based loans found
                          </p>
                        )}
                      </div>
                    
                      {/* Snowball Strategy */}
                      <div className="p-4 border border-slate-200 dark:border-slate-700 rounded-lg">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-semibold text-slate-900 dark:text-white text-sm">Snowball</h4>
                          <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400 text-xs">
                            Small Balance First
                          </Badge>
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-400 mb-3">
                          Pay smallest balances first - psychological wins
                        </p>
                        
                        {snowballLoans.length > 0 ? (
                          <div className="space-y-2">
                            {snowballLoans.slice(0, 3).map((loan, index) => (
                              <div key={index} className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-700 rounded text-xs">
                                <div className="flex items-center space-x-2">
                                  <div className={`p-1 rounded ${loanColors[loan.loanCategory]} text-white`}>
                                    {loanIcons[loan.loanCategory]}
                                  </div>
                                  <div>
                                    <p className="font-medium text-slate-900 dark:text-white">
                                      {loan.loanCategory.replace('_', ' ').toUpperCase()}
                                    </p>
                                    <p className="text-slate-600 dark:text-slate-400">
                                      {loan.interest_rate}% • ₹{loan.outstandingBalance.toLocaleString()}
                                    </p>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <p className="font-medium text-slate-900 dark:text-white">
                                    #{index + 1}
                                  </p>
                                  <p className="text-slate-600 dark:text-slate-400">
                                    {loan.emi ? `₹${loan.emi.toLocaleString()}` : 'No EMI'}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-slate-600 dark:text-slate-400">
                            No EMI-based loans found
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Second Row */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Smart Hybrid Strategy */}
                      <div className="p-4 border border-slate-200 dark:border-slate-700 rounded-lg">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-semibold text-slate-900 dark:text-white text-sm">Smart Hybrid</h4>
                          <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400 text-xs">
                            Best of Both
                          </Badge>
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-400 mb-3">
                          High interest first, small balance when rates close
                        </p>
                        
                        {hybridLoans.length > 0 ? (
                          <div className="space-y-2">
                            {hybridLoans.slice(0, 3).map((loan, index) => (
                              <div key={index} className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-700 rounded text-xs">
                                <div className="flex items-center space-x-2">
                                  <div className={`p-1 rounded ${loanColors[loan.loanCategory]} text-white`}>
                                    {loanIcons[loan.loanCategory]}
                                  </div>
                                  <div>
                                    <p className="font-medium text-slate-900 dark:text-white">
                                      {loan.loanCategory.replace('_', ' ').toUpperCase()}
                                    </p>
                                    <p className="text-slate-600 dark:text-slate-400">
                                      {loan.interest_rate}% • ₹{loan.outstandingBalance.toLocaleString()}
                                    </p>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <p className="font-medium text-slate-900 dark:text-white">
                                    #{index + 1}
                                  </p>
                                  <p className="text-slate-600 dark:text-slate-400">
                                    {loan.emi ? `₹${loan.emi.toLocaleString()}` : 'No EMI'}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-slate-600 dark:text-slate-400">
                            No EMI-based loans found
                          </p>
                        )}
                      </div>

                      {/* Risk First Strategy */}
                      <div className="p-4 border border-slate-200 dark:border-slate-700 rounded-lg">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-semibold text-slate-900 dark:text-white text-sm">Risk First</h4>
                          <Badge className="bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400 text-xs">
                            High Risk
                          </Badge>
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-400 mb-3">
                          Prioritizes highest risk loans (rate + balance + tenure)
                        </p>
                        
                        {riskFirstLoans.length > 0 ? (
                          <div className="space-y-2">
                            {riskFirstLoans.slice(0, 3).map((loan, index) => {
                              const riskScore = (loan.interest_rate || 0) + (loan.outstandingBalance / 100000) + (loan.remainingMonths / 12);
                              return (
                                <div key={index} className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-700 rounded text-xs">
                                  <div className="flex items-center space-x-2">
                                    <div className={`p-1 rounded ${loanColors[loan.loanCategory]} text-white`}>
                                      {loanIcons[loan.loanCategory]}
                                    </div>
                                    <div>
                                      <p className="font-medium text-slate-900 dark:text-white">
                                        {loan.loanCategory.replace('_', ' ').toUpperCase()}
                                      </p>
                                      <p className="text-slate-600 dark:text-slate-400">
                                        {loan.interest_rate}% • ₹{loan.outstandingBalance.toLocaleString()}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <p className="font-medium text-slate-900 dark:text-white">
                                      #{index + 1}
                                    </p>
                                    <p className="text-slate-600 dark:text-slate-400">
                                      Risk: {riskScore.toFixed(1)} • {loan.emi ? `₹${loan.emi.toLocaleString()}` : 'No EMI'}
                                    </p>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <p className="text-xs text-slate-600 dark:text-slate-400">
                            No EMI-based loans found
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </Card>
            </div>
          </div>
        )}

        {/* Prepay Modal */}
        {showPrepayModal && selectedLoanForPrepay && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <Card className="p-6 border-0 shadow-2xl bg-white dark:bg-slate-800">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
                      <Calculator className="w-6 h-6 text-purple-600" />
                    </div>
                    <h3 className="text-xl font-semibold text-slate-900 dark:text-white">
                      Prepayment Analysis
                    </h3>
                  </div>
                  <Button
                    onClick={() => setShowPrepayModal(false)}
                    variant="outline"
                    size="sm"
                  >
                    ✕
                  </Button>
                </div>
                
                {/* Selected Loan Info */}
                <div className="mb-6 p-4 bg-slate-50 dark:bg-slate-700 rounded-lg">
                  <div className="flex items-center space-x-3 mb-3">
                    <div className={`p-2 rounded-lg ${loanColors[selectedLoanForPrepay.loanCategory]} text-white`}>
                      {loanIcons[selectedLoanForPrepay.loanCategory]}
                    </div>
                    <div>
                      <h4 className="font-semibold text-slate-900 dark:text-white">
                        {selectedLoanForPrepay.loanCategory.replace('_', ' ').toUpperCase()}
                      </h4>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        {selectedLoanForPrepay.interest_rate}% • ₹{selectedLoanForPrepay.outstandingBalance.toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-slate-600 dark:text-slate-400">Current EMI</p>
                      <p className="font-semibold text-slate-900 dark:text-white">
                        ₹{selectedLoanForPrepay.emi?.toLocaleString() || 'N/A'}
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-600 dark:text-slate-400">Remaining</p>
                      <p className="font-semibold text-slate-900 dark:text-white">
                        {selectedLoanForPrepay.remainingMonths} months
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-600 dark:text-slate-400">Interest Rate</p>
                      <p className="font-semibold text-slate-900 dark:text-white">
                        {selectedLoanForPrepay.interest_rate}%
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-600 dark:text-slate-400">Outstanding</p>
                      <p className="font-semibold text-slate-900 dark:text-white">
                        ₹{selectedLoanForPrepay.outstandingBalance.toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Prepayment Inputs */}
                <div className="mb-6">
                  <h4 className="font-semibold text-slate-900 dark:text-white mb-4">
                    Prepayment Details
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        Amount (₹)
                      </Label>
                      <Input
                        type="number"
                        value={prepayAmount || ''}
                        onChange={(e) => setPrepayAmount(Number(e.target.value))}
                        placeholder="Enter prepayment amount"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        Frequency
                      </Label>
                      <select 
                        value={prepayFrequency}
                        onChange={(e) => setPrepayFrequency(e.target.value)}
                        className="w-full mt-1 p-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                      >
                        <option value="lump_sum">Lump Sum</option>
                        <option value="monthly">Monthly Extra</option>
                        <option value="quarterly">Quarterly Extra</option>
                        <option value="yearly">Yearly Extra</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Impact Analysis */}
                <div className="mb-6">
                  <h4 className="font-semibold text-slate-900 dark:text-white mb-4">
                    Impact Analysis
                  </h4>
                  {(() => {
                    const impact = calculatePrepaymentImpact(selectedLoanForPrepay, prepayAmount, prepayFrequency);
                    return (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-4 bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800 rounded-lg">
                          <h5 className="font-semibold text-green-800 dark:text-green-400 mb-2">
                            Savings
                          </h5>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-green-700 dark:text-green-300">Interest Saved:</span>
                              <span className="font-semibold text-green-800 dark:text-green-400">
                                ₹{impact.interestSaved.toLocaleString()}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-green-700 dark:text-green-300">Months Saved:</span>
                              <span className="font-semibold text-green-800 dark:text-green-400">
                                {impact.monthsSaved} months
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-green-700 dark:text-green-300">New Payoff Date:</span>
                              <span className="font-semibold text-green-800 dark:text-green-400">
                                {impact.newPayoffDate.toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="p-4 bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 rounded-lg">
                          <h5 className="font-semibold text-blue-800 dark:text-blue-400 mb-2">
                            New Terms
                          </h5>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-blue-700 dark:text-blue-300">New EMI:</span>
                              <span className="font-semibold text-blue-800 dark:text-blue-400">
                                ₹{impact.newEMI.toLocaleString()}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-blue-700 dark:text-blue-300">New Balance:</span>
                              <span className="font-semibold text-blue-800 dark:text-blue-400">
                                ₹{impact.newBalance.toLocaleString()}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-blue-700 dark:text-blue-300">Remaining Months:</span>
                              <span className="font-semibold text-blue-800 dark:text-blue-400">
                                {selectedLoanForPrepay.remainingMonths - impact.monthsSaved} months
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* Action Buttons */}
                <div className="flex space-x-3">
                  <Button
                    onClick={() => setShowPrepayModal(false)}
                    variant="outline"
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                  >
                    Apply Prepayment
                  </Button>
                </div>
              </Card>
            </div>
          </div>
        )}

        {/* Add Liability Modal */}
        {showAddForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-md p-6 border-0 shadow-2xl bg-white dark:bg-slate-800">
              <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">
                Add New Liability
              </h3>
              
              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    Loan Type
                  </Label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({...formData, type: e.target.value as LoanCategory})}
                    className="w-full mt-1 p-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                  >
                    <option value="home_loan">Home Loan</option>
                    <option value="car_loan">Car Loan</option>
                    <option value="personal_loan">Personal Loan</option>
                    <option value="credit_card">Credit Card</option>
                    <option value="gold_loan">Gold Loan</option>
                    <option value="education_loan">Education Loan</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    Institution
                  </Label>
                  <Input
                    value={formData.institution}
                    onChange={(e) => setFormData({...formData, institution: e.target.value})}
                    placeholder="e.g., HDFC Bank"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    Original Amount (₹)
                  </Label>
                  <Input
                    type="number"
                    value={formData.original_amount}
                    onChange={(e) => setFormData({...formData, original_amount: Number(e.target.value)})}
                    placeholder="500000"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    Interest Rate (%)
                  </Label>
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
                  <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    Start Date
                  </Label>
                  <Input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({...formData, start_date: e.target.value})}
                    className="mt-1"
                  />
                </div>

                {/* Only show tenure for EMI-based loans */}
                {formData.type && !['credit_card'].includes(formData.type) && (
                  <div>
                    <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      Tenure (months) - Optional
                    </Label>
                    <Input
                      type="number"
                      value={formData.tenure_months || ''}
                      onChange={(e) => setFormData({...formData, tenure_months: e.target.value ? Number(e.target.value) : undefined})}
                      placeholder="Leave empty for default tenure"
                      className="mt-1"
                    />
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      Leave empty to use default tenure based on loan type
                    </p>
                  </div>
                )}
                
                {/* Show info for non-EMI loans */}
                {formData.type && ['credit_card'].includes(formData.type) && (
                  <div className="p-3 bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 rounded-lg">
                    <p className="text-sm text-blue-800 dark:text-blue-400">
                      <Info className="w-4 h-4 inline mr-1" />
                      Credit cards don't have fixed tenure - they're revolving credit
                    </p>
                  </div>
                )}
              </div>

              <div className="flex space-x-3 mt-6">
                <Button
                  onClick={() => setShowAddForm(false)}
                  variant="outline"
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={resetForm}
                  variant="outline"
                  className="flex-1"
                >
                  Reset
                </Button>
                <Button
                  onClick={addLiability}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Add Liability
                </Button>
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}