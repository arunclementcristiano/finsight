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
    description: 'Mortgage and home financing'
  },
  { 
    value: 'car_loan', 
    label: 'Car Loan', 
    icon: Car, 
    color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
    description: 'Vehicle financing'
  },
  { 
    value: 'personal_loan', 
    label: 'Personal Loan', 
    icon: User, 
    color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
    description: 'Personal and unsecured loans'
  },
  { 
    value: 'credit_card', 
    label: 'Credit Card', 
    icon: CreditCard, 
    color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
    description: 'Credit card balances'
  },
  { 
    value: 'bnpl', 
    label: 'BNPL', 
    icon: Smartphone, 
    color: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300',
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

  const handleAddRepayment = async (data: RepaymentFormData) => {
    try {
      await createRepayment(data);
      setShowAddModal(false);
      setSelectedType('');
      loadRepayments(); // Refresh the list
    } catch (error) {
      console.error('Error saving repayment:', error);
      alert('Error saving repayment. Please try again.');
    }
  };

  const handlePrepayClick = (repayment: Repayment) => {
    setSelectedRepayment(repayment);
    setShowCalculatorModal(true);
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded w-1/4 mb-8"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-32 bg-slate-200 dark:bg-slate-700 rounded-xl"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Repayments
          </h1>
          <p className="text-muted-foreground">
            Track and manage your loans and credit obligations
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowAddModal(true)}
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Repayment
        </Button>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Outstanding</p>
                  <p className="text-2xl font-bold text-foreground">
                    {formatCurrency(summary.total_outstanding)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">Debt to repay</p>
                </div>
                <div className="p-3 bg-destructive/10 rounded-full">
                  <TrendingDown className="w-6 h-6 text-destructive" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Monthly EMIs</p>
                  <p className="text-2xl font-bold text-foreground">
                    {formatCurrency(summary.total_emi)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">Due every month</p>
                </div>
                <div className="p-3 bg-primary/10 rounded-full">
                  <Calendar className="w-6 h-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Active Loans</p>
                  <p className="text-2xl font-bold text-foreground">
                    {summary.total_repayments}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">Currently paying</p>
                </div>
                <div className="p-3 bg-orange-500/10 rounded-full">
                  <DollarSign className="w-6 h-6 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Debt-to-Income</p>
                  <p className="text-2xl font-bold text-foreground">
                    {((summary.total_emi / 50000) * 100).toFixed(0)}%
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">EMI ratio</p>
                </div>
                <div className="p-3 bg-green-500/10 rounded-full">
                  <AlertTriangle className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Repayments List */}
      {summary && summary.repayments.length > 0 ? (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">Your Repayments</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {summary.repayments.map((repayment) => {
              const typeConfig = getRepaymentTypeConfig(repayment.type);
              const progress = calculateProgressPercentage(repayment);
              const daysUntilDue = getDaysUntilDue(repayment.due_date);
              const IconComponent = typeConfig.icon;

              return (
                <Card key={repayment.repayment_id} className="hover:shadow-md transition-all duration-200">
                  <CardContent className="p-5">
                    <div className="space-y-4">
                      {/* Header */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className={`p-3 rounded-full ${typeConfig.color}`}>
                            <IconComponent className="w-6 h-6" />
                          </div>
                          <div>
                            <h3 className="text-lg font-semibold text-foreground">
                              {typeConfig.label}
                            </h3>
                            <p className="text-sm text-muted-foreground">
                              {repayment.institution}
                            </p>
                          </div>
                        </div>
                        
                        <div className="text-right">
                          <p className="text-xl font-bold text-foreground">
                            {formatCurrency(repayment.outstanding_balance)}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Outstanding
                          </p>
                        </div>
                      </div>

                      {/* Key Metrics */}
                      <div className="grid grid-cols-2 gap-4 py-3 bg-muted/30 rounded-lg px-4">
                        <div className="text-center">
                          <p className="text-lg font-semibold text-foreground">
                            {formatCurrency(repayment.emi_amount)}
                          </p>
                          <p className="text-xs text-muted-foreground">Monthly EMI</p>
                        </div>
                        <div className="text-center">
                          <p className="text-lg font-semibold text-foreground">
                            {formatPercentage(repayment.interest_rate)}
                          </p>
                          <p className="text-xs text-muted-foreground">Interest Rate</p>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div>
                        <div className="flex justify-between text-sm text-muted-foreground mb-2">
                          <span>Repayment Progress</span>
                          <span className="font-medium">{progress.toFixed(1)}%</span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-3">
                          <div 
                            className="bg-gradient-to-r from-primary to-primary/80 h-3 rounded-full transition-all duration-500"
                            style={{ width: `${progress}%` }}
                          ></div>
                        </div>
                        <div className="flex justify-between text-xs text-muted-foreground mt-1">
                          <span>₹{formatCurrency(repayment.principal - repayment.outstanding_balance)} paid</span>
                          <span>₹{formatCurrency(repayment.outstanding_balance)} remaining</span>
                        </div>
                      </div>

                      {/* Timeline & Actions */}
                      <div className="flex items-center justify-between pt-2 border-t border-border">
                        <div className="flex items-center space-x-4 text-sm">
                          <div className="flex items-center space-x-1">
                            <Calendar className="w-4 h-4 text-muted-foreground" />
                            <span className="text-muted-foreground">
                              Due {new Date(repayment.due_date).toLocaleDateString()}
                            </span>
                          </div>
                          <div className={`flex items-center space-x-1 ${daysUntilDue <= 7 ? 'text-destructive' : 'text-muted-foreground'}`}>
                            <AlertTriangle className="w-4 h-4" />
                            <span>{daysUntilDue} days left</span>
                          </div>
                        </div>
                        
                        <div className="flex space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handlePrepayClick(repayment)}
                            className="text-primary border-primary hover:bg-primary/10"
                          >
                            <Calculator className="w-4 h-4 mr-1" />
                            Prepay
                          </Button>
                        </div>
                      </div>

                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      ) : (
        <Card>
          <CardContent className="p-8 text-center">
            <div className="p-3 bg-muted rounded-full w-12 h-12 mx-auto mb-4">
              <TrendingDown className="w-6 h-6 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">
              No Repayments Yet
            </h3>
            <p className="text-muted-foreground mb-6">
              Start tracking your loans and credit to get a complete view of your financial health.
            </p>
            <Button 
              variant="outline"
              size="sm"
              onClick={() => setShowAddModal(true)}
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
              <h3 className="text-lg font-semibold text-foreground mb-4">
                Choose Repayment Type
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {REPAYMENT_TYPE_CONFIGS.map((type) => {
                  const IconComponent = type.icon;
                  return (
                    <button
                      key={type.value}
                      onClick={() => setSelectedType(type.value)}
                      className="p-4 border border-border rounded-xl hover:border-primary/50 transition-colors text-left group"
                    >
                      <div className="flex items-center space-x-3">
                        <div className={`p-3 rounded-lg ${type.color}`}>
                          <IconComponent className="w-6 h-6" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-foreground group-hover:text-primary">
                            {type.label}
                          </h4>
                          <p className="text-sm text-muted-foreground">
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
              onSave={handleAddRepayment}
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
        title="Prepayment Calculator"
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
  );
}