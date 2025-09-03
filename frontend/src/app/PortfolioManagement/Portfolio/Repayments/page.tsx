'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../../components/Card';
import { Button } from '../../../components/Button';
import { Input } from '../../../components/Input';
import { Label } from '../../../components/Label';
import { Badge } from '../../../components/Badge';
import { Modal } from '../../../components/Modal';
import { 
  DollarSign, 
  Clock, 
  TrendingUp, 
  Target, 
  Plus, 
  Zap, 
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
            <div className="space-y-4">
              {liabilities.map((loan, index) => (
                <div key={index} className="flex items-center justify-between p-4 border border-border rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div className={`p-3 rounded-xl ${loanColors[loan.loanCategory]} text-white`}>
                      {loanIcons[loan.loanCategory]}
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">
                        {loan.loanCategory.replace('_', ' ').toUpperCase()}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        ₹{loan.originalAmount.toLocaleString()} • {loan.interest_rate}% APR
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-6">
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">Outstanding</p>
                      <p className="font-semibold text-foreground">
                        ₹{loan.outstandingBalance.toLocaleString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">EMI</p>
                      <p className="font-semibold text-foreground">
                        ₹{loan.emi?.toLocaleString() || 'N/A'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">Remaining</p>
                      <p className="font-semibold text-foreground">
                        {loan.remainingMonths} months
                      </p>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {loan.loanType.toUpperCase()}
                    </Badge>
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
        title="Optimization Strategies"
        footer={
          <Button variant="outline" onClick={() => setShowOptimizeModal(false)}>
            Close
          </Button>
        }
      >
        <div className="space-y-4">
          {[
            {
              id: 'avalanche',
              name: 'Avalanche Method',
              description: 'Pay highest interest rate loans first',
              icon: <TrendingDown className="w-5 h-5" />,
              color: 'border-l-red-500 bg-red-50 dark:bg-red-900/10',
              iconColor: 'text-red-600'
            },
            {
              id: 'snowball',
              name: 'Snowball Method',
              description: 'Pay smallest balance loans first',
              icon: <Coins className="w-5 h-5" />,
              color: 'border-l-blue-500 bg-blue-50 dark:bg-blue-900/10',
              iconColor: 'text-blue-600'
            },
            {
              id: 'hybrid',
              name: 'Smart Hybrid',
              description: 'Balanced approach considering both factors',
              icon: <Star className="w-5 h-5" />,
              color: 'border-l-purple-500 bg-purple-50 dark:bg-purple-900/10',
              iconColor: 'text-purple-600'
            },
            {
              id: 'risk',
              name: 'Risk First',
              description: 'Prioritize high-risk loans first',
              icon: <Shield className="w-5 h-5" />,
              color: 'border-l-orange-500 bg-orange-50 dark:bg-orange-900/10',
              iconColor: 'text-orange-600'
            }
          ].map((strategy) => (
            <div
              key={strategy.id}
              className={`p-4 border-l-4 ${strategy.color} rounded-lg cursor-pointer hover:shadow-md transition-all duration-200`}
              onClick={() => {
                console.log('Selected strategy:', strategy.id);
                setShowOptimizeModal(false);
              }}
            >
              <div className="flex items-center space-x-3">
                <div className={`p-2 rounded-lg ${strategy.iconColor}`}>
                  {strategy.icon}
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">{strategy.name}</h3>
                  <p className="text-sm text-muted-foreground">{strategy.description}</p>
                </div>
              </div>
            </div>
          ))}
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