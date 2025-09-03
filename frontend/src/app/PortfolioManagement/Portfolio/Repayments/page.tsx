"use client";
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/Card";
import { Button } from "../../../components/Button";
import { 
  Plus, 
  Calculator, 
  Target, 
  TrendingUp, 
  TrendingDown, 
  BarChart3, 
  PieChart, 
  LineChart, 
  Activity, 
  Eye, 
  Play, 
  Brain, 
  Zap, 
  Clock, 
  DollarSign, 
  Percent, 
  Calendar,
  ArrowRight,
  Settings,
  Trash2,
  Edit,
  AlertTriangle,
  CheckCircle,
  Info,
  Lightbulb,
  Star,
  Award,
  Trophy,
  Rocket,
  Shield,
  Heart,
  Sparkles
} from "lucide-react";
import { Modal } from "../../../components/Modal";
import { LoanEngine, UltraSimpleLiabilityInput, EnhancedLoanStatus } from "../../domain/Repaymentadvisor/repaymentEngine";
import SmartLiabilityCapture from "./components/SmartLiabilityCapture";
import OptimizationDashboard from "./components/OptimizationDashboard";
import ScenarioPlayground from "./components/ScenarioPlayground";
import VisualAnalytics from "./components/VisualAnalytics";
import { formatCurrency, formatPercentage } from "@/lib/smartRepayments";

