"use client";
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/Card";
import { Button } from "../../../components/Button";
import { Plus, TrendingDown, Calendar, DollarSign, AlertTriangle, CreditCard, Home, Car, User, Smartphone, Calculator, Target, Zap, Clock, TrendingUp } from "lucide-react";
import { Modal } from "../../../components/Modal";
import AddRepaymentForm from "./components/AddRepaymentForm";
import PrepaymentCalculator from "./components/PrepaymentCalculator";
import { 
  fetchRepayments, 
  createRepayment, 
  formatCurrency, 
  formatPercentage, 
  calculateProgressPercentage, 
  getDaysUntilDue,
  REPAYMENT_TYPES,
  type Repayment,
  type RepaymentSummary,
  type RepaymentFormData
} from "@/lib/repayments";

// Repayment type configurations with icons and colors
const REPAYMENT_TYPE_CONFIGS = [
  { 
    value: 'home_loan', 
    label: 'Home Loan', 
    icon: Home, 
    color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    gradient: 'from-blue-500 to-blue-600',
    description: 'Mortgage and home financing'
  },
  { 
    value: 'car_loan', 
    label: 'Car Loan', 
    icon: Car, 
    color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
    gradient: 'from-green-500 to-green-600',
    description: 'Vehicle financing'
  },
  { 
    value: 'personal_loan', 
    label: 'Personal Loan', 
    icon: User, 
    color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
    gradient: 'from-purple-500 to-purple-600',
    description: 'Personal and unsecured loans'
  },
  { 
    value: 'credit_card', 
    label: 'Credit Card', 
    icon: CreditCard, 
    color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
    gradient: 'from-orange-500 to-orange-600',
    description: 'Credit card balances'
  },
  { 
    value: 'bnpl', 
    label: 'BNPL', 
    icon: Smartphone, 
    color: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300',
    gradient: 'from-pink-500 to-pink-600',
    description: 'Buy now, pay later'
  }
];

