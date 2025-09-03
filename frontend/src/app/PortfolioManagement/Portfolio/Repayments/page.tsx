"use client";
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/Card";
import { Button } from "../../../components/Button";
import { Plus, TrendingDown, Calendar, DollarSign, AlertTriangle, CreditCard, Home, Car, User, Smartphone, Calculator } from "lucide-react";
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

// Types are now imported from lib/repayments.ts

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
    description: 'Credit card outstanding'
  },
  { 
    value: 'bnpl', 
    label: 'BNPL', 
    icon: Smartphone, 
    color: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300',
    description: 'Buy Now Pay Later'
  }
];

export default function RepaymentsPage() {
  const [summary, setSummary] = useState<RepaymentSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedType, setSelectedType] = useState<string>('');
  const [showCalculatorModal, setShowCalculatorModal] = useState(false);
  const [selectedRepayment, setSelectedRepayment] = useState<Repayment | null>(null);

  // Load repayments data
  useEffect(() => {
    loadRepayments();
  }, []);

  const loadRepayments = async () => {
    try {
      setLoading(true);
      
      // Try to fetch from API first
      try {
        const data = await fetchRepayments();
        setSummary(data);
      } catch (apiError) {
        console.warn('API not available, using mock data:', apiError);
        
        // Fallback to mock data
        const mockData: RepaymentSummary = {
          total_outstanding: 2500000,
          total_emi: 45000,
          total_repayments: 3,
          repayments: [
            {
              repayment_id: '1',
              type: 'home_loan',
              institution: 'HDFC Bank',
              principal: 2000000,
              interest_rate: 8.5,
              emi_amount: 25000,
              tenure_months: 120,
              outstanding_balance: 1800000,
              start_date: '2023-01-01',
              due_date: '2024-01-15',
              status: 'active'
            },
            {
              repayment_id: '2',
              type: 'car_loan',
              institution: 'ICICI Bank',
              principal: 800000,
              interest_rate: 9.2,
              emi_amount: 15000,
              tenure_months: 60,
              outstanding_balance: 600000,
              start_date: '2023-06-01',
              due_date: '2024-01-10',
              status: 'active'
            },
            {
              repayment_id: '3',
              type: 'credit_card',
              institution: 'SBI Card',
              principal: 100000,
              interest_rate: 24.0,
              emi_amount: 5000,
              tenure_months: 24,
              outstanding_balance: 100000,
              start_date: '2023-12-01',
              due_date: '2024-01-05',
              status: 'active'
            }
          ]
        };
        
        setSummary(mockData);
      }
    } catch (error) {
      console.error('Error loading repayments:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRepaymentTypeConfig = (type: string) => {
    return REPAYMENT_TYPE_CONFIGS.find(t => t.value === type) || REPAYMENT_TYPE_CONFIGS[0];
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Repayments</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">Track and manage your loans and credit</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Repayments</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Track and manage your loans and credit</p>
        </div>
        <Button 
          onClick={() => setShowAddModal(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Repayment
        </Button>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Outstanding</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {formatCurrency(summary.total_outstanding)}
                  </p>
                </div>
                <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-full">
                  <TrendingDown className="w-6 h-6 text-red-600 dark:text-red-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Monthly EMIs</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {formatCurrency(summary.total_emi)}
                  </p>
                </div>
                <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-full">
                  <Calendar className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Active Repayments</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {summary.total_repayments}
                  </p>
                </div>
                <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-full">
                  <DollarSign className="w-6 h-6 text-green-600 dark:text-green-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Repayments List */}
      {summary && summary.repayments.length > 0 ? (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Your Repayments</h2>
          <div className="grid grid-cols-1 gap-4">
            {summary.repayments.map((repayment) => {
              const typeConfig = getRepaymentTypeConfig(repayment.type);
              const progress = calculateProgressPercentage(repayment);
              const daysUntilDue = getDaysUntilDue(repayment.due_date);
              const IconComponent = typeConfig.icon;

              return (
                <Card key={repayment.repayment_id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className={`p-3 rounded-full ${typeConfig.color}`}>
                          <IconComponent className="w-6 h-6" />
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                            {typeConfig.label}
                          </h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {repayment.institution}
                          </p>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <p className="text-lg font-semibold text-gray-900 dark:text-white">
                          {formatCurrency(repayment.outstanding_balance)}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          EMI: {formatCurrency(repayment.emi_amount)}
                        </p>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="mt-4">
                      <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-1">
                        <span>Progress</span>
                        <span>{progress.toFixed(1)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${progress}%` }}
                        ></div>
                      </div>
                    </div>

                    {/* Details Row */}
                    <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-gray-600 dark:text-gray-400">Interest Rate</p>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {formatPercentage(repayment.interest_rate)}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-600 dark:text-gray-400">Tenure Left</p>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {Math.ceil(repayment.outstanding_balance / repayment.emi_amount)} months
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-600 dark:text-gray-400">Next Due</p>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {new Date(repayment.due_date).toLocaleDateString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-600 dark:text-gray-400">Days Until Due</p>
                        <p className={`font-medium ${daysUntilDue <= 7 ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-white'}`}>
                          {daysUntilDue} days
                          {daysUntilDue <= 7 && <AlertTriangle className="w-4 h-4 inline ml-1" />}
                        </p>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="mt-4 flex justify-end space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedRepayment(repayment);
                          setShowCalculatorModal(true);
                        }}
                        className="text-blue-600 border-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                      >
                        <Calculator className="w-4 h-4 mr-1" />
                        Prepayment Calculator
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      ) : (
        <Card>
          <CardContent className="p-12 text-center">
            <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-full w-16 h-16 mx-auto mb-4">
              <TrendingDown className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              No Repayments Yet
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Start tracking your loans and credit to get a complete view of your financial health.
            </p>
            <Button 
              onClick={() => setShowAddModal(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white"
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
      >
        <div className="space-y-6">
          {!selectedType ? (
            // Step 1: Select Type
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                What type of repayment would you like to add?
              </h3>
              <div className="grid grid-cols-1 gap-3">
                {REPAYMENT_TYPE_CONFIGS.map((type) => {
                  const IconComponent = type.icon;
                  return (
                    <button
                      key={type.value}
                      onClick={() => setSelectedType(type.value)}
                      className="flex items-center p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    >
                      <div className={`p-3 rounded-full ${type.color} mr-4`}>
                        <IconComponent className="w-6 h-6" />
                      </div>
                      <div className="text-left">
                        <h4 className="font-medium text-gray-900 dark:text-white">
                          {type.label}
                        </h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {type.description}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            // Step 2: Form
            <AddRepaymentForm
              selectedType={selectedType}
              onBack={() => setSelectedType('')}
              onSave={async (data) => {
                try {
                  console.log('Saving repayment:', data);
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
  );
}