export default function RepaymentsPage() {
  const [liabilities, setLiabilities] = useState<UltraSimpleLiabilityInput[]>([]);
  const [liabilityStatuses, setLiabilityStatuses] = useState<EnhancedLoanStatus[]>([]);
  const [showCaptureModal, setShowCaptureModal] = useState(false);
  const [selectedView, setSelectedView] = useState<'overview' | 'optimize' | 'scenarios' | 'analytics'>('overview');
  const [engine] = useState(new LoanEngine());

  // Calculate liability statuses when liabilities change
  useEffect(() => {
    const statuses = liabilities.map(liability => 
      engine.calculateEverything(liability)
    );
    setLiabilityStatuses(statuses);
  }, [liabilities, engine]);

  const handleSaveLiability = (liability: UltraSimpleLiabilityInput) => {
    setLiabilities(prev => [...prev, liability]);
    setShowCaptureModal(false);
  };

  const handleDeleteLiability = (index: number) => {
    setLiabilities(prev => prev.filter((_, i) => i !== index));
  };

  const calculateTotalDebt = () => {
    return liabilityStatuses.reduce((sum, status) => sum + status.outstandingBalance, 0);
  };

  const calculateTotalEMI = () => {
    return liabilityStatuses.reduce((sum, status) => sum + status.emi, 0);
  };

  const calculateTotalInterest = () => {
    return liabilityStatuses.reduce((sum, status) => 
      sum + (status.totalInterestPaid || 0) + (status.totalInterestAccrued || 0), 0
    );
  };

  const calculateDebtHealthScore = () => {
    if (liabilityStatuses.length === 0) return 0;
    
    let score = 100;
    const avgInterestRate = liabilityStatuses.reduce((sum, status) => {
      const liability = liabilities.find(l => l.type === status.loanCategory);
      return sum + (liability?.interest_rate || 0);
    }, 0) / liabilityStatuses.length;
    
    if (avgInterestRate > 20) score -= 30;
    else if (avgInterestRate > 15) score -= 20;
    else if (avgInterestRate > 10) score -= 10;
    
    const highRiskCount = liabilityStatuses.filter(status => 
      status.loanCategory === 'credit_card' || status.loanCategory === 'gold_loan'
    ).length;
    score -= highRiskCount * 15;
    
    return Math.max(0, Math.min(100, score));
  };

  const getDebtHealthColor = (score: number) => {
    if (score >= 80) return 'text-green-600 dark:text-green-400';
    if (score >= 60) return 'text-yellow-600 dark:text-yellow-400';
    if (score >= 40) return 'text-orange-600 dark:text-orange-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getDebtHealthLabel = (score: number) => {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    if (score >= 40) return 'Fair';
    return 'Needs Attention';
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center space-x-3">
            <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl">
              <Brain className="w-8 h-8 text-white" />
            </div>
            <span>Smart Repayment Advisor</span>
          </h1>
          <p className="text-muted-foreground mt-2">
            Your AI-powered debt optimization companion with advanced analytics and personalized strategies
          </p>
        </div>
        <Button
          size="lg"
          onClick={() => setShowCaptureModal(true)}
          className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600"
        >
          <Plus className="w-5 h-5 mr-2" />
          Add Liability
        </Button>
      </div>

      {/* View Toggle */}
      <div className="flex items-center space-x-2 bg-muted p-1 rounded-lg w-fit">
        {[
          { id: 'overview', label: 'Overview', icon: Eye },
          { id: 'optimize', label: 'Optimize', icon: Target },
          { id: 'scenarios', label: 'Scenarios', icon: Play },
          { id: 'analytics', label: 'Analytics', icon: BarChart3 }
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setSelectedView(id as any)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center space-x-2 ${
              selectedView === id
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Icon className="w-4 h-4" />
            <span>{label}</span>
          </button>
        ))}
      </div>

      {liabilities.length > 0 ? (
        <>
          {/* Debt Health Score - Hero Section */}
          <Card className="border border-border bg-card">
            <CardContent className="p-8">
              <div className="flex items-center justify-between">
                <div className="space-y-6">
                  <div>
                    <h2 className="text-3xl font-bold text-foreground mb-2">Your Debt Health</h2>
                    <div className="flex items-center space-x-6">
                      <div className={`text-6xl font-bold ${getDebtHealthColor(calculateDebtHealthScore())}`}>
                        {calculateDebtHealthScore()}/100
                      </div>
                      <div>
                        <p className="text-2xl font-semibold text-foreground">
                          {getDebtHealthLabel(calculateDebtHealthScore())}
                        </p>
                        <p className="text-muted-foreground">
                          {liabilities.length} liability{liabilities.length > 1 ? 'ies' : ''} analyzed
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Key Metrics Grid */}
                  <div className="grid grid-cols-4 gap-4">
                    <div className="text-center p-4 bg-muted/50 rounded-lg">
                      <DollarSign className="w-8 h-8 text-red-600 dark:text-red-400 mx-auto mb-2" />
                      <p className="text-2xl font-bold text-foreground">
                        {formatCurrency(calculateTotalDebt())}
                      </p>
                      <p className="text-sm text-muted-foreground">Total Debt</p>
                    </div>
                    <div className="text-center p-4 bg-muted/50 rounded-lg">
                      <Calendar className="w-8 h-8 text-blue-600 dark:text-blue-400 mx-auto mb-2" />
                      <p className="text-2xl font-bold text-foreground">
                        {formatCurrency(calculateTotalEMI())}
                      </p>
                      <p className="text-sm text-muted-foreground">Monthly EMIs</p>
                    </div>
                    <div className="text-center p-4 bg-muted/50 rounded-lg">
                      <TrendingDown className="w-8 h-8 text-orange-600 dark:text-orange-400 mx-auto mb-2" />
                      <p className="text-2xl font-bold text-foreground">
                        {formatCurrency(calculateTotalInterest())}
                      </p>
                      <p className="text-sm text-muted-foreground">Total Interest</p>
                    </div>
                    <div className="text-center p-4 bg-muted/50 rounded-lg">
                      <Percent className="w-8 h-8 text-green-600 dark:text-green-400 mx-auto mb-2" />
                      <p className="text-2xl font-bold text-foreground">
                        {formatPercentage(liabilities.length > 0 ? 
                          liabilities.reduce((sum, l) => sum + l.interest_rate, 0) / liabilities.length : 0)}
                      </p>
                      <p className="text-sm text-muted-foreground">Avg Interest</p>
                    </div>
                  </div>
                </div>
                
                <div className="text-right">
                  <div className="w-32 h-32 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                    <Activity className="w-16 h-16 text-white" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* View Content */}
          {selectedView === 'overview' && (
            <div className="space-y-6">
              {/* Quick Actions */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Zap className="w-5 h-5 text-yellow-600" />
                    <span>Quick Actions</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Button variant="outline" className="h-24 flex-col space-y-2">
                      <Calculator className="w-6 h-6" />
                      <span>Prepayment Calculator</span>
                    </Button>
                    <Button variant="outline" className="h-24 flex-col space-y-2">
                      <Target className="w-6 h-6" />
                      <span>Payoff Strategy</span>
                    </Button>
                    <Button variant="outline" className="h-24 flex-col space-y-2">
                      <TrendingUp className="w-6 h-6" />
                      <span>Refinance Check</span>
                    </Button>
                    <Button variant="outline" className="h-24 flex-col space-y-2">
                      <Lightbulb className="w-6 h-6" />
                      <span>Smart Tips</span>
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Liabilities Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {liabilityStatuses.map((status, index) => (
                  <LiabilityCard
                    key={index}
                    liability={liabilities[index]}
                    status={status}
                    onDelete={() => handleDeleteLiability(index)}
                  />
                ))}
              </div>
            </div>
          )}

          {selectedView === 'optimize' && (
            <OptimizationDashboard 
              liabilities={liabilities}
              liabilityStatuses={liabilityStatuses}
              engine={engine}
            />
          )}

          {selectedView === 'scenarios' && (
            <ScenarioPlayground 
              liabilities={liabilities}
              liabilityStatuses={liabilityStatuses}
              engine={engine}
            />
          )}

          {selectedView === 'analytics' && (
            <VisualAnalytics 
              liabilities={liabilities}
              liabilityStatuses={liabilityStatuses}
            />
          )}
        </>
      ) : (
        <Card>
          <CardContent className="p-12 text-center">
            <div className="w-32 h-32 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-8">
              <Brain className="w-16 h-16 text-white" />
            </div>
            <h3 className="text-3xl font-bold text-foreground mb-4">
              Start Your Debt-Free Journey
            </h3>
            <p className="text-muted-foreground mb-8 max-w-2xl mx-auto text-lg">
              Add your first liability to unlock powerful AI-driven insights, optimization strategies, 
              and personalized recommendations to help you become debt-free faster and smarter.
            </p>
            <Button 
              size="lg"
              onClick={() => setShowCaptureModal(true)}
              className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600"
            >
              <Plus className="w-6 h-6 mr-2" />
              Add Your First Liability
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Smart Liability Capture Modal */}
      <Modal
        open={showCaptureModal}
        onClose={() => setShowCaptureModal(false)}
        title="Add Smart Liability"
      >
        <SmartLiabilityCapture
          onSave={handleSaveLiability}
          onCancel={() => setShowCaptureModal(false)}
        />
      </Modal>
    </div>
  );
}

// Liability Card Component
function LiabilityCard({ 
  liability, 
  status, 
  onDelete 
}: { 
  liability: UltraSimpleLiabilityInput, 
  status: EnhancedLoanStatus, 
  onDelete: () => void 
}) {
  const [showDetails, setShowDetails] = useState(false);
  
  const getIcon = () => {
    switch (liability.type) {
      case 'home_loan':
        return <Shield className="w-6 h-6 text-blue-600 dark:text-blue-400" />;
      case 'car_loan':
        return <Trophy className="w-6 h-6 text-green-600 dark:text-green-400" />;
      case 'credit_card':
        return <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />;
      case 'gold_loan':
        return <Award className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />;
      case 'personal_loan':
        return <Heart className="w-6 h-6 text-purple-600 dark:text-purple-400" />;
      case 'education_loan':
        return <Star className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />;
      default:
        return <Settings className="w-6 h-6 text-gray-600 dark:text-gray-400" />;
    }
  };

  const getStatusColor = () => {
    switch (status.loanType) {
      case 'emi':
        return 'border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-900/20';
      case 'credit_card':
        return 'border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-900/20';
      case 'gold_loan':
        return 'border-yellow-200 dark:border-yellow-800 bg-yellow-50/50 dark:bg-yellow-900/20';
      default:
        return 'border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/20';
    }
  };

  const calculateProgress = () => {
    if (status.emi === 0) return 0;
    const totalMonths = status.monthsElapsed + status.remainingMonths;
    return totalMonths > 0 ? Math.round((status.monthsElapsed / totalMonths) * 100) : 0;
  };

  const progress = calculateProgress();

  return (
    <Card className={`border-2 ${getStatusColor()} hover:shadow-lg transition-all duration-300`}>
      <CardContent className="p-6">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-background rounded-xl shadow-sm">
                {getIcon()}
              </div>
              <div>
                <h4 className="text-lg font-bold text-foreground">{liability.institution}</h4>
                <p className="text-sm text-muted-foreground capitalize">{liability.type.replace('_', ' ')}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-foreground">{formatCurrency(status.outstandingBalance)}</p>
              <p className="text-sm text-muted-foreground">{formatPercentage(liability.interest_rate)}</p>
            </div>
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg border border-border bg-card p-3 text-center">
              <div className="text-xs text-muted-foreground mb-1">Monthly Payment</div>
              <div className="text-lg font-semibold text-foreground">
                {status.emi > 0 ? formatCurrency(status.emi) : 'No EMI'}
              </div>
            </div>
            <div className="rounded-lg border border-border bg-card p-3 text-center">
              <div className="text-xs text-muted-foreground mb-1">Remaining</div>
              <div className="text-lg font-semibold text-foreground">
                {status.remainingMonths > 0 ? `${status.remainingMonths} months` : 'No tenure'}
              </div>
            </div>
          </div>

          {/* Progress Bar for EMI loans */}
          {status.emi > 0 && status.remainingMonths > 0 && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Progress</span>
                <span className="font-medium text-foreground">
                  {progress}% • {status.remainingMonths} months left
                </span>
              </div>
              <div className="w-full bg-muted rounded-full h-3">
                <div 
                  className="bg-gradient-to-r from-blue-500 to-purple-500 h-3 rounded-full transition-all duration-500"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
            >
              <Calculator className="w-4 h-4 mr-2" />
              Analyze
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowDetails(!showDetails)}
            >
              <Settings className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onDelete}
              className="text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>

          {/* Details Section */}
          {showDetails && (
            <div className="pt-4 border-t border-border">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Original Amount:</span>
                  <span className="font-medium">{formatCurrency(status.originalAmount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Months Elapsed:</span>
                  <span className="font-medium">{status.monthsElapsed}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Monthly Interest:</span>
                  <span className="font-medium">{formatCurrency(status.monthlyInterestAccrual)}</span>
                </div>
                {status.minimumDue && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Minimum Due:</span>
                    <span className="font-medium">{formatCurrency(status.minimumDue)}</span>
                  </div>
                )}
              </div>
              <div className="mt-3 p-3 bg-muted/50 rounded-lg">
                <p className="text-xs text-muted-foreground">{status.explanation}</p>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}