export default function RepaymentsPage() {
  const [summary, setSummary] = useState<RepaymentSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showCalculatorModal, setShowCalculatorModal] = useState(false);
  const [selectedRepayment, setSelectedRepayment] = useState<Repayment | null>(null);
  const [selectedType, setSelectedType] = useState<string>('');

  // Load repayments data
  useEffect(() => {
    loadRepayments();
  }, []);

  const loadRepayments = async () => {
    try {
      setLoading(true);
      const data = await fetchRepayments();
      setSummary(data);
    } catch (error) {
      console.error('Error loading repayments:', error);
      // Show empty state instead of mock data
      setSummary({
        total_outstanding: 0,
        total_emi: 0,
        total_repayments: 0,
        repayments: []
      });
    } finally {
      setLoading(false);
    }
  };

  const getRepaymentTypeConfig = (type: string) => {
    return REPAYMENT_TYPE_CONFIGS.find(t => t.value === type) || REPAYMENT_TYPE_CONFIGS[0];
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded w-1/4 mb-8"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-32 bg-slate-200 dark:bg-slate-700 rounded-xl"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-2">
              Repayments Dashboard
            </h1>
            <p className="text-slate-600 dark:text-slate-400">
              Track and manage your loans, credit cards, and debt obligations
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAddModal(true)}
            className="bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border-slate-200 dark:border-slate-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Repayment
          </Button>
        </div>

        {/* Summary Cards - Enhanced Design */}
        {summary && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Total Outstanding - Red gradient */}
            <Card className="relative overflow-hidden bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 border-red-200 dark:border-red-800 hover:shadow-lg transition-all duration-300">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-red-600 dark:text-red-400">Total Outstanding</p>
                    <p className="text-3xl font-bold text-red-700 dark:text-red-300">
                      {formatCurrency(summary.total_outstanding)}
                    </p>
                    <p className="text-xs text-red-500 dark:text-red-400">Debt to repay</p>
                  </div>
                  <div className="p-4 bg-red-500/20 rounded-2xl">
                    <TrendingDown className="w-8 h-8 text-red-600 dark:text-red-400" />
                  </div>
                </div>
                <div className="absolute top-0 right-0 w-20 h-20 bg-red-500/10 rounded-full -translate-y-10 translate-x-10"></div>
              </CardContent>
            </Card>

            {/* Monthly EMIs - Blue gradient */}
            <Card className="relative overflow-hidden bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border-blue-200 dark:border-blue-800 hover:shadow-lg transition-all duration-300">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-blue-600 dark:text-blue-400">Monthly EMIs</p>
                    <p className="text-3xl font-bold text-blue-700 dark:text-blue-300">
                      {formatCurrency(summary.total_emi)}
                    </p>
                    <p className="text-xs text-blue-500 dark:text-blue-400">Due every month</p>
                  </div>
                  <div className="p-4 bg-blue-500/20 rounded-2xl">
                    <Calendar className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                  </div>
                </div>
                <div className="absolute top-0 right-0 w-20 h-20 bg-blue-500/10 rounded-full -translate-y-10 translate-x-10"></div>
              </CardContent>
            </Card>

            {/* Active Loans - Orange gradient */}
            <Card className="relative overflow-hidden bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 border-orange-200 dark:border-orange-800 hover:shadow-lg transition-all duration-300">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-orange-600 dark:text-orange-400">Active Loans</p>
                    <p className="text-3xl font-bold text-orange-700 dark:text-orange-300">
                      {summary.total_repayments}
                    </p>
                    <p className="text-xs text-orange-500 dark:text-orange-400">Currently paying</p>
                  </div>
                  <div className="p-4 bg-orange-500/20 rounded-2xl">
                    <DollarSign className="w-8 h-8 text-orange-600 dark:text-orange-400" />
                  </div>
                </div>
                <div className="absolute top-0 right-0 w-20 h-20 bg-orange-500/10 rounded-full -translate-y-10 translate-x-10"></div>
              </CardContent>
            </Card>

            {/* Debt-to-Income - Green gradient */}
            <Card className="relative overflow-hidden bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border-green-200 dark:border-green-800 hover:shadow-lg transition-all duration-300">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-green-600 dark:text-green-400">Debt-to-Income</p>
                    <p className="text-3xl font-bold text-green-700 dark:text-green-300">
                      {((summary.total_emi / 50000) * 100).toFixed(0)}%
                    </p>
                    <p className="text-xs text-green-500 dark:text-green-400">EMI ratio</p>
                  </div>
                  <div className="p-4 bg-green-500/20 rounded-2xl">
                    <AlertTriangle className="w-8 h-8 text-green-600 dark:text-green-400" />
                  </div>
                </div>
                <div className="absolute top-0 right-0 w-20 h-20 bg-green-500/10 rounded-full -translate-y-10 translate-x-10"></div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Repayments List - Enhanced Design */}
        {summary && summary.repayments.length > 0 ? (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Your Repayments</h2>
              <div className="flex items-center space-x-2 text-sm text-slate-600 dark:text-slate-400">
                <Target className="w-4 h-4" />
                <span>Track your progress</span>
              </div>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {summary.repayments.map((repayment) => {
                const typeConfig = getRepaymentTypeConfig(repayment.type);
                const progress = calculateProgressPercentage(repayment);
                const daysUntilDue = getDaysUntilDue(repayment.due_date);
                const IconComponent = typeConfig.icon;

                return (
                  <Card key={repayment.repayment_id} className="group hover:shadow-xl transition-all duration-300 border-0 bg-white dark:bg-slate-800 overflow-hidden">
                    <CardContent className="p-0">
                      {/* Header with gradient */}
                      <div className={`h-2 bg-gradient-to-r ${typeConfig.gradient}`}></div>
                      
                      <div className="p-6 space-y-6">
                        {/* Header */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <div className={`p-4 rounded-2xl ${typeConfig.color} group-hover:scale-110 transition-transform duration-300`}>
                              <IconComponent className="w-8 h-8" />
                            </div>
                            <div>
                              <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                                {typeConfig.label}
                              </h3>
                              <p className="text-slate-600 dark:text-slate-400 font-medium">
                                {repayment.institution}
                              </p>
                            </div>
                          </div>
                          
                          <div className="text-right">
                            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                              {formatCurrency(repayment.outstanding_balance)}
                            </p>
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                              Outstanding
                            </p>
                          </div>
                        </div>

                        {/* Key Metrics */}
                        <div className="grid grid-cols-2 gap-4">
                          <div className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-xl">
                            <div className="flex items-center space-x-2 mb-2">
                              <DollarSign className="w-4 h-4 text-slate-500" />
                              <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Monthly EMI</span>
                            </div>
                            <p className="text-xl font-bold text-slate-900 dark:text-slate-100">
                              {formatCurrency(repayment.emi_amount)}
                            </p>
                          </div>
                          <div className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-xl">
                            <div className="flex items-center space-x-2 mb-2">
                              <TrendingUp className="w-4 h-4 text-slate-500" />
                              <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Interest Rate</span>
                            </div>
                            <p className="text-xl font-bold text-slate-900 dark:text-slate-100">
                              {formatPercentage(repayment.interest_rate)}
                            </p>
                          </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="space-y-3">
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Repayment Progress</span>
                            <span className="text-sm font-bold text-slate-900 dark:text-slate-100">{progress.toFixed(1)}%</span>
                          </div>
                          <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-3 overflow-hidden">
                            <div 
                              className={`h-3 bg-gradient-to-r ${typeConfig.gradient} transition-all duration-1000 ease-out`}
                              style={{ width: `${progress}%` }}
                            ></div>
                          </div>
                          <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400">
                            <span>₹{formatCurrency(repayment.principal - repayment.outstanding_balance)} paid</span>
                            <span>₹{formatCurrency(repayment.outstanding_balance)} remaining</span>
                          </div>
                        </div>

                        {/* Timeline & Actions */}
                        <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-700">
                          <div className="flex items-center space-x-4 text-sm">
                            <div className="flex items-center space-x-2">
                              <Clock className="w-4 h-4 text-slate-500" />
                              <span className="text-slate-600 dark:text-slate-400">
                                Due {new Date(repayment.due_date).toLocaleDateString()}
                              </span>
                            </div>
                            <div className={`flex items-center space-x-2 ${daysUntilDue <= 7 ? 'text-red-500' : 'text-slate-500'}`}>
                              <AlertTriangle className="w-4 h-4" />
                              <span>{daysUntilDue} days left</span>
                            </div>
                          </div>
                          
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedRepayment(repayment);
                              setShowCalculatorModal(true);
                            }}
                            className="bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100"
                          >
                            <Zap className="w-4 h-4 mr-2" />
                            Prepay
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        ) : (
          <Card className="bg-white dark:bg-slate-800 border-0 shadow-lg">
            <CardContent className="p-12 text-center">
              <div className="p-6 bg-slate-100 dark:bg-slate-700 rounded-full w-24 h-24 mx-auto mb-6">
                <TrendingDown className="w-12 h-12 text-slate-400" />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-4">
                No Repayments Yet
              </h3>
              <p className="text-slate-600 dark:text-slate-400 mb-8 max-w-md mx-auto">
                Start tracking your loans and credit to get a complete view of your financial health and optimize your debt management.
              </p>
              <Button 
                variant="outline"
                size="sm"
                onClick={() => setShowAddModal(true)}
                className="bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border-slate-200 dark:border-slate-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Your First Repayment
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Add Repayment Modal */}
        <Modal
          isOpen={showAddModal}
          onClose={() => {
            setShowAddModal(false);
            setSelectedType('');
          }}
          title="Add New Repayment"
          size="lg"
        >
          <div className="p-6">
            {!selectedType ? (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">
                  Choose Repayment Type
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {REPAYMENT_TYPE_CONFIGS.map((type) => {
                    const IconComponent = type.icon;
                    return (
                      <button
                        key={type.value}
                        onClick={() => setSelectedType(type.value)}
                        className="p-4 border border-slate-200 dark:border-slate-700 rounded-xl hover:border-slate-300 dark:hover:border-slate-600 transition-colors text-left group"
                      >
                        <div className="flex items-center space-x-3">
                          <div className={`p-3 rounded-lg ${type.color}`}>
                            <IconComponent className="w-6 h-6" />
                          </div>
                          <div>
                            <h4 className="font-semibold text-slate-900 dark:text-slate-100 group-hover:text-slate-700 dark:group-hover:text-slate-300">
                              {type.label}
                            </h4>
                            <p className="text-sm text-slate-600 dark:text-slate-400">
                              {type.description}
                            </p>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              <AddRepaymentForm
                type={selectedType}
                onSave={async (data) => {
                  try {
                    await createRepayment(data);
                    setShowAddModal(false);
                    setSelectedType('');
                    loadRepayments(); // Refresh the list
                  } catch (error) {
                    console.error('Error saving repayment:', error);
                    // TODO: Show error toast
                  }
                }}
                onCancel={() => {
                  setShowAddModal(false);
                  setSelectedType('');
                }}
              />
            )}
          </div>
        </Modal>

        {/* Prepayment Calculator Modal */}
        <Modal
          isOpen={showCalculatorModal}
          onClose={() => {
            setShowCalculatorModal(false);
            setSelectedRepayment(null);
          }}
          title=""
          size="lg"
        >
          {selectedRepayment && (
            <PrepaymentCalculator
              repayment={selectedRepayment}
              onClose={() => {
                setShowCalculatorModal(false);
                setSelectedRepayment(null);
              }}
            />
          )}
        </Modal>
      </div>
    </div>
  );
}