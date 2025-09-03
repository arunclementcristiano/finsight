'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  const [showAddForm, setShowAddForm] = useState(false);
  const [engine] = useState(new LoanEngine());

  // Quick Add Form State
  const [formData, setFormData] = useState<Partial<UltraSimpleLiabilityInput>>({
    type: 'personal_loan',
    interest_rate: 12,
    institution: '',
    start_date: new Date().toISOString().split('T')[0],
    original_amount: 0,
    tenure_months: 36
  });

  const addLiability = () => {
    if (!formData.type || !formData.institution || !formData.original_amount) return;
    
    const input: UltraSimpleLiabilityInput = {
      type: formData.type as LoanCategory,
      interest_rate: formData.interest_rate || 12,
      institution: formData.institution,
      start_date: formData.start_date || new Date().toISOString().split('T')[0],
      original_amount: formData.original_amount,
      tenure_months: formData.tenure_months
    };

    const result = engine.calculateEverything(input);
    setLiabilities([...liabilities, result]);
    setShowAddForm(false);
    setFormData({
      type: 'personal_loan',
      interest_rate: 12,
      institution: '',
      start_date: new Date().toISOString().split('T')[0],
      original_amount: 0,
      tenure_months: 36
    });
  };

  // Calculate Summary Stats
  const totalOutstanding = liabilities.reduce((sum, loan) => sum + loan.outstandingBalance, 0);
  const totalMonthlyEMI = liabilities.reduce((sum, loan) => sum + (loan.emi || 0), 0);
  const totalInterestAccrued = liabilities.reduce((sum, loan) => sum + (loan.totalInterestAccrued || 0), 0);
  const avgInterestRate = liabilities.length > 0 
    ? liabilities.reduce((sum, loan) => sum + (loan.emi ? 12 : 0), 0) / liabilities.length 
    : 0;

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
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card className="p-6 border-0 shadow-lg bg-white dark:bg-slate-800">
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

            <Card className="p-6 border-0 shadow-lg bg-white dark:bg-slate-800">
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

            <Card className="p-6 border-0 shadow-lg bg-white dark:bg-slate-800">
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

            <Card className="p-6 border-0 shadow-lg bg-white dark:bg-slate-800">
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
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 bg-white dark:bg-slate-800 shadow-lg">
            <TabsTrigger value="overview" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
              Overview
            </TabsTrigger>
            <TabsTrigger value="optimize" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
              Optimize
            </TabsTrigger>
            <TabsTrigger value="scenarios" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
              Scenarios
            </TabsTrigger>
            <TabsTrigger value="insights" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
              Insights
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {liabilities.length === 0 ? (
              <Card className="p-12 text-center border-0 shadow-lg bg-white dark:bg-slate-800">
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
                  <Card key={index} className="p-6 border-0 shadow-lg bg-white dark:bg-slate-800 hover:shadow-xl transition-shadow">
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
                        <Button size="sm" variant="outline" className="text-xs">
                          <Zap className="w-4 h-4 mr-1" />
                          Optimize
                        </Button>
                        <Button size="sm" variant="outline" className="text-xs">
                          <Calculator className="w-4 h-4 mr-1" />
                          Prepay
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Optimize Tab */}
          <TabsContent value="optimize" className="space-y-6">
            <Card className="p-6 border-0 shadow-lg bg-white dark:bg-slate-800">
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
              
              <div className="grid gap-4">
                <div className="p-4 border border-slate-200 dark:border-slate-700 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold text-slate-900 dark:text-white">Avalanche Method</h4>
                    <Badge className="bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400">
                      Highest Interest First
                    </Badge>
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Pay extra towards the highest interest rate loan first
                  </p>
                </div>
                
                <div className="p-4 border border-slate-200 dark:border-slate-700 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold text-slate-900 dark:text-white">Snowball Method</h4>
                    <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400">
                      Smallest Balance First
                    </Badge>
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Pay off smallest balances first for psychological wins
                  </p>
                </div>
              </div>
            </Card>
          </TabsContent>

          {/* Scenarios Tab */}
          <TabsContent value="scenarios" className="space-y-6">
            <Card className="p-6 border-0 shadow-lg bg-white dark:bg-slate-800">
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
              
              <div className="grid gap-4">
                <div className="p-4 bg-slate-50 dark:bg-slate-700 rounded-lg">
                  <h4 className="font-semibold text-slate-900 dark:text-white mb-2">
                    Extra ₹5,000 Monthly Payment
                  </h4>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    See how much you can save with additional monthly payments
                  </p>
                </div>
                
                <div className="p-4 bg-slate-50 dark:bg-slate-700 rounded-lg">
                  <h4 className="font-semibold text-slate-900 dark:text-white mb-2">
                    Lump Sum Prepayment
                  </h4>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Calculate savings from one-time prepayments
                  </p>
                </div>
              </div>
            </Card>
          </TabsContent>

          {/* Insights Tab */}
          <TabsContent value="insights" className="space-y-6">
            <Card className="p-6 border-0 shadow-lg bg-white dark:bg-slate-800">
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
          </TabsContent>
        </Tabs>

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

                <div>
                  <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    Tenure (months) - Optional
                  </Label>
                  <Input
                    type="number"
                    value={formData.tenure_months}
                    onChange={(e) => setFormData({...formData, tenure_months: Number(e.target.value)})}
                    placeholder="36"
                    className="mt-1"
                  />
                </div>